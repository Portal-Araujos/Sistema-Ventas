import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function GET() {
  try {
    const departamentos = await prisma.departamentoEmpresa.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(departamentos);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener departamentos" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre } = body;
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }
    const nuevoDepto = await prisma.departamentoEmpresa.create({
      data: { nombre: nombre.trim() },
    });

    return NextResponse.json(
      { success: true, departamento: nuevoDepto },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Este departamento ya existe" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
