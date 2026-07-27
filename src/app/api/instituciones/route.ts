import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
const parseOptionalInt = (val: any): number | null => {
  if (!val || val === '' || isNaN(Number(val))) return null;
  return parseInt(val);
};
export async function GET() {
  try {
    const instituciones = await prisma.institution.findMany({
      include: {
        parroquia: { include: { canton: { include: { provincia: true } } } },
        sostenimiento: true,
        jornada: true,
        nivelEducativo: true,
        area: true,
        regimen: true,
        jurisdiccion: true,
        modalidad: true,
        accesoEdificio: true,
        vendedor: { select: { id: true, nombre: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    const dataFormateada = instituciones.map((inst) => ({
      id: inst.id,
      nombre: inst.nombre,
      provinciaId: inst.parroquia.canton.provincia.id,
      provincia: inst.parroquia.canton.provincia.nombre,
      cantonId: inst.parroquia.canton.id,
      canton: inst.parroquia.canton.nombre,
      parroquiaId: inst.parroquia.id,
      parroquia: inst.parroquia.nombre,
      docentesHombres: inst.docentesHombres,
      docentesMujeres: inst.docentesMujeres,
      docentes: inst.totalDocentes,
      tamano: inst.tamano,
      estado: inst.estadoComercial,
      sostenimientoId: inst.sostenimientoId,
      sostenimiento: inst.sostenimiento.nombre,
      jornadaId: inst.jornadaId,
      jornada: inst.jornada.nombre,
      nivelEducativoId: inst.nivelEducativoId,
      nivelEducativo: inst.nivelEducativo?.nombre || 'N/A',
      areaId: inst.areaId,
      area: inst.area?.nombre || 'N/A',
      regimenId: inst.regimenId,
      regimen: inst.regimen?.nombre || 'N/A',
      vendedorId: inst.vendedorId || null,
      vendedorNombre: inst.vendedor ? inst.vendedor.nombre : 'Sin Asignar'
    }));

    return NextResponse.json(dataFormateada);
  } catch (error) {
    console.error('Error fetching instituciones:', error);
    return NextResponse.json({ error: 'Error al obtener las instituciones' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const usuarioExiste = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuarioExiste) {
      return NextResponse.json({ 
        error: 'La base de datos se reinició o tu sesión caducó. Por favor, ve a /login y vuelve a iniciar sesión.' 
      }, { status: 401 });
    }
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
    // VALIDACIONES ESTRICTAS
    if (!parroquiaId || isNaN(Number(parroquiaId))) {
      return NextResponse.json({ error: 'Debe seleccionar una Provincia, Cantón y Parroquia.' }, { status: 400 });
    }
    if (!sostenimientoId || isNaN(Number(sostenimientoId))) {
      return NextResponse.json({ error: 'Debe seleccionar el Sostenimiento.' }, { status: 400 });
    }
    if (!jornadaId || isNaN(Number(jornadaId))) {
      return NextResponse.json({ error: 'Debe seleccionar la Jornada.' }, { status: 400 });
    }
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
    const nuevaInstitucion = await prisma.institution.create({
      data: {
        nombre,
        sostenimientoId: parseInt(sostenimientoId),
        jornadaId: parseInt(jornadaId),
        parroquiaId: parseInt(parroquiaId),
        docentesHombres: hombres,
        docentesMujeres: mujeres,
        totalDocentes,
        tamano: tamanoCalculado,
        estadoComercial: 'No visitada',
        nivelEducativoId: parseOptionalInt(nivelEducativoId),
        areaId: parseOptionalInt(areaId),
        regimenId: parseOptionalInt(regimenId),
        jurisdiccionId: parseOptionalInt(jurisdiccionId),
        modalidadId: parseOptionalInt(modalidadId),
        accesoEdificioId: parseOptionalInt(accesoEdificioId),
        creadoPor: userId,
        vendedorId: vendedorId || null
      }
    });
    return NextResponse.json(nuevaInstitucion, { status: 201 });
  } catch (error) {
    console.error('Error creando institución:', error);
    return NextResponse.json({ error: 'Error interno al guardar la institución' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const { institucionId, vendedorId } = await request.json();

    if (!institucionId) return NextResponse.json({ error: 'ID de institución requerido' }, { status: 400 });

    const institucionActualizada = await prisma.institution.update({
      where: { id: institucionId },
      data: { vendedorId: vendedorId ? vendedorId : null }
    });

    return NextResponse.json(institucionActualizada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al reasignar vendedor' }, { status: 500 });
  }
}