import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;
  // 1. Dejar pasar archivos estáticos, imágenes y la ruta de login
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  // 2. Si no hay token, patada al Login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  try {
    // 3. Leer Credencial (Token)
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const rol = payload.rol as string;
    const permisos = (payload.permisos as string[]) || [];
    // 4. El Super Admin es Dios, entra a todo sin preguntar
    if (rol === 'super_admin') return NextResponse.next();
    // 5. DICCIONARIO DE SEGURIDAD ESTRICTA (URL vs Permiso Requerido)
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
    // 6. Verificar si la URL que escribieron está protegida
    for (const ruta in rutasProtegidas) {
      if (pathname.startsWith(ruta)) {
        const permisoRequerido = rutasProtegidas[ruta];
        // Si intenta entrar a Roles y no es super_admin -> Bloqueado
        if (permisoRequerido === 'super_admin_only' && rol !== 'super_admin') {
          return NextResponse.redirect(new URL('/agenda', request.url));
        }
        // Si no tiene el check en su rol -> Bloqueado
        if (permisoRequerido !== 'super_admin_only' && !permisos.includes(permisoRequerido)) {
          // Lo rebotamos a su Agenda o una ruta segura
          return NextResponse.redirect(new URL('/agenda', request.url)); 
        }
      }
    }
    return NextResponse.next();
  } catch (error) {
    // Si el token es falso o expiró, al Login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};