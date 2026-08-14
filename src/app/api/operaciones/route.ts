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

    await jwtVerify(token, JWT_SECRET);

    const countEstados = await prisma.estadoOperacion.count();
    if (countEstados === 0) {
      await prisma.estadoOperacion.createMany({
        data: [
          { nombre: 'Pendiente en revisión' },
          { nombre: 'En producción' },
          { nombre: 'En empaque' },
          { nombre: 'Listos para el despacho' },
          { nombre: 'Despachado' }
        ]
      });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const whereCondition: any = { estado: { not: 'Borrador' } };

    if (fechaInicio && fechaFin) {
      whereCondition.updatedAt = {
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
      orderBy: { updatedAt: 'desc' }
    });

    const catalogosEstados = await prisma.estadoOperacion.findMany({ where: { activo: true } });

    const hoyEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoyEcuador.setHours(0,0,0,0);
    const mananaEcuador = new Date(hoyEcuador);
    mananaEcuador.setDate(mananaEcuador.getDate() + 1);

    const kpis = {
      enRevision: 0, enProduccion: 0, enEmpaque: 0, listosDespacho: 0,
      despachosHoy: 0, totalPendientes: 0, atrasados: 0
    };

    pedidos.forEach(p => {
      const estadoReal = p.estado === 'En Operaciones' ? 'Pendiente en revisión' : p.estado;

      if (estadoReal === 'Pendiente en revisión') kpis.enRevision++;
      if (estadoReal === 'En producción') kpis.enProduccion++;
      if (estadoReal === 'En empaque') kpis.enEmpaque++;
      if (estadoReal === 'Listos para el despacho') kpis.listosDespacho++;
      
      if (estadoReal === 'Despachado') {
        if (new Date(p.updatedAt) >= hoyEcuador && new Date(p.updatedAt) < mananaEcuador) {
          kpis.despachosHoy++;
        }
      } else {
        kpis.totalPendientes++;
      }

      if (p.fechaRequerida && new Date(p.fechaRequerida) < hoyEcuador && estadoReal !== 'Despachado') {
        kpis.atrasados++;
      }
    });

    const mapaGrupos = new Map();

    for (const ped of pedidos as any[]) {
      const instId = ped.institucionId;
      const estadoReal = ped.estado === 'En Operaciones' ? 'Pendiente en revisión' : ped.estado;

      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : 'S/N';

      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId,
          codigoPedido: `OP-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaIngreso: ped.updatedAt,
          paquetesCantidad: 0,
          totalPrendas: 0,
          estadosSet: new Set(),
          fechasRequeridas: [],
          pedidosAsociados: []
        });
      }

      const grupo = mapaGrupos.get(instId);
      const prendasEnContrato = (ped.detalles || []).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);

      grupo.pedidosAsociados.push({
        id: ped.id,
        numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente,
        estado: estadoReal,
        fechaRequerida: ped.fechaRequerida,
        motivoCambioFecha: ped.motivoCambioFecha,
        operarioAsignado: ped.operarioAsignado,
        totalPrendas: prendasEnContrato,
        detalles: ped.detalles || []
      });

      grupo.paquetesCantidad += 1;
      grupo.totalPrendas += prendasEnContrato;
      grupo.estadosSet.add(estadoReal);
      if (ped.fechaRequerida) grupo.fechasRequeridas.push(new Date(ped.fechaRequerida));
      
      if (new Date(ped.updatedAt) > new Date(grupo.fechaIngreso)) {
        grupo.fechaIngreso = ped.updatedAt;
      }
    }

    const tabla = Array.from(mapaGrupos.values()).map(g => {
      const arrayEstados = Array.from(g.estadosSet);
      const estadoGlobal = arrayEstados.length === 1 ? arrayEstados[0] : 'Varios Estados';
      
      const fechaUrgente = g.fechasRequeridas.length > 0 
        ? new Date(Math.min(...g.fechasRequeridas.map((d: Date) => d.getTime()))) 
        : null;

      return {
        ...g,
        estadosArray: arrayEstados, // 🔥 CORRECCIÓN: Enviamos un Array real para que el filtro funcione
        estadoActual: estadoGlobal,
        fechaIngresoTexto: new Date(g.fechaIngreso).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
        fechaRequeridaTexto: fechaUrgente ? fechaUrgente.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : 'Sin Asignar',
        esAtrasado: fechaUrgente ? fechaUrgente < hoyEcuador : false
      };
    });

    // Limpiamos el Set original para evitar errores de transmisión JSON
    tabla.forEach(g => delete (g as any).estadosSet);

    return NextResponse.json({ kpis, tabla, catalogos: { estados: catalogosEstados } });
  } catch (error) {
    console.error("Error en Operaciones:", error);
    return NextResponse.json({ error: 'Error al consultar operaciones' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { modo, id, institucionId, estado, fechaRequerida, motivoCambioFecha, operarioAsignado } = body;

    // 🔥 NUEVO: Aprobar todo el stock de una escuela masivamente 🔥
    if (modo === 'aprobar_escuela') {
      if (!institucionId) return NextResponse.json({ error: 'ID de institución requerido' }, { status: 400 });
      
      await prisma.pedido.updateMany({
        where: { 
          institucionId, 
          estado: { in: ['Pendiente en revisión', 'En Operaciones'] } 
        },
        data: { estado: 'En producción' }
      });
      return NextResponse.json({ success: true, message: 'Escuela enviada a Producción.' });
    }

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updateData: any = {};
    if (estado) updateData.estado = estado;
    if (fechaRequerida) updateData.fechaRequerida = new Date(`${fechaRequerida}T12:00:00Z`);
    if (motivoCambioFecha !== undefined) updateData.motivoCambioFecha = motivoCambioFecha;
    if (operarioAsignado !== undefined) updateData.operarioAsignado = operarioAsignado;

    const actualizado = await prisma.pedido.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: actualizado });
  } catch (error) {
    console.error("Error actualizando operación:", error);
    return NextResponse.json({ error: 'Error interno al actualizar' }, { status: 500 });
  }
}