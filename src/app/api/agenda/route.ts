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

    // Si es vendedor, solo ve sus propias instituciones asignadas. Si es admin, puede filtrar.
    const whereCondition: any = {};

    if (userRol === 'vendedor') {
      whereCondition.vendedorId = userId;
    } else if (filtroVendedor) {
      whereCondition.vendedorId = filtroVendedor;
    }

    // Traer visitas con fecha de próximo contacto agendada
    const visitasAgenda = await prisma.visitaAgenda.findMany({
      where: {
        fechaProximoContacto: { not: null },
        institucion: whereCondition
      },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } }
            },
            vendedor: { select: { nombre: true, email: true } }
          }
        },
        usuario: { select: { nombre: true } }
      },
      orderBy: { fechaProximoContacto: 'asc' }
    });

    const hoyStr = new Date().toISOString().split('T')[0];

    const dataFormatted = visitasAgenda.map(item => {
      const fechaContactoStr = item.fechaProximoContacto 
        ? new Date(item.fechaProximoContacto).toISOString().split('T')[0] 
        : '';

      let categoria = 'Próxima';
      if (fechaContactoStr === hoyStr) {
        categoria = 'Hoy';
      } else if (fechaContactoStr < hoyStr) {
        categoria = 'Vencida';
      }

      return {
        id: item.id,
        institucionId: item.institucionId,
        nombreInstitucion: item.institucion.nombre,
        provincia: item.institucion.parroquia.canton.provincia.nombre,
        provinciaId: item.institucion.parroquia.canton.provincia.id,
        canton: item.institucion.parroquia.canton.nombre,
        cantonId: item.institucion.parroquia.canton.id,
        parroquia: item.institucion.parroquia.nombre,
        estadoComercial: item.institucion.estadoComercial,
        vendedorNombre: item.institucion.vendedor?.nombre || 'Sin asignar',
        vendedorId: item.institucion.vendedorId,
        ultimoAcuerdo: item.resumenAcuerdos || 'Sin acuerdos previos',
        fechaProgramada: fechaContactoStr,
        tipoGestion: item.tipoGestion,
        categoria // 'Hoy' | 'Próxima' | 'Vencida'
      };
    });

    return NextResponse.json(dataFormatted);
  } catch (error) {
    console.error('Error fetching agenda:', error);
    return NextResponse.json({ error: 'Error al obtener la agenda' }, { status: 500 });
  }
}