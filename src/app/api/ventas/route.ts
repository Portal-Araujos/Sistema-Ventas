import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

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
    const cantonId = searchParams.get('cantonId');
    const institucionId = searchParams.get('institucionId');
    const tipoCobroId = searchParams.get('tipoCobroId');
    const estadoContratoId = searchParams.get('estadoContratoId');
    const estadoClienteId = searchParams.get('estadoClienteId');
    const mesCobro = searchParams.get('mesCobro');
    const where: any = {};
    
    if (userRol === 'vendedor') {
      where.vendedorId = userId;
    }

    if (institucionId) {
      where.institucionId = institucionId;
    } else if (cantonId) {
      where.institucion = {
        parroquia: { cantonId: parseInt(cantonId) }
      };
    }
    if (tipoCobroId) where.tipoCobroId = parseInt(tipoCobroId);
    if (estadoContratoId) where.estadoContratoId = parseInt(estadoContratoId);
    if (estadoClienteId) where.estadoClienteId = parseInt(estadoClienteId);
    if (mesCobro) where.mesCobro = mesCobro;
    
    const ventas = await prisma.venta.findMany({
      where,
      include: {
        institucion: {
          include: {
            parroquia: { include: { canton: { include: { provincia: true } } } }
          }
        },
        vendedor: { select: { id: true, nombre: true, email: true } },
        estadoCliente: true,
        estadoContrato: true,
        tipoCobro: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const numContratos = ventas.map(v => v.numContrato).filter(Boolean);
    const instIds = ventas.map(v => v.institucionId).filter(Boolean);
    
    let pedidosAsociados: any[] = [];
    if (numContratos.length > 0) {
      pedidosAsociados = await prisma.pedido.findMany({
        where: { numContrato: { in: numContratos }, institucionId: { in: instIds } },
        select: { numContrato: true, institucionId: true, nombreCliente: true, observacion: true }
      });
    }

    const dataFormateada = ventas.map(v => {
      const ped = pedidosAsociados.find(p => p.numContrato === v.numContrato && p.institucionId === v.institucionId);
      return {
        id: v.id,
        fechaVenta: new Date(v.fechaVenta).toLocaleDateString('es-EC'),
        institucionId: v.institucionId?.toString(),
        institucionNombre: v.institucion.nombre,
        cantonId: v.institucion.parroquia?.canton?.id?.toString() || '',
        cantonNombre: v.institucion.parroquia?.canton?.nombre || '',
        provinciaNombre: v.institucion.parroquia?.canton?.provincia?.nombre || '',
        vendedorId: v.vendedor.id, 
        vendedorNombre: v.vendedor.nombre,
        numContrato: v.numContrato,
        valorContrato: v.valorContrato,
        meses: v.meses,
        mesCobro: v.mesCobro,
        cuotaMensual: v.cuotaMensual,
        nombreCliente: ped?.nombreCliente || '',
        observacion: ped?.observacion || '',
        abono: v.abono,
        tipoClienteId: v.tipoClienteId?.toString(),
        tieneCedula: v.tieneCedula,
        numeroCedula: v.numeroCedula || '',
        estadoClienteId: v.estadoClienteId?.toString(),
        estadoClienteNombre: v.estadoCliente?.nombre || 'Pendiente',
        estadoContratoId: v.estadoContratoId?.toString(),
        estadoContratoNombre: v.estadoContrato?.nombre || 'Pendiente',
        tipoCobroId: v.tipoCobroId?.toString(),
        tipoCobroNombre: v.tipoCobro?.nombre || 'N/A',
        observacionesFact: v.observacionesFact || 'Sin observaciones',
        verificacionFact: v.verificacionFact || 'Sin validar',
        estadoTicket: v.estadoTicket
      };
    });

    return NextResponse.json(dataFormateada);
  } catch (error) {
    console.error("Error fetching ventas:", error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const {
      institucionId, numContrato, valorContrato, meses, mesCobro, cuotaMensual,
      estadoClienteId, estadoContratoId, tipoCobroId, abono, tipoClienteId, tieneCedula, nombreCliente, observacion,numeroCedula
    } = body;

    if (!institucionId || !numContrato || !valorContrato || !meses || !mesCobro) {
      return NextResponse.json({ error: 'Por favor completa todos los campos requeridos.' }, { status: 400 });
    }
    
    const valor = parseFloat(valorContrato) || 0;
    const abonoVal = parseFloat(abono) || 0;
    const numMeses = parseInt(meses) || 1;
    const cuota = parseFloat(cuotaMensual) || ((valor - abonoVal) / numMeses);
    
    const nuevaVenta = await prisma.venta.create({
      data: {
        institucionId,
        vendedorId: userId,
        numContrato: String(numContrato).trim(),
        valorContrato: valor,
        abono: abonoVal,
        meses: numMeses,
        mesCobro,
        cuotaMensual: parseFloat(cuota.toFixed(2)),
        estadoClienteId: estadoClienteId ? parseInt(estadoClienteId) : null,
        estadoContratoId: estadoContratoId ? parseInt(estadoContratoId) : null,
        tipoCobroId: tipoCobroId ? parseInt(tipoCobroId) : null,
        tipoClienteId: tipoClienteId ? parseInt(tipoClienteId) : null,
        tieneCedula: Boolean(tieneCedula),
        numeroCedula: numeroCedula ? String(numeroCedula).trim() : null,
        estadoTicket: 'Pendiente Facturación'
      }
    });
    await prisma.pedido.updateMany({
      where: { institucionId, numContrato: String(numContrato).trim() },
      data: { nombreCliente: nombreCliente || '', observacion: observacion || '' }
    });

    return NextResponse.json(nuevaVenta, { status: 201 });
  } catch (error) {
    console.error("Error creando venta:", error);
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const { 
      id, observacionesFact, verificacionFact,
      institucionId, numContrato, valorContrato, meses, mesCobro, cuotaMensual,
      estadoClienteId, estadoContratoId, tipoCobroId, abono, tipoClienteId, tieneCedula, nombreCliente, observacion, numeroCedula
    } = body;

    if (!id) return NextResponse.json({ error: 'ID de venta requerido' }, { status: 400 });
    const ventaDb = await prisma.venta.findUnique({ where: { id } });
    if (!ventaDb) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    
    const updateData: any = {};
    let nuevoEstadoTicket = ventaDb.estadoTicket;
    
    if (numContrato !== undefined) {
      updateData.institucionId = institucionId;
      updateData.numContrato = String(numContrato).trim();
      updateData.valorContrato = parseFloat(valorContrato);
      updateData.abono = parseFloat(abono) || 0;
      updateData.meses = parseInt(meses);
      updateData.mesCobro = mesCobro;
      updateData.cuotaMensual = parseFloat(cuotaMensual);
      updateData.estadoClienteId = estadoClienteId ? parseInt(estadoClienteId) : null;
      updateData.estadoContratoId = estadoContratoId ? parseInt(estadoContratoId) : null;
      updateData.tipoCobroId = tipoCobroId ? parseInt(tipoCobroId) : null;
      updateData.tipoClienteId = tipoClienteId ? parseInt(tipoClienteId) : null;
      updateData.tieneCedula = Boolean(tieneCedula);
      updateData.numeroCedula = numeroCedula ? String(numeroCedula).trim() : null;
      await prisma.pedido.updateMany({
        where: { institucionId: ventaDb.institucionId, numContrato: ventaDb.numContrato },
        data: {
          numContrato: String(numContrato).trim(), // Le inyectamos el nuevo número
          nombreCliente: nombreCliente ? String(nombreCliente).trim() : '',
          observacion: observacion || '' // Guardamos la observación
        }
      });
    }
    
    if (observacionesFact !== undefined) {
      updateData.observacionesFact = observacionesFact;
    }
    
    if (verificacionFact !== undefined) {
      const verifLimpia = String(verificacionFact).trim();
      const contratoAComparar = updateData.numContrato || ventaDb.numContrato;
      updateData.verificacionFact = verifLimpia;
      if (verifLimpia === '') {
        nuevoEstadoTicket = updateData.observacionesFact ? 'Observado ⚠️ - Pendiente Vendedor' : 'Pendiente Facturación';
      } else if (verifLimpia === String(contratoAComparar).trim()) {
        nuevoEstadoTicket = 'Validado ';
      } else {
        nuevoEstadoTicket = 'Rechazado  - Número no coincide';
      }
    } else if (observacionesFact !== undefined && (!ventaDb.verificacionFact || ventaDb.verificacionFact === 'Sin validar')) {
      nuevoEstadoTicket = observacionesFact ? 'Observado ⚠️ - Pendiente Vendedor' : 'Pendiente Facturación';
    }

    updateData.estadoTicket = nuevoEstadoTicket;

    const ventaActualizada = await prisma.venta.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(ventaActualizada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar venta' }, { status: 500 });
  }
}