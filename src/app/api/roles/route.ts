import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "usuarios:gestionar")) {
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
    if (session.rol !== "super_admin")
      return NextResponse.json(
        { error: "Solo el Super Admin puede crear roles" },
        { status: 403 },
      );
    const { nombre, descripcion, permisos } = await request.json();
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
    if (session.rol !== "super_admin")
      return NextResponse.json(
        { error: "Solo el Super Admin puede editar roles" },
        { status: 403 },
      );
    const { id, descripcion, permisos } = await request.json();
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
