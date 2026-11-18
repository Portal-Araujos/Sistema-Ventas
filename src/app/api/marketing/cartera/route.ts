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
  prepararCliente,
  redistribuirClientes,
  VENDEDORES_ACTUALES,
  type ClienteDistribuido,
  type ClienteRow,
  type MetricasMarketing,
} from "@/lib/marketing";

const METRICAS_VACIAS: MetricasMarketing = {
  registrosLeidos: 0,
  clientesHistoricos: 0,
  nuevasRelaciones: 0,
  yaEstabanAsignados: 0,
  pendientesRevision: 0,
};

export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  const esAdmin = hasPermission(session, "marketing:administrar");
  if (!esAdmin && !hasPermission(session, "marketing:ver")) return forbiddenResponse();

  try {
    const carga = await prisma.marketingCarga.findFirst({
      where: { activo: true },
      orderBy: { createdAt: "desc" },
      include: { clientes: { orderBy: { fila: "asc" } } },
    });

    if (!carga) {
      return NextResponse.json({
        carga: null,
        original: [],
        aplicado: [],
        metricas: METRICAS_VACIAS,
        vendedores: VENDEDORES_ACTUALES,
        resumenEnvio: [],
      });
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
    const { original, aplicado, metricas } = redistribuirClientes(filas);

    let visibles: ClienteDistribuido[] = aplicado;
    if (!esAdmin) {
      visibles = [];
      if (carga.enviadoEn) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: session.id },
          select: { nombre: true },
        });
        const canonico = canonizarVendedor(usuario?.nombre ?? "");
        if (canonico) {
          visibles = carga.clientes
            .map((cliente) => ({
              cliente,
              asignado: canonizarVendedor(cliente.vendedorAsignado),
            }))
            .filter((item) => item.asignado === canonico)
            .map(({ cliente, asignado }) =>
              prepararCliente(
                {
                  fila: cliente.fila,
                  identificacion: cliente.identificacion,
                  nombreCliente: cliente.nombreCliente,
                  movil: cliente.movil,
                  provincia: cliente.provincia,
                  ciudad: cliente.ciudad,
                  direccion: cliente.direccion,
                  vendedor: cliente.vendedor,
                },
                asignado || cliente.vendedor,
              ),
            );
        }
      }
    }

    return NextResponse.json({
      carga: {
        nombreArchivo: carga.nombreArchivo,
        createdAt: carga.createdAt.toISOString(),
        totalRegistros: carga.totalRegistros,
        enviadoEn: carga.enviadoEn?.toISOString() ?? null,
      },
      original: esAdmin ? original : [],
      aplicado: visibles,
      metricas,
      vendedores: VENDEDORES_ACTUALES,
      resumenEnvio: VENDEDORES_ACTUALES.map((vendedor) => ({
        vendedor,
        clientes: carga.clientes.filter(
          (cliente) => canonizarVendedor(cliente.vendedorAsignado) === vendedor,
        ).length,
      })),
    });
  } catch (error) {
    console.error("Error consultando cartera de Marketing:", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera" }, { status: 500 });
  }
}
