import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";

function parsearDetalles(valor: string | null): Record<string, unknown> | null {
  if (!valor) return null;
  try {
    const parsed: unknown = JSON.parse(valor);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const cargas = await prisma.marketingCarga.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombreArchivo: true,
        activo: true,
        totalRegistros: true,
        enviadoEn: true,
        createdAt: true,
        creadoPor: { select: { nombre: true } },
        _count: { select: { clientes: true } },
      },
    });
    const auditorias = await prisma.marketingAuditoria.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        accion: true,
        nombreArchivo: true,
        detalles: true,
        createdAt: true,
        usuario: { select: { nombre: true } },
      },
    });

    return NextResponse.json({
      cargas: cargas.map((carga) => ({
        id: carga.id,
        nombreArchivo: carga.nombreArchivo,
        activo: carga.activo,
        totalRegistros: carga.totalRegistros,
        clientes: carga._count.clientes,
        enviadoEn: carga.enviadoEn?.toISOString() ?? null,
        createdAt: carga.createdAt.toISOString(),
        creadoPor: carga.creadoPor.nombre,
      })),
      auditorias: auditorias.map((auditoria) => ({
        id: auditoria.id,
        accion: auditoria.accion,
        nombreArchivo: auditoria.nombreArchivo,
        detalles: parsearDetalles(auditoria.detalles),
        usuario: auditoria.usuario?.nombre ?? null,
        createdAt: auditoria.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error consultando historial de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el historial" },
      { status: 500 },
    );
  }
}
