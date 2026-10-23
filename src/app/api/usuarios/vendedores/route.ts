import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as argon2 from "argon2";
import {
  forbiddenResponse,
  getApiSession,
  isAdministrator,
  unauthorizedResponse,
} from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();

    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { nombre: "vendedor" },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        rolId: true,
        rol: { select: { nombre: true } },
        institucionesAsignadas: { select: { id: true, nombre: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const dataFormateada = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rolId: u.rolId,
      rolNombre: u.rol.nombre,
      activo: u.activo,
      escuelasAsignadas: u.institucionesAsignadas.length,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(dataFormateada);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!isAdministrator(session)) return forbiddenResponse();

    const body = await request.json();
    const { nombre, email, password, rolId } = body;
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 },
      );
    }
    const rol = await prisma.rol.findUnique({
      where: { nombre: "vendedor" },
      select: { id: true },
    });
    if (!rol || (rolId !== undefined && Number(rolId) !== rol.id)) {
      return NextResponse.json({ error: "Rol de vendedor inválido" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existe = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
    });
    if (existe) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado" },
        { status: 400 },
      );
    }
    const passwordHash = await argon2.hash(password);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: normalizedEmail,
        passwordHash,
        rolId: rol.id,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rolId: true,
        activo: true,
      },
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error("Error creando usuario:", error);
    return NextResponse.json(
      { error: "Error interno al crear usuario" },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!isAdministrator(session)) return forbiddenResponse();

    const body = await request.json();
    const { id, activo, nombre, password } = body;
    if (typeof id !== "string" || !id)
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 },
      );
    const vendedor = await prisma.usuario.findFirst({
      where: { id, rol: { nombre: "vendedor" } },
      select: { id: true },
    });
    if (!vendedor) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 404 },
      );
    }

    const updateData: {
      activo?: boolean;
      nombre?: string;
      passwordHash?: string;
      tokenSesionActual?: null;
    } = {};
    if (activo !== undefined) {
      if (typeof activo !== "boolean") {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }
      updateData.activo = activo;
    }
    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !nombre.trim()) {
        return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
      }
      updateData.nombre = nombre.trim();
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres" },
          { status: 400 },
        );
      }
      updateData.passwordHash = await argon2.hash(password);
      updateData.tokenSesionActual = null;
    }
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
      },
    });
    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 },
    );
  }
}
