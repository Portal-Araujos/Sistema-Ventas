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
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { rol: true } 
    });
    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }
    const isValid = await argon2.verify(usuario.passwordHash, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    const permisosUsuario = usuario.rol.permisos ? JSON.parse(usuario.rol.permisos) : [];
    const token = await new SignJWT({ 
      id: usuario.id, 
      rol: usuario.rol.nombre,
      permisos: permisosUsuario 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h')
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
      maxAge: 60 * 60 * 8, 
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Error en Login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}