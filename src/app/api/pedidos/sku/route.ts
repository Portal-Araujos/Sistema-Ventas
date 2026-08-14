import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// ==========================================
// 🔥 TU FUNCIÓN GET (INTACTA Y FUNCIONAL) 🔥
// ==========================================
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

// ==========================================
// 🔥 LO QUE FALTABA: LA FUNCIÓN POST 🔥
// ==========================================
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const body = await request.json();
    
    // Si envías { skus: [...] } o directamente el array [...]
    const datosExcel = Array.isArray(body) ? body : body.skus;

    if (!datosExcel || !Array.isArray(datosExcel)) {
      return NextResponse.json({ error: 'Formato de datos incorrecto' }, { status: 400 });
    }

    // 1. Limpiar espacios y preparar la data (Evita errores del Excel)
    const dataLimpia = datosExcel.map((item: any) => ({
      codigo: String(item.codigo || item.Codigo || item.SKU || '').trim(),
      tipoRopa: String(item.tipoRopa || item.Prenda || item.Articulo || '').trim(),
      color: String(item.color || item.Color || '').trim(),
      genero: String(item.genero || item.Sexo || 'UNISEX').trim().toUpperCase(),
      talla: String(item.talla || item.Talla || 'N/A').trim().toUpperCase(),
      activo: true
    })).filter(item => item.codigo && item.tipoRopa); // Filtramos filas vacías

    if (dataLimpia.length === 0) {
      return NextResponse.json({ error: 'El archivo Excel parece estar vacío o sin las columnas correctas.' }, { status: 400 });
    }

    // 2. Inserción Masiva Ultrarrápida (Salta los códigos que ya existen)
    const insertados = await prisma.catalogoSKU.createMany({
      data: dataLimpia,
      skipDuplicates: true, // Si suben el mismo Excel dos veces, no se rompe la base de datos
    });

    return NextResponse.json({ 
      success: true, 
      message: `¡Subida exitosa! Se registraron ${insertados.count} SKUs nuevos.`,
      registros: insertados.count
    });

  } catch (error) {
    console.error("Error subiendo SKUs:", error);
    return NextResponse.json({ error: 'Error al procesar el archivo masivo' }, { status: 500 });
  }
}