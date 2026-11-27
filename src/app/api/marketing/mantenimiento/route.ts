import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
const KEEP_RECENTES = 2;

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:mantenimiento")) return forbiddenResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const meses = Number(body.meses);
    if (!Number.isInteger(meses) || meses < 1 || meses > 120) {
      return NextResponse.json({ error: "Cantidad de meses inválida" }, { status: 400 });
    }

    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - meses);

    const inactivas = await prisma.marketingCarga.findMany({
      where: { activo: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombreArchivo: true,
        createdAt: true,
        _count: { select: { clientes: true } },
      },
    });

    const protegidas = new Set(
      inactivas.slice(0, KEEP_RECENTES).map((carga) => carga.id),
    );
    const candidatas = inactivas.filter(
      (carga) => carga.createdAt < fechaLimite && !protegidas.has(carga.id),
    );

    if (!candidatas.length) {
      return NextResponse.json({
        eliminadas: 0,
        clientesEliminados: 0,
        protegidas: protegidas.size,
        fechaLimite: fechaLimite.toISOString(),
      });
    }

    const ids = candidatas.map((carga) => carga.id);
    const clientesEliminados = candidatas.reduce(
      (total, carga) => total + carga._count.clientes,
      0,
    );

    await prisma.$transaction(async (tx) => {
      await tx.marketingCarga.deleteMany({ where: { id: { in: ids } } });
      await tx.marketingAuditoria.create({
        data: {
          accion: "MANTENIMIENTO",
          detalles: JSON.stringify({
            meses,
            eliminadas: ids.length,
            clientesEliminados,
            protegidas: protegidas.size,
            fechaLimite: fechaLimite.toISOString(),
            archivos: candidatas.map((carga) => carga.nombreArchivo).slice(0, 50),
          }),
          usuarioId: session.id,
        },
      });
    });

    return NextResponse.json({
      eliminadas: ids.length,
      clientesEliminados,
      protegidas: protegidas.size,
      fechaLimite: fechaLimite.toISOString(),
    });
  } catch (error) {
    console.error("Error en mantenimiento de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo ejecutar el mantenimiento" },
      { status: 500 },
    );
  }
}
