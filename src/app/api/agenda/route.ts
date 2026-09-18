import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userIdSession = payload.id as string;
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get("vendedorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const esAdmin = userRol === "super_admin" || userRol === "administrador";
    const targetUserId =
      esAdmin && vendedorId ? vendedorId : !esAdmin ? userIdSession : null;

    const hoy = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }),
    );
    hoy.setHours(0, 0, 0, 0);
    const start = fechaDesde ? new Date(`${fechaDesde}T00:00:00-05:00`) : hoy;
    const end = fechaHasta
      ? new Date(`${fechaHasta}T23:59:59.999-05:00`)
      : new Date(hoy.getTime() + 24 * 60 * 60 * 1000 - 1);

    const baseWhereVisita: any = {};
    if (targetUserId) baseWhereVisita.usuarioId = targetUserId;

    const estadosPendientes = ["Pendiente", "No Visitada", "No visitada"];

    // Obtenemos TODAS las realizadas para validar si hay promesas rotas
    const todasRealizadas = await prisma.visitaAgenda.findMany({
      where: {
        ...baseWhereVisita,
        estadoGestion: { notIn: estadosPendientes },
      },
      select: { institucionId: true, createdAt: true },
    });

    const lastVisitMap = new Map<string, Date>();
    todasRealizadas.forEach((v) => {
      const existing = lastVisitMap.get(v.institucionId);
      if (!existing || v.createdAt > existing) {
        lastVisitMap.set(v.institucionId, v.createdAt);
      }
    });

    // 🔥 NUEVA LÓGICA DE VALIDACIÓN 🔥
    const isNotFulfilled = (v: any) => {
      const lastVisit = lastVisitMap.get(v.institucionId);
      if (!lastVisit) return true;
      // Si esta visita ES la última realizada, su promesa futura de contacto sigue viva
      if (v.createdAt.getTime() >= lastVisit.getTime()) return true;

      // Si es una visita vieja, verificamos si su fecha prometida aún es válida
      const fechaTarget = v.fechaProximoContacto
        ? new Date(v.fechaProximoContacto)
        : new Date(v.fechaProgramada);
      return fechaTarget > lastVisit;
    };

    // 🔥 RUTA RAW (Con nueva inteligencia y ORDEN POR HORA) 🔥
    const rutaRaw = await prisma.visitaAgenda.findMany({
      where: {
        ...baseWhereVisita,
        OR: [
          {
            estadoGestion: { in: estadosPendientes },
            fechaProgramada: { gte: start, lte: end },
          },
          {
            estadoGestion: { notIn: estadosPendientes },
            fechaProximoContacto: { gte: start, lte: end },
          },
        ],
      },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } },
            },
          },
        },
      },
      orderBy: [{ fechaProgramada: "asc" }, { horaProgramada: "asc" }],
    });

    const visitadas = await prisma.visitaAgenda.findMany({
      where: {
        ...baseWhereVisita,
        estadoGestion: { notIn: estadosPendientes },
        createdAt: { gte: start, lte: end },
      },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 🔥 PRÓXIMAS RAW 🔥
    const proximasRaw = await prisma.visitaAgenda.findMany({
      where: {
        ...baseWhereVisita,
        OR: [
          {
            estadoGestion: { in: estadosPendientes },
            fechaProgramada: { gt: end },
          },
          {
            estadoGestion: { notIn: estadosPendientes },
            fechaProximoContacto: { gt: end },
          },
        ],
      },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } },
            },
          },
        },
      },
      orderBy: [{ fechaProgramada: "asc" }, { horaProgramada: "asc" }],
    });

    // 🔥 VENCIDAS RAW 🔥
    const vencidasRaw = await prisma.visitaAgenda.findMany({
      where: {
        ...baseWhereVisita,
        OR: [
          {
            estadoGestion: { in: estadosPendientes },
            fechaProgramada: { lt: hoy },
          },
          {
            estadoGestion: { notIn: estadosPendientes },
            fechaProximoContacto: { lt: hoy },
          },
        ],
      },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } },
            },
          },
        },
      },
      orderBy: [{ fechaProgramada: "desc" }, { horaProgramada: "desc" }],
    });

    const ruta = rutaRaw.filter(isNotFulfilled);

    const proximasMap = new Map();
    proximasRaw.filter(isNotFulfilled).forEach((v) => {
      if (!proximasMap.has(v.institucionId))
        proximasMap.set(v.institucionId, v);
    });
    const proximas = Array.from(proximasMap.values());

    const vencidasMap = new Map();
    vencidasRaw.filter(isNotFulfilled).forEach((v) => {
      if (!vencidasMap.has(v.institucionId))
        vencidasMap.set(v.institucionId, v);
    });
    const vencidas = Array.from(vencidasMap.values());

    const sinAsignarEscuelas = await prisma.institution.findMany({
      where: {
        OR: [
          { vendedorId: null },
          { vendedorId: "" },
          { visitas: { none: {} } },
        ],
      },
      include: {
        parroquia: { include: { canton: { include: { provincia: true } } } },
      },
      orderBy: { nombre: "asc" },
    });

    const correcciones = await prisma.visitaAgenda.findMany({
      where: { ...baseWhereVisita, edicionFechaHabilitada: true },
      include: {
        institucion: {
          include: {
            parroquia: {
              include: { canton: { include: { provincia: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const instWhere = targetUserId
      ? { vendedorId: targetUserId }
      : { vendedorId: { not: null }, NOT: { vendedorId: "" } };
    const totalAsignadas = await prisma.institution.count({ where: instWhere });
    const visitadasCount = await prisma.institution.count({
      where: {
        ...instWhere,
        visitas: { some: { estadoGestion: { notIn: estadosPendientes } } },
      },
    });
    const porcentaje =
      totalAsignadas === 0
        ? 0
        : Math.round((visitadasCount / totalAsignadas) * 100);

    const formatearFechaExacta = (fechaObj: any) => {
      if (!fechaObj) return null;
      const d = new Date(fechaObj);
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}/${d.getUTCFullYear()}`;
      }
      return d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" });
    };

    // 🔥 TRADUCTOR DE ESTADOS PARA EL FRONTEND 🔥
    const mapVisita = (v: any, forceRealState = false) => {
      let estadoVirtual = v.estadoGestion;
      let dateToShow = formatearFechaExacta(v.fechaProgramada);

      // Si es un Seguimiento Futuro (Ya la visitó, pero prometió volver)
      if (
        !forceRealState &&
        !estadosPendientes.includes(v.estadoGestion) &&
        v.fechaProximoContacto
      ) {
        estadoVirtual = "Seguimiento";
        dateToShow = formatearFechaExacta(v.fechaProximoContacto);
      }

      return {
        id: v.id,
        institucionId: v.institucionId,
        nombreInstitucion: v.institucion?.nombre || "Desconocida",
        provinciaId: v.institucion?.parroquia?.canton?.provincia?.id,
        cantonId: v.institucion?.parroquia?.canton?.id,
        canton: v.institucion?.parroquia?.canton?.nombre,
        parroquia: v.institucion?.parroquia?.nombre,
        estadoComercial: estadoVirtual,
        fechaProgramada: dateToShow,
        horaProgramada: v.horaProgramada || "", // <-- Aseguramos la hora
        fechaVisitaReal: v.createdAt,
        fechaProximoContacto: formatearFechaExacta(v.fechaProximoContacto),
        resumenAcuerdos: v.resumenAcuerdos || "Sin registros",
        tipoGestion: v.tipoGestion,
        edicionFechaHabilitada: v.edicionFechaHabilitada,
      };
    };

    const mapSinAsignar = (inst: any) => ({
      id: inst.id,
      institucionId: inst.id,
      nombreInstitucion: inst.nombre,
      provinciaId: inst.parroquia?.canton?.provincia?.id,
      cantonId: inst.parroquia?.canton?.id,
      canton: inst.parroquia?.canton?.nombre,
      parroquia: inst.parroquia?.nombre,
      estadoComercial: inst.estadoComercial || "Sin Asignar",
      fechaProgramada: "",
      fechaVisitaReal: inst.createdAt,
      fechaProximoContacto: null,
      resumenAcuerdos: "Escuela libre / Sin vendedor ni visitas previas",
      tipoGestion: "Prospección",
      edicionFechaHabilitada: false,
    });

    return NextResponse.json({
      ruta: ruta.map((v) => mapVisita(v, false)),
      visitadas: visitadas.map((v) => mapVisita(v, true)),
      proximas: proximas.map((v) => mapVisita(v, false)),
      vencidas: vencidas.map((v) => mapVisita(v, false)),
      sinAsignar: sinAsignarEscuelas.map(mapSinAsignar),
      correcciones: correcciones.map((v) => mapVisita(v, true)),
      cobertura: {
        asignadas: totalAsignadas,
        visitadas: visitadasCount,
        porcentaje,
      },
    });
  } catch (error) {
    console.error("Error en agenda:", error);
    return NextResponse.json(
      { error: "Error al cargar agenda" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const body = await request.json();
    const {
      institucionId,
      usuarioId,
      fechaProgramada,
      horaProgramada,
      tipoGestion,
    } = body;
    const escuela = await prisma.institution.findUnique({
      where: { id: institucionId },
      include: { vendedor: { select: { nombre: true, id: true } } },
    });
    if (escuela && escuela.vendedorId && escuela.vendedorId !== usuarioId) {
      return NextResponse.json(
        {
          error: `Esta escuela le pertenece a ${escuela.vendedor?.nombre || "otro vendedor"}. Debes reasignarla desde el Módulo de Instituciones antes de agendar a otro vendedor.`,
        },
        { status: 400 },
      );
    }
    const visitaProblema = await prisma.visitaAgenda.findFirst({
      where: {
        institucionId: institucionId,
        estadoGestion: { in: ["Pendiente", "No Visitada", "No visitada"] },
      },
      include: { usuario: { select: { nombre: true } } },
    });
    if (visitaProblema) {
      const fechaVisitaObj = new Date(visitaProblema.fechaProgramada);
      const hoyObj = new Date();
      hoyObj.setHours(0, 0, 0, 0);
      const fechaFormateada = fechaVisitaObj.toLocaleDateString("es-EC", {
        timeZone: "UTC",
      });
      const nombreDueño =
        visitaProblema.usuario?.nombre || "el vendedor actual";
      if (fechaVisitaObj < hoyObj) {
        return NextResponse.json(
          {
            error: `¡Bloqueado! ${nombreDueño} tiene una visita VENCIDA del ${fechaFormateada} en esta escuela. Dile que la reporte antes de poder agendar otra vez.`,
          },
          { status: 400 },
        );
      } else {
        return NextResponse.json(
          {
            error: `¡Colisión! Esta escuela ya está agendada para ${nombreDueño} el día ${fechaFormateada}. No puedes asignarla dos veces.`,
          },
          { status: 400 },
        );
      }
    }
    await prisma.institution.update({
      where: { id: institucionId },
      data: { vendedorId: usuarioId },
    });
    const nuevaVisita = await prisma.visitaAgenda.create({
      data: {
        institucionId,
        usuarioId,
        fechaProgramada: new Date(`${fechaProgramada}T12:00:00Z`),
        horaProgramada: horaProgramada || "09:00",
        tipoGestion: tipoGestion || "Visita Presencial",
        estadoGestion: "Pendiente",
      },
    });
    return NextResponse.json(nuevaVisita);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno al agendar la visita" },
      { status: 500 },
    );
  }
}
