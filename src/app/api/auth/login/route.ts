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

    // 1. Buscar al usuario en la base de datos (incluyendo qué rol tiene)
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { rol: true } 
    });

    // Si no existe o está desactivado, rebotamos la petición
    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }

    // 2. Verificar la contraseña encriptada con Argon2
    const isValid = await argon2.verify(usuario.passwordHash, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // 3. Crear el Token de Sesión (JWT)
    const token = await new SignJWT({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      nombre: usuario.nombre
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h') // La sesión durará 8 horas
      .sign(JWT_SECRET);

    // 4. Crear la respuesta y guardar el token en una Cookie segura (httpOnly)
    const response = NextResponse.json({
      success: true,
      rol: usuario.rol.nombre,
      nombre: usuario.nombre
    });

    response.cookies.set('session_token', token, {
      httpOnly: true, // Evita que hackers roben la cookie con JavaScript
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