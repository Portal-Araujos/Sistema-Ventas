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
    const userRol = payload.rol as string;
    const userIdSession = payload.id as string;
    
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
    const targetUserId = (esAdmin && vendedorId) ? vendedorId : (!esAdmin ? userIdSession : null);

    const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    hoy.setHours(0,0,0,0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const start = fechaDesde ? new Date(`${fechaDesde}T00:00:00-05:00`) : hoy;
    const end = fechaHasta ? new Date(`${fechaHasta}T23:59:59-05:00`) : new Date(manana.getTime() - 1);

    const baseWhereVisita: any = {};
    if (targetUserId) baseWhereVisita.usuarioId = targetUserId;

    // 1. MI RUTA 
    const rutaHoy = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, estadoGestion: 'No Visitada', fechaProgramada: { gte: hoy, lt: manana } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { horaProgramada: 'asc' }
    });

    // 2. VISITADAS
    const visitadas = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, estadoGestion: { not: 'No Visitada' }, createdAt: { gte: start, lte: end } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });

    // 3. PRÓXIMAS 
    const proximas = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, fechaProximoContacto: { gte: manana } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { fechaProximoContacto: 'asc' }
    });

    // 4. VENCIDAS 
    const vencidasRaw = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, fechaProximoContacto: { lt: hoy } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { fechaProximoContacto: 'desc' }
    });
    const vencidasMap = new Map();
    vencidasRaw.forEach(v => { if(!vencidasMap.has(v.institucionId)) vencidasMap.set(v.institucionId, v); });
    const vencidas = Array.from(vencidasMap.values());

    // 🔥 5. SIN ASIGNAR (LÍMITE REMOVIDO) 🔥
    const sinAsignarEscuelas = await prisma.institution.findMany({
      where: { OR: [ { vendedorId: null }, { vendedorId: '' }, { visitas: { none: {} } } ] },
      include: { parroquia: { include: { canton: { include: { provincia: true } } } } },
      // take: 100 <- Esto fue eliminado para que traiga todas las 1046
      orderBy: { nombre: 'asc' }
    });

    // 6. COBERTURA DE TERRITORIO
    const instWhere = targetUserId 
      ? { vendedorId: targetUserId } 
      : { vendedorId: { not: null }, NOT: { vendedorId: '' } };

    const totalAsignadas = await prisma.institution.count({ where: instWhere });
    const visitadasCount = await prisma.institution.count({
      where: { ...instWhere, visitas: { some: { estadoGestion: { not: 'No Visitada' } } } }
    });
    const porcentaje = totalAsignadas === 0 ? 0 : Math.round((visitadasCount / totalAsignadas) * 100);

    // 🔥 CORRECCIÓN HORARIA (MAGIA DE FECHAS) 🔥
    const formatearFechaExacta = (fechaObj: any) => {
      if (!fechaObj) return null;
      const d = new Date(fechaObj);
      // Si el sistema lo guardó exactamente a las 00:00 (Como hace el asignador masivo)
      // forzamos el horario a UTC para que el -5 de Ecuador no retroceda un día.
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
      }
      // De lo contrario, respeta el horario del sistema
      return d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" });
    };

    const mapVisita = (v: any) => ({
      id: v.id, institucionId: v.institucionId, nombreInstitucion: v.institucion?.nombre || 'Desconocida',
      provinciaId: v.institucion?.parroquia?.canton?.provincia?.id, cantonId: v.institucion?.parroquia?.canton?.id,
      canton: v.institucion?.parroquia?.canton?.nombre, parroquia: v.institucion?.parroquia?.nombre,
      estadoComercial: v.estadoGestion, 
      fechaProgramada: formatearFechaExacta(v.fechaProgramada), // <- Ahora usa la función mágica
      fechaVisitaReal: v.createdAt, 
      fechaProximoContacto: formatearFechaExacta(v.fechaProximoContacto), // <- También corregido aquí
      resumenAcuerdos: v.resumenAcuerdos || 'Sin registros', tipoGestion: v.tipoGestion
    });

    const mapSinAsignar = (inst: any) => ({
      id: inst.id, institucionId: inst.id, nombreInstitucion: inst.nombre,
      provinciaId: inst.parroquia?.canton?.provincia?.id, cantonId: inst.parroquia?.canton?.id,
      canton: inst.parroquia?.canton?.nombre, parroquia: inst.parroquia?.nombre,
      estadoComercial: inst.estadoComercial || 'Sin Asignar', fechaProgramada: '',
      fechaVisitaReal: inst.createdAt, fechaProximoContacto: null,
      resumenAcuerdos: 'Escuela libre / Sin vendedor ni visitas previas', tipoGestion: 'Prospección'
    });

    return NextResponse.json({
      ruta: rutaHoy.map(mapVisita), visitadas: visitadas.map(mapVisita), proximas: proximas.map(mapVisita),
      vencidas: vencidas.map(mapVisita), sinAsignar: sinAsignarEscuelas.map(mapSinAsignar),
      cobertura: { asignadas: totalAsignadas, visitadas: visitadasCount, porcentaje }
    });
    
  } catch (error) {
    console.error("Error en agenda:", error);
    return NextResponse.json({ error: 'Error al cargar agenda' }, { status: 500 });
  }
}