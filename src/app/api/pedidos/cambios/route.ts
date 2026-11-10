import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getApiSession, unauthorizedResponse } from "@/lib/api-auth";
import { CambioError, datosPrenda, puedeModificarProduccion, validarAccesoPedido, validarPrendaEnProduccion } from "@/lib/cambios-prenda";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  try {
    const pedidoId = new URL(request.url).searchParams.get("pedidoId") || "";
    await validarAccesoPedido(prisma, session, pedidoId);
    const [detalles, usuarios, departamentos, skus] = await Promise.all([
      prisma.detallePedido.findMany({ where: { pedidoId }, include: {
        ticketsCambio: { select: { id: true, codigo: true, estado: true, cantidadCambio: true, motivoCambio: true }, orderBy: { createdAt: "desc" } },
        cambiosProduccion: { orderBy: { createdAt: "desc" } },
      } }),
      prisma.usuario.findMany({ where: { activo: true, bloqueado: false }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
      prisma.departamentoEmpresa.findMany({ where: { activo: true }, select: { id: true, nombre: true } }),
      prisma.catalogoSKU.findMany({ where: { activo: true, categoriaItem: "TEXTIL" }, orderBy: { codigo: "asc" } }),
    ]);
    return NextResponse.json({ detalles, usuarios, departamentos, skus, puedeModificar: puedeModificarProduccion(session) });
  } catch (error) { return responderError(error); }
}

export async function PUT(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!puedeModificarProduccion(session)) return NextResponse.json({ error: "Necesitas el permiso Modificar prendas en producción" }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.motivo !== "string" || body.motivo.trim().length < 10 || typeof body.detallePedidoId !== "string" || typeof body.skuCodigo !== "string") {
      throw new CambioError("Selecciona la prenda, el SKU y un motivo de al menos 10 caracteres");
    }
    await prisma.$transaction(async tx => {
      const detalle = await tx.detallePedido.findUnique({ where: { id: body.detallePedidoId } });
      if (!detalle) throw new CambioError("Prenda no encontrada", 404);
      const pedido = await validarAccesoPedido(tx, session, detalle.pedidoId);
      validarPrendaEnProduccion(detalle);
      const sku = await tx.catalogoSKU.findUnique({ where: { codigo: body.skuCodigo } });
      if (!sku?.activo || sku.categoriaItem !== "TEXTIL") throw new CambioError("Selecciona un SKU textil activo");
      const anterior = datosPrenda(detalle);
      const nuevo = { ...anterior, skuCodigo: sku.codigo, tipoRopa: sku.tipoRopa, color: sku.color, genero: sku.genero, talla: sku.talla };
      if (JSON.stringify(anterior) === JSON.stringify(nuevo)) throw new CambioError("Selecciona una prenda diferente");
      const usuario = await tx.usuario.findUniqueOrThrow({ where: { id: session.id }, select: { nombre: true } });
      await tx.detallePedido.update({ where: { id: detalle.id }, data: nuevo });
      await tx.cambioPrendaProduccion.create({ data: { detallePedidoId: detalle.id, usuarioId: session.id, usuarioNombre: usuario.nombre, motivo: body.motivo.trim(), anterior, nuevo } });
      await tx.pedido.update({ where: { id: pedido.id }, data: { updatedAt: new Date() } });
      await tx.notificacion.createMany({ data: [
        { titulo: "Prenda modificada en producción", mensaje: `Contrato ${pedido.numContrato}: ${detalle.skuCodigo} → ${sku.codigo}. Motivo: ${body.motivo.trim()}`, tipoModulo: "PRODUCCION", rolDestino: "produccion", urlDestino: `/produccion?pedidoId=${pedido.id}` },
        { titulo: "Cambio de prenda registrado", mensaje: `${usuario.nombre} modificó ${detalle.skuCodigo} por ${sku.codigo}. Motivo: ${body.motivo.trim()}`, tipoModulo: "PEDIDOS", usuarioDestinoId: pedido.usuarioId, urlDestino: "/pedidos" },
      ] });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true });
  } catch (error) { return responderError(error); }
}

function responderError(error: unknown) {
  if (error instanceof CambioError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (typeof error === "object" && error && "code" in error && error.code === "P2034") return NextResponse.json({ error: "La prenda cambió mientras guardabas. Actualiza y vuelve a intentar." }, { status: 409 });
  console.error("Error cambios de prenda", error);
  return NextResponse.json({ error: "No se pudo procesar el cambio" }, { status: 500 });
}
