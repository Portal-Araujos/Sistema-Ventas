import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:mantenimiento")) return forbiddenResponse();

  try {
    const { id } = await params;
    const carga = await prisma.marketingCarga.findUnique({
      where: { id },
      select: {
        id: true,
        nombreArchivo: true,
        activo: true,
        _count: { select: { clientes: true } },
      },
    });
    if (!carga) {
      return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 });
    }
    if (carga.activo) {
      return NextResponse.json(
        { error: "No se puede eliminar la carga activa" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.marketingAuditoria.create({
        data: {
          accion: "CARGA_ELIMINADA",
          cargaId: carga.id,
          nombreArchivo: carga.nombreArchivo,
          detalles: JSON.stringify({
            modo: "individual",
            clientesEliminados: carga._count.clientes,
          }),
          usuarioId: session.id,
        },
      });
      await tx.marketingCarga.delete({ where: { id: carga.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando carga de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la carga" },
      { status: 500 },
    );
  }
}
