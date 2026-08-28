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
        departamento: true 
      },
      orderBy: { nombre: 'asc' }
    });

    const data = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rolNombre: u.rol.nombre,
      rolId: u.rolId,
      activo: u.activo,
      bloqueado: u.bloqueado,
      departamentoId: u.departamentoId, 
      departamento: u.departamento     
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {

    const { nombre, email, password, rolId, departamentoId } = await request.json();
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    const hashedPassword = await argon2.hash(password);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: hashedPassword,
        rolId: parseInt(rolId),
        departamentoId: departamentoId ? parseInt(departamentoId) : null
      }
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }
    const { id, nombre, email, rolId, activo, password, departamentoId } = await request.json();
    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (email) updateData.email = email;
    if (rolId) updateData.rolId = parseInt(rolId);
    if (activo !== undefined) updateData.activo = activo;
    if (departamentoId !== undefined) {
      updateData.departamentoId = departamentoId ? parseInt(departamentoId) : null;
    }
    if (password) updateData.passwordHash = await argon2.hash(password);
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}