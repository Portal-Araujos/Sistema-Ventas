import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// ==========================================
// 🔥 FUNCIÓN GET (BÚSQUEDA Y LISTADO) 🔥
// ==========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const whereClause: any = { }; 
    
    if (q.trim().length > 0) {
      whereClause.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { tipoRopa: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    const catalogos = await prisma.catalogoSKU.findMany({
      where: whereClause,
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
// 🔥 FUNCIÓN POST (CREAR / ACTUALIZAR MASIVO) 🔥
// ==========================================
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const body = await request.json();
    const datosExcel = Array.isArray(body) ? body : body.skus;

    if (!datosExcel || !Array.isArray(datosExcel)) {
      return NextResponse.json({ error: 'Formato de datos incorrecto' }, { status: 400 });
    }

    // 1. Limpieza Extrema y Detección de Categoría
    const dataLimpia = datosExcel.map((item: any) => ({
      codigo: item.codigo ? String(item.codigo).trim().toUpperCase() : '',
      tipoRopa: item.tipoRopa ? String(item.tipoRopa).trim().toUpperCase() : '',
      color: item.color ? String(item.color).trim().toUpperCase() : '',
      genero: item.genero ? String(item.genero).trim().toUpperCase() : 'UNISEX',
      talla: item.talla ? String(item.talla).trim().toUpperCase() : 'N/A',
      activo: item.activo !== undefined ? item.activo : true,
      categoriaItem: item.categoriaItem || 'TEXTIL' // 🔥 Inyectamos la etiqueta Textil/Electro
    })).filter(item => item.codigo !== '' && item.tipoRopa !== ''); 

    if (dataLimpia.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío o los datos son inválidos.' }, { status: 400 });
    }

    // 2. UPSERT: Si el código existe lo actualiza, si no, lo crea.
    const operaciones = dataLimpia.map((sku) => 
      prisma.catalogoSKU.upsert({
        where: { codigo: sku.codigo },
        update: {
          tipoRopa: sku.tipoRopa,
          color: sku.color,
          genero: sku.genero,
          talla: sku.talla,
          activo: sku.activo,
          categoriaItem: sku.categoriaItem // 🔥 Actualiza si cambió de bodega
        },
        create: {
          codigo: sku.codigo,
          tipoRopa: sku.tipoRopa,
          color: sku.color,
          genero: sku.genero,
          talla: sku.talla,
          activo: sku.activo,
          categoriaItem: sku.categoriaItem // 🔥 Crea con la bodega correcta
        }
      })
    );

    await prisma.$transaction(operaciones);

    return NextResponse.json({ 
      success: true, 
      message: `¡Subida exitosa! Se procesaron ${dataLimpia.length} SKUs en bodega.`,
      creados: dataLimpia.length
    });

  } catch (error) {
    console.error("Error subiendo SKUs:", error);
    return NextResponse.json({ error: 'Error al procesar el archivo masivo' }, { status: 500 });
  }
}

// ==========================================
// 🔥 FUNCIÓN PUT (ACTIVAR / DESACTIVAR) 🔥
// ==========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, activo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const skuActualizado = await prisma.catalogoSKU.update({
      where: { id },
      data: { activo }
    });

    return NextResponse.json({ success: true, data: skuActualizado });
  } catch (error) {
    console.error("Error al actualizar SKU:", error);
    return NextResponse.json({ error: 'Error interno al actualizar el estado del SKU' }, { status: 500 });
  }
}