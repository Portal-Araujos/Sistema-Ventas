import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// GET: Obtener todos los usuarios con su respectivo Rol
export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: { rol: true },
      orderBy: { createdAt: 'desc' }
    });

    const data = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      activo: u.activo,
      rolId: u.rolId,
      rolNombre: u.rol?.nombre.replace('_', ' ') || 'Sin rol',
      fechaCreacion: new Date(u.createdAt).toLocaleDateString('es-EC')
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST: Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const { nombre, email, password, rolId } = await request.json();

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });

    const hashedPassword = await argon2.hash(password);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: hashedPassword,
        rolId: parseInt(rolId)
      }
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

// PUT: Editar usuario (Cambiar Rol, Nombre o Estado)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const { id, nombre, email, rolId, activo, password } = await request.json();

    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (email) updateData.email = email;
    if (rolId) updateData.rolId = parseInt(rolId);
    if (activo !== undefined) updateData.activo = activo;
    if (password) updateData.password = await argon2.hash(password);

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}