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
    
    // NOTA: vendedorId es lo que manda el front, pero en Prisma se llama usuarioId
    const { institucionIds, vendedorId, fechaProgramada, horaProgramada } = body;

    if (!institucionIds || institucionIds.length === 0 || !vendedorId || !fechaProgramada) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para armar la ruta' }, { status: 400 });
    }

    // Convertimos la fecha de string ("2026-08-07") a objeto Date en ISO, que es lo que exige Prisma para @db.Date
    const fechaISO = new Date(`${fechaProgramada}T00:00:00Z`);

    // 1. Preparamos el arreglo con los nombres EXACTOS de tu schema.prisma
    const nuevasVisitas = institucionIds.map((instId: string) => ({
      institucionId: instId,
      usuarioId: vendedorId, // 🔥 CORREGIDO: En tu schema se llama usuarioId
      fechaProgramada: fechaISO, // 🔥 CORREGIDO: Formato Date
      horaProgramada: horaProgramada || '08:30',
      tipoGestion: 'Asignación Masiva', // 🔥 CORREGIDO: Este campo es obligatorio en tu DB
      estadoGestion: 'Pendiente', 
      esVisitaLibre: false
    }));

    // 2. INYECCIÓN MASIVA EN LA AGENDA
    const result = await prisma.visitaAgenda.createMany({
      data: nuevasVisitas,
      skipDuplicates: true
    });

    // 3. Actualizamos automáticamente el responsable principal de esas escuelas
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