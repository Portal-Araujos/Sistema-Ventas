import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const { visitaId, habilitar } = await request.json();
    const actualizado = await prisma.visitaAgenda.update({
      where: { id: visitaId },
      data: { edicionFechaHabilitada: habilitar },
    });
    return NextResponse.json({
      success: true,
      estado: actualizado.edicionFechaHabilitada,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al cambiar candado" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const { visitaId, nuevaFecha } = await request.json();
    const visita = await prisma.visitaAgenda.findUnique({
      where: { id: visitaId },
    });
    if (!visita || !visita.edicionFechaHabilitada) {
      return NextResponse.json(
        { error: "Esta visita no está habilitada para edición" },
        { status: 403 },
      );
    }
    const fechaBase = new Date(`${nuevaFecha}T12:00:00Z`);
    const ventas = await prisma.venta.findMany({ where: { visitaId } });
    const numerosContrato = ventas.map((v) => v.numContrato).filter(Boolean);
    await prisma.$transaction([
      prisma.visitaAgenda.update({
        where: { id: visitaId },
        data: { createdAt: fechaBase, edicionFechaHabilitada: false },
      }),
      prisma.venta.updateMany({
        where: { visitaId },
        data: { fechaVenta: fechaBase },
      }),
      ...(numerosContrato.length > 0
        ? [
            prisma.pedido.updateMany({
              where: { numContrato: { in: numerosContrato } },
              data: { fechaPedido: fechaBase, createdAt: fechaBase },
            }),
          ]
        : []),
    ]);
    return NextResponse.json({
      success: true,
      message: "Fechas actualizadas correctamente",
    });
  } catch (error) {
    console.error("Error retroactivo:", error);
    return NextResponse.json(
      { error: "Error al actualizar las fechas" },
      { status: 500 },
    );
  }
}
