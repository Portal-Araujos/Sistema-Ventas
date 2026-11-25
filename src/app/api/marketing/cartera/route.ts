import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  aplicarAsignacionesPersistidas,
  canonizarVendedor,
  etiquetaCarga,
  redistribuirClientes,
  resumenVacio,
  VENDEDORES_ACTUALES,
  type ClienteRow,
  type MetricasMarketing,
  type ResumenCambiosMarketing,
} from "@/lib/marketing";

const METRICAS_VACIAS: MetricasMarketing = {
  registrosLeidos: 0,
  clientesHistoricos: 0,
  nuevasRelaciones: 0,
  yaEstabanAsignados: 0,
  pendientesRevision: 0,
};

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const cargasDisponibles = await prisma.marketingCarga.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombreArchivo: true,
        createdAt: true,
        activo: true,
        semanaNumero: true,
        mes: true,
        anio: true,
      },
    });
    const listaCargas = cargasDisponibles.map((carga) => ({
      id: carga.id,
      nombreArchivo: carga.nombreArchivo,
      createdAt: carga.createdAt.toISOString(),
      semana: etiquetaCarga(carga),
      activo: carga.activo,
    }));

    const idSolicitado = new URL(request.url).searchParams.get("cargaId") || "";
    const carga = idSolicitado
      ? await prisma.marketingCarga.findUnique({
          where: { id: idSolicitado },
          include: { clientes: { orderBy: { fila: "asc" } } },
        })
      : await prisma.marketingCarga.findFirst({
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
        cargasDisponibles: listaCargas,
      });
    }

    const conteos = await prisma.marketingCambio.groupBy({
      by: ["tipo"],
      where: { cargaId: carga.id },
      _count: { _all: true },
    });
    const resumenCambios: ResumenCambiosMarketing = resumenVacio();
    for (const conteo of conteos) {
      const cantidad = conteo._count._all;
      if (conteo.tipo === "ALTA") resumenCambios.altas = cantidad;
      if (conteo.tipo === "BAJA") resumenCambios.bajas = cantidad;
      if (conteo.tipo === "CAMBIO") resumenCambios.cambios = cantidad;
      resumenCambios.total += cantidad;
    }

    const filas: ClienteRow[] = carga.clientes.map((cliente) => ({
      fila: cliente.fila,
      identificacion: cliente.identificacion,
      nombreCliente: cliente.nombreCliente,
      numDocumento: cliente.numDocumento,
      fechaEmision: cliente.fechaEmision,
      fechaVence: cliente.fechaVence,
      total: cliente.total,
      ctas: cliente.ctas,
      abonado: cliente.abonado,
      cob: cliente.cob,
      saldo: cliente.saldo,
      ven: cliente.ven,
      dias: cliente.dias,
      movil: cliente.movil,
      vendedor: cliente.vendedor,
      cuota: cliente.cuota,
      saldoFecha: cliente.saldoFecha,
      categoriaOrigen: cliente.categoriaOrigen,
      provincia: cliente.provincia,
      ciudad: cliente.ciudad,
      direccion: cliente.direccion,
    }));
    const asignadosPorFila = new Map<number, string>();
    for (const cliente of carga.clientes) {
      const canonico = canonizarVendedor(cliente.vendedorAsignado);
      if (canonico) asignadosPorFila.set(cliente.fila, canonico);
    }

    const { original, aplicado: propuesto, metricas } = redistribuirClientes(filas);
    const originalConAsignaciones = aplicarAsignacionesPersistidas(
      original,
      asignadosPorFila,
    );
    const aplicado = aplicarAsignacionesPersistidas(propuesto, asignadosPorFila);

    return NextResponse.json({
      carga: {
        id: carga.id,
        nombreArchivo: carga.nombreArchivo,
        createdAt: carga.createdAt.toISOString(),
        semana: etiquetaCarga(carga),
        esActiva: carga.activo,
        totalRegistros: carga.totalRegistros,
        enviadoEn: carga.enviadoEn?.toISOString() ?? null,
        cambios: resumenCambios,
      },
      original: originalConAsignaciones,
      aplicado,
      metricas,
      vendedores: VENDEDORES_ACTUALES,
      resumenEnvio: VENDEDORES_ACTUALES.map((vendedor) => ({
        vendedor,
        clientes: carga.clientes.filter(
          (cliente) => canonizarVendedor(cliente.vendedorAsignado) === vendedor,
        ).length,
      })),
      cargasDisponibles: listaCargas,
    });
  } catch (error) {
    console.error("Error consultando cartera de Marketing:", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera" }, { status: 500 });
  }
}
