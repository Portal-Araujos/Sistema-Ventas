import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type ClientePrisma = Prisma.TransactionClient | typeof prisma;

export async function generarSiguienteCodigoTicket(
  cliente: ClientePrisma = prisma,
): Promise<string> {
  const tickets = await cliente.ticketGestion.findMany({
    where: { codigo: { startsWith: "TKT-" } },
    select: { codigo: true },
  });

  let maximo = 0;
  for (const ticket of tickets) {
    const numero = Number.parseInt(ticket.codigo.replace("TKT-", ""), 10);
    if (Number.isFinite(numero) && numero > maximo) maximo = numero;
  }

  return `TKT-${String(maximo + 1).padStart(3, "0")}`;
}
