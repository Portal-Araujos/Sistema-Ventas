import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fInicio = searchParams.get('fechaInicio');
    const fFin = searchParams.get('fechaFin');
    const provinciaId = searchParams.get('provinciaId');
    const cantonId = searchParams.get('cantonId');
    const vendedorId = searchParams.get('vendedorId');

    // 1. ZONA HORARIA DE ECUADOR (UTC-5)
    // Forzamos a que las "00:00" y "23:59" sean exactamente en horario de Ecuador
    const dateStart = fInicio ? new Date(`${fInicio}T00:00:00-05:00`) : new Date();
    const dateEnd = fFin ? new Date(`${fFin}T23:59:59.999-05:00`) : new Date();

    // 2. Filtros Geográficos y de Vendedor
    const instFilters: any = {};
    if (cantonId) {
      instFilters.parroquia = { cantonId: parseInt(cantonId) };
    } else if (provinciaId) {
      instFilters.parroquia = { canton: { provinciaId: parseInt(provinciaId) } };
    }
    if (vendedorId) instFilters.vendedorId = vendedorId;

    const visitaFilters: any = {
      createdAt: { gte: dateStart, lte: dateEnd },
      institucion: instFilters
    };
    if (vendedorId) visitaFilters.usuarioId = vendedorId;

    // 3. KPIs Generales
    const totalInstituciones = await prisma.institution.count({ where: instFilters });
    const institucionesVisitadasCount = await prisma.institution.count({
      where: { ...instFilters, estadoComercial: { not: 'No visitada' } }
    });
    const totalVisitasRango = await prisma.visitaAgenda.count({ where: visitaFilters });

    const porcentajeCobertura = totalInstituciones > 0 
      ? Math.round((institucionesVisitadasCount / totalInstituciones) * 100) 
      : 0;

    // 4. TOP 5 VENDEDORES
    const topVendedoresRaw = await prisma.visitaAgenda.groupBy({
      by: ['usuarioId'],
      where: { createdAt: { gte: dateStart, lte: dateEnd } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const usuariosIds = topVendedoresRaw.map(t => t.usuarioId);
    const usuariosNombres = await prisma.usuario.findMany({ 
      where: { id: { in: usuariosIds } }, select: { id: true, nombre: true } 
    });

    const topVendedores = topVendedoresRaw.map(t => {
      const user = usuariosNombres.find(u => u.id === t.usuarioId);
      return {
        nombre: user?.nombre || 'Desconocido',
        visitas: t._count.id
      };
    });

    // 5. Gráfico de Estados Comerciales
    const estadosAgrupados = await prisma.institution.groupBy({
      by: ['estadoComercial'],
      where: instFilters,
      _count: { id: true }
    });

    const desgloseEstados = estadosAgrupados.map(e => ({
      name: e.estadoComercial,
      value: e._count.id,
      porcentaje: totalInstituciones > 0 ? Math.round((e._count.id / totalInstituciones) * 100) : 0
    }));

    // 6. Últimas Visitas
    const ultimasVisitasRaw = await prisma.visitaAgenda.findMany({
      where: visitaFilters,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        institucion: {
          include: { parroquia: { include: { canton: { include: { provincia: true } } } } }
        },
        usuario: { select: { nombre: true } }
      }
    });

    const ultimasVisitas = ultimasVisitasRaw.map(v => {
      const fechaObj = new Date(v.createdAt);
      return {
        id: v.id,
        institucionId: v.institucionId,
        institucionNombre: v.institucion.nombre,
        provincia: v.institucion.parroquia.canton.provincia.nombre,
        canton: v.institucion.parroquia.canton.nombre,
        vendedorNombre: v.usuario.nombre,
        tipoGestion: v.tipoGestion,
        estadoGestion: v.estadoGestion,
        resumenAcuerdos: v.resumenAcuerdos || 'Sin resumen registrado',
        latitud: v.latitud,
        longitud: v.longitud,
        // FORZAMOS LA HORA LOCAL DE ECUADOR EN LA TABLA
        fechaFormatted: fechaObj.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
        horaFormatted: fechaObj.toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hour12: true })
      };
    });

    return NextResponse.json({
      totalInstituciones,
      totalVisitasRango,
      porcentajeCobertura,
      topVendedores,
      desgloseEstados,
      ultimasVisitas
    });
  } catch (error) {
    console.error('Error generando estadísticas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}