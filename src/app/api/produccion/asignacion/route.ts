import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getApiSession, hasPermission, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";

// The order's existing assignee may be its default warehouse contact. Workshop
// ownership comes from the garment assignees. Lock the order before claiming
// unassigned workshop work so concurrent viewers cannot replace the first owner.
export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "produccion:ver")) return forbiddenResponse();
  const { pedidoIds } = await request.json();
  if (!Array.isArray(pedidoIds) || !pedidoIds.length || pedidoIds.length > 500 || !pedidoIds.every(id => typeof id === "string" && id.length > 0)) {
    return NextResponse.json({ error: "Selecciona los pedidos a abrir" }, { status: 400 });
  }
  try {
    const pedidos = await prisma.$transaction(async tx => {
      const ids = [...new Set<string>(pedidoIds)].sort();
      for (const id of ids) {
        await tx.$queryRaw`SELECT "id" FROM "pedidos" WHERE "id" = ${id} FOR UPDATE`;
        const pedido = await tx.pedido.findUnique({ where: { id }, select: { estado: true, detalles: {
          where: { estadoOperacion: "En produccion", guiaDespachoId: null, recibidoPorVendedor: false },
          select: { operarioAsignadoId: true },
        } } });
        if (!pedido || pedido.estado === "Borrador" || !pedido.detalles.length) continue;
        const responsable = pedido.detalles.find(d => d.operarioAsignadoId)?.operarioAsignadoId || session.id;
        // Preserve the warehouse contact on Pedido; the workshop's responsible
        // belongs to each garment and is displayed from those persisted values.
        await tx.detallePedido.updateMany({
          where: { pedidoId: id, operarioAsignadoId: null, estadoOperacion: "En produccion", guiaDespachoId: null, recibidoPorVendedor: false },
          data: { operarioAsignadoId: responsable },
        });
      }
      return tx.pedido.findMany({ where: { id: { in: ids }, estado: { not: "Borrador" } }, select: {
        id: true, operarioAsignadoId: true, operarioAsignado: { select: { id: true, nombre: true } },
        detalles: { where: { estadoOperacion: "En produccion", guiaDespachoId: null, recibidoPorVendedor: false }, select: { id: true, operarioAsignadoId: true, operarioAsignado: { select: { id: true, nombre: true } } } },
      } });
    });
    return NextResponse.json({ pedidos: pedidos.map(p => {
      const responsable = p.detalles.find(d => d.operarioAsignado)?.operarioAsignado;
      return { ...p, operarioAsignado: responsable || null, operarioAsignadoId: responsable?.id || null };
    }) });
  } catch (error) {
    console.error("Error autoasignando pedido", error);
    return NextResponse.json({ error: "No se pudo asignar el responsable. Vuelve a abrir el pedido." }, { status: 500 });
  }
}
