import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as argon2 from "argon2";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "usuarios:gestionar")) {
      return forbiddenResponse();
    }

    const usuarios = await prisma.usuario.findMany({
      include: {
        rol: true,
        departamento: { select: { id: true, nombre: true, activo: true } },
      },
      orderBy: { nombre: "asc" },
    });

    const data = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rolNombre: u.rol.nombre,
      rolId: u.rolId,
      activo: u.activo,
      bloqueado: u.bloqueado,
      departamentoId: u.departamentoId,
      departamento: u.departamento,
      esJefe: u.esJefe,
    }));

    return NextResponse.json(data);
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
    if (!hasPermission(session, "usuarios:gestionar")) {
      return forbiddenResponse();
    }

    const { nombre, email, password, rolId, departamentoId, esJefe } =
      await request.json();
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      !Number.isSafeInteger(Number(rolId)) ||
      Number(rolId) < 1
    ) {
      return NextResponse.json(
        { error: "Datos de usuario inválidos" },
        { status: 400 },
      );
    }
    const rol = await prisma.rol.findUnique({
      where: { id: Number(rolId) },
      select: { id: true, nombre: true },
    });
    if (!rol) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 400 });
    }
    if (
      session.rol !== "super_admin" &&
      (rol.nombre === "super_admin" ||
        (rol.nombre === "administrador" && session.rol !== "administrador"))
    ) {
      return forbiddenResponse();
    }
    const parsedDepartmentId =
      departamentoId === null || departamentoId === "" || departamentoId === undefined
        ? null
        : Number(departamentoId);
    if (
      parsedDepartmentId !== null &&
      (!Number.isSafeInteger(parsedDepartmentId) || parsedDepartmentId < 1)
    ) {
      return NextResponse.json(
        { error: "Departamento inválido" },
        { status: 400 },
      );
    }
    if (parsedDepartmentId !== null) {
      const department = await prisma.departamentoEmpresa.findUnique({
        where: { id: parsedDepartmentId },
        select: { id: true },
      });
      if (!department) {
        return NextResponse.json(
          { error: "Departamento no encontrado" },
          { status: 400 },
        );
      }
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailExiste = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
    });
    if (emailExiste)
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 },
      );
    const hashedPassword = await argon2.hash(password);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        rolId: rol.id,
        departamentoId: parsedDepartmentId,
        esJefe: esJefe === true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rolId: true,
        activo: true,
        departamentoId: true,
        esJefe: true,
      },
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "usuarios:gestionar")) {
      return forbiddenResponse();
    }

    const {
      id,
      nombre,
      email,
      rolId,
      activo,
      password,
      departamentoId,
      esJefe,
    } = await request.json();
    if (typeof id !== "string" || !id) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 },
      );
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { rol: { select: { nombre: true } } },
    });
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }
    if (
      session.rol !== "super_admin" &&
      (usuario.rol.nombre === "super_admin" ||
        (usuario.rol.nombre === "administrador" &&
          session.rol !== "administrador"))
    ) {
      return forbiddenResponse();
    }

    const updateData: {
      nombre?: string;
      email?: string;
      rolId?: number;
      activo?: boolean;
      esJefe?: boolean;
      departamentoId?: number | null;
      passwordHash?: string;
      tokenSesionActual?: null;
    } = {};
    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !nombre.trim()) {
        return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
      }
      updateData.nombre = nombre.trim();
    }
    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return NextResponse.json({ error: "Email inválido" }, { status: 400 });
      }
      updateData.email = email.trim().toLowerCase();
    }
    if (rolId !== undefined) {
      const parsedRoleId = Number(rolId);
      if (!Number.isSafeInteger(parsedRoleId) || parsedRoleId < 1) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      const role = await prisma.rol.findUnique({
        where: { id: parsedRoleId },
        select: { id: true, nombre: true },
      });
      if (!role) {
        return NextResponse.json({ error: "Rol no encontrado" }, { status: 400 });
      }
      if (
        session.rol !== "super_admin" &&
        (role.nombre === "super_admin" ||
          (role.nombre === "administrador" &&
            session.rol !== "administrador"))
      ) {
        return forbiddenResponse();
      }
      updateData.rolId = role.id;
    }
    if (activo !== undefined) {
      if (typeof activo !== "boolean") {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }
      updateData.activo = activo;
    }
    if (esJefe !== undefined) {
      if (typeof esJefe !== "boolean") {
        return NextResponse.json(
          { error: "Estado de jefe inválido" },
          { status: 400 },
        );
      }
      updateData.esJefe = esJefe;
    }
    if (departamentoId !== undefined) {
      const parsedDepartmentId =
        departamentoId === null || departamentoId === ""
          ? null
          : Number(departamentoId);
      if (
        parsedDepartmentId !== null &&
        (!Number.isSafeInteger(parsedDepartmentId) || parsedDepartmentId < 1)
      ) {
        return NextResponse.json(
          { error: "Departamento inválido" },
          { status: 400 },
        );
      }
      updateData.departamentoId = parsedDepartmentId;
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
        rolId: true,
        activo: true,
        departamentoId: true,
        esJefe: true,
      },
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 },
    );
  }
}
