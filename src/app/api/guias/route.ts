import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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