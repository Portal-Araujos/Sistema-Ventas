import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// 🔥 CORRECCIÓN: Ahora Taller incluye los estados futuros para que no desaparezcan de la lista, solo se bloqueen
const ESTADOS_TALLER = [
  'En producción', 'Planificación', 'Corte', 'Confección', 'Preparación', 
  'En empaque', 'Listos para el despacho', 'Despachado'
];

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    // AUTO-SEMBRADO
    if (await prisma.estadoProduccion.count() === 0) {
      await prisma.estadoProduccion.createMany({
        data: [{ nombre: 'Planificación' }, { nombre: 'Corte' }, { nombre: 'Confección' }, { nombre: 'Preparación' }]
      });
      await prisma.lineaProduccion.createMany({
        data: [{ nombre: 'Línea Deportiva' }, { nombre: 'Línea Formal' }, { nombre: 'Taller Externo 1' }]
      });
      await prisma.operario.createMany({
        data: [{ nombreApellido: 'Génesis Méndez' }, { nombreApellido: 'Mónica Ruiz' }, { nombreApellido: 'Juan Costura' }]
      });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const whereCondition: any = { estado: { in: ESTADOS_TALLER } };
    if (fechaInicio && fechaFin) {
      whereCondition.updatedAt = {
        gte: new Date(`${fechaInicio}T00:00:00-05:00`),
        lte: new Date(`${fechaFin}T23:59:59-05:00`)
      };
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereCondition,
      include: { institucion: { select: { id: true, nombre: true } }, usuario: { select: { nombre: true } }, detalles: true },
      orderBy: { updatedAt: 'desc' }
    });

    const catalogos = {
      estados: await prisma.estadoProduccion.findMany({ where: { activo: true } }),
      lineas: await prisma.lineaProduccion.findMany({ where: { activo: true } }),
      operarios: await prisma.operario.findMany({ where: { activo: true } })
    };

    const hoyEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoyEcuador.setHours(0,0,0,0);
    const mananaEcuador = new Date(hoyEcuador);
    mananaEcuador.setDate(mananaEcuador.getDate() + 1);

    // CÁLCULO DE KPIs
    const kpis = { ordenesProceso: 0, ordenesCompletadas: 0, prendasProduccion: 0, prendasDia: 0 };
    const estadosProceso = ['En producción', 'Planificación', 'Corte', 'Confección', 'Preparación'];
    const estadosCompletados = ['En empaque', 'Listos para el despacho', 'Despachado']; // 🔥 Cuenta los enviados a bodega

    pedidos.forEach(p => {
      const prendasEnPedido = p.detalles.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      if (estadosProceso.includes(p.estado)) {
        kpis.ordenesProceso++;
        kpis.prendasProduccion += prendasEnPedido;
      } else if (estadosCompletados.includes(p.estado)) {
        kpis.ordenesCompletadas++;
        if (new Date(p.updatedAt) >= hoyEcuador && new Date(p.updatedAt) < mananaEcuador) {
          kpis.prendasDia += prendasEnPedido;
        }
      }
    });

    const mapaGrupos = new Map();
    for (const ped of pedidos) {
      const instId = ped.institucionId;
      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId,
          codigoOP: `OP-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          paquetesCantidad: 0, totalPrendas: 0, estadosSet: new Set(), lineasSet: new Set(),
          fechaInicio: ped.updatedAt, fechasRequeridas: [], pedidosAsociados: []
        });
      }

      const grupo = mapaGrupos.get(instId);
      const prendasContrato = ped.detalles.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      let numContrato = ped.numContrato ? String(ped.numContrato).trim() : 'S/N';

      grupo.pedidosAsociados.push({
        id: ped.id, numPedido: `PED-${ped.id.slice(0,6).toUpperCase()}`, numContrato,
        estado: ped.estado, operarioAsignado: ped.operarioAsignado || '', lineaProduccion: ped.lineaProduccion || '',
        fechaRequerida: ped.fechaRequerida, detalles: ped.detalles || [], totalPrendas: prendasContrato
      });

      grupo.paquetesCantidad++;
      grupo.totalPrendas += prendasContrato;
      grupo.estadosSet.add(ped.estado);
      if (ped.lineaProduccion) grupo.lineasSet.add(ped.lineaProduccion);
      if (ped.fechaRequerida) grupo.fechasRequeridas.push(new Date(ped.fechaRequerida));
      if (new Date(ped.updatedAt) < new Date(grupo.fechaInicio)) grupo.fechaInicio = ped.updatedAt;
    }

    const tabla = Array.from(mapaGrupos.values()).map(g => {
      const arrayEstados = Array.from(g.estadosSet);
      const arrayLineas = Array.from(g.lineasSet);
      const fechaUrgente = g.fechasRequeridas.length > 0 ? new Date(Math.min(...g.fechasRequeridas.map((d: Date) => d.getTime()))) : null;

      return {
        ...g,
        estadosArray: arrayEstados,
        lineasArray: arrayLineas,
        estadoActual: arrayEstados.length === 1 ? arrayEstados[0] : 'Varios Estados',
        lineaActual: arrayLineas.length === 1 ? arrayLineas[0] : (arrayLineas.length > 1 ? 'Varias Líneas' : 'Sin Asignar'),
        fechaInicioTexto: new Date(g.fechaInicio).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
        fechaCompromisoTexto: fechaUrgente ? fechaUrgente.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : 'Sin Asignar'
      };
    });

    tabla.forEach(g => { delete (g as any).estadosSet; delete (g as any).lineasSet; });
    return NextResponse.json({ kpis, tabla, catalogos });
  } catch (error) {
    return NextResponse.json({ error: 'Error en Producción' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { modo, id, institucionId, estado, operarioAsignado, lineaProduccion } = body;

    // 🔥 ENVÍO MASIVO A EMPAQUE 🔥
    if (modo === 'masivo_empaque') {
      if (!institucionId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      await prisma.pedido.updateMany({
        where: { institucionId, estado: { in: ['En producción', 'Planificación', 'Corte', 'Confección', 'Preparación'] } },
        data: { estado: 'En empaque' }
      });
      return NextResponse.json({ success: true });
    }

    // 🔥 ENVÍO INDIVIDUAL A EMPAQUE 🔥
    if (modo === 'individual_empaque') {
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      await prisma.pedido.update({ where: { id }, data: { estado: 'En empaque' } });
      return NextResponse.json({ success: true });
    }

    // ACTUALIZACIÓN NORMAL DE TALLER
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updateData: any = {};
    if (estado) updateData.estado = estado;
    if (operarioAsignado !== undefined) updateData.operarioAsignado = operarioAsignado;
    if (lineaProduccion !== undefined) updateData.lineaProduccion = lineaProduccion;

    const actualizado = await prisma.pedido.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: actualizado });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}