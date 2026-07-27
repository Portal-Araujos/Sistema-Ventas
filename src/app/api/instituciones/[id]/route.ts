import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const institucion = await prisma.institution.findUnique({
      where: { id },
      include: {
        parroquia: {
          include: {
            canton: {
              include: { provincia: true }
            }
          }
        },
        sostenimiento: true,
        jornada: true,
        nivelEducativo: true,
        area: true,
        regimen: true,
        jurisdiccion: true,
        modalidad: true,
        accesoEdificio: true,
        vendedor: { select: { id: true, nombre: true, email: true } },
        usuarioCreador: { select: { id: true, nombre: true } },
        visitas: {
          include: { usuario: { select: { nombre: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!institucion) {
      return NextResponse.json({ error: 'Institución no encontrada' }, { status: 404 });
    }

    return NextResponse.json(institucion);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener institución' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      nombre,
      sostenimientoId,
      jornadaId,
      parroquiaId,
      docentesHombres,
      docentesMujeres,
      nivelEducativoId,
      areaId,
      regimenId,
      jurisdiccionId,
      modalidadId,
      accesoEdificioId,
      vendedorId
    } = body;

    const hombres = parseInt(docentesHombres) || 0;
    const mujeres = parseInt(docentesMujeres) || 0;
    const totalDocentes = hombres + mujeres;

    const reglas = await prisma.reglaTamano.findMany();
    let tamanoCalculado = 'Pequeña';
    for (const regla of reglas) {
      if (totalDocentes >= regla.minDocentes && totalDocentes <= regla.maxDocentes) {
        tamanoCalculado = regla.nombre;
        break;
      }
    }

    const institucionActualizada = await prisma.institution.update({
      where: { id },
      data: {
        nombre,
        sostenimientoId: parseInt(sostenimientoId),
        jornadaId: parseInt(jornadaId),
        parroquiaId: parseInt(parroquiaId),
        docentesHombres: hombres,
        docentesMujeres: mujeres,
        totalDocentes,
        tamano: tamanoCalculado,
        nivelEducativoId: nivelEducativoId ? parseInt(nivelEducativoId) : null,
        areaId: areaId ? parseInt(areaId) : null,
        regimenId: regimenId ? parseInt(regimenId) : null,
        jurisdiccionId: jurisdiccionId ? parseInt(jurisdiccionId) : null,
        modalidadId: modalidadId ? parseInt(modalidadId) : null,
        accesoEdificioId: accesoEdificioId ? parseInt(accesoEdificioId) : null,
        vendedorId: vendedorId && vendedorId !== '' ? vendedorId : null
      }
    });

    return NextResponse.json(institucionActualizada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar institución' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.institution.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar institución' }, { status: 500 });
  }
}