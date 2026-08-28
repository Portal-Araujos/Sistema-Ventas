import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as argon2 from 'argon2';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        rol: true,
        institucionesAsignadas: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const dataFormateada = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rolId: u.rolId,
      rolNombre: u.rol.nombre,
      activo: u.activo,
      escuelasAsignadas: u.institucionesAsignadas.length,
      createdAt: u.createdAt
    }));

    return NextResponse.json(dataFormateada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const body = await request.json();
    const { nombre, email, password, rolId } = body;
    if (!nombre || !email || !password || !rolId) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ error: 'Este correo electrónico ya está registrado' }, { status: 400 });
    }
    const passwordHash = await argon2.hash(password);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rolId: parseInt(rolId),
        activo: true
      }
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json({ error: 'Error interno al crear usuario' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, activo, nombre, password } = body;
    if (!id) return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    const updateData: any = {};
    if (typeof activo === 'boolean') updateData.activo = activo;
    if (nombre) updateData.nombre = nombre;
    if (password) updateData.passwordHash = await argon2.hash(password);
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}