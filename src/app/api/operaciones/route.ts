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

    const { searchParams } = new URL(request.url);
    const estadoFiltro = searchParams.get('estado') || 'TODOS';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);

    const whereBase: any = {
      pedido: { estado: { not: 'Borrador' } }
    };

    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio ? `${fechaInicio}T00:00:00-05:00` : '1970-01-01T00:00:00-05:00';
      const endStr = fechaFin ? `${fechaFin}T23:59:59.999-05:00` : '2099-12-31T23:59:59.999-05:00';
      whereBase.createdAt = { gte: new Date(startStr), lte: new Date(endStr) };
    }

    const [estadosCatalogo, todosLosDetalles] = await Promise.all([
      prisma.estadoOperacion.findMany({ where: { activo: true } }),
      prisma.detallePedido.findMany({
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
      })
    ]);

    let kpis = {
      enRevision: 0, enProduccion: 0, enEmpaque: 0,
      listosDespacho: 0, despachosHoy: 0, totalPendientes: 0, atrasados: 0
    };

    const mapaEscuelas = new Map();

    todosLosDetalles.forEach((det: any) => {
      const ped = det.pedido;
      const instId = ped.institucionId;
      const estPrenda = det.estadoOperacion || 'Pendiente en revision';
      const fConfeccion = det.fechaEstimadaConfeccion ? new Date(det.fechaEstimadaConfeccion) : null;
      const fUpdatedAt = new Date(det.updatedAt);
      
      const esAtrasado = fConfeccion !== null && fConfeccion < hoy && estPrenda !== 'Despacho';

      if (estPrenda === 'Pendiente en revision') kpis.enRevision += det.cantidad;
      if (estPrenda === 'En produccion') kpis.enProduccion += det.cantidad;
      if (estPrenda === 'en empaque') kpis.enEmpaque += det.cantidad;
      if (estPrenda === 'Listos para el despacho') kpis.listosDespacho += det.cantidad;
      
      if (estPrenda !== 'Despacho') {
        kpis.totalPendientes += det.cantidad;
        if (esAtrasado) kpis.atrasados += det.cantidad;
      }

      if (estPrenda === 'Despacho' && fUpdatedAt >= hoy && fUpdatedAt <= finHoy) {
        kpis.despachosHoy += det.cantidad;
      }

      let cumpleFiltro = true;
      if (estadoFiltro !== 'TODOS') {
        if (estadoFiltro === 'PENDIENTES') cumpleFiltro = estPrenda !== 'Despacho';
        else if (estadoFiltro === 'ATRASADOS') cumpleFiltro = esAtrasado;
        else if (estadoFiltro === 'HOY') cumpleFiltro = (estPrenda === 'Despacho' && fUpdatedAt >= hoy && fUpdatedAt <= finHoy);
        else cumpleFiltro = estPrenda === estadoFiltro;
      }

      if (!cumpleFiltro) return;

      if (!mapaEscuelas.has(instId)) {
        mapaEscuelas.set(instId, {
          id: instId,
          institucionId: instId,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          codigoPedido: `PED-${instId.slice(0, 6).toUpperCase()}`,
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaIngresoTexto: new Date(ped.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
          fechaRequeridaTexto: ped.fechaRequerida ? new Date(ped.fechaRequerida).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'No asignada',
          esAtrasado: false,
          paquetesCantidad: 0,
          totalPrendas: 0,
          estadosUnicosEscuela: new Set(), // Recolector de Estados Globales
          fechaEstimadaConfeccionGlobal: fConfeccion,
          pedidosAsociados: new Map()
        });
      }

      const escuela = mapaEscuelas.get(instId);
      if (esAtrasado) escuela.esAtrasado = true;
      if (fConfeccion) {
        if (!escuela.fechaEstimadaConfeccionGlobal || fConfeccion < escuela.fechaEstimadaConfeccionGlobal) {
          escuela.fechaEstimadaConfeccionGlobal = fConfeccion;
        }
      }
      
      escuela.estadosUnicosEscuela.add(estPrenda);

      if (!escuela.pedidosAsociados.has(ped.id)) {
        escuela.pedidosAsociados.set(ped.id, {
          id: ped.id,
          numContrato: ped.numContrato || 'S/N',
          nombreCliente: ped.nombreCliente || 'Sin Cliente',
          estado: ped.estado,
          fechaRequerida: ped.fechaRequerida,
          estadosUnicosContrato: new Set(), // Recolector de Estados por Contrato
          detalles: []
        });
        escuela.paquetesCantidad += 1;
      }

      const contrato = escuela.pedidosAsociados.get(ped.id);
      contrato.estadosUnicosContrato.add(estPrenda);
      
      contrato.detalles.push({
        ...det,
        estadoOperacion: estPrenda,
        // 🔥 LECTURA EN UTC 🔥
        fechaEstimadaConfeccionTexto: fConfeccion ? fConfeccion.toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'Sin Asignar'
      });
    });

    const tablaRes = Array.from(mapaEscuelas.values()).map(e => ({
      ...e,
      // 🔥 LÓGICA: Si hay más de un estado, se llama "Varios Estados" 🔥
      estadoActual: e.estadosUnicosEscuela.size > 1 ? 'Varios Estados' : Array.from(e.estadosUnicosEscuela)[0],
      fechaEstimadaConfeccionTexto: e.fechaEstimadaConfeccionGlobal 
         ? e.fechaEstimadaConfeccionGlobal.toLocaleDateString('es-EC', { timeZone: 'UTC' }) 
         : 'Sin Asignar',
      pedidosAsociados: Array.from(e.pedidosAsociados.values()).map((c: any) => ({
        ...c,
        estadoGlobalContrato: c.estadosUnicosContrato.size > 1 ? 'Varios Estados' : Array.from(c.estadosUnicosContrato)[0]
      }))
    }));

    return NextResponse.json({
      kpis,
      catalogos: { estados: estadosCatalogo },
      tabla: tablaRes
    });

  } catch (error) {
    console.error("Error Operaciones GET:", error);
    return NextResponse.json({ error: 'Error al consultar operaciones' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { modo } = body;

    // 🔥 NUEVO MÓDULO: CEREBRO DE ASIGNACIÓN INTELIGENTE DE STOCK 🔥
    if (modo === 'asignacion_stock') {
      const { institucionId, stockAsignado, fechaEstimadaConfeccion } = body;

      // 1. Sanitizar y configurar la fecha en formato UTC (Si se envió)
      let fechaParseada = null;
      if (fechaEstimadaConfeccion) {
        const fechaLimpia = fechaEstimadaConfeccion.split('T')[0];
        fechaParseada = new Date(`${fechaLimpia}T12:00:00Z`);
      }

      // 2. Buscamos TODAS las prendas de la escuela que están "Pendientes en revisión"
      const prendasPendientes = await prisma.detallePedido.findMany({
        where: { pedido: { institucionId }, estadoOperacion: 'Pendiente en revision' },
        orderBy: { pedidoId: 'asc' }
      });

      const personalizadas: any[] = [];
      const genericasPorContrato = new Map();

      for (const p of prendasPendientes) {
        const esPersonalizado = (p.bordado && p.bordado.trim() !== '') || (p.observacion && p.observacion.trim() !== '');
        if (esPersonalizado) {
          personalizadas.push(p);
        } else {
          if (!genericasPorContrato.has(p.pedidoId)) {
            genericasPorContrato.set(p.pedidoId, { pedidoId: p.pedidoId, totalPrendas: 0, items: [] });
          }
          const grupo = genericasPorContrato.get(p.pedidoId);
          grupo.totalPrendas += p.cantidad;
          grupo.items.push(p);
        }
      }

      // 🎯 OBJETO DE ACTUALIZACIÓN PARA PRODUCCIÓN (Incluye la nueva fecha)
      const dataProduccion: any = { estadoOperacion: 'En produccion', estadoProduccion: 'Planificacion' };
      if (fechaParseada) dataProduccion.fechaEstimadaConfeccion = fechaParseada;

      // 3. ENVIAR PERSONALIZADAS A PRODUCCIÓN DIRECTO
      for (const p of personalizadas) {
        await prisma.detallePedido.update({
          where: { id: p.id },
          data: dataProduccion
        });
      }

      // 4. ORDENAR POR PRIORIDAD: Contratos con menos prendas van primero
      const contratosOrdenados = Array.from(genericasPorContrato.values()).sort((a, b) => a.totalPrendas - b.totalPrendas);

      // 5. ASIGNAR STOCK O DIVIDIR PRENDAS
      for (const contrato of contratosOrdenados) {
        for (const prenda of contrato.items) {
          const key = `${prenda.skuCodigo || 'S/N'}|${prenda.tipoRopa || 'Prenda'}|${prenda.color || '-'}|${prenda.talla || '-'}`;
          let stockDisponible = stockAsignado[key] ? parseInt(stockAsignado[key]) : 0;

          if (stockDisponible >= prenda.cantidad) {
            // ✅ Hay stock: A Despacho
            await prisma.detallePedido.update({
              where: { id: prenda.id },
              data: { estadoOperacion: 'Despacho', estadoProduccion: 'Terminado' }
            });
            stockAsignado[key] -= prenda.cantidad;

          } else if (stockDisponible > 0 && stockDisponible < prenda.cantidad) {
            // ✂️ MITOSIS: Partimos el requerimiento
            const faltante = prenda.cantidad - stockDisponible;
            
            // A) Actualizamos la prenda actual con lo que SÍ HAY en stock (A Despacho)
            await prisma.detallePedido.update({
              where: { id: prenda.id },
              data: { cantidad: stockDisponible, estadoOperacion: 'Despacho', estadoProduccion: 'Terminado' }
            });

            // B) Creamos un registro gemelo con lo que FALTA (A Producción + Fecha)
            const dataCreate: any = {
              pedidoId: prenda.pedidoId,
              skuCodigo: prenda.skuCodigo,
              tipoRopa: prenda.tipoRopa,
              color: prenda.color,
              genero: prenda.genero,
              talla: prenda.talla,
              cantidad: faltante,
              bordado: prenda.bordado,
              observacion: prenda.observacion,
              operarioAsignadoId: prenda.operarioAsignadoId,
              estadoOperacion: 'En produccion',
              estadoProduccion: 'Planificacion'
            };
            if (fechaParseada) dataCreate.fechaEstimadaConfeccion = fechaParseada;

            await prisma.detallePedido.create({ data: dataCreate });
            stockAsignado[key] = 0;

          } else {
            // ❌ No hay stock: Va a Producción (Con Fecha)
            await prisma.detallePedido.update({
              where: { id: prenda.id },
              data: dataProduccion
            });
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Balance procesado exitosamente.' });
    }

    // =========================================================
    // LÓGICA TRADICIONAL (Para el modal individual)
    // =========================================================
    const { prendaIds, nuevoEstado, fechaEstimadaConfeccion, observacionOperaciones } = body;

    if (!Array.isArray(prendaIds) || prendaIds.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos una prenda.' }, { status: 400 });
    }

    const updateData: any = {};
    if (nuevoEstado) updateData.estadoOperacion = nuevoEstado;
    
    if (fechaEstimadaConfeccion) {
      const fechaLimpia = fechaEstimadaConfeccion.split('T')[0];
      updateData.fechaEstimadaConfeccion = new Date(`${fechaLimpia}T12:00:00Z`);
    }
    if (observacionOperaciones !== undefined) updateData.observacionOperaciones = observacionOperaciones;

    await prisma.detallePedido.updateMany({
      where: { id: { in: prendaIds } },
      data: updateData
    });

    return NextResponse.json({ success: true, message: 'Estado actualizado correctamente.' });
  } catch (error) {
    console.error("Error Operaciones PUT:", error);
    return NextResponse.json({ error: 'Error al actualizar operaciones' }, { status: 500 });
  }
}