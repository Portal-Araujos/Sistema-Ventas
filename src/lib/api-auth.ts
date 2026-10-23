import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { getJwtSecret } from "@/lib/jwt";

export type ApiSession = {
  id: string;
  sessionId: string;
  rol: string;
  permisos: string[];
};

export async function getApiSession(): Promise<ApiSession | null> {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;

  const secret = getJwtSecret();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret));
  } catch {
    return null;
  }

  if (
    typeof payload.id !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    return null;
  }

  const user = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      activo: true,
      bloqueado: true,
      tokenSesionActual: true,
      rol: { select: { nombre: true, permisos: true } },
    },
  });
  if (
    !user ||
    !user.activo ||
    user.bloqueado ||
    user.tokenSesionActual !== payload.sessionId
  ) {
    return null;
  }

  const parsedPermissions: unknown = JSON.parse(user.rol.permisos || "[]");
  if (
    !Array.isArray(parsedPermissions) ||
    !parsedPermissions.every((permission) => typeof permission === "string")
  ) {
    throw new Error(`Invalid permissions configured for role ${user.rol.nombre}.`);
  }

  return {
    id: user.id,
    sessionId: payload.sessionId,
    rol: user.rol.nombre,
    permisos: parsedPermissions,
  };
}

export function isAdministrator(session: ApiSession): boolean {
  return session.rol === "super_admin" || session.rol === "administrador";
}

export function hasPermission(
  session: ApiSession,
  permission: string,
): boolean {
  return isAdministrator(session) || session.permisos.includes(permission);
}

export function unauthorizedResponse() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "No tienes permisos" }, { status: 403 });
}
