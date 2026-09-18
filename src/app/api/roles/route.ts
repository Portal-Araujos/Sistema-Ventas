import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);

export async function GET() {
  try {
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
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== "super_admin")
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
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== "super_admin")
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
