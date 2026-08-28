import { NextResponse } from 'next/server';
import * as argon2 from 'argon2';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';
    const bloqueoActivo = await prisma.bitacoraSeguridad.findFirst({
      where: {
        ip: ip,
        fechaBloqueoHasta: { gt: new Date() } // ¿El castigo sigue vigente?
      },
      orderBy: { createdAt: 'desc' }
    });
    if (bloqueoActivo) {
      return NextResponse.json({ 
        error: `Acceso denegado temporalmente por seguridad. La red detectó actividad inusual. Intente más tarde.` 
      }, { status: 429 }); // 429 = Too Many Requests
    }
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { rol: true } 
    });
    if (usuario && usuario.bloqueado) {
      return NextResponse.json({ 
        error: 'Tu cuenta ha sido bloqueada por seguridad tras múltiples intentos fallidos. Contacta al Administrador.' 
      }, { status: 403 });
    }
    if (!usuario || !usuario.activo) {
      // Registrar intento fallido silencioso
      await registrarFalloYCastigar(ip, email);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    const isValid = await argon2.verify(usuario.passwordHash, password);
    if (!isValid) {
      await registrarFalloYCastigar(ip, email);
      const nuevosFallos = usuario.intentosFallidos + 1;
      const debeBloquearse = nuevosFallos >= 3;
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { 
          intentosFallidos: nuevosFallos, 
          bloqueado: debeBloquearse 
        }
      });
      if (debeBloquearse) {
        return NextResponse.json({ error: '¡Atención! Has superado los 3 intentos. Tu cuenta ha sido bloqueada.' }, { status: 403 });
      }
      return NextResponse.json({ error: `Credenciales inválidas. Te quedan ${3 - nuevosFallos} intentos.` }, { status: 401 });
    }
    const sessionId = crypto.randomUUID(); 
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { 
        intentosFallidos: 0,
        tokenSesionActual: sessionId 
      }
    });

    const permisosUsuario = usuario.rol.permisos ? JSON.parse(usuario.rol.permisos) : [];
    const token = await new SignJWT({ 
      id: usuario.id, 
      rol: usuario.rol.nombre,
      permisos: permisosUsuario,
      sessionId: sessionId 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h') 
      .sign(JWT_SECRET);

    const response = NextResponse.json({ 
      success: true, 
      rol: usuario.rol.nombre,
      permisos: permisosUsuario 
    });
    response.cookies.set('session_token', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas en segundos
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Error en Login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
async function registrarFalloYCastigar(ip: string, email: string) {
  await prisma.bitacoraSeguridad.create({
    data: { ip, evento: 'LOGIN_FALLIDO', emailIntentado: email }
  });
  const config = await prisma.configuracionSeguridad.findUnique({ where: { id: 1 } });
  const esIpOficina = config?.ipOficina === ip;
  const limiteNivel1 = esIpOficina ? 30 : 5;  // 15 Minutos de bloqueo
  const limiteNivel2 = esIpOficina ? 50 : 10; // 30 Minutos de bloqueo
  const limiteNivel3 = esIpOficina ? 100 : 15; // 24 Horas de bloqueo
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const totalFallos = await prisma.bitacoraSeguridad.count({
    where: { ip: ip, evento: 'LOGIN_FALLIDO', createdAt: { gt: haceUnaHora } }
  });
  if (totalFallos === limiteNivel3) {
    await castigarIP(ip, 3, 24 * 60 * 60 * 1000);
  } else if (totalFallos === limiteNivel2) {
    await castigarIP(ip, 2, 30 * 60 * 1000);
  } else if (totalFallos === limiteNivel1) {
    await castigarIP(ip, 1, 15 * 60 * 1000);
  }
}
async function castigarIP(ip: string, nivelBloqueo: number, tiempoCastigoMs: number) {
  const hasta = new Date(Date.now() + tiempoCastigoMs);
  await prisma.bitacoraSeguridad.create({
    data: { 
      ip, 
      evento: 'RATE_LIMIT_ACTIVADO', 
      nivelBloqueo, 
      fechaBloqueoHasta: hasta 
    }
  });
  console.warn(`[SEGURIDAD] IP ${ip} bloqueada por nivel ${nivelBloqueo} hasta ${hasta}`);
}