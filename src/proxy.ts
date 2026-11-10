import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PAGE_PERMISSIONS, can } from "@/lib/permissions";
import { apiActionPermissions } from "@/lib/api-action-permissions";
import { getJwtSecret } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const lastActivity = request.cookies.get("last_activity")?.value;
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/login") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/verify-session" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isApiRequest = pathname.startsWith("/api/");
  const rejectRequest = (status = 401) => {
    const response = isApiRequest
      ? NextResponse.json({ error: "No autorizado" }, { status })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session_token");
    response.cookies.delete("last_activity");
    return response;
  };

  if (!token) {
    return rejectRequest();
  }
  const ahora = Date.now();
  const TIEMPO_INACTIVIDAD_MAX = 30 * 60 * 1000; // 30 Minutos en milisegundos

  if (lastActivity) {
    const tiempoInactivo = ahora - parseInt(lastActivity, 10);
    if (tiempoInactivo > TIEMPO_INACTIVIDAD_MAX) {
      const response = isApiRequest
        ? NextResponse.json(
            { error: "La sesión expiró por inactividad" },
            { status: 401 },
          )
        : NextResponse.redirect(
            new URL("/login?error=inactividad", request.url),
          );
      response.cookies.delete("session_token");
      response.cookies.delete("last_activity");
      return response;
    }
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.rol !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.id !== "string"
    ) {
      return rejectRequest();
    }
    const rol = payload.rol;
    const permisos = Array.isArray(payload.permisos)
      ? payload.permisos.filter((permission): permission is string =>
          typeof permission === "string",
        )
      : [];
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
    const verifyRes = await fetch(new URL("/api/auth/verify-session", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ip }),
      cache: "no-store",
    });
    if (!verifyRes.ok) {
      return isApiRequest
        ? NextResponse.json(
            { error: "No se pudo verificar la sesión" },
            { status: 503 },
          )
        : NextResponse.redirect(new URL("/login?error=verificacion", request.url));
    }
    const verifyData = await verifyRes.json();
    if (!verifyData.valid) {
      return rejectRequest();
    }

    let response = NextResponse.next();

    if (!isApiRequest && rol !== "super_admin") {
      const rutasProtegidas = PAGE_PERMISSIONS;

      const rutasOrdenadas = Object.keys(rutasProtegidas).sort(
        (a, b) => b.length - a.length,
      );

      for (const ruta of rutasOrdenadas) {
        if (pathname.startsWith(ruta)) {
          const permisoRequerido = rutasProtegidas[ruta];

          if (
            permisoRequerido === "super_admin_only" ||
            !permisos.includes(permisoRequerido)
          ) {
            response = NextResponse.redirect(new URL("/sin-acceso", request.url));
          }
          break;
        }
      }
    }
    if (isApiRequest && rol !== "super_admin") {
      const required = await apiActionPermissions(request);
      if (required.length && !required.some(permission => can({ rol, permisos }, permission))) return NextResponse.json({ error: "No tienes permiso para realizar esta acción" }, { status: 403 });
    }
    response.cookies.set("last_activity", ahora.toString(), {
      path: "/",
      maxAge: 60 * 60 * 8,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error al verificar la sesión:", error);
    return rejectRequest();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    "/uploads/:path*",
  ],
};
