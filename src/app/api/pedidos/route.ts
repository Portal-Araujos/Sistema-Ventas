import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// ==========================================
// 🔥 FUNCIONES AUXILIARES (TRADUCTORES) 🔥
// ==========================================
const parseId = (val: any) => {
  if (!val) return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
};

const parseMoney = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? 0 : num;
};

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
      const vendedorInfo = await prisma.usuario.findUnique({
        where: { id: userId },
        include: { institucionesAsignadas: { select: { id: true } } }
      });
      const misEscuelas = vendedorInfo?.institucionesAsignadas.map((i: any) => i.id) || [];

      whereCondition.OR = [
        { usuarioId: userId },
        { institucionId: { in: misEscuelas } }
      ];
    }
    
    if (institucionIdParam) {
      if (whereCondition.OR) {
        whereCondition.AND = [{ institucionId: institucionIdParam }];
      } else {
        whereCondition.institucionId = institucionIdParam;
      }
    }

    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio ? `${fechaInicio}T00:00:00-05:00` : '1970-01-01T00:00:00-05:00';
      const endStr = fechaFin ? `${fechaFin}T23:59:59.999-05:00` : '2099-12-31T23:59:59.999-05:00';
      
      if (whereCondition.AND) {
         whereCondition.AND.push({ createdAt: { gte: new Date(startStr), lte: new Date(endStr) } });
      } else {
         whereCondition.createdAt = { gte: new Date(startStr), lte: new Date(endStr) };
      }
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
        id: true, numContrato: true, institucionId: true, vendedorId: true, 
        valorContrato: true, abono: true, meses: true, mesCobro: true,
        tipoCobroId: true, estadoClienteId: true, estadoContratoId: true,
        cuotaMensual: true
      },
      orderBy: { fechaVenta: 'desc' }
    });

    const mapaGrupos = new Map();
    const prioridadEstados = ['Pendiente en revision', 'En produccion', 'en empaque', 'Listos para el despacho', 'Despacho'];

    for (const ped of pedidos as any[]) {
      const instId = ped.institucionId;
      let contratoExtraido = ped.numContrato ? String(ped.numContrato).trim() : 'S/N';
      
      const ventaAsociada = ventasGuardadas.find(v => {
        const vNum = v.numContrato ? String(v.numContrato).trim() : 'S/N';
        return vNum === contratoExtraido && v.institucionId === instId;
      });

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

      let fechaValida = ped.fechaRequerida;
      if (fechaValida && new Date(fechaValida).getFullYear() < 2000) fechaValida = null;

      if (!mapaGrupos.has(instId)) {
        mapaGrupos.set(instId, {
          id: instId, codigoPedido: `PED-${instId.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || 'Sin Escuela',
          vendedorNombre: ped.usuario?.nombre || 'Sistema',
          fechaCreacion: ped.createdAt, fechaRequerida: fechaValida,
          contratosTotal: 0, paquetesCantidad: 0, totalPrendas: 0,
          estado: estadoRealPedido, updatedAt: ped.updatedAt, pedidosAsociados: []
        });
      } else {
         const grupo = mapaGrupos.get(instId);
         if (grupo.estado !== 'Borrador' && estadoRealPedido !== 'Borrador') {
            if (prioridadEstados.indexOf(estadoRealPedido) < prioridadEstados.indexOf(grupo.estado)) grupo.estado = estadoRealPedido;
         }
         if (fechaValida && (!grupo.fechaRequerida || new Date(fechaValida) > new Date(grupo.fechaRequerida))) {
             grupo.fechaRequerida = fechaValida;
         }
      }

      const grupo = mapaGrupos.get(instId);
      const unidadesEnEstePedido = (ped.detalles || []).reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);

      grupo.pedidosAsociados.push({
        id: ped.id, numContrato: contratoExtraido,
        nombreCliente: ped.nombreCliente || `Cliente Contrato #${contratoExtraido}`,
        tipoPedido: ped.tipoPedido || 'Pedido', observacion: ped.observacion || '',
        fechaRequerida: fechaValida, 
        detalles: ped.detalles || [],
        totalUnidadesContrato: unidadesEnEstePedido,
        estadoActualizadoOperaciones: estadoRealPedido,
        
        valorContrato: ventaAsociada?.valorContrato || 0,
        abono: ventaAsociada?.abono || 0,
        cuotaMensual: ventaAsociada?.cuotaMensual || 0,
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
      fechaRequeridaTexto: g.fechaRequerida ? new Date(g.fechaRequerida).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : 'No asignada',
      updatedAt: new Date(g.updatedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
    }));

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("🔥 ERROR EN GET PEDIDOS:", error);
    return NextResponse.json({ error: error.message || 'Error al consultar pedidos' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let userIdFallback = '';
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userIdFallback = payload.id as string;
    }

    const body = await request.json();
    const { modo, id, institucionId, detalles, numContrato, nombreCliente, fechaRequerida, valorContrato, abono, cuotaMensual, meses, mesCobro, tipoCobroId, estadoClienteId, estadoContratoId } = body;

    const fechaParseada = (fechaRequerida && fechaRequerida.length > 4) ? new Date(`${fechaRequerida}T12:00:00Z`) : null;

    if (modo === 'masivo') {
      await prisma.pedido.updateMany({
        where: { institucionId, estado: 'Borrador' },
        data: { estado: 'Pendiente en revisión', fechaRequerida: fechaParseada }
      });
      return NextResponse.json({ success: true });
    } else {
      
      const pedidoAntiguo = await prisma.pedido.findUnique({ where: { id } });
      const oldNumContrato = pedidoAntiguo?.numContrato ? String(pedidoAntiguo.numContrato).trim() : 'S/N';
      const numContratoLimpio = numContrato !== undefined ? String(numContrato).trim() : oldNumContrato;
      const idEscuelaReal = pedidoAntiguo ? pedidoAntiguo.institucionId : institucionId;

      // 🔥 MAGIA: BUSCADOR DEL DUEÑO DE LA ESCUELA 🔥
      // Buscamos quién es el usuario que tiene esta institución asignada
      let vendedorFinalId = pedidoAntiguo?.usuarioId || userIdFallback;
      const dueñoEscuela = await prisma.usuario.findFirst({
        where: { institucionesAsignadas: { some: { id: idEscuelaReal } } },
        select: { id: true }
      });
      
      if (dueñoEscuela) {
        vendedorFinalId = dueñoEscuela.id;
      }

      if (detalles) {
        await prisma.detallePedido.deleteMany({ where: { pedidoId: id } });
        const updateData: any = {};
        if (numContrato !== undefined) updateData.numContrato = numContratoLimpio || null;
        if (nombreCliente !== undefined) updateData.nombreCliente = nombreCliente;
        if (fechaRequerida !== undefined) updateData.fechaRequerida = fechaParseada;
        
        // Asignamos la propiedad del pedido al dueño de la escuela
        updateData.usuarioId = vendedorFinalId; 

        if (Array.isArray(detalles) && detalles.length > 0) {
          updateData.detalles = {
            create: detalles.map((d: any) => ({
              skuCodigo: d.skuCodigo || 'S/N', tipoRopa: d.tipoRopa || 'Prenda', color: d.color || '',
              genero: d.genero || 'UNISEX', talla: d.talla || 'M', cantidad: parseInt(d.cantidad) || 1, bordado: d.bordado || null, observacion: d.observacion || null
            }))
          };
        }
        await prisma.pedido.update({ where: { id }, data: updateData });
      }

      // 🔥 SINCRONIZACIÓN FINANCIERA 🔥
      if (pedidoAntiguo) {
        const ventaExistente = await prisma.venta.findFirst({
          where: { institucionId: idEscuelaReal, numContrato: oldNumContrato }
        });

        const ventaData: any = {};
        if (numContrato !== undefined) ventaData.numContrato = numContratoLimpio;
        if (valorContrato !== undefined) ventaData.valorContrato = parseMoney(valorContrato);
        if (abono !== undefined) ventaData.abono = parseMoney(abono);
        if (cuotaMensual !== undefined) ventaData.cuotaMensual = parseMoney(cuotaMensual);
        if (meses !== undefined) ventaData.meses = parseInt(meses) || 12;
        if (mesCobro !== undefined) ventaData.mesCobro = String(mesCobro);
        if (tipoCobroId) ventaData.tipoCobroId = parseId(tipoCobroId);
        if (estadoClienteId) ventaData.estadoClienteId = parseId(estadoClienteId);
        if (estadoContratoId) ventaData.estadoContratoId = parseId(estadoContratoId);
        
        // Asignamos el dinero al dueño de la escuela
        ventaData.vendedorId = vendedorFinalId; 

        if (ventaExistente) {
          await prisma.venta.update({ where: { id: ventaExistente.id }, data: ventaData });
        } else {
          await prisma.venta.create({
            data: {
              institucionId: idEscuelaReal,
              vendedorId: vendedorFinalId,
              fechaVenta: new Date(),
              numContrato: numContratoLimpio,
              valorContrato: parseMoney(valorContrato),
              abono: parseMoney(abono),
              cuotaMensual: parseMoney(cuotaMensual), 
              meses: parseInt(meses) || 12,
              mesCobro: mesCobro ? String(mesCobro) : 'Enero',
              tipoCobroId: parseId(tipoCobroId),
              estadoClienteId: parseId(estadoClienteId),
              estadoContratoId: parseId(estadoContratoId),
            }
          });
        }
      }

      return NextResponse.json({ success: true });
    }
  } catch (error: any) { 
    console.error("🔥 ERROR EN PUT PEDIDOS:", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const { payload } = await jwtVerify(token!, JWT_SECRET);
    const userId = payload.id as string;
    
    const body = await request.json();
    const fechaParseada = (body.fechaRequerida && body.fechaRequerida.length > 4) ? new Date(`${body.fechaRequerida}T12:00:00Z`) : null;
    const numContratoLimpio = body.numContrato ? String(body.numContrato).trim() : 'S/N';

    // 🔥 MAGIA: BUSCADOR DEL DUEÑO DE LA ESCUELA 🔥
    let vendedorFinalId = userId;
    const dueñoEscuela = await prisma.usuario.findFirst({
      where: { institucionesAsignadas: { some: { id: body.institucionId } } },
      select: { id: true }
    });
    
    if (dueñoEscuela) {
      vendedorFinalId = dueñoEscuela.id;
    }

    const nuevoPedido = await prisma.pedido.create({
      data: {
        institucionId: body.institucionId, 
        usuarioId: vendedorFinalId, // Asignamos el creador correcto
        numContrato: body.numContrato || null,
        nombreCliente: body.nombreCliente || `Cliente`,
        fechaRequerida: fechaParseada,
        detalles: {
          create: (body.detalles || []).map((d: any) => ({
            skuCodigo: d.skuCodigo || 'S/N', tipoRopa: d.tipoRopa || 'Prenda', color: d.color || '',
            genero: d.genero || 'UNISEX', talla: d.talla || 'M', cantidad: parseInt(d.cantidad) || 1, bordado: d.bordado || null, observacion: d.observacion || null
          }))
        }
      }
    });

    await prisma.venta.create({
      data: {
        institucionId: body.institucionId,
        vendedorId: vendedorFinalId, // Asignamos el dinero al dueño correcto
        numContrato: numContratoLimpio,
        fechaVenta: new Date(), 
        valorContrato: parseMoney(body.valorContrato),
        abono: parseMoney(body.abono),
        cuotaMensual: parseMoney(body.cuotaMensual),
        meses: parseInt(body.meses) || 12,
        mesCobro: body.mesCobro ? String(body.mesCobro) : 'Enero',
        tipoCobroId: parseId(body.tipoCobroId),
        estadoClienteId: parseId(body.estadoClienteId),
        estadoContratoId: parseId(body.estadoContratoId),
      }
    });

    return NextResponse.json(nuevoPedido);
  } catch (error: any) { 
    console.error("🔥 ERROR EN POST PEDIDOS:", error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 }); 
  }
}