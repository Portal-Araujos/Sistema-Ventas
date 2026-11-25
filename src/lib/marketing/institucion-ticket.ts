import { Prisma } from "@prisma/client";

export const NOMBRE_INSTITUCION_MARKETING = "[SISTEMA] Cartera Marketing";

export async function obtenerInstitucionCarteraMarketing(
  cliente: Prisma.TransactionClient,
  creadorId: string,
): Promise<string> {
  const existente = await cliente.institution.findFirst({
    where: { nombre: NOMBRE_INSTITUCION_MARKETING },
    select: { id: true },
  });
  if (existente) return existente.id;

  const sostenimiento = await cliente.sostenimiento.findFirst({
    where: { activo: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  const jornada = await cliente.jornada.findFirst({
    where: { activo: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  const parroquia = await cliente.parroquia.findFirst({
    where: { activo: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!sostenimiento || !jornada || !parroquia) {
    throw new Error(
      "Faltan catálogos de sostenimiento, jornada o parroquia para crear el ticket de Marketing",
    );
  }

  const institucion = await cliente.institution.create({
    data: {
      nombre: NOMBRE_INSTITUCION_MARKETING,
      sostenimientoId: sostenimiento.id,
      jornadaId: jornada.id,
      parroquiaId: parroquia.id,
      creadoPor: creadorId,
    },
    select: { id: true },
  });

  return institucion.id;
}
