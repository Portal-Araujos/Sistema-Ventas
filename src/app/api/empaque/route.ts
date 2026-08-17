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

    // 🔥 BUSCAMOS PEDIDOS QUE TENGAN PRENDAS EN FASE DE EMPAQUE / BODEGA / DESPACHO 🔥
    const whereCondition: any = {
      estado: { not: 'Borrador' },
      detalles: {
        some: {
          estadoOperacion: {
            in: ['en empaque', 'En empaque', 'Listos para el despacho', 'Despacho']
          }
        }
      }
    };

    if (fechaInicio && fechaFin) {
      whereCondition.updatedAt = {
        gte: new Date(`${fechaInicio}T00:00:00-05:00`),
        lte: new Date(`${fechaFin}T23:59:59.999-05:00`)
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

      // Filtramos solo las prendas de este pedido que corresponden a empaque o fases posteriores
      const prendasEmpaque = ped.detalles.filter((d: any) => {
        const est = (d.estadoOperacion || '').toLowerCase();
        return est.includes('empaque') || est.includes('despacho') || est.includes('listos');
      });

      if (prendasEmpaque.length === 0) continue;

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
      
      const prendasEnContrato = prendasEmpaque.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      const prendasListasContrato = prendasEmpaque
        .filter((d: any) => d.estadoEmpaque === 'Preparado' || d.estadoOperacion === 'Listos para el despacho' || d.estadoOperacion === 'Despacho')
        .reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);

      grupo.pedidosAsociados.push({
        id: ped.id,
        numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente || 'Sin Cliente',
        estado: ped.estado,
        responsableEmpaque: ped.responsableEmpaque || 'Sin Asignar',
        fechaInicioEmpaque: ped.fechaInicioEmpaque,
        fechaFinEmpaque: ped.fechaFinEmpaque,
        totalPrendas: prendasEnContrato,
        prendasPreparadas: prendasListasContrato,
        avance: prendasEnContrato > 0 ? Math.round((prendasListasContrato / prendasEnContrato) * 100) : 0,
        detalles: prendasEmpaque
      });

      grupo.paquetesCantidad += 1;
      grupo.totalPrendas += prendasEnContrato;
      grupo.prendasPreparadas += prendasListasContrato;
    }

    const kpis = { pendientes: 0, enPreparacion: 0, completados: 0 };

    const tabla = Array.from(mapaGrupos.values()).map(g => {
      const avanceGlobal = g.totalPrendas > 0 ? Math.round((g.prendasPreparadas / g.totalPrendas) * 100) : 0;
      
      let estadoGlobal = 'Pendiente';
      if (avanceGlobal === 0) { 
        estadoGlobal = 'Pendiente'; 
        kpis.pendientes++; 
      } else if (avanceGlobal > 0 && avanceGlobal < 100) { 
        estadoGlobal = 'En Preparación'; 
        kpis.enPreparacion++; 
      } else if (avanceGlobal === 100) { 
        estadoGlobal = 'Completado'; 
        kpis.completados++; 
      }

      return { ...g, avanceGlobal, estadoGlobal };
    });

    return NextResponse.json({ currentUser, kpis, tabla });
  } catch (error) {
    console.error("Error en Empaque GET:", error);
    return NextResponse.json({ error: 'Error al consultar empaque' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let responsableDefecto = 'Bodega';
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        responsableDefecto = payload.nombre as string || 'Bodega';
      } catch (e) {}
    }

    const body = await request.json();
    const { pedidoId, responsableEmpaque, detallesUpdates } = body;

    if (!pedidoId || !detallesUpdates) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

    // 1. Actualizar el checklist de cada prenda individual
    const promesasDetalles = detallesUpdates.map((d: any) => 
      prisma.detallePedido.update({
        where: { id: d.id },
        data: { 
          estadoEmpaque: d.estadoEmpaque,
          // Si el checklist se marca como Preparado, actualizamos estadoOperacion a 'Listos para el despacho'
          estadoOperacion: d.estadoEmpaque === 'Preparado' ? 'Listos para el despacho' : 'en empaque'
        }
      })
    );
    await Promise.all(promesasDetalles);

    // 2. Verificar el contrato completo
    const pedidoActualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true }
    });

    const totalDetalles = pedidoActualizado?.detalles.length || 0;
    const completados = pedidoActualizado?.detalles.filter(d => d.estadoEmpaque === 'Preparado').length || 0;

    let nuevoEstado = pedidoActualizado?.estado;
    let fechaInicio = pedidoActualizado?.fechaInicioEmpaque || new Date();
    let fechaFin = pedidoActualizado?.fechaFinEmpaque;

    if (completados === totalDetalles && totalDetalles > 0) {
      nuevoEstado = 'Listos para el despacho';
      fechaFin = new Date(); 
    } else {
      nuevoEstado = 'En empaque';
      fechaFin = null;
    }

    const resultadoFinal = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: nuevoEstado,
        responsableEmpaque: responsableEmpaque || responsableDefecto,
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