import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getApiSession,
  isAdministrator,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { detectStoredAttachmentType } from "@/lib/ticket-uploads";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();

  const { filename } = await context.params;
  if (
    path.basename(filename) !== filename ||
    !/^[A-Za-z0-9._-]+$/.test(filename) ||
    filename === "." ||
    filename === ".."
  ) {
    return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
  }

  const message = await prisma.mensajeTicket.findFirst({
    where: { adjuntoUrl: `/uploads/${filename}` },
    select: {
      ticket: {
        select: {
          creadorId: true,
          tipo: true,
          asignados: { select: { id: true } },
        },
      },
    },
  });
  if (!message) {
    return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
  }
  const user = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: {
      esJefe: true,
      departamento: { select: { nombre: true } },
    },
  });
  const canRead =
    isAdministrator(session) ||
    session.permisos.includes("ver_todos_tickets") ||
    message.ticket.creadorId === session.id ||
    message.ticket.asignados.some((assignee) => assignee.id === session.id) ||
    (user?.esJefe === true &&
      user.departamento?.nombre === message.ticket.tipo);
  if (!canRead) {
    return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
  }

  let fileBuffer: Buffer;
  try {
    const storagePath = path.join(process.cwd(), "storage", "uploads", filename);
    let filePath = storagePath;
    try {
      await stat(storagePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      filePath = path.join(process.cwd(), "public", "uploads", filename);
    }
    const fileInfo = await stat(filePath);
    if (fileInfo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo supera el tamaño permitido" },
        { status: 413 },
      );
    }
    fileBuffer = await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
    }
    console.error("Error al leer adjunto:", error);
    return NextResponse.json(
      { error: "Error al leer el adjunto" },
      { status: 500 },
    );
  }

  const detectedType = detectStoredAttachmentType(fileBuffer);
  if (!detectedType) {
    return NextResponse.json(
      { error: "Formato de adjunto no permitido" },
      { status: 415 },
    );
  }

  return new Response(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": detectedType.mimeType,
      "Content-Disposition":
        detectedType.mimeType === "application/pdf" ? "attachment" : "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
