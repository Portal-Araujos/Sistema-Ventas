import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getApiSession, hasPermission, unauthorizedResponse, type ApiSession } from "@/lib/api-auth";

const permisos: Record<string, string> = {
  TICKETS: "tickets:ver", PEDIDOS: "pedidos:ver", OPERACIONES: "operaciones:ver",
  PRODUCCION: "produccion:ver", EMPAQUE: "empaque:ver", AGENDA: "agenda:ver",
};

async function destinos(session: ApiSession) {
  const usuario = await prisma.usuario.findUnique({ where: { id: session.id }, select: { esJefe: true, departamentoId: true } });
  return [
    { usuarioDestinoId: session.id },
    { rolDestino: session.rol },
    ...(["administrador", "super_admin"].includes(session.rol) ? [{ rolDestino: "admin" }] : []),
    ...(usuario?.esJefe && usuario.departamentoId ? [{
      usuarioDestino: { is: { departamentoId: usuario.departamentoId } },
      tipoModulo: { not: "TICKETS" },
    }] : []),
  ];
}

function modulosPermitidos(session: ApiSession) {
  return Object.entries(permisos).filter(([, permiso]) => hasPermission(session, permiso)).map(([modulo]) => modulo);
}

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const destinatarios = await destinos(session);
    const notificaciones = await prisma.notificacion.findMany({
      where: {
        leido: false,
        tipoModulo: { in: modulosPermitidos(session) },
        OR: destinatarios,
        lecturas: { none: { usuarioId: session.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error("Error GET Notificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const destinatarios = await destinos(session);
    const body = await request.json();
    const id = Number(body.notificacionId);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Notificación inválida" }, { status: 400 });
    const notificacion = await prisma.notificacion.findFirst({
      where: { id, leido: false, tipoModulo: { in: modulosPermitidos(session) }, OR: destinatarios },
      select: { id: true },
    });
    if (!notificacion) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    await prisma.lecturaNotificacion.upsert({
      where: { notificacionId_usuarioId: { notificacionId: id, usuarioId: session.id } },
      create: { notificacionId: id, usuarioId: session.id },
      update: {},
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error PUT Notificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
