import { getJwtSecret } from "@/lib/jwt";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { unlink } from "fs/promises";
import path from "path";



export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { payload } = await jwtVerify(token, getJwtSecret());
    const userRol = payload.rol as string;

    // Obtenemos el nombre del usuario directamente de la base de datos para que sea exacto
    const dbUser = await prisma.usuario.findUnique({
      where: { id: payload.id as string },
    });
    const userName = dbUser?.nombre || "Administrador";

    // 🔥 SEGURIDAD EXTREMA: Solo el super admin puede activar esto
    if (userRol !== "super_admin") {
      return NextResponse.json(
        { error: "Solo el Super Administrador puede hacer limpieza masiva" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { meses } = body;

    if (!meses || isNaN(meses))
      return NextResponse.json(
        { error: "Cantidad de meses inválida" },
        { status: 400 },
      );

    // Calculamos la fecha límite (Todo lo que sea MÁS VIEJO que esta fecha será borrado)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - parseInt(meses));

    const mensajesConAdjuntos = await prisma.mensajeTicket.findMany({
      where: {
        adjuntoUrl: { not: null },
        createdAt: { lt: fechaLimite },
      },
    });

    let borrados = 0;
    const fechaHoy = new Date().toLocaleDateString("es-EC", {
      timeZone: "America/Guayaquil",
    });

    // Ejecutamos el borrado físico y la actualización uno por uno
    for (const msg of mensajesConAdjuntos) {
      if (msg.adjuntoUrl) {
        const filename = path.basename(msg.adjuntoUrl);
        const paths = [
          path.join(process.cwd(), "storage", "uploads", filename),
          path.join(process.cwd(), "public", "uploads", filename),
        ];
        let fileRemoved = false;
        try {
          for (const filepath of paths) {
            try {
              await unlink(filepath);
              fileRemoved = true;
              break;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
            }
          }
        } catch (error) {
          console.log(
            `No se pudo eliminar el archivo físico ${msg.adjuntoUrl}:`,
            error,
          );
        }
        if (!fileRemoved) {
          console.info(
            `El archivo físico de ${msg.adjuntoUrl} no estaba en el disco.`,
          );
        }

        // Dejamos el rastro de auditoría que solicitaste
        await prisma.mensajeTicket.update({
          where: { id: msg.id },
          data: {
            adjuntoUrl: null,
            adjuntoTipo: null,
            adjuntoNombre: `🗑️ Imagen/Archivo eliminado masivamente el ${fechaHoy} por ${userName}`,
          },
        });
        borrados++;
      }
    }

    return NextResponse.json({ success: true, borrados });
  } catch (error) {
    console.error("Error en limpieza masiva:", error);
    return NextResponse.json(
      { error: "Error al ejecutar limpieza" },
      { status: 500 },
    );
  }
}
