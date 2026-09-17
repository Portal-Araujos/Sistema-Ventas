import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;

    // 🔥 BUSCAMOS LAS NOTIFICACIONES QUE TE PERTENECEN 🔥
    const notificaciones = await prisma.notificacion.findMany({
      where: {
        leido: false,
        OR: [
          { usuarioDestinoId: userId }, // Alertas directas a ti (Ej: Tus pedidos)
          { rolDestino: userRol },      // Alertas a tu departamento (Ej: Todo Taller)
          { rolDestino: 'admin' }       // Si eres admin, puedes hacer que te lleguen copias
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Solo traemos las 20 más recientes para no saturar el celular
    });

    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error("Error GET Notificaciones:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Para marcar como leídas cuando el usuario hace clic
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await prisma.notificacion.update({
      where: { id: parseInt(body.notificacionId) },
      data: { leido: true }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}