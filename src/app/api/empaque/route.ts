import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const currentUser = { id: payload.id, nombre: payload.nombre, rol: payload.rol };
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const whereCondition: any = {
      estado: { not: 'Borrador' },
      detalles: {
        some: { estadoOperacion: { in: ['en empaque', 'En empaque', 'Listos para el despacho', 'Despacho'] } }
      }
    };
    if (fechaInicio && fechaFin) {
      whereCondition.updatedAt = {
        gte: new Date(`${fechaInicio}T00:00:00-05:00`),
        lte: new Date(`${fechaFin}T23:59:59.999-05:00`)
      };
    }
    const [pedidos, pedidosMaestros] = await Promise.all([
      prisma.pedido.findMany({
        where: whereCondition,
        include: {
          institucion: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          detalles: true
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.pedido.findMany({
        where: { estado: { not: 'Borrador' } },
        select: { id: true, institucionId: true, fechaRequerida: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);
    const mapaGrupos = new Map();
    for (const ped of pedidos) {
      const instId = ped.institucionId;
      const fr = ped.fechaRequerida ? new Date(ped.fechaRequerida).toISOString().split('T')[0] : 'sin-fecha';
      const grupoKey = `${instId}_${fr}`;
      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : 'S/N';

      if (!mapaGrupos.has(grupoKey)) {
        // 🔥 MAGIA: Buscamos el ID del contrato más viejo globalmente
        const pedidoBase = pedidosMaestros.find((pm: any) => {
          const frPm = pm.fechaRequerida ? new Date(pm.fechaRequerida).toISOString().split('T')[0] : 'sin-fecha';
          return pm.institucionId === instId && frPm === fr;
        });
        const idMaestro = pedidoBase ? pedidoBase.id : ped.id;

        mapaGrupos.set(grupoKey, {
          id: grupoKey,
          institucionId: instId, 
          codigoOP: `PED-${idMaestro.slice(0, 6).toUpperCase()}`, // 🔥 CÓDIGO ÚNICO E INMUTABLE
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Vendedor',
          paquetesCantidad: 0, 
          totalPrendasEscuela: 0,
          despachadasHistoricasEscuela: 0,
          saldoPendienteEscuela: 0,
          preparadasSinDespacharEscuela: 0,
          fechaRequeridaDate: null,
          pedidosAsociados: []
        });
      }
      const grupo = mapaGrupos.get(grupoKey);
      if (ped.fechaRequerida) {
        const pedReqDate = new Date(ped.fechaRequerida);
        if (!grupo.fechaRequeridaDate || pedReqDate < grupo.fechaRequeridaDate) {
          grupo.fechaRequeridaDate = pedReqDate;
        }
      }
      const totalContratoReal = ped.detalles.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      const despachadasHistoricas = ped.detalles.filter((d:any) => d.guiaDespachoId !== null).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      const preparadasSinDespachar = ped.detalles.filter((d:any) => d.estadoEmpaque === 'Preparado' && d.guiaDespachoId === null).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      grupo.totalPrendasEscuela += totalContratoReal;
      grupo.despachadasHistoricasEscuela += despachadasHistoricas;
      grupo.saldoPendienteEscuela += (totalContratoReal - despachadasHistoricas);
      grupo.preparadasSinDespacharEscuela += preparadasSinDespachar;
      grupo.pedidosAsociados.push({
        id: ped.id, 
        numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente || 'Sin Cliente',
        estado: ped.estado, 
        responsableEmpaque: ped.responsableEmpaque || 'Sin Asignar',
        fechaInicioEmpaque: ped.fechaInicioEmpaque, 
        fechaFinEmpaque: ped.fechaFinEmpaque,
        totalPrendasContrato: totalContratoReal,
        despachadasHistoricasContrato: despachadasHistoricas,
        saldoPendienteContrato: totalContratoReal - despachadasHistoricas,
        preparadasSinDespacharContrato: preparadasSinDespachar,
        detalles: ped.detalles,
        detallesCompletos: ped.detalles 
      });
      grupo.paquetesCantidad += 1;
    }
    const kpis = { pendientes: 0, enPreparacion: 0, completados: 0 };
    const tabla = Array.from(mapaGrupos.values()).map(g => {
      const procesadasTotal = g.preparadasSinDespacharEscuela + g.despachadasHistoricasEscuela;
      const avanceGlobal = g.totalPrendasEscuela > 0 ? Math.round((procesadasTotal / g.totalPrendasEscuela) * 100) : 0;
      let estadoGlobal = 'Pendiente';
      if (avanceGlobal === 0) { estadoGlobal = 'Pendiente'; kpis.pendientes++; } 
      else if (avanceGlobal > 0 && avanceGlobal < 100) { estadoGlobal = 'En Preparación'; kpis.enPreparacion++; } 
      else if (avanceGlobal === 100) { estadoGlobal = 'Completado'; kpis.completados++; }
      let fechaRequeridaTexto = 'No asignada';
      let esAtrasado = false;
      if (g.fechaRequeridaDate) {
        const isoString = g.fechaRequeridaDate.toISOString();
        const [yyyy, mm, dd] = isoString.split('T')[0].split('-');
        fechaRequeridaTexto = `${dd}/${mm}/${yyyy}`;
        const reqDateLocal = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        const hoyLocal = new Date();
        hoyLocal.setHours(0, 0, 0, 0);
        esAtrasado = reqDateLocal < hoyLocal;
      }
      const { fechaRequeridaDate, ...restoGrupo } = g;
      return { ...restoGrupo, avanceGlobal, estadoGlobal, fechaRequeridaTexto, esAtrasado };
    });

    return NextResponse.json({ currentUser, kpis, tabla });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let responsableDefecto = 'Bodega';
    if (token) {
      try { const { payload } = await jwtVerify(token, JWT_SECRET); responsableDefecto = payload.nombre as string || 'Bodega'; } catch (e) {}
    }
    const body = await request.json();
    const { modo, pedidoId, responsableEmpaque, detallesUpdates, institucionId, codigoGuia, prendasIds } = body;
    if (modo === 'generar_guia') {
      const nuevaGuia = await prisma.guiaDespacho.create({
        data: {
          codigoGuia: codigoGuia,
          institucionId: institucionId, 
          responsable: responsableDefecto
        }
      });
      await prisma.detallePedido.updateMany({
        where: { id: { in: prendasIds } },
        data: {
          estadoOperacion: 'Despacho',
          estadoEmpaque: 'Despachado',
          estadoProduccion: 'Terminado',
          guiaDespachoId: nuevaGuia.id
        }
      });
      const pedidosInvolucrados = await prisma.detallePedido.findMany({
         where: { id: { in: prendasIds } }, select: { pedidoId: true }, distinct: ['pedidoId']
      });
      for (const ped of pedidosInvolucrados) {
         const p = await prisma.pedido.findUnique({ where: { id: ped.pedidoId }, include: { detalles: true } });
         const tot = p?.detalles.length || 0;
         const desp = p?.detalles.filter(d => d.guiaDespachoId !== null).length || 0;
         if (tot === desp && tot > 0) {
             await prisma.pedido.update({ where: { id: ped.pedidoId }, data: { estado: 'Despachado', fechaFinEmpaque: new Date() } });
         }
      }
      if (prendasIds.length > 0) {
         // Buscamos a quién le pertenece este pedido
         const detalleReferencia = await prisma.detallePedido.findFirst({ 
           where: { id: prendasIds[0] }, 
           include: { pedido: true } 
         });
         
         if (detalleReferencia?.pedido) {
            const codigoOP = `PED-${detalleReferencia.pedido.id.slice(0, 6).toUpperCase()}`;
            await prisma.notificacion.create({
              data: {
                titulo: '🚚 Guía de Despacho Generada',
                mensaje: `Bodega ha despachado prendas de tu pedido ${codigoOP}. Guía: ${codigoGuia}`,
                tipoModulo: 'PEDIDOS',
                urlDestino: `/pedidos?pedidoId=${codigoOP}`,
                usuarioDestinoId: detalleReferencia.pedido.usuarioId // Solo le avisa al dueño
              }
            });
         }
      }
      return NextResponse.json({ success: true, guia: nuevaGuia });
    }
    const promesasDetalles = detallesUpdates.map((d: any) => 
      prisma.detallePedido.update({
        where: { id: d.id },
        data: { 
          estadoEmpaque: d.estadoEmpaque,
          estadoOperacion: d.estadoEmpaque === 'Preparado' ? 'Listos para el despacho' : 'en empaque'
        }
      })
    );
    await Promise.all(promesasDetalles);
    const pedidoActualizado = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { detalles: true } });
    const totalDetalles = pedidoActualizado?.detalles.length || 0;
    const completados = pedidoActualizado?.detalles.filter(d => d.estadoEmpaque === 'Preparado' || d.guiaDespachoId !== null).length || 0;
    let nuevoEstado = pedidoActualizado?.estado;
    let fechaFin = pedidoActualizado?.fechaFinEmpaque;

    if (completados === totalDetalles && totalDetalles > 0) {
      nuevoEstado = 'Listos para el despacho';
    } else {
      nuevoEstado = 'En empaque';
      fechaFin = null;
    }

    const resultadoFinal = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: nuevoEstado, responsableEmpaque: responsableEmpaque || responsableDefecto, fechaFinEmpaque: fechaFin }
    });
    return NextResponse.json({ success: true, data: resultadoFinal });
  } catch (error) { return NextResponse.json({ error: 'Error interno' }, { status: 500 }); }
}