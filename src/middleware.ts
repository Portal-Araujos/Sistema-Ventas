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
    const rutasProtegidas: Record<string, string> = {
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
    for (const ruta in rutasProtegidas) {
      if (pathname.startsWith(ruta)) {
        const permisoRequerido = rutasProtegidas[ruta];
        if (permisoRequerido === 'super_admin_only' && rol !== 'super_admin') {
          return NextResponse.redirect(new URL('/agenda', request.url));
        }
        if (permisoRequerido !== 'super_admin_only' && !permisos.includes(permisoRequerido)) {
          return NextResponse.redirect(new URL('/agenda', request.url)); 
        }
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