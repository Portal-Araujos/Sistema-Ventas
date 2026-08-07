import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const esAdmin = payload.rol === 'super_admin' || payload.rol === 'administrador';
    const vendedorIdFiltro = !esAdmin ? (payload.id as string) : undefined;
    const whereClause: any = {};
    if (vendedorIdFiltro) whereClause.usuarioId = vendedorIdFiltro;
    if (fechaInicio && fechaFin) {
      whereClause.fechaPedido = {
        gte: new Date(`${fechaInicio}T00:00:00-05:00`),
        lte: new Date(`${fechaFin}T23:59:59-05:00`)
      };
    }
    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      include: {
        institucion: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
        detalles: true 
      },
      orderBy: { fechaPedido: 'desc' }
    });
    return NextResponse.json({ success: true, data: pedidos });
  } catch (error) {
    console.error("Error al traer pedidos:", error);
    return NextResponse.json({ error: 'Error interno al cargar los pedidos' }, { status: 500 });
  }
}