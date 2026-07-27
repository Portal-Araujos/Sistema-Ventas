import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let userRol = 'vendedor';

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userRol = (payload.rol as string) || 'vendedor';
      } catch (e) {}
    }

    const provincias = await prisma.provincia.findMany({
      include: { cantones: { include: { parroquias: true } } },
      orderBy: { nombre: 'asc' }
    });

    const niveles = await prisma.nivelEducativo.findMany({ orderBy: { nombre: 'asc' } });
    const areas = await prisma.areaEducativa.findMany({ orderBy: { nombre: 'asc' } });
    const regimenes = await prisma.regimenEscolar.findMany({ orderBy: { nombre: 'asc' } });
    const jurisdicciones = await prisma.jurisdiccion.findMany({ orderBy: { nombre: 'asc' } });
    const modalidades = await prisma.modalidadEducativa.findMany({ orderBy: { nombre: 'asc' } });
    const accesos = await prisma.accesoEdificio.findMany({ orderBy: { nombre: 'asc' } });
    const sostenimientos = await prisma.sostenimiento.findMany({ orderBy: { nombre: 'asc' } });
    const jornadas = await prisma.jornada.findMany({ orderBy: { nombre: 'asc' } });
    const estadosComerciales = await prisma.estadoComercial.findMany({ orderBy: { id: 'asc' } });

    
    // REGLAS DE TAMAÑO DÍNAMICAS
    const reglasTamano = await prisma.reglaTamano.findMany({ orderBy: { minDocentes: 'asc' } });

    return NextResponse.json({
      userRol,
      provincias,
      niveles,
      areas,
      regimenes,
      jurisdicciones,
      modalidades,
      accesos,
      sostenimientos,
      jornadas,
      reglasTamano
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar catálogos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { tipo, nombre, provinciaId, cantonId } = await request.json();
    if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

    switch (tipo) {
      case 'provincia': return NextResponse.json(await prisma.provincia.create({ data: { nombre } }), { status: 201 });
      case 'canton': return NextResponse.json(await prisma.canton.create({ data: { nombre, provinciaId: parseInt(provinciaId) } }), { status: 201 });
      case 'parroquia': return NextResponse.json(await prisma.parroquia.create({ data: { nombre, cantonId: parseInt(cantonId) } }), { status: 201 });
      case 'nivel': return NextResponse.json(await prisma.nivelEducativo.create({ data: { nombre } }), { status: 201 });
      case 'area': return NextResponse.json(await prisma.areaEducativa.create({ data: { nombre } }), { status: 201 });
      case 'regimen': return NextResponse.json(await prisma.regimenEscolar.create({ data: { nombre } }), { status: 201 });
      case 'jurisdiccion': return NextResponse.json(await prisma.jurisdiccion.create({ data: { nombre } }), { status: 201 });
      case 'modalidad': return NextResponse.json(await prisma.modalidadEducativa.create({ data: { nombre } }), { status: 201 });
      case 'acceso': return NextResponse.json(await prisma.accesoEdificio.create({ data: { nombre } }), { status: 201 });
      case 'sostenimiento': return NextResponse.json(await prisma.sostenimiento.create({ data: { nombre } }), { status: 201 });
      case 'jornada': return NextResponse.json(await prisma.jornada.create({ data: { nombre } }), { status: 201 });
      case 'estadoComercial':return NextResponse.json(await prisma.estadoComercial.create({ data: { nombre, activo: true } }), { status: 201 });
      default: return NextResponse.json({ error: 'Tipo de catálogo no válido' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar elemento' }, { status: 500 });
  }
}

// ==========================================
// PUT: EDITAR UN CATÁLOGO EXISTENTE
// ==========================================
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    // AQUÍ ESTÁ LA CORRECCIÓN: Agregamos 'activo' a la lectura del body
    const { id, tipo, nombre, minDocentes, maxDocentes, activo } = body;

    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    let item;

    // Regla de Tamaño
    if (tipo === 'reglaTamano') {
      item = await prisma.reglaTamano.update({
        where: { id: parseInt(id) },
        data: {
          minDocentes: parseInt(minDocentes),
          maxDocentes: parseInt(maxDocentes)
        }
      });
      return NextResponse.json(item);
    }

    // Estado Comercial (Permite actualizar nombre y/o activar/deshabilitar)
    if (tipo === 'estadoComercial') {
      item = await prisma.estadoComercial.update({
        where: { id: parseInt(id) },
        data: {
          ...(nombre && { nombre }),
          ...(typeof activo === 'boolean' && { activo })
        }
      });
      return NextResponse.json(item);
    }

    const data = { nombre };
    const numericId = parseInt(id);

    switch (tipo) {
      case 'provincia': item = await prisma.provincia.update({ where: { id: numericId }, data }); break;
      case 'canton': item = await prisma.canton.update({ where: { id: numericId }, data }); break;
      case 'parroquia': item = await prisma.parroquia.update({ where: { id: numericId }, data }); break;
      case 'nivel': item = await prisma.nivelEducativo.update({ where: { id: numericId }, data }); break;
      case 'area': item = await prisma.areaEducativa.update({ where: { id: numericId }, data }); break;
      case 'regimen': item = await prisma.regimenEscolar.update({ where: { id: numericId }, data }); break;
      case 'jurisdiccion': item = await prisma.jurisdiccion.update({ where: { id: numericId }, data }); break;
      case 'modalidad': item = await prisma.modalidadEducativa.update({ where: { id: numericId }, data }); break;
      case 'acceso': item = await prisma.accesoEdificio.update({ where: { id: numericId }, data }); break;
      case 'sostenimiento': item = await prisma.sostenimiento.update({ where: { id: numericId }, data }); break;
      case 'jornada': item = await prisma.jornada.update({ where: { id: numericId }, data }); break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error en PUT catálogos:', error);
    return NextResponse.json({ error: 'Error al actualizar elemento' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const tipo = searchParams.get('tipo');

    if (!id || !tipo) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });

    switch (tipo) {
      case 'provincia': await prisma.provincia.delete({ where: { id } }); break;
      case 'canton': await prisma.canton.delete({ where: { id } }); break;
      case 'parroquia': await prisma.parroquia.delete({ where: { id } }); break;
      case 'nivel': await prisma.nivelEducativo.delete({ where: { id } }); break;
      case 'area': await prisma.areaEducativa.delete({ where: { id } }); break;
      case 'regimen': await prisma.regimenEscolar.delete({ where: { id } }); break;
      case 'jurisdiccion': await prisma.jurisdiccion.delete({ where: { id } }); break;
      case 'modalidad': await prisma.modalidadEducativa.delete({ where: { id } }); break;
      case 'acceso': await prisma.accesoEdificio.delete({ where: { id } }); break;
      case 'sostenimiento': await prisma.sostenimiento.delete({ where: { id } }); break;
      case 'jornada': await prisma.jornada.delete({ where: { id } }); break;
      case 'estadoComercial':return NextResponse.json({ error: 'No se permite eliminar estados comerciales para no perder el historial. Puedes deshabilitarlo desde la opción de edición.' },{ status: 400 });
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'No se puede eliminar porque hay escuelas usando este dato.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}