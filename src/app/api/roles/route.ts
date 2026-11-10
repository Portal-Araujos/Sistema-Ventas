import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERMISSION_IDS } from "@/lib/permissions";
import {
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!["roles:ver", "usuarios:ver", "usuarios:crear", "usuarios:editar", "usuarios:gestionar"].some(p => hasPermission(session, p))) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const roles = await prisma.rol.findMany({
      include: {
        _count: { select: { usuarios: true } },
      },
      orderBy: { id: "asc" },
    });

    const dataFormateada = roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion || "",
      permisos: JSON.parse(r.permisos || "[]"),
      usuariosCount: r._count.usuarios,
    }));

    return NextResponse.json(dataFormateada);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al cargar roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "roles:crear"))
      return NextResponse.json(
        { error: "Solo el Super Admin puede crear roles" },
        { status: 403 },
      );
    const { nombre, descripcion, permisos } = await request.json();
    if (String(nombre).toLowerCase().replace(/\s+/g, "_") === "super_admin" || !Array.isArray(permisos) || permisos.some(p => typeof p !== "string" || !PERMISSION_IDS.has(p))) return NextResponse.json({ error: "Rol o permisos inválidos" }, { status: 400 });
    const nuevoRol = await prisma.rol.create({
      data: {
        nombre: String(nombre).toLowerCase().replace(/\s+/g, "_"),
        descripcion,
        permisos: JSON.stringify(permisos || []),
      },
    });
    return NextResponse.json(nuevoRol, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear rol" }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "roles:editar"))
      return NextResponse.json(
        { error: "Solo el Super Admin puede editar roles" },
        { status: 403 },
      );
    const { id, descripcion, permisos } = await request.json();
    const actual = await prisma.rol.findUnique({ where: { id: Number(id) } });
    if (!actual || actual.nombre === "super_admin" || !Array.isArray(permisos) || permisos.some(p => typeof p !== "string" || (!PERMISSION_IDS.has(p) && !JSON.parse(actual.permisos || "[]").includes(p)))) return NextResponse.json({ error: "Rol protegido o permisos inválidos" }, { status: 400 });
    const rolActualizado = await prisma.rol.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        permisos: JSON.stringify(permisos || []),
      },
    });

    return NextResponse.json(rolActualizado);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar rol" },
      { status: 500 },
    );
  }
}
