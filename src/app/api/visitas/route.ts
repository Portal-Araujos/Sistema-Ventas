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

    // 1. Manejo de Fechas (Zona Horaria Ecuador)
    const dateStart = fInicio ? new Date(`${fInicio}T00:00:00-05:00`) : new Date(new Date().setHours(0,0,0,0));
    const dateEnd = fFin ? new Date(`${fFin}T23:59:59.999-05:00`) : new Date(new Date().setHours(23,59,59,999));

    // 2. Filtros de Visita con Cartera Protegida
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

    // 3. Traer VISITAS y VENTAS por separado para el cruce inteligente
    const [visitas, ventas] = await Promise.all([
      prisma.visitaAgenda.findMany({
        where: visitaFilters,
        include: {
          institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } },
          usuario: { select: { nombre: true } }
        },
        orderBy: { createdAt: 'desc' } // ORDENADAS DE LA MÁS NUEVA A LA MÁS VIEJA
      }),
      prisma.venta.findMany({
        where: {
          fechaVenta: { gte: dateStart, lte: dateEnd },
          vendedorId: userRol === 'vendedor' ? userId : (vendedorId || undefined)
        }
      })
    ]);

    // 4. ALGORITMO ANTI-DUPLICADOS (Consumo de Ventas)
    const ventasAsignadas = new Set(); // Memoria temporal para guardar IDs de ventas ya sumadas

    const dataConsolidada = visitas.map(v => {
      const dateVisitaEcuador = new Date(new Date(v.createdAt).toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
      const diaVisitaStr = dateVisitaEcuador.toISOString().split('T')[0];
      
      // Buscar las ventas de ESE MISMO DÍA para ESA ESCUELA y ESE VENDEDOR
      const ventasDelDia = ventas.filter(venta => {
        const diaVentaStr = new Date(new Date(venta.fechaVenta).toLocaleString("en-US", { timeZone: "America/Guayaquil" })).toISOString().split('T')[0];
        return venta.institucionId === v.institucionId && 
               venta.vendedorId === v.usuarioId && 
               diaVentaStr === diaVisitaStr;
      });

      // Filtrar SOLO las ventas que NO han sido asignadas a otra visita anterior en el bucle
      const ventasParaEstaVisita = ventasDelDia.filter(venta => !ventasAsignadas.has(venta.id));

      // Guardar en la memoria que estas ventas ya se sumaron
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
        ventasRegistradas: ventasParaEstaVisita.length, // Si ya se usó, será 0
        totalVendido: totalVendidoVisita, // Si ya se usó, será $0
        detallesContratos: contratosTexto || ''
      };
    });

    return NextResponse.json(dataConsolidada);
  } catch (error) {
    console.error("Error en reporte consolidado:", error);
    return NextResponse.json({ error: 'Error al generar reporte consolidado' }, { status: 500 });
  }
  
}
// POST: GUARDAR VISITA Y VENTA EN UN SOLO PASO
// POST: GUARDAR VISITA Y MÚLTIPLES VENTAS (CON ABONO)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    
    // 1. Recibimos los datos de la Visita + El Arreglo de Ventas
    const { 
      institucionId, tipoGestion, estadoGestion, resumenAcuerdos, latitud, longitud,
      fechaProgramada, horaProgramada, 
      huboVenta, ventas // <--- AQUÍ RECIBE EL ARREGLO DE TARJETAS
    } = body;

    if (!institucionId) return NextResponse.json({ error: 'Falta la institución' }, { status: 400 });

    const fechaValida = fechaProgramada 
      ? new Date(`${fechaProgramada}T12:00:00Z`) 
      : new Date();
      
    const hoy = new Date();
    const horaDefecto = horaProgramada || hoy.toTimeString().slice(0, 5);

    // PASO A: Guardamos la Visita (Esto ya te estaba funcionando bien)
    const nuevaVisita = await prisma.visitaAgenda.create({
      data: {
        institucionId,
        usuarioId: userId,
        tipoGestion,
        estadoGestion,
        resumenAcuerdos,
        latitud,
        longitud,
        fechaProgramada: fechaValida,
        horaProgramada: String(horaDefecto)
      }
    });

    // PASO B: Si hubo venta y el arreglo tiene datos, Hacemos un Ciclo (Loop)
    if (huboVenta && Array.isArray(ventas) && ventas.length > 0) {
      
      const transaccionesVentas = ventas.map((v: any) => {
        const valor = parseFloat(v.valorContrato) || 0;
        const abonoVal = parseFloat(v.abono) || 0; // <-- ATRAPAMOS EL ABONO
        const m = parseInt(v.meses) || 1;
        
        // Aseguramos la matemática exacta por seguridad del servidor
        const cuota = parseFloat(v.cuotaMensual) || parseFloat(((valor - abonoVal) / m).toFixed(2));

        // Creamos cada contrato amarrado a la misma visita
        return prisma.venta.create({
          data: {
            institucionId,
            vendedorId: userId,
            visitaId: nuevaVisita.id,
            numContrato: String(v.numContrato).trim(),
            valorContrato: valor,
            abono: abonoVal, // <-- GUARDAMOS EL ABONO EN BASE DE DATOS
            meses: m,
            mesCobro: v.mesCobro || 'Enero',
            cuotaMensual: cuota,
            tipoCobroId: v.tipoCobroId ? parseInt(v.tipoCobroId) : null,
            estadoClienteId: v.estadoClienteId ? parseInt(v.estadoClienteId) : null,
            estadoContratoId: v.estadoContratoId ? parseInt(v.estadoContratoId) : null,
            estadoTicket: 'Pendiente Facturación' // Estado inicial para que el Admin audite
          }
        });
      });

      // Ejecutamos la creación de todas las ventas al mismo tiempo
      await Promise.all(transaccionesVentas);
    }

    // PASO C: Actualizamos estado comercial de la escuela
    await prisma.institution.update({
      where: { id: institucionId },
      data: { estadoComercial: huboVenta ? 'Cliente (Con Contrato)' : estadoGestion }
    });

    return NextResponse.json(nuevaVisita, { status: 201 });
  } catch (error) {
    console.error("Error guardando visita y ventas:", error);
    return NextResponse.json({ error: 'Error interno al registrar la gestión' }, { status: 500 });
  }
}