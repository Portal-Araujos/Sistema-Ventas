import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const lastActivity = request.cookies.get('last_activity')?.value;
  const { pathname } = request.nextUrl;

  // Dejamos pasar los recursos del sistema y las rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ==========================================
  // ⏱️ 1. CIERRE POR INACTIVIDAD (30 MINUTOS)
  // ==========================================
  const ahora = Date.now();
  const TIEMPO_INACTIVIDAD_MAX = 30 * 60 * 1000; // 30 Minutos en milisegundos

  if (lastActivity) {
    const tiempoInactivo = ahora - parseInt(lastActivity, 10);
    if (tiempoInactivo > TIEMPO_INACTIVIDAD_MAX) {
      // Pasó el tiempo. Lo botamos y borramos las cookies.
      const response = NextResponse.redirect(new URL('/login?error=inactividad', request.url));
      response.cookies.delete('session_token');
      response.cookies.delete('last_activity');
      return response;
    }
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const rol = payload.rol as string;
    const permisos = (payload.permisos as string[]) || [];
    const sessionId = payload.sessionId as string; // La llave anti-clon
    const userId = payload.id as string;

    // Capturamos la IP de donde se está conectando
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // ==========================================
    // 🛡️ 2. VERIFICAR CLONACIÓN Y FILTRO DE IP
    // ==========================================
    // Llamamos a nuestro "Puesto de Control" interno para validar la BD
    const verifyRes = await fetch(new URL('/api/auth/verify-session', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, ip, rol })
    });

    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      if (!verifyData.valid) {
        // Falló la seguridad (Alguien más entró o su IP es inválida)
        const response = NextResponse.redirect(new URL(`/login?error=${verifyData.reason}`, request.url));
        response.cookies.delete('session_token');
        response.cookies.delete('last_activity');
        return response;
      }
    }

    // ==========================================
    // 🚦 3. MATRIZ DE RUTAS Y PERMISOS
    // ==========================================
    let response = NextResponse.next();

    if (rol !== 'super_admin') {
      const rutasProtegidas: Record<string, string> = {
        '/configuracion/skus': 'skus:ver',
        '/pedidos': 'pedidos:ver',
        '/inicio': 'inicio:ver',
        '/instituciones': 'instituciones:ver',
        '/ventas': 'ventas:ver',
        '/agenda': 'agenda:ver',
        '/visitas': 'visitas:ver',
        '/seguimientos': 'seguimientos:ver',
        '/operaciones': 'operaciones:ver',
        '/produccion': 'produccion:ver',
        '/empaque': 'empaque:ver',
        '/hiatorial-despachos': 'historial-despachos:ver',
        '/indicadores': 'indicadores:ver',
        '/configuracion': 'configuracion:ver',
        '/usuarios': 'usuarios:gestionar',
        '/roles': 'super_admin_only'
      };

      const rutasOrdenadas = Object.keys(rutasProtegidas).sort((a, b) => b.length - a.length);

      for (const ruta of rutasOrdenadas) {
        if (pathname.startsWith(ruta)) {
          if (ruta === '/instituciones' && pathname !== '/instituciones' && !pathname.startsWith('/instituciones/nueva')) {
            break; // Lo dejamos pasar a submódulos de instituciones
          }

          const permisoRequerido = rutasProtegidas[ruta];

          if (permisoRequerido === 'super_admin_only' || !permisos.includes(permisoRequerido)) {
            response = NextResponse.redirect(new URL('/agenda', request.url));
          }
          break;
        }
      }
    }

    // ==========================================
    // 🔄 4. REINICIAR EL RELOJ DE INACTIVIDAD
    // ==========================================
    // Cada vez que el usuario hace un clic y carga una página, le damos otros 30 minutos
    response.cookies.set('last_activity', ahora.toString(), {
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas máximo de jornada
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    // Si el token es inválido, manipulado o venció las 8 horas
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session_token');
    response.cookies.delete('last_activity');
    return response;
  }
}

export const config = {
  matcher: [
    // Se ejecuta en todas las pantallas EXCEPTO en la API y archivos estáticos
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};