import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const { searchParams } = new URL(request.url);
    const filtroVendedor = searchParams.get('vendedorId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const targetUserId = (userRol === 'vendedor') ? userId : (filtroVendedor || undefined);
    const hoyStr = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }).split(',')[0]; 
    const hoyDate = new Date();
    const whereInstituciones: any = {
      estadoComercial: { 
        in: ['No visitada', 'Pendiente', 'Seguimiento', 'En seguimiento'] 
      }
    };
    if (targetUserId) {
      whereInstituciones.vendedorId = targetUserId;
    }
    const institucionesPendientes = await prisma.institution.findMany({
      where: whereInstituciones,
      include: {
        parroquia: { include: { canton: { include: { provincia: true } } } },
        vendedor: { select: { nombre: true, email: true } },
        visitas: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Solo traemos la última visita para ver su último acuerdo
        }
      },
      orderBy: { nombre: 'asc' }
    });
    const pendientesFormateadas = institucionesPendientes.map(inst => {
      const ultimaVisita = inst.visitas[0];
      let categoria = 'Sin programar';
      let fechaProgramada = '';
      if (ultimaVisita && ultimaVisita.fechaProximoContacto) {
        fechaProgramada = new Date(ultimaVisita.fechaProximoContacto).toISOString().split('T')[0];
        const hoyIso = hoyDate.toISOString().split('T')[0];
        if (fechaProgramada === hoyIso) categoria = 'Hoy';
        else if (fechaProgramada < hoyIso) categoria = 'Vencida';
        else categoria = 'Próxima';
      }
      return {
        id: inst.id, // ID de la institución
        institucionId: inst.id,
        nombreInstitucion: inst.nombre,
        provincia: inst.parroquia.canton.provincia.nombre,
        provinciaId: inst.parroquia.canton.provincia.id,
        canton: inst.parroquia.canton.nombre,
        cantonId: inst.parroquia.canton.id,
        parroquia: inst.parroquia.nombre,
        estadoComercial: inst.estadoComercial,
        vendedorNombre: inst.vendedor?.nombre || 'Sin asignar',
        ultimoAcuerdo: ultimaVisita?.resumenAcuerdos || 'No hay gestiones previas registradas.',
        fechaProgramada: fechaProgramada,
        categoria // 'Hoy' | 'Próxima' | 'Vencida' | 'Sin programar'
      };
    });
    const whereVisitas: any = {};
    if (targetUserId) {
      whereVisitas.usuarioId = targetUserId;
    }
    if (fechaDesde || fechaHasta) {
      whereVisitas.createdAt = {};
      if (fechaDesde) whereVisitas.createdAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) whereVisitas.createdAt.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }
    const visitasRealizadas = await prisma.visitaAgenda.findMany({
      where: whereVisitas,
      include: {
        institucion: {
          include: {
            parroquia: { include: { canton: { include: { provincia: true } } } }
          }
        },
        usuario: { select: { nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const realizadasFormateadas = visitasRealizadas.map(visita => ({
      id: visita.id, // ID de la Visita
      institucionId: visita.institucionId,
      nombreInstitucion: visita.institucion.nombre,
      provincia: visita.institucion.parroquia.canton.provincia.nombre,
      canton: visita.institucion.parroquia.canton.nombre,
      parroquia: visita.institucion.parroquia.nombre,
      estadoComercialActual: visita.institucion.estadoComercial,
      tipoGestion: visita.tipoGestion,
      estadoGestion: visita.estadoGestion,
      resumenAcuerdos: visita.resumenAcuerdos,
      fechaVisitaReal: visita.createdAt, // Cuándo se hizo realmente la visita
      vendedorNombre: visita.usuario.nombre
    }));
    return NextResponse.json({
      pendientes: pendientesFormateadas,
      realizadas: realizadasFormateadas
    });
  } catch (error) {
    console.error('Error fetching agenda pipeline:', error);
    return NextResponse.json({ error: 'Error al obtener la agenda' }, { status: 500 });
  }
}