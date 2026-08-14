import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const whereClause: any = { activo: true };
    if (q.trim().length > 0) {
      whereClause.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { tipoRopa: { contains: q, mode: 'insensitive' } }
      ];
    }
    const catalogos = await prisma.catalogoSKU.findMany({
      where: whereClause,
      take: 20, //
      orderBy: { codigo: 'asc' }
    });
    return NextResponse.json({
      success: true,
      raw: catalogos
    });
  } catch (error) {
    console.error("Error al cargar SKUs:", error);
    return NextResponse.json({ error: 'Error al cargar catálogo SKU' }, { status: 500 });
  }
}