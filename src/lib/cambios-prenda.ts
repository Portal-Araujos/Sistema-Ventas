import { Prisma } from "@prisma/client";
import { ApiSession, hasPermission, isAdministrator } from "@/lib/api-auth";

export class CambioError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function puedeModificarProduccion(session: ApiSession) {
  return hasPermission(session, "pedidos:cambiar_produccion") || hasPermission(session, "produccion:cambiar_prenda");
}

export async function puedeConsultarCambio(tx: Prisma.TransactionClient, session: ApiSession, pedidoId: string | null) {
  if (!pedidoId) return false;
  try { await validarAccesoPedido(tx, session, pedidoId); return true; }
  catch (error) { if (error instanceof CambioError) return false; throw error; }
}

export function validarPrendaEnProduccion(detalle: { estadoOperacion: string; estadoProduccion: string; guiaDespachoId: string | null; recibidoPorVendedor: boolean }) {
  if (detalle.guiaDespachoId) throw new CambioError("La prenda tiene una guía activa. Primero anula el despacho desde el historial de guías.", 409);
  if (detalle.estadoOperacion !== "En produccion" || detalle.recibidoPorVendedor || detalle.estadoProduccion === "Terminado") {
    throw new CambioError("Solo se pueden modificar prendas que siguen en producción y no están recibidas", 409);
  }
}

export function validarPrendaRecibida(detalle: { recibidoPorVendedor: boolean; guiaDespachoId: string | null; cantidad: number }, cantidad: number) {
  if (!detalle.recibidoPorVendedor || !detalle.guiaDespachoId) throw new CambioError("Primero confirma la recepción de esta prenda", 409);
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > detalle.cantidad) throw new CambioError("La cantidad a cambiar debe estar entre 1 y las unidades recibidas");
}

export async function validarAccesoPedido(tx: Prisma.TransactionClient, session: ApiSession, pedidoId: string) {
  const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { institucion: true } });
  if (!pedido) throw new CambioError("Pedido no encontrado", 404);
  if (!isAdministrator(session) && !session.permisos.includes("operaciones:ver") && !session.permisos.includes("produccion:ver") &&
      !puedeModificarProduccion(session) && pedido.usuarioId !== session.id && pedido.institucion.vendedorId !== session.id) {
    throw new CambioError("No tienes acceso a este pedido", 403);
  }
  if (pedido.estado === "Borrador") throw new CambioError("El pedido todavía es un borrador");
  return pedido;
}

export function datosPrenda(prenda: { skuCodigo: string; tipoRopa: string; color: string; genero: string; talla: string; bordado: string | null; observacion: string | null }) {
  return { skuCodigo: prenda.skuCodigo, tipoRopa: prenda.tipoRopa, color: prenda.color, genero: prenda.genero, talla: prenda.talla, bordado: prenda.bordado, observacion: prenda.observacion };
}
