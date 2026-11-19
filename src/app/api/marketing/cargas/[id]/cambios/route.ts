import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { etiquetaCarga, resumenVacio } from "@/lib/marketing";
import type { ResumenCambiosMarketing, TipoCambioMarketing } from "@/lib/marketing";

const ORDEN: Record<string, number> = { ALTA: 0, CAMBIO: 1, BAJA: 2 };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const { id } = await params;
    const carga = await prisma.marketingCarga.findUnique({
      where: { id },
      select: {
        id: true,
        nombreArchivo: true,
        activo: true,
        createdAt: true,
        semanaNumero: true,
        mes: true,
        anio: true,
      },
    });
    if (!carga) {
      return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 });
    }

    const registros = await prisma.marketingCambio.findMany({
      where: { cargaId: id },
      select: {
        id: true,
        identificacion: true,
        nombreCliente: true,
        tipo: true,
        campo: true,
        valorAnterior: true,
        valorNuevo: true,
      },
    });

    const resumen: ResumenCambiosMarketing = resumenVacio();
    for (const registro of registros) {
      const tipo = registro.tipo as TipoCambioMarketing;
      if (tipo === "ALTA") resumen.altas += 1;
      if (tipo === "BAJA") resumen.bajas += 1;
      if (tipo === "CAMBIO") resumen.cambios += 1;
      resumen.total += 1;
    }

    registros.sort(
      (a, b) =>
        (ORDEN[a.tipo] ?? 99) - (ORDEN[b.tipo] ?? 99) ||
        a.identificacion.localeCompare(b.identificacion, "es") ||
        (a.campo ?? "").localeCompare(b.campo ?? "", "es"),
    );

    return NextResponse.json({
      carga: {
        id: carga.id,
        nombreArchivo: carga.nombreArchivo,
        semana: etiquetaCarga(carga),
        activo: carga.activo,
        createdAt: carga.createdAt.toISOString(),
      },
      resumen,
      cambios: registros,
    });
  } catch (error) {
    console.error("Error consultando cambios de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los cambios" },
      { status: 500 },
    );
  }
}
