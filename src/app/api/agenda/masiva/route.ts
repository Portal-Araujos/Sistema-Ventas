import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Solo los administradores pueden armar rutas' }, { status: 403 });
    }

    const body = await request.json();
    
    const { institucionIds, vendedorId, fechaProgramada, horaProgramada } = body;

    if (!institucionIds || institucionIds.length === 0 || !vendedorId || !fechaProgramada) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para armar la ruta' }, { status: 400 });
    }

    const fechaISO = new Date(`${fechaProgramada}T00:00:00Z`);

    const nuevasVisitas = institucionIds.map((instId: string) => ({
      institucionId: instId,
      usuarioId: vendedorId, 
      fechaProgramada: fechaISO, 
      horaProgramada: horaProgramada || '08:30',
      tipoGestion: 'Asignación Masiva', 
      // 🔥 LA MAGIA ESTÁ AQUÍ: Lo cambiamos a "No Visitada" para que la Ficha Técnica lo ignore automáticamente
      estadoGestion: 'No Visitada', 
      esVisitaLibre: false
    }));

    const result = await prisma.visitaAgenda.createMany({
      data: nuevasVisitas,
      skipDuplicates: true
    });

    await prisma.institution.updateMany({
      where: { id: { in: institucionIds } },
      data: { vendedorId: vendedorId }
    });

    return NextResponse.json({ success: true, creadas: result.count }, { status: 201 });
  } catch (error) {
    console.error("Error Masiva:", error);
    return NextResponse.json({ error: 'Error interno al generar las rutas' }, { status: 500 });
  }
}