import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // 🛡️ 1. CAPTURAR LA IP DEL USUARIO O BOT 🛡️
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // 🛡️ 2. RATE LIMITING: REVISAR SI LA IP ESTÁ CASTIGADA 🛡️
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

    // 🛡️ 3. REVISAR SI LA CUENTA ESTÁ BLOQUEADA POR LOS 3 INTENTOS FALLIDOS 🛡️
    if (usuario && usuario.bloqueado) {
      return NextResponse.json({ 
        error: 'Tu cuenta ha sido bloqueada por seguridad tras múltiples intentos fallidos. Contacta al Administrador.' 
      }, { status: 403 }); // 403 = Forbidden
    }

    if (!usuario || !usuario.activo) {
      // Registrar intento fallido silencioso
      await registrarFalloYCastigar(ip, email);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await argon2.verify(usuario.passwordHash, password);
    
    if (!isValid) {
      // 🛡️ 4. CONTRASEÑA INCORRECTA: SUBIR EL CONTADOR Y BLOQUEAR SI LLEGA A 3 🛡️
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

    // ============================================
    // 🚀 ¡LOGIN EXITOSO! PREPARAMOS LA SESIÓN
    // ============================================

    // 🛡️ 5. LLAVE ANTI-CLONACIÓN (Para el control de sesiones concurrentes) 🛡️
    const sessionId = crypto.randomUUID(); 

    // Reseteamos los intentos fallidos a 0 y guardamos la nueva llave en la BD
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { 
        intentosFallidos: 0,
        tokenSesionActual: sessionId 
      }
    });

    const permisosUsuario = usuario.rol.permisos ? JSON.parse(usuario.rol.permisos) : [];
    
    // 🛡️ 6. CREACIÓN DEL JWT (8 Horas exactas y lleva la llave anti-clon incrustada) 🛡️
    const token = await new SignJWT({ 
      id: usuario.id, 
      rol: usuario.rol.nombre,
      permisos: permisosUsuario,
      sessionId: sessionId // ¡Magia! El middleware usará esto para comparar con la BD
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

// ==============================================================
// 🧠 FUNCIÓN AUXILIAR: EL GUARDIA SILENCIOSO (RATE LIMITING)
// ==============================================================
async function registrarFalloYCastigar(ip: string, email: string) {
  // 1. El guardia anota el intento fallido en la bitácora
  await prisma.bitacoraSeguridad.create({
    data: { ip, evento: 'LOGIN_FALLIDO', emailIntentado: email }
  });

  // 2. Revisamos si la IP pertenece a la OFICINA CENTRAL (Whitelist)
  const config = await prisma.configuracionSeguridad.findUnique({ where: { id: 1 } });
  const esIpOficina = config?.ipOficina === ip;

  // 🔥 MAGIA: Si es la oficina, el límite sube muchísimo porque hay 10+ empleados.
  // Si es un atacante de internet, el límite es súper estricto.
  const limiteNivel1 = esIpOficina ? 30 : 5;  // 15 Minutos de bloqueo
  const limiteNivel2 = esIpOficina ? 50 : 10; // 30 Minutos de bloqueo
  const limiteNivel3 = esIpOficina ? 100 : 15; // 24 Horas de bloqueo

  // 3. Contamos cuántos errores lleva esta IP en la última hora
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const totalFallos = await prisma.bitacoraSeguridad.count({
    where: { ip: ip, evento: 'LOGIN_FALLIDO', createdAt: { gt: haceUnaHora } }
  });

  // 4. APLICAMOS EL CASTIGO SEGÚN EL LÍMITE QUE LE TOQUE
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