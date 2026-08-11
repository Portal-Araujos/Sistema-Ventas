import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

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

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const rol = payload.rol as string;
    const permisos = (payload.permisos as string[]) || [];

    if (rol === 'super_admin') return NextResponse.next();

    // 🔥 Matriz de Rutas y sus Permisos Requeridos
    const rutasProtegidas: Record<string, string> = {
      '/configuracion/skus': 'skus:ver', // Se pone primero para que no choque con /configuracion
      '/pedidos': 'pedidos:ver',
      '/inicio': 'inicio:ver',
      '/instituciones': 'instituciones:ver',
      '/ventas': 'ventas:ver',
      '/agenda': 'agenda:ver',
      '/visitas': 'visitas:ver',
      '/seguimientos': 'seguimientos:ver',
      '/indicadores': 'indicadores:ver',
      '/configuracion': 'configuracion:ver',
      '/usuarios': 'usuarios:gestionar',
      '/roles': 'super_admin_only'
    };

    // Ordenamos las rutas de más larga a más corta para mayor precisión
    const rutasOrdenadas = Object.keys(rutasProtegidas).sort((a, b) => b.length - a.length);

    for (const ruta of rutasOrdenadas) {
      if (pathname.startsWith(ruta)) {
        
        // 🔥 LA SOLUCIÓN: EXCEPCIÓN PARA LA FICHA TÉCNICA 🔥
        // Si entra a /instituciones/[id], lo dejamos pasar.
        // Pero seguimos bloqueando la tabla (/instituciones) y el botón de crear (/instituciones/nueva)
        if (ruta === '/instituciones' && pathname !== '/instituciones' && !pathname.startsWith('/instituciones/nueva')) {
            return NextResponse.next(); // Lo dejamos pasar
        }

        const permisoRequerido = rutasProtegidas[ruta];

        if (permisoRequerido === 'super_admin_only' && rol !== 'super_admin') {
          return NextResponse.redirect(new URL('/agenda', request.url));
        }
        
        if (permisoRequerido !== 'super_admin_only' && !permisos.includes(permisoRequerido)) {
          return NextResponse.redirect(new URL('/agenda', request.url)); 
        }
        
        break; // Si ya validó su ruta, salimos del ciclo
      }
    }
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};