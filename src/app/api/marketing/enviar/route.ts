import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  canonizarVendedor,
  redistribuirClientes,
  VENDEDORES_ACTUALES,
  type ClienteRow,
} from "@/lib/marketing";
import { registrarAuditoriaMarketing } from "@/lib/marketing/auditoria";

export async function POST() {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const carga = await prisma.marketingCarga.findFirst({
      where: { activo: true },
      orderBy: { createdAt: "desc" },
      include: { clientes: { orderBy: { fila: "asc" } } },
    });
    if (!carga) {
      return NextResponse.json(
        { error: "No hay una carga activa para enviar" },
        { status: 400 },
      );
    }

    const filas: ClienteRow[] = carga.clientes.map((cliente) => ({
      fila: cliente.fila,
      identificacion: cliente.identificacion,
      nombreCliente: cliente.nombreCliente,
      movil: cliente.movil,
      provincia: cliente.provincia,
      ciudad: cliente.ciudad,
      direccion: cliente.direccion,
      vendedor: cliente.vendedor,
    }));

    const { aplicado } = redistribuirClientes(filas);
    const asignadosPorFila = new Map<number, string>();
    for (const fila of aplicado) {
      const canonico = canonizarVendedor(fila.vendedorAsignado);
      if (canonico) asignadosPorFila.set(fila.fila, canonico);
    }

    const filasPorVendedor = new Map<string, number[]>();
    for (const [fila, vendedor] of asignadosPorFila) {
      const grupo = filasPorVendedor.get(vendedor) ?? [];
      grupo.push(fila);
      filasPorVendedor.set(vendedor, grupo);
    }

    const enviadoEn = new Date();
    await prisma.$transaction(
      async (tx) => {
        await tx.marketingCliente.updateMany({
          where: { cargaId: carga.id },
          data: { vendedorAsignado: null },
        });
        for (const [vendedor, numerosFila] of filasPorVendedor) {
          await tx.marketingCliente.updateMany({
            where: { cargaId: carga.id, fila: { in: numerosFila } },
            data: { vendedorAsignado: vendedor },
          });
        }
        await tx.marketingCarga.update({
          where: { id: carga.id },
          data: { enviadoEn },
        });
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    const conteos = new Map<string, number>();
    for (const vendedor of asignadosPorFila.values()) {
      conteos.set(vendedor, (conteos.get(vendedor) ?? 0) + 1);
    }
    const resumen = VENDEDORES_ACTUALES.map((vendedor) => ({
      vendedor,
      clientes: conteos.get(vendedor) ?? 0,
    }));

    await registrarAuditoriaMarketing({
      accion: "CARTERA_ENVIADA",
      cargaId: carga.id,
      nombreArchivo: carga.nombreArchivo,
      detalles: {
        totalEnviados: asignadosPorFila.size,
        totalRegistros: carga.totalRegistros,
        porVendedor: Object.fromEntries(conteos),
      },
      usuarioId: session.id,
    });

    return NextResponse.json({
      enviadoEn: enviadoEn.toISOString(),
      resumen,
      totalEnviados: asignadosPorFila.size,
    });
  } catch (error) {
    console.error("Error enviando cartera de Marketing:", error);
    const esTimeout =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2028";
    return NextResponse.json(
      {
        error: esTimeout
          ? "La operación tardó demasiado. Vuelve a intentarlo."
          : "No se pudo enviar la cartera",
      },
      { status: 500 },
    );
  }
}
