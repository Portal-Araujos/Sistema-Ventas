import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    // Obtenemos todo el catálogo de códigos activo
    const catalogos = await prisma.catalogoSKU.findMany({
      where: { activo: true },
      orderBy: { tipoRopa: 'asc' }
    });

    // Vamos a agrupar los datos para que el FrontEnd arme los menús desplegables fácilmente
    const tiposRopa = [...new Set(catalogos.map(c => c.tipoRopa))];
    
    return NextResponse.json({
      success: true,
      raw: catalogos, // Todos los códigos (para que el sistema haga el match oculto)
      tiposRopa // Ej: ["POLO MAO", "CHALECO PREMIUM"]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar catálogo SKU' }, { status: 500 });
  }
}

// Esta función POST servirá para que luego tú subas tu Excel masivo de códigos
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { skus } = body; // Array de objetos { codigo, tipoRopa, color, genero, talla }

    if (!skus || skus.length === 0) return NextResponse.json({ error: 'No hay datos' }, { status: 400 });

    const result = await prisma.catalogoSKU.createMany({
      data: skus,
      skipDuplicates: true // Ignora si ya subiste ese código antes
    });

    return NextResponse.json({ success: true, creados: result.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al subir catálogo' }, { status: 500 });
  }
}