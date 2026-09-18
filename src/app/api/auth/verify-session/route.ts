import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId, sessionId, ip, rol } = await request.json();
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { tokenSesionActual: true, bloqueado: true },
    });
    if (!user || user.bloqueado) {
      return NextResponse.json({ valid: false, reason: "bloqueado" });
    }
    if (user.tokenSesionActual !== sessionId) {
      return NextResponse.json({ valid: false, reason: "concurrencia" });
    }
    if (rol !== "super_admin" && rol !== "vendedor") {
      const config = await prisma.configuracionSeguridad.findUnique({
        where: { id: 1 },
      });
      if (config && config.ipOficina && config.ipOficina.trim() !== "") {
        const rolesBloqueados = JSON.parse(config.rolesBloqueados || "[]");
        if (rolesBloqueados.includes(rol)) {
          if (ip !== config.ipOficina) {
            return NextResponse.json({ valid: false, reason: "ip_invalida" });
          }
        }
      }
    }
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error en Verify Session:", error);
    return NextResponse.json({ valid: true });
  }
}
