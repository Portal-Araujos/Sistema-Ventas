import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { getJwtSecret } from "@/lib/jwt";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((permission: unknown) => typeof permission === "string")
  );
}

export async function POST(request: Request) {
  try {
    const { token, ip } = await request.json();
    if (typeof token !== "string") {
      return NextResponse.json({ valid: false, reason: "sesion_invalida" });
    }
    let payload;
    try {
      ({ payload } = await jwtVerify(token, getJwtSecret()));
    } catch {
      return NextResponse.json({ valid: false, reason: "sesion_invalida" });
    }
    if (
      typeof payload.id !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.rol !== "string"
    ) {
      return NextResponse.json({ valid: false, reason: "sesion_invalida" });
    }
    const user = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        tokenSesionActual: true,
        bloqueado: true,
        activo: true,
        rol: { select: { nombre: true, permisos: true } },
      },
    });
    if (!user || user.bloqueado || !user.activo) {
      return NextResponse.json({ valid: false, reason: "bloqueado" });
    }
    if (
      user.tokenSesionActual !== payload.sessionId ||
      user.rol.nombre !== payload.rol
    ) {
      return NextResponse.json({ valid: false, reason: "concurrencia" });
    }
    const currentPermissions: unknown = JSON.parse(user.rol.permisos || "[]");
    const tokenPermissions: unknown = payload.permisos;
    if (
      !isStringArray(currentPermissions) ||
      !isStringArray(tokenPermissions) ||
      [...currentPermissions].sort().join("\0") !==
        [...tokenPermissions].sort().join("\0")
    ) {
      return NextResponse.json({ valid: false, reason: "permisos_actualizados" });
    }
    if (payload.rol !== "super_admin" && payload.rol !== "vendedor") {
      const config = await prisma.configuracionSeguridad.findUnique({
        where: { id: 1 },
      });
      if (config && config.ipOficina && config.ipOficina.trim() !== "") {
        const rolesBloqueados = JSON.parse(config.rolesBloqueados || "[]");
        if (rolesBloqueados.includes(payload.rol)) {
          if (ip !== config.ipOficina) {
            return NextResponse.json({ valid: false, reason: "ip_invalida" });
          }
        }
      }
    }
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error en Verify Session:", error);
    return NextResponse.json(
      { valid: false, reason: "verificacion_fallida" },
      { status: 500 },
    );
  }
}
