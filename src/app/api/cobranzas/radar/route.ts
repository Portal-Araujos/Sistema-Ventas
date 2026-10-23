import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  InvalidTicketAttachmentError,
  storeTicketAttachment,
} from "@/lib/ticket-uploads";


export async function GET(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "cobranzas:ver")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get("vendedorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const hoy = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }),
    );
    hoy.setHours(0, 0, 0, 0);

    const start = fechaDesde ? new Date(`${fechaDesde}T00:00:00-05:00`) : hoy;
    const end = fechaHasta
      ? new Date(`${fechaHasta}T23:59:59.999-05:00`)
      : new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

    const visitaWhere: any = {
      fechaProgramada: { gte: start, lte: end },
    };
    if (session.rol === "vendedor") {
      visitaWhere.usuarioId = session.id;
    } else if (vendedorId) {
      visitaWhere.usuarioId = vendedorId;
    }

    const instituciones = await prisma.institution.findMany({
      where: {
        visitas: { some: visitaWhere },
      },
      include: {
        parroquia: { include: { canton: { include: { provincia: true } } } },
        vendedor: true,
        visitas: {
          where: visitaWhere,
          orderBy: [{ fechaProgramada: "asc" }, { horaProgramada: "asc" }],
          include: { usuario: true }, // 🔥 AQUÍ ESTÁ LA SOLUCIÓN AL ERROR 🔥
        },
        tickets: {
          where: {
            tipo: "Cobranza",
            estado: { notIn: ["Cerrado", "Resuelto"] },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const radarData = instituciones.map((inst) => {
      return {
        id: inst.id,
        nombre: inst.nombre,
        ubicacion: `${inst.parroquia?.canton?.provincia?.nombre || ""} - ${inst.parroquia?.canton?.nombre || ""}`,
        vendedorId: inst.visitas[0]?.usuarioId || inst.vendedorId,
        vendedorNombre:
          inst.visitas[0]?.usuario?.nombre ||
          inst.vendedor?.nombre ||
          "Sin Asignar",
        proximaVisita:
          inst.visitas.length > 0 ? inst.visitas[0].fechaProgramada : null,
        horaProgramada:
          inst.visitas.length > 0 ? inst.visitas[0].horaProgramada : null,
        ticketsActivos: inst.tickets.length,
        ticketsList: inst.tickets,
      };
    });

    return NextResponse.json(radarData);
  } catch (error) {
    console.error("Error en radar:", error);
    return NextResponse.json(
      { error: "Error al cargar radar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "cobranzas:ver")) {
      return forbiddenResponse();
    }
    const userId = session.id;

    const data = await request.formData();
    const institucionId = data.get("institucionId") as string;
    const vendedorId = data.get("vendedorId") as string;
    const deudor = data.get("deudor") as string;
    const monto = data.get("monto") as string;
    const instrucciones = data.get("instrucciones") as string;
    const fileEntry = data.get("file");
    if (fileEntry !== null && !(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Archivo adjunto inválido" }, { status: 400 });
    }
    const file = fileEntry instanceof File ? fileEntry : null;
    if (
      typeof institucionId !== "string" ||
      !institucionId ||
      typeof deudor !== "string" ||
      !deudor.trim() ||
      typeof monto !== "string" ||
      !Number.isFinite(Number(monto)) ||
      Number(monto) < 0 ||
      (vendedorId && typeof vendedorId !== "string")
    ) {
      return NextResponse.json(
        { error: "Datos de cobranza inválidos" },
        { status: 400 },
      );
    }
    const institucion = await prisma.institution.findUnique({
      where: { id: institucionId },
      select: {
        id: true,
        vendedorId: true,
        visitas: {
          where: { usuarioId: userId },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!institucion) {
      return NextResponse.json(
        { error: "Institución no encontrada" },
        { status: 404 },
      );
    }
    if (
      session.rol === "vendedor" &&
      institucion.vendedorId !== session.id &&
      institucion.visitas.length === 0
    ) {
      return forbiddenResponse();
    }
    const assignedSellerId = vendedorId || userId;
    if (session.rol === "vendedor" && assignedSellerId !== session.id) {
      return forbiddenResponse();
    }
    const assignedSeller = await prisma.usuario.findFirst({
      where: {
        id: assignedSellerId,
        activo: true,
        rol: { nombre: "vendedor" },
      },
      select: { id: true },
    });
    if (!assignedSeller) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 400 },
      );
    }

    let fileUrl = null;
    let fileTipo = null;
    let fileNombre = null;

    if (file) {
      const attachment = await storeTicketAttachment(file);
      fileUrl = attachment.url;
      fileTipo = attachment.mimeType;
      fileNombre = attachment.displayName;
    }

    const nuevoTicket = await prisma.ticketGestion.create({
      data: {
        codigo: `COB-${Date.now().toString().slice(-6)}`,
        tipo: "Cobranza",
        asunto: `Cobro a ${deudor} - Monto: $${monto}`,
        estado: "Abierto",
        prioridad: "Alta",
        institucionId: institucionId,
        creadorId: userId,
        asignados: {
          connect: { id: assignedSeller.id },
        },
      },
    });

    await prisma.mensajeTicket.create({
      data: {
        ticketId: nuevoTicket.id,
        remitenteId: userId,
        contenido: instrucciones || "Por favor realizar gestión de cobro.",
        esSistema: true,
        adjuntoUrl: fileUrl,
        adjuntoTipo: fileTipo,
        adjuntoNombre: fileNombre,
      },
    });

    return NextResponse.json({ success: true, ticket: nuevoTicket });
  } catch (error) {
    if (error instanceof InvalidTicketAttachmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Error al generar ticket" },
      { status: 500 },
    );
  }
}
