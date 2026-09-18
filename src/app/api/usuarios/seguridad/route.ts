import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as argon2 from "argon2";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== "super_admin" && payload.rol !== "administrador") {
      return NextResponse.json(
        { error: "Permisos insuficientes" },
        { status: 403 },
      );
    }
    const { action, usuarioId } = await request.json();
    if (action === "reset_password") {
      const tempPassword = "Sistemas2026*";
      const hash = await argon2.hash(tempPassword);

      await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          passwordHash: hash,
          bloqueado: false,
          intentosFallidos: 0,
          tokenSesionActual: null,
        },
      });
      return NextResponse.json({
        success: true,
        message: `Clave reseteada a: ${tempPassword}`,
      });
    }
    if (action === "toggle_bloqueo") {
      const user = await prisma.usuario.findUnique({
        where: { id: usuarioId },
      });
      const nuevoEstado = !user?.bloqueado;

      await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          bloqueado: nuevoEstado,
          intentosFallidos: nuevoEstado ? 3 : 0, // Si lo bloqueas, fingimos que falló 3 veces
          tokenSesionActual: nuevoEstado ? null : user?.tokenSesionActual, // Si se bloquea, se cierra su sesión
        },
      });
      return NextResponse.json({ success: true, bloqueado: nuevoEstado });
    }

    return NextResponse.json(
      { error: "Acción no reconocida" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error en seguridad de usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
