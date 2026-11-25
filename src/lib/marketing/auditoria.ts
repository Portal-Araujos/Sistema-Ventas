import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AccionAuditoriaMarketing } from "./types";

type ClientePrisma = Prisma.TransactionClient | typeof prisma;

type RegistroAuditoria = {
  accion: AccionAuditoriaMarketing;
  cargaId?: string | null;
  nombreArchivo?: string | null;
  detalles?: Record<string, unknown>;
  usuarioId?: string | null;
  cliente?: ClientePrisma;
};

export async function registrarAuditoriaMarketing({
  accion,
  cargaId = null,
  nombreArchivo = null,
  detalles,
  usuarioId = null,
  cliente = prisma,
}: RegistroAuditoria) {
  await cliente.marketingAuditoria.create({
    data: {
      accion,
      cargaId,
      nombreArchivo,
      detalles: detalles ? JSON.stringify(detalles) : null,
      usuarioId,
    },
  });
}
