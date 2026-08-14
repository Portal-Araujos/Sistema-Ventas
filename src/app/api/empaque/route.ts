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

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    // Traemos todo lo que ya salió de producción hacia empaque o más allá
    const whereCondition: any = { 
      estado: { in: ['En empaque', 'Listos para el despacho', 'Despachado'] } 
    };

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

    const mapaGrupos = new Map();

    for (const ped of pedidos) {
      const instId = ped.institucionId;
      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : 'S/N';

      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId,
          codigoOP: `OP-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Vendedor',
          paquetesCantidad: 0,
          totalPrendas: 0,
          prendasPreparadas: 0,
          pedidosAsociados: []
        });
      }

      const grupo = mapaGrupos.get(instId);
      
      const prendasEnContrato = ped.detalles.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      const prendasLitasContrato = ped.detalles.filter(d => d.estadoEmpaque === 'Preparado').reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);

      grupo.pedidosAsociados.push({
        id: ped.id,
        numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente,
        estado: ped.estado,
        responsableEmpaque: ped.responsableEmpaque || 'Sin Asignar',
        fechaInicioEmpaque: ped.fechaInicioEmpaque,
        fechaFinEmpaque: ped.fechaFinEmpaque,
        totalPrendas: prendasEnContrato,
        prendasPreparadas: prendasLitasContrato,
        avance: prendasEnContrato > 0 ? Math.round((prendasLitasContrato / prendasEnContrato) * 100) : 0,
        detalles: ped.detalles || []
      });

      grupo.paquetesCantidad += 1;
      grupo.totalPrendas += prendasEnContrato;
      grupo.prendasPreparadas += prendasLitasContrato;
    }

    const kpis = { pendientes: 0, enPreparacion: 0, completados: 0 };

    const tabla = Array.from(mapaGrupos.values()).map(g => {
      const avanceGlobal = g.totalPrendas > 0 ? Math.round((g.prendasPreparadas / g.totalPrendas) * 100) : 0;
      
      let estadoGlobal = 'Pendiente';
      if (avanceGlobal === 0) { estadoGlobal = 'Pendiente'; kpis.pendientes++; }
      else if (avanceGlobal > 0 && avanceGlobal < 100) { estadoGlobal = 'En Preparación'; kpis.enPreparacion++; }
      else if (avanceGlobal === 100) { estadoGlobal = 'Completado'; kpis.completados++; }

      return { ...g, avanceGlobal, estadoGlobal };
    });

    return NextResponse.json({ kpis, tabla });
  } catch (error) {
    console.error("Error en Empaque:", error);
    return NextResponse.json({ error: 'Error al consultar empaque' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { pedidoId, responsableEmpaque, detallesUpdates } = body;

    if (!pedidoId || !detallesUpdates) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

    // 1. Actualizar el checklist de cada prenda individual
    const promesasDetalles = detallesUpdates.map((d: any) => 
      prisma.detallePedido.update({
        where: { id: d.id },
        data: { estadoEmpaque: d.estadoEmpaque }
      })
    );
    await Promise.all(promesasDetalles);

    // 2. Verificar cómo quedó el contrato entero
    const pedidoActualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true }
    });

    const totalDetalles = pedidoActualizado?.detalles.length || 0;
    const completados = pedidoActualizado?.detalles.filter(d => d.estadoEmpaque === 'Preparado').length || 0;

    let nuevoEstado = pedidoActualizado?.estado;
    let fechaInicio = pedidoActualizado?.fechaInicioEmpaque || new Date();
    let fechaFin = pedidoActualizado?.fechaFinEmpaque;

    // LÓGICA AUTOMÁTICA DE ESTADOS
    if (completados === totalDetalles && totalDetalles > 0) {
      nuevoEstado = 'Listos para el despacho';
      fechaFin = new Date(); // Marcamos a qué hora terminó de empacar
    } else {
      nuevoEstado = 'En empaque';
      fechaFin = null; // Si retrocede algo, borramos la fecha fin
    }

    const resultadoFinal = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: nuevoEstado,
        responsableEmpaque: responsableEmpaque || pedidoActualizado?.responsableEmpaque,
        fechaInicioEmpaque: fechaInicio,
        fechaFinEmpaque: fechaFin
      }
    });

    return NextResponse.json({ success: true, data: resultadoFinal });
  } catch (error) {
    console.error("Error actualizando empaque:", error);
    return NextResponse.json({ error: 'Error interno al actualizar empaque' }, { status: 500 });
  }
}