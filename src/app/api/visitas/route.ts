import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userId = payload.id as string;
    const { searchParams } = new URL(request.url);
    const fInicio = searchParams.get('fechaInicio');
    const fFin = searchParams.get('fechaFin');
    const cantonId = searchParams.get('cantonId');
    const institucionId = searchParams.get('institucionId');
    const vendedorId = searchParams.get('vendedorId');
    const dateStart = fInicio ? new Date(`${fInicio}T00:00:00-05:00`) : new Date(new Date().setHours(0,0,0,0));
    const dateEnd = fFin ? new Date(`${fFin}T23:59:59.999-05:00`) : new Date(new Date().setHours(23,59,59,999));
    const instFilters: any = {};
    if (cantonId) instFilters.parroquia = { cantonId: parseInt(cantonId) };
    const visitaFilters: any = {
      createdAt: { gte: dateStart, lte: dateEnd },
      institucionId: institucionId ? institucionId : undefined,
      institucion: cantonId ? instFilters : undefined,
    };
    if (userRol === 'vendedor') {
      visitaFilters.usuarioId = userId;
    } else if (vendedorId) {
      visitaFilters.usuarioId = vendedorId;
    }
    const [visitas, ventas] = await Promise.all([
      prisma.visitaAgenda.findMany({
        where: visitaFilters,
        include: {
          institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } },
          usuario: { select: { nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.venta.findMany({
        where: {
          fechaVenta: { gte: dateStart, lte: dateEnd },
          vendedorId: userRol === 'vendedor' ? userId : (vendedorId || undefined)
        }
      })
    ]);
    const ventasAsignadas = new Set();
    const dataConsolidada = visitas.map(v => {
      const dateVisitaEcuador = new Date(new Date(v.createdAt).toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
      const diaVisitaStr = dateVisitaEcuador.toISOString().split('T')[0];
      const ventasDelDia = ventas.filter(venta => {
        const diaVentaStr = new Date(new Date(venta.fechaVenta).toLocaleString("en-US", { timeZone: "America/Guayaquil" })).toISOString().split('T')[0];
        return venta.institucionId === v.institucionId && 
               venta.vendedorId === v.usuarioId && 
               diaVentaStr === diaVisitaStr;
      });
      const ventasParaEstaVisita = ventasDelDia.filter(venta => !ventasAsignadas.has(venta.id));
      ventasParaEstaVisita.forEach(venta => ventasAsignadas.add(venta.id));
      const totalVendidoVisita = ventasParaEstaVisita.reduce((sum, vta) => sum + vta.valorContrato, 0);
      const contratosTexto = ventasParaEstaVisita.map(va => `N° ${va.numContrato}`).join(', ');
      return {
        id: v.id,
        fecha: dateVisitaEcuador.toLocaleDateString('es-EC'),
        hora: dateVisitaEcuador.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        vendedor: v.usuario.nombre,
        institucion: v.institucion.nombre,
        provincia: v.institucion.parroquia.canton.provincia.nombre,
        canton: v.institucion.parroquia.canton.nombre,
        tipoGestion: v.tipoGestion,
        estadoGestion: v.estadoGestion,
        resumen: v.resumenAcuerdos || 'Sin resumen registrado',
        latitud: v.latitud,
        longitud: v.longitud,
        ventasRegistradas: ventasParaEstaVisita.length,
        totalVendido: totalVendidoVisita,
        detallesContratos: contratosTexto || ''
      };
    });
    return NextResponse.json(dataConsolidada);
  } catch (error) {
    console.error("Error en reporte consolidado:", error);
    return NextResponse.json({ error: 'Error al generar reporte consolidado' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const body = await request.json();
    const { 
      institucionId, tipoGestion, estadoGestion, resumenAcuerdos, latitud, longitud,
      fechaProgramada, horaProgramada, fechaProximoContacto,
      huboVenta, ventas 
    } = body;
    if (!institucionId) return NextResponse.json({ error: 'Falta la institución' }, { status: 400 });

    // VALIDACIÓN PREVIA DE CONTRATOS DUPLICADOS
    if (huboVenta && Array.isArray(ventas) && ventas.length > 0) {
      const numerosContratos = ventas
        .map((v: any) => String(v.numContrato).trim())
        .filter((n: string) => n && n !== 'S/N' && n !== '');

      if (numerosContratos.length > 0) {
        const contratosExistentes = await prisma.venta.findMany({
          where: { numContrato: { in: numerosContratos } },
          select: { numContrato: true }
        });

        if (contratosExistentes.length > 0) {
          const duplicados = contratosExistentes.map(c => c.numContrato).join(', ');
          return NextResponse.json(
            { error: `¡Atención! El contrato N° ${duplicados} ya se encuentra registrado en la base de datos.` },
            { status: 400 }
          );
        }
      }
    }

    const hoy = new Date();
    const horaDefecto = horaProgramada || hoy.toTimeString().slice(0, 5);
    const fechaProximo = fechaProximoContacto ? new Date(`${fechaProximoContacto}T12:00:00Z`) : null;
    
    const nuevaVisita = await prisma.visitaAgenda.create({
      data: {
        institucionId,
        usuarioId: userId,
        tipoGestion,
        estadoGestion,
        resumenAcuerdos,
        latitud,
        longitud,
        fechaProgramada: hoy,
        horaProgramada: String(horaDefecto),
        fechaProximoContacto: fechaProximo,
        esVisitaLibre: true 
      }
    });

    if (huboVenta && Array.isArray(ventas) && ventas.length > 0) {
      // 1. REGISTRO DE VENTAS
      const transaccionesVentas = ventas.map((v: any) => {
        const valor = parseFloat(v.valorContrato) || 0;
        const abonoVal = parseFloat(v.abono) || 0;
        const m = parseInt(v.meses) || 1;
        const cuota = parseFloat(v.cuotaMensual) || parseFloat(((valor - abonoVal) / m).toFixed(2));
        return prisma.venta.create({
          data: {
            institucionId,
            vendedorId: userId,
            visitaId: nuevaVisita.id,
            numContrato: String(v.numContrato).trim(),
            valorContrato: valor,
            abono: abonoVal,
            meses: m,
            mesCobro: v.mesCobro || 'Enero',
            cuotaMensual: cuota,
            tipoCobroId: v.tipoCobroId ? parseInt(v.tipoCobroId) : null,
            estadoClienteId: v.estadoClienteId ? parseInt(v.estadoClienteId) : null,
            estadoContratoId: v.estadoContratoId ? parseInt(v.estadoContratoId) : null,
            estadoTicket: 'Pendiente Facturación'
          }
        });
      });
      await Promise.all(transaccionesVentas);

      // 2. REGISTRO DE PEDIDOS (AHORA CON NUMCONTRATO DIRECTO 🔥)
      const transaccionesPedidos = ventas
        .filter((v: any) => (Array.isArray(v.prendas) && v.prendas.length > 0) || v.nombreCliente)
        .map((v: any) => {
          const numContratoLimpio = String(v.numContrato || '').trim();
          return prisma.pedido.create({
            data: {
              institucionId,
              usuarioId: userId,
              numContrato: numContratoLimpio || null, // 🔥 AQUÍ SE GUARDA EL NÚMERO DE CONTRATO
              nombreCliente: v.nombreCliente || `Cliente Contrato #${numContratoLimpio || 'S/N'}`,
              observacion: resumenAcuerdos || null,
              detalles: {
                create: (v.prendas || []).map((p: any) => ({
                  skuCodigo: p.skuCodigo || 'S/COD',
                  tipoRopa: p.tipoRopa,
                  color: p.color,
                  genero: p.genero,
                  talla: p.talla,
                  cantidad: parseInt(p.cantidad) || 1,
                  bordado: p.bordado || null,
                  observacion: p.observacion || null
                }))
              }
            }
          });
        });
      if (transaccionesPedidos.length > 0) {
        await Promise.all(transaccionesPedidos);
      }
    }

    await prisma.institution.update({
      where: { id: institucionId },
      data: { 
        estadoComercial: huboVenta ? 'Visitada' : estadoGestion, 
        vendedorId: userId 
      }
    });

    return NextResponse.json(nuevaVisita, { status: 201 });
  } catch (error) {
    console.error("Error guardando visita, ventas y pedidos:", error);
    return NextResponse.json({ error: 'Error interno al registrar la gestión' }, { status: 500 });
  }
}