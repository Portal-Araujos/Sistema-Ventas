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

    if (fechaInicio && fechaFin) {
      whereCondition.createdAt = {
        gte: new Date(`${fechaInicio}T00:00:00-05:00`),
        lte: new Date(`${fechaFin}T23:59:59-05:00`)
      };
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

    // 🔥 MODO DETECTIVE: Rescate de números de contrato 🔥
    const institucionIds = [...new Set(pedidos.map((p: any) => p.institucionId))];
    const ventasGuardadas = await prisma.venta.findMany({
      where: { institucionId: { in: institucionIds } },
      select: { numContrato: true, institucionId: true, vendedorId: true },
      orderBy: { fechaVenta: 'desc' }
    });

    const mapaGrupos = new Map();

    for (const ped of pedidos as any[]) {
      const instId = ped.institucionId;

      // 1. Extraemos el contrato del pedido
      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : '';
      
      // 2. Rescate en la tabla de facturación si está vacío
      if (!contratoExtraido) {
        const ventaFugitiva = ventasGuardadas.find(v => v.institucionId === instId && v.vendedorId === ped.usuarioId);
        if (ventaFugitiva) contratoExtraido = ventaFugitiva.numContrato;
      }

      // 3. Rescate en el nombre del cliente
      if (!contratoExtraido && ped.nombreCliente) {
        const match = ped.nombreCliente.match(/Contrato\s*#?\s*([A-Za-z0-9\-_]+)/i);
        if (match && match[1]) contratoExtraido = match[1];
      }

      if (!contratoExtraido) contratoExtraido = 'S/N';

      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId,
          codigoPedido: `PED-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaCreacion: ped.createdAt,
          contratosTotal: 0,
          paquetesCantidad: 0,
          totalPrendas: 0,
          estado: ped.estado,
          updatedAt: ped.updatedAt,
          pedidosAsociados: []
        });
      }

      const grupo = mapaGrupos.get(instId);
      const unidadesEnEstePedido = (ped.detalles || []).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);

      grupo.pedidosAsociados.push({
        id: ped.id,
        numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente || `Cliente Contrato #${contratoExtraido}`,
        tipoPedido: ped.tipoPedido || 'Pedido',
        observacion: ped.observacion || '',
        detalles: ped.detalles || [],
        totalUnidadesContrato: unidadesEnEstePedido
      });

      const numContratosEnPedido = contratoExtraido !== 'S/N' ? contratoExtraido.split(',').filter(Boolean).length : 1;
      grupo.contratosTotal += numContratosEnPedido;
      grupo.paquetesCantidad += numContratosEnPedido;
      grupo.totalPrendas += unidadesEnEstePedido;

      if (new Date(ped.updatedAt) > new Date(grupo.updatedAt)) {
        grupo.updatedAt = ped.updatedAt;
      }
    }

    const resultado = Array.from(mapaGrupos.values()).map(g => ({
      ...g,
      fechaCreacionTexto: new Date(g.fechaCreacion).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      updatedAt: new Date(g.updatedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error consultando pedidos:", error);
    return NextResponse.json({ error: 'Error al consultar pedidos' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { modo, id, institucionId, detalles, observacion, tipoPedido } = body;

    // 🔥 ENVÍO A OPERACIONES 🔥
    if (modo === 'masivo') {
      if (!institucionId) return NextResponse.json({ error: 'Falta ID de Institución' }, { status: 400 });

      const pedidosDeEscuela = await prisma.pedido.findMany({
        where: { institucionId, estado: 'Borrador' },
        include: { detalles: true }
      });

      const vacios = pedidosDeEscuela.filter(p => p.detalles.length === 0);
      if (vacios.length > 0) {
        const nombres = vacios.map(v => v.numContrato || 'S/N').join(', ');
        return NextResponse.json({ error: `¡Error! Los contratos [${nombres}] no tienen prendas registradas. Llénalos antes de enviar.` }, { status: 400 });
      }

      await prisma.pedido.updateMany({
        where: { institucionId, estado: 'Borrador' },
        data: { estado: 'Pendiente en revisión' } // Pasa oficialmente a Operaciones
      });

      return NextResponse.json({ success: true, message: 'Enviados correctamente.' });
    } else {
      if (!id) return NextResponse.json({ error: 'Falta el ID del pedido' }, { status: 400 });

      await prisma.detallePedido.deleteMany({ where: { pedidoId: id } });

      const updateData: any = {
        observacion,
        tipoPedido: tipoPedido || 'Pedido'
      };

      if (Array.isArray(detalles) && detalles.length > 0) {
        updateData.detalles = {
          create: detalles.map((d: any) => ({
            skuCodigo: d.skuCodigo || 'PERSONALIZADO',
            tipoRopa: d.tipoRopa || 'Prenda',
            color: d.color || 'Estándar',
            genero: d.genero || 'UNISEX',
            talla: d.talla || 'M',
            cantidad: parseInt(d.cantidad) || 1,
            bordado: d.bordado || null,
            observacion: d.observacion || null
          }))
        };
      }

      const pedidoActualizado = await prisma.pedido.update({
        where: { id },
        data: updateData,
        include: { detalles: true }
      });

      return NextResponse.json(pedidoActualizado);
    }
  } catch (error) {
    console.error("Error actualizando pedido:", error);
    return NextResponse.json({ error: 'Error interno al actualizar pedido' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institucionId = searchParams.get('institucionId');
    if (!institucionId) return NextResponse.json({ error: 'ID de institución requerido' }, { status: 400 });

    await prisma.pedido.deleteMany({ where: { institucionId, estado: 'Borrador' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando borrador:", error);
    return NextResponse.json({ error: 'Error al eliminar borrador' }, { status: 500 });
  }
}