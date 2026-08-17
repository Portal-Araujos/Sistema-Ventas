import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
    const estadoParam = searchParams.get('estado') || 'Borrador';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const institucionIdParam = searchParams.get('institucionId');

    const whereCondition: any = {};
    if (estadoParam === 'Borrador') {
      whereCondition.estado = 'Borrador';
    } else {
      whereCondition.estado = { not: 'Borrador' };
    }

    if (userRol === 'vendedor') {
      whereCondition.usuarioId = userId;
    }
    if (institucionIdParam) {
      whereCondition.institucionId = institucionIdParam;
    }

    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio ? `${fechaInicio}T00:00:00-05:00` : '1970-01-01T00:00:00-05:00';
      const endStr = fechaFin ? `${fechaFin}T23:59:59.999-05:00` : '2099-12-31T23:59:59.999-05:00';
      whereCondition.createdAt = { gte: new Date(startStr), lte: new Date(endStr) };
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereCondition,
      include: {
        institucion: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        detalles: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const institucionIds = [...new Set(pedidos.map((p: any) => p.institucionId))];
    const ventasGuardadas = await prisma.venta.findMany({
      where: { institucionId: { in: institucionIds } },
      select: { 
        numContrato: true, institucionId: true, vendedorId: true, 
        valorContrato: true, abono: true, meses: true, mesCobro: true,
        tipoCobroId: true, estadoClienteId: true, estadoContratoId: true 
      },
      orderBy: { fechaVenta: 'desc' }
    });

    const mapaGrupos = new Map();
    // 🔥 ORDEN DE PRIORIDAD DE LA FÁBRICA 🔥
    const prioridadEstados = ['Pendiente en revision', 'En produccion', 'en empaque', 'Listos para el despacho', 'Despacho'];

    for (const ped of pedidos as any[]) {
      const instId = ped.institucionId;
      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : '';
      
      const ventaAsociada = ventasGuardadas.find(v => v.numContrato === contratoExtraido && v.institucionId === instId);
      if (!contratoExtraido && ventaAsociada) contratoExtraido = ventaAsociada.numContrato;

      if (!contratoExtraido) contratoExtraido = 'S/N';

      // 🔥 LÓGICA DE SINCRONIZACIÓN DE ESTADO DESDE OPERACIONES 🔥
      let estadoRealPedido = ped.estado;
      if (ped.estado !== 'Borrador') {
        const estPrendas = (ped.detalles || []).map((d:any) => d.estadoOperacion || 'Pendiente en revision');
        if (estPrendas.length > 0) {
          let estadoMasRetrasado = 'Despacho';
          for (const est of estPrendas) {
            if (prioridadEstados.indexOf(est) < prioridadEstados.indexOf(estadoMasRetrasado)) {
              estadoMasRetrasado = est;
            }
          }
          estadoRealPedido = estadoMasRetrasado;
        }
      }

      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId, codigoPedido: `PED-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaCreacion: ped.createdAt, fechaRequerida: ped.fechaRequerida || null,
          contratosTotal: 0, paquetesCantidad: 0, totalPrendas: 0,
          estado: estadoRealPedido, updatedAt: ped.updatedAt, pedidosAsociados: []
        });
      } else {
         const grupo = mapaGrupos.get(instId);
         // Mantener el estado más retrasado para todo el grupo
         if (grupo.estado !== 'Borrador' && estadoRealPedido !== 'Borrador') {
            if (prioridadEstados.indexOf(estadoRealPedido) < prioridadEstados.indexOf(grupo.estado)) {
                grupo.estado = estadoRealPedido;
            }
         }
      }

      const grupo = mapaGrupos.get(instId);
      const unidadesEnEstePedido = (ped.detalles || []).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      if (ped.fechaRequerida && !grupo.fechaRequerida) grupo.fechaRequerida = ped.fechaRequerida;

      grupo.pedidosAsociados.push({
        id: ped.id, numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente || `Cliente Contrato #${contratoExtraido}`,
        tipoPedido: ped.tipoPedido || 'Pedido', observacion: ped.observacion || '',
        fechaRequerida: ped.fechaRequerida || null, detalles: ped.detalles || [],
        totalUnidadesContrato: unidadesEnEstePedido,
        estadoActualizadoOperaciones: estadoRealPedido, // <- Estado visible para vendedor
        valorContrato: ventaAsociada?.valorContrato || '',
        abono: ventaAsociada?.abono || '',
        meses: ventaAsociada?.meses || 12,
        mesCobro: ventaAsociada?.mesCobro || 'Enero',
        tipoCobroId: ventaAsociada?.tipoCobroId || '',
        estadoClienteId: ventaAsociada?.estadoClienteId || '',
        estadoContratoId: ventaAsociada?.estadoContratoId || ''
      });

      const numContratosEnPedido = contratoExtraido !== 'S/N' ? contratoExtraido.split(',').filter(Boolean).length : 1;
      grupo.contratosTotal += numContratosEnPedido;
      grupo.paquetesCantidad += numContratosEnPedido;
      grupo.totalPrendas += unidadesEnEstePedido;
      if (new Date(ped.updatedAt) > new Date(grupo.updatedAt)) grupo.updatedAt = ped.updatedAt;
    }

    const resultado = Array.from(mapaGrupos.values()).map(g => ({
      ...g,
      fechaCreacionTexto: new Date(g.fechaCreacion).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      // 🔥 Forzamos UTC aquí para que no salte al día anterior 🔥
      fechaRequeridaTexto: g.fechaRequerida ? new Date(g.fechaRequerida).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'No asignada',
      updatedAt: new Date(g.updatedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al consultar pedidos' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // IGUAL QUE ANTES (No cambia la actualización)
  try {
    const body = await request.json();
    const { modo, id, institucionId, detalles, numContrato, nombreCliente, fechaRequerida, valorContrato, abono, meses, mesCobro, tipoCobroId, estadoClienteId, estadoContratoId } = body;

    if (modo === 'masivo') {
      await prisma.pedido.updateMany({
        where: { institucionId, estado: 'Borrador' },
        data: { estado: 'Pendiente en revisión', fechaRequerida: new Date(`${fechaRequerida}T12:00:00Z`) }
      });
      return NextResponse.json({ success: true });
    } else {
      await prisma.detallePedido.deleteMany({ where: { pedidoId: id } });
      const updateData: any = {};
      if (numContrato !== undefined) updateData.numContrato = String(numContrato).trim() || null;
      if (nombreCliente !== undefined) updateData.nombreCliente = nombreCliente;
      if (fechaRequerida !== undefined) updateData.fechaRequerida = fechaRequerida ? new Date(`${fechaRequerida}T12:00:00Z`) : null;

      if (Array.isArray(detalles) && detalles.length > 0) {
        updateData.detalles = {
          create: detalles.map((d: any) => ({
            skuCodigo: d.skuCodigo || 'S/N', tipoRopa: d.tipoRopa || 'Prenda', color: d.color || '',
            genero: d.genero || 'UNISEX', talla: d.talla || 'M', cantidad: parseInt(d.cantidad) || 1, bordado: d.bordado || null, observacion: d.observacion || null
          }))
        };
      }
      const pedidoActualizado = await prisma.pedido.update({ where: { id }, data: updateData });
      return NextResponse.json(pedidoActualizado);
    }
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const { payload } = await jwtVerify(token!, JWT_SECRET);
    const userId = payload.id as string;
    const body = await request.json();
    const nuevoPedido = await prisma.pedido.create({
      data: {
        institucionId: body.institucionId, usuarioId: userId, numContrato: body.numContrato || null,
        nombreCliente: body.nombreCliente || `Cliente`,
        fechaRequerida: body.fechaRequerida ? new Date(`${body.fechaRequerida}T12:00:00Z`) : null,
        detalles: {
          create: (body.detalles || []).map((d: any) => ({
            skuCodigo: d.skuCodigo || 'S/N', tipoRopa: d.tipoRopa || 'Prenda', color: d.color || '',
            genero: d.genero || 'UNISEX', talla: d.talla || 'M', cantidad: parseInt(d.cantidad) || 1
          }))
        }
      }
    });
    return NextResponse.json(nuevoPedido);
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}