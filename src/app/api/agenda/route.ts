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

    // 🔥 LA CLAVE DE LA CORRECCIÓN: Le enseñamos al sistema los estados "vírgenes"
    const estadosPendientes = ['Pendiente', 'No Visitada', 'No visitada'];

    // 1. MI RUTA (Ahora verifica correctamente que esté en estado Pendiente)
    const rutaAsignadaHoy = await prisma.visitaAgenda.findMany({
      where: { 
        ...baseWhereVisita, 
        estadoGestion: { in: estadosPendientes }, 
        fechaProgramada: { gte: hoy, lt: manana } 
      },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { horaProgramada: 'asc' }
    });

    // Filtro de seguridad: Vemos cuáles YA visitó hoy realmente para restarlas de la ruta
    const visitadasHoy = await prisma.visitaAgenda.findMany({
      where: { 
        ...baseWhereVisita, 
        estadoGestion: { notIn: estadosPendientes }, 
        createdAt: { gte: hoy, lt: manana } 
      },
      select: { institucionId: true }
    });
    const visitadasHoyIds = new Set(visitadasHoy.map(v => v.institucionId));
    
    // Dejamos en la ruta solo las que NO ha visitado hoy
    const rutaHoy = rutaAsignadaHoy.filter(v => !visitadasHoyIds.has(v.institucionId));

    // 2. VISITADAS REALES (Cualquier estado que no sea Pendiente)
    const visitadas = await prisma.visitaAgenda.findMany({
      where: { 
        ...baseWhereVisita, 
        estadoGestion: { notIn: estadosPendientes }, 
        createdAt: { gte: start, lte: end } 
      },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });

    // 3. PRÓXIMAS 
    const proximasRaw = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, fechaProximoContacto: { gte: manana } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { fechaProximoContacto: 'asc' }
    });
    const proximasMap = new Map();
    proximasRaw.forEach(v => { if(!proximasMap.has(v.institucionId)) proximasMap.set(v.institucionId, v); });
    const proximas = Array.from(proximasMap.values());

    // 4. VENCIDAS 
    const vencidasRaw = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, fechaProximoContacto: { lt: hoy } },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { fechaProximoContacto: 'desc' }
    });
    const vencidasMap = new Map();
    vencidasRaw.forEach(v => { if(!vencidasMap.has(v.institucionId)) vencidasMap.set(v.institucionId, v); });
    const vencidas = Array.from(vencidasMap.values());
    
    // 5. SIN ASIGNAR 
    const sinAsignarEscuelas = await prisma.institution.findMany({
      where: { OR: [ { vendedorId: null }, { vendedorId: '' }, { visitas: { none: {} } } ] },
      include: { parroquia: { include: { canton: { include: { provincia: true } } } } },
      orderBy: { nombre: 'asc' }
    });

    // 6. CORRECCIONES DE CONTRATO (Candado Abierto)
    const correcciones = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, edicionFechaHabilitada: true },
      include: { institucion: { include: { parroquia: { include: { canton: { include: { provincia: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });

    const instWhere = targetUserId 
      ? { vendedorId: targetUserId } 
      : { vendedorId: { not: null }, NOT: { vendedorId: '' } };

    const totalAsignadas = await prisma.institution.count({ where: instWhere });
    
    // Cobertura: Solo cuenta las escuelas que ya tienen una gestión REAL (No pendiente)
    const visitadasCount = await prisma.institution.count({
      where: { ...instWhere, visitas: { some: { estadoGestion: { notIn: estadosPendientes } } } }
    });
    const porcentaje = totalAsignadas === 0 ? 0 : Math.round((visitadasCount / totalAsignadas) * 100);

    const formatearFechaExacta = (fechaObj: any) => {
      if (!fechaObj) return null;
      const d = new Date(fechaObj);
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
      }
      return d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" });
    };

    const mapVisita = (v: any) => ({
      id: v.id, institucionId: v.institucionId, nombreInstitucion: v.institucion?.nombre || 'Desconocida',
      provinciaId: v.institucion?.parroquia?.canton?.provincia?.id, cantonId: v.institucion?.parroquia?.canton?.id,
      canton: v.institucion?.parroquia?.canton?.nombre, parroquia: v.institucion?.parroquia?.nombre,
      estadoComercial: v.estadoGestion, 
      fechaProgramada: formatearFechaExacta(v.fechaProgramada),
      fechaVisitaReal: v.createdAt, 
      fechaProximoContacto: formatearFechaExacta(v.fechaProximoContacto),
      resumenAcuerdos: v.resumenAcuerdos || 'Sin registros', tipoGestion: v.tipoGestion,
      edicionFechaHabilitada: v.edicionFechaHabilitada
    });

    const mapSinAsignar = (inst: any) => ({
      id: inst.id, institucionId: inst.id, nombreInstitucion: inst.nombre,
      provinciaId: inst.parroquia?.canton?.provincia?.id, cantonId: inst.parroquia?.canton?.id,
      canton: inst.parroquia?.canton?.nombre, parroquia: inst.parroquia?.nombre,
      estadoComercial: inst.estadoComercial || 'Sin Asignar', fechaProgramada: '',
      fechaVisitaReal: inst.createdAt, fechaProximoContacto: null,
      resumenAcuerdos: 'Escuela libre / Sin vendedor ni visitas previas', tipoGestion: 'Prospección',
      edicionFechaHabilitada: false
    });

    return NextResponse.json({
      ruta: rutaHoy.map(mapVisita), 
      visitadas: visitadas.map(mapVisita), 
      proximas: proximas.map(mapVisita),
      vencidas: vencidas.map(mapVisita), 
      sinAsignar: sinAsignarEscuelas.map(mapSinAsignar),
      correcciones: correcciones.map(mapVisita),
      cobertura: { asignadas: totalAsignadas, visitadas: visitadasCount, porcentaje }
    });
    
  } catch (error) {
    console.error("Error en agenda:", error);
    return NextResponse.json({ error: 'Error al cargar agenda' }, { status: 500 });
  }
}