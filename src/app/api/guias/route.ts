import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getApiSession, hasPermission, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
export async function GET(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();

    const guias = await prisma.guiaDespacho.findMany({
      include: {
        // 🔥 MODIFICACIÓN 1: Le decimos que también traiga el vendedor desde la Institución
        institucion: { 
          select: { 
            id: true, 
            nombre: true,
            vendedor: { select: { nombre: true } } 
          } 
        },
        vendedor: { select: { id: true, nombre: true } },
        prendasDespachadas: {
          include: {
            pedido: { include: { detalles: true } },
          },
        },
      },
      orderBy: { fechaDespacho: "desc" },
    });

    const resultado = guias.map((guia: any) => {
      const pedidosInvolucrados = new Map();
      guia.prendasDespachadas.forEach((prenda: any) => {
        const ped = prenda.pedido;
        if (!pedidosInvolucrados.has(ped.id)) {
          const totalContrato = ped.detalles.reduce(
            (acc: number, d: any) => acc + (d.cantidad || 1),
            0,
          );
          const totalDespachadoHistorico = ped.detalles
            .filter((d: any) => d.guiaDespachoId !== null)
            .reduce((acc: number, d: any) => acc + (d.cantidad || 1), 0);
          pedidosInvolucrados.set(ped.id, {
            id: ped.id,
            numContrato: ped.numContrato || "S/N",
            nombreCliente: ped.nombreCliente || "Sin Cliente",
            totalPrendasContrato: totalContrato,
            totalDespachadoHistorico: totalDespachadoHistorico,
            saldoPendiente: totalContrato - totalDespachadoHistorico,
            prendasEnEstaGuia: [],
          });
        }
        pedidosInvolucrados.get(ped.id).prendasEnEstaGuia.push(prenda);
      });

      return {
        id: guia.id,
        puedeAnular: hasPermission(session, "empaque:anular"),
        codigoGuia: guia.codigoGuia,
        institucionNombre: guia.institucion?.nombre || "Sin Escuela",
        // 🔥 MODIFICACIÓN 2: Doble validación. Si no está en la guía, lo saca de la escuela.
        vendedorNombre: guia.vendedor?.nombre || guia.institucion?.vendedor?.nombre || "Vendedor No Asignado",
        responsable: guia.responsable,
        fechaDespacho: new Date(guia.fechaDespacho).toLocaleString("es-EC", {
          timeZone: "America/Guayaquil",
        }),
        totalPrendasEnGuia: guia.prendasDespachadas.reduce(
          (acc: number, p: any) => acc + p.cantidad,
          0,
        ),
        contratosInvolucrados: Array.from(pedidosInvolucrados.values()),
      };
    });
    
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "empaque:anular")) return forbiddenResponse();
  try {
    const { id, motivo } = await request.json();
    if (typeof id !== "string" || typeof motivo !== "string" || motivo.trim().length < 10) return NextResponse.json({ error: "Indica la guía y un motivo de al menos 10 caracteres" }, { status: 400 });
    await prisma.$transaction(async tx => {
      const guia = await tx.guiaDespacho.findUnique({ where: { id }, include: { prendasDespachadas: { select: { pedidoId: true, cantidad: true } } } });
      if (!guia) throw new Error("GUIA_NO_ENCONTRADA");
      const pedidoIds = [...new Set(guia.prendasDespachadas.map(d => d.pedidoId))];
      await tx.detallePedido.updateMany({ where: { guiaDespachoId: id }, data: { guiaDespachoId: null, estadoOperacion: "Pendiente en revision", estadoProduccion: "Planificacion", estadoEmpaque: "Pendiente", recibidoPorVendedor: false, fechaRecepcion: null, usuarioReceptorId: null } });
      await tx.pedido.updateMany({ where: { id: { in: pedidoIds } }, data: { estado: "En Operaciones", fechaInicioEmpaque: null, fechaFinEmpaque: null } });
      await tx.bitacoraSeguridad.create({ data: { usuarioId: session.id, ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "local", evento: JSON.stringify({ accion: "ANULAR_GUIA_DESPACHO", codigoGuia: guia.codigoGuia, guiaId: id, pedidoIds, motivo: motivo.trim() }) } });
      if (guia.vendedorId) await tx.notificacion.create({ data: { titulo: "Despacho anulado", mensaje: `Guía ${guia.codigoGuia} anulada. Motivo: ${motivo.trim()}. Sus prendas regresaron a revisión en Operaciones.`, tipoModulo: "PEDIDOS", usuarioDestinoId: guia.vendedorId, urlDestino: "/pedidos" } });
      await tx.guiaDespacho.delete({ where: { id } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "GUIA_NO_ENCONTRADA") return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 });
    return NextResponse.json({ error: "No se pudo anular el despacho. Actualiza y vuelve a intentar." }, { status: 409 });
  }
}
