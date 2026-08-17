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
    const currentUser = { id: payload.id, nombre: payload.nombre, rol: payload.rol };

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);

    const whereBase: any = {
      estadoOperacion: 'En produccion',
      pedido: { estado: { not: 'Borrador' } }
    };

    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio ? `${fechaInicio}T00:00:00-05:00` : '1970-01-01T00:00:00-05:00';
      const endStr = fechaFin ? `${fechaFin}T23:59:59.999-05:00` : '2099-12-31T23:59:59.999-05:00';
      whereBase.createdAt = { gte: new Date(startStr), lte: new Date(endStr) };
    }

    // 🔥 1. CONSULTAS BLINDADAS (Separadas para que no colapsen entre sí) 🔥
    let estadosCat: any[] = [];
    try {
      estadosCat = await prisma.estadoOperacion.findMany({ where: { activo: true } });
    } catch (e) { console.error("Error cargando estados:", e); }

    let usuariosBrutos: any[] = [];
    try {
      // Forzamos a traer a TODOS los usuarios sin importar si están activos o no
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
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (e) { console.error("Error cargando prendas:", e); }

    // 🔥 2. FILTRADO INTELIGENTE Y FLEXIBLE DE USUARIOS 🔥
    const usuariosOperarios = usuariosBrutos.map((u: any) => {
      // Extraemos el nombre del rol sea como sea que se llame en tu BD (nombre, name, descripcion)
      const nombreDelRol = u.rol?.nombre || u.rol?.name || u.rol?.descripcion || String(u.rolId || 'Desconocido');
      return {
        id: u.id,
        nombre: u.nombre || 'Sin Nombre',
        rol: nombreDelRol
      };
    }).filter((u: any) => !u.rol.toLowerCase().includes('vendedor')); // Quitamos a los vendedores

    // 3. PROCESAMIENTO DE PRENDAS PARA EL FRONTEND
    let kpis = { ordenesProceso: 0, prendasProduccion: 0, prendasDia: 0 };
    const mapaEscuelas = new Map();

    prendasEnTaller.forEach((det: any) => {
      const ped = det.pedido;
      const instId = ped.institucionId;
      const estTaller = det.estadoProduccion || 'Planificacion';
      const fUpdatedAt = new Date(det.updatedAt);

      kpis.prendasProduccion += det.cantidad;
      if ((estTaller.includes('Preparacion') || estTaller.includes('Terminad') || estTaller.includes('empaque')) && fUpdatedAt >= hoy && fUpdatedAt <= finHoy) {
        kpis.prendasDia += det.cantidad;
      }

      if (!mapaEscuelas.has(instId)) {
        mapaEscuelas.set(instId, {
          id: instId,
          institucionId: instId,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          codigoOP: `OP-${instId.slice(0, 6).toUpperCase()}`,
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaInicioTexto: new Date(ped.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
          fechaCompromisoTexto: det.fechaEstimadaConfeccion ? new Date(det.fechaEstimadaConfeccion).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'Sin Asignar',
          paquetesCantidad: 0,
          totalPrendas: 0,
          estadoActual: estTaller,
          estadosArray: new Set(),
          pedidosAsociados: new Map()
        });
        kpis.ordenesProceso += 1;
      }

      const escuela = mapaEscuelas.get(instId);
      escuela.totalPrendas += det.cantidad;
      escuela.estadosArray.add(estTaller);

      if (!escuela.pedidosAsociados.has(ped.id)) {
        escuela.pedidosAsociados.set(ped.id, {
          id: ped.id,
          numContrato: ped.numContrato || 'S/N',
          nombreCliente: ped.nombreCliente || 'Sin Cliente',
          detalles: []
        });
        escuela.paquetesCantidad += 1;
      }

      const contrato = escuela.pedidosAsociados.get(ped.id);
      contrato.detalles.push(det);
    });

    const tablaRes = Array.from(mapaEscuelas.values()).map(e => ({
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
    const body = await request.json();
    const { modo, id, institucionId, prendaIds, estado, operarioAsignado } = body;

    if (modo === 'masivo_empaque') {
      const prendasEscuela = await prisma.detallePedido.findMany({ 
        where: { pedido: { institucionId }, estadoOperacion: 'En produccion' } 
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
      if (operarioAsignado) updateData.operarioAsignado = operarioAsignado;

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