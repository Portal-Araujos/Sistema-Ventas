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
    const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);
    const whereBase: any = {
      estadoOperacion: { contains: 'producci', mode: 'insensitive' },
      pedido: { estado: { not: 'Borrador' } }
    };
    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio ? `${fechaInicio}T00:00:00-05:00` : '1970-01-01T00:00:00-05:00';
      const endStr = fechaFin ? `${fechaFin}T23:59:59.999-05:00` : '2099-12-31T23:59:59.999-05:00';
      whereBase.createdAt = { gte: new Date(startStr), lte: new Date(endStr) };
    }
    let estadosCat: any[] = [];
    try {
      estadosCat = await prisma.estadoProduccion.findMany({ where: { activo: true } });
    } catch (e) { console.error("Error cargando estados:", e); }

    let usuariosBrutos: any[] = [];
    try {
      usuariosBrutos = await prisma.usuario.findMany({ include: { rol: true } });
    } catch (e) { console.error("Error cargando usuarios:", e); }

    let prendasEnTaller: any[] = [];
    try {
      prendasEnTaller = await prisma.detallePedido.findMany({
        where: whereBase,
        include: {
          pedido: {
            include: {
              institucion: { select: { id: true, nombre: true } },
              usuario: { select: { id: true, nombre: true } }
            }
          },
          operarioAsignado: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (e) { console.error("Error cargando prendas:", e); }

    const usuariosOperarios = usuariosBrutos.map((u: any) => {
      const nombreDelRol = u.rol?.nombre || u.rol?.name || String(u.rolId || 'Desconocido');
      return { id: u.id, nombre: u.nombre || 'Sin Nombre', rol: nombreDelRol };
    }).filter((u: any) => !u.rol.toLowerCase().includes('vendedor'));

    let kpis = { ordenesProceso: 0, prendasProduccion: 0, prendasDia: 0, vencidos: 0 };
    const mapaPedidosTaller = new Map();

    prendasEnTaller.forEach((det: any) => {
      const ped = det.pedido;
      const instId = ped.institucionId;
      const fr = ped.fechaRequerida ? new Date(ped.fechaRequerida).toISOString().split('T')[0] : 'sin-fecha';
      const grupoKey = `${instId}_${fr}`;
      const estTaller = det.estadoProduccion || 'Planificacion';
      const fUpdatedAt = new Date(det.updatedAt);
      const fConfeccion = det.fechaEstimadaConfeccion ? new Date(det.fechaEstimadaConfeccion) : null;
      const esVencido = fConfeccion !== null && fConfeccion < hoy && !estTaller.toLowerCase().includes('terminad');

      kpis.prendasProduccion += det.cantidad;
      if (esVencido) kpis.vencidos += det.cantidad;
      if ((estTaller.includes('Preparacion') || estTaller.includes('Terminad') || estTaller.includes('empaque')) && fUpdatedAt >= hoy && fUpdatedAt <= finHoy) {
        kpis.prendasDia += det.cantidad;
      }
      if (!mapaPedidosTaller.has(grupoKey)) {
        mapaPedidosTaller.set(grupoKey, {
          id: grupoKey,
          institucionId: instId,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          codigoOP: `PED-${ped.id.slice(0, 6).toUpperCase()}`, 
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaInicioTexto: new Date(ped.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
          fechaCompromisoTexto: fConfeccion ? fConfeccion.toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'Sin Asignar',
          fechaRequeridaTexto: ped.fechaRequerida ? new Date(ped.fechaRequerida).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : null,
          esAtrasado: esVencido,
          paquetesCantidad: 0,
          totalPrendas: 0,
          estadoActual: estTaller,
          estadosArray: new Set(),
          pedidosAsociados: new Map()
        });
        kpis.ordenesProceso += 1;
      }

      const escuela = mapaPedidosTaller.get(grupoKey);
      escuela.totalPrendas += det.cantidad;
      escuela.estadosArray.add(estTaller);
      if (esVencido) escuela.esAtrasado = true;

      if (!escuela.pedidosAsociados.has(ped.id)) {
        escuela.pedidosAsociados.set(ped.id, {
          id: ped.id,
          numContrato: ped.numContrato || 'S/N',
          nombreCliente: ped.nombreCliente || 'Sin Cliente',
          fechaRequerida: ped.fechaRequerida,
          detalles: []
        });
        escuela.paquetesCantidad += 1;
      }

      const contrato = escuela.pedidosAsociados.get(ped.id);
      contrato.detalles.push(det);
    });

    const tablaRes = Array.from(mapaPedidosTaller.values()).map(e => ({
      ...e,
      estadosArray: Array.from(e.estadosArray),
      pedidosAsociados: Array.from(e.pedidosAsociados.values())
    }));

    return NextResponse.json({
      currentUser,
      kpis,
      catalogos: { estados: estadosCat, operarios: usuariosOperarios },
      tabla: tablaRes
    });

  } catch (error) {
    console.error("Error Produccion GET:", error);
    return NextResponse.json({ error: 'Error al consultar producción' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let userId = '';
    let userRol = '';

    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userId = payload.id as string;
      userRol = (payload.rol as string).toLowerCase();
    }
    const body = await request.json();
    const { modo, id, institucionId, prendaIds, estado, operarioAsignadoId } = body;
    if (modo === 'masivo_empaque') {
      const realInstId = institucionId.split('_')[0];
      const frStr = institucionId.includes('_') ? institucionId.split('_')[1] : null;
      const whereClause: any = {
        pedido: { institucionId: realInstId },
        estadoOperacion: { contains: 'producci', mode: 'insensitive' }
      };

      if (frStr && frStr !== 'sin-fecha') {
        const startOfDay = new Date(`${frStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${frStr}T23:59:59.999Z`);
        whereClause.pedido.fechaRequerida = { gte: startOfDay, lte: endOfDay };
      } else if (frStr === 'sin-fecha') {
        whereClause.pedido.fechaRequerida = null;
      }
      const prendasEscuela = await prisma.detallePedido.findMany({ 
        where: whereClause 
      });
      await prisma.detallePedido.updateMany({
        where: { id: { in: prendasEscuela.map((p: any) => p.id) } },
        data: { estadoOperacion: 'en empaque', estadoProduccion: 'Terminado' }
      });
      return NextResponse.json({ success: true });
    }
    if (modo === 'individual_empaque') {
      await prisma.detallePedido.update({
        where: { id },
        data: { estadoOperacion: 'en empaque', estadoProduccion: 'Terminado' }
      });
      return NextResponse.json({ success: true });
    }
    if (prendaIds && prendaIds.length > 0) {
      const updateData: any = {};
      if (estado) updateData.estadoProduccion = estado;

      const esAdmin = userRol.includes('admin');
      
      if (esAdmin) {
        if (operarioAsignadoId) {
          updateData.operarioAsignadoId = operarioAsignadoId;
        }
      } else {
        updateData.operarioAsignadoId = userId;
      }

      await prisma.detallePedido.updateMany({
        where: { id: { in: prendaIds } },
        data: updateData
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Comando no reconocido.' }, { status: 400 });
  } catch (error) {
    console.error("Error Produccion PUT:", error);
    return NextResponse.json({ error: 'Error al actualizar producción' }, { status: 500 });
  }
}