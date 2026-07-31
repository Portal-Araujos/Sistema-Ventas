import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// GET: OBTENER LISTADO DE VENTAS CON FILTROS Y SEGURIDAD
export async function GET(request: Request) {
  try {
    // 🔒 1. EXTRAER TOKEN Y SABER QUIÉN ES
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

    // 🔒 2. REGLA DE SEGURIDAD: Si es vendedor, SOLO ve sus ventas
    if (userRol !== 'super_admin' && userRol !== 'administrador') {
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

    const dataFormateada = ventas.map(v => ({
      id: v.id,
      fechaVenta: new Date(v.fechaVenta).toLocaleDateString('es-EC'),
      institucionId: v.institucionId,
      institucionNombre: v.institucion.nombre,
      cantonId: v.institucion.parroquia.canton.id,
      cantonNombre: v.institucion.parroquia.canton.nombre,
      provinciaNombre: v.institucion.parroquia.canton.provincia.nombre,
      vendedorNombre: v.vendedor.nombre,
      numContrato: v.numContrato,
      valorContrato: v.valorContrato,
      meses: v.meses,
      mesCobro: v.mesCobro,
      cuotaMensual: v.cuotaMensual,
      estadoClienteId: v.estadoClienteId,
      estadoClienteNombre: v.estadoCliente?.nombre || 'Pendiente',
      estadoContratoId: v.estadoContratoId,
      estadoContratoNombre: v.estadoContrato?.nombre || 'Pendiente',
      tipoCobroId: v.tipoCobroId,
      tipoCobroNombre: v.tipoCobro?.nombre || 'N/A',
      observacionesFact: v.observacionesFact || 'Sin observaciones',
      verificacionFact: v.verificacionFact || 'Sin validar',
      estadoTicket: v.estadoTicket
    }));

    return NextResponse.json(dataFormateada);
  } catch (error) {
    console.error("Error fetching ventas:", error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// POST: REGISTRAR NUEVA VENTA (VENDEDOR)
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
      estadoClienteId, estadoContratoId, tipoCobroId, abono // <-- Agregado por si acaso lo usas aquí
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
        estadoTicket: 'Pendiente Facturación'
      }
    });

    return NextResponse.json(nuevaVenta, { status: 201 });
  } catch (error) {
    console.error("Error creando venta:", error);
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 });
  }
}

// PUT: ACTUALIZAR VENTA Y GUARDAR OBSERVACIONES CORRECTAMENTE
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { 
      id, observacionesFact, verificacionFact,
      institucionId, numContrato, valorContrato, meses, mesCobro, cuotaMensual,
      estadoClienteId, estadoContratoId, tipoCobroId
    } = body;

    if (!id) return NextResponse.json({ error: 'ID de venta requerido' }, { status: 400 });

    const ventaDb = await prisma.venta.findUnique({ where: { id } });
    if (!ventaDb) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

    const updateData: any = {};
    let nuevoEstadoTicket = ventaDb.estadoTicket;

    // 1. EDICIÓN DEL CONTRATO (Solo Admins)
    if (numContrato) {
      updateData.institucionId = institucionId;
      updateData.numContrato = String(numContrato).trim();
      updateData.valorContrato = parseFloat(valorContrato);
      updateData.meses = parseInt(meses);
      updateData.mesCobro = mesCobro;
      updateData.cuotaMensual = parseFloat(cuotaMensual);
      updateData.estadoClienteId = estadoClienteId ? parseInt(estadoClienteId) : null;
      updateData.estadoContratoId = estadoContratoId ? parseInt(estadoContratoId) : null;
      updateData.tipoCobroId = tipoCobroId ? parseInt(tipoCobroId) : null;
    }

    // 2. GUARDAR OBSERVACIONES (Sin que choque con Verificación)
    if (observacionesFact !== undefined) {
      updateData.observacionesFact = observacionesFact;
    }

    // 3. GUARDAR VERIFICACIÓN Y ASIGNAR ESTADO (Tu lógica genial)
    if (verificacionFact !== undefined) {
      const verifLimpia = String(verificacionFact).trim();
      const contratoAComparar = updateData.numContrato || ventaDb.numContrato;
      
      updateData.verificacionFact = verifLimpia;

      if (verifLimpia === '') {
        nuevoEstadoTicket = updateData.observacionesFact ? 'Observado ⚠️ - Pendiente Vendedor' : 'Pendiente Facturación';
      } else if (verifLimpia === String(contratoAComparar).trim()) {
        nuevoEstadoTicket = 'Validado ✅';
      } else {
        nuevoEstadoTicket = 'Rechazado ❌ - Número no coincide';
      }
    } else if (observacionesFact !== undefined && (!ventaDb.verificacionFact || ventaDb.verificacionFact === 'Sin validar')) {
      // Si el admin solo envió observación pero aún no valida
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