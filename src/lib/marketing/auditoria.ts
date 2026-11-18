import prisma from "@/lib/prisma";
import type { AccionAuditoriaMarketing } from "./types";

type RegistroAuditoria = {
  accion: AccionAuditoriaMarketing;
  cargaId?: string | null;
  nombreArchivo?: string | null;
  detalles?: Record<string, unknown>;
  usuarioId?: string | null;
};

export async function registrarAuditoriaMarketing({
  accion,
  cargaId = null,
  nombreArchivo = null,
  detalles,
  usuarioId = null,
}: RegistroAuditoria) {
  await prisma.marketingAuditoria.create({
    data: {
      accion,
      cargaId,
      nombreArchivo,
      detalles: detalles ? JSON.stringify(detalles) : null,
      usuarioId,
    },
  });
}
