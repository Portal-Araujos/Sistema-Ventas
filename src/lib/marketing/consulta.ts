import prisma from "@/lib/prisma";
import {
  conteosPorVendedor,
  estadosPorCliente,
  parsearRegistrosEnvio,
} from "./envios";
import { etiquetaCarga } from "./semana";
import {
  analizarCartera,
  FILTROS_SEMAFORO_VACIOS,
  GRUPOS_SEMAFORO,
  esColumnaOrdenableSemaforo,
  type DocumentoAnalisis,
  type FiltrosSemaforo,
  type OrdenSemaforo,
  type TabSemaforo,
} from "./semaforo";
import type { ClienteCartera } from "./types";

type ClienteCarteraRow = {
  fila: number;
  identificacion: string;
  nombreCliente: string;
  numDocumento: string;
  fechaEmision: string;
  fechaVence: string;
  total: string;
  ctas: string;
  abonado: string;
  cob: string;
  saldo: string;
  ven: string;
  dias: string;
  movil: string;
  vendedor: string;
  cuota: string;
  saldoFecha: string;
  categoriaOrigen: string;
  provincia: string;
  ciudad: string;
  direccion: string;
};

export function aClienteCartera(cliente: ClienteCarteraRow): ClienteCartera {
  return {
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
  };
}

export function anioMinimoDeAuditoria(detalles: string | null): number | null {
  if (!detalles) return null;
  try {
    const parsed: unknown = JSON.parse(detalles);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const valor = (parsed as Record<string, unknown>).anioMinimoSinContrato;
    return typeof valor === "number" &&
      Number.isInteger(valor) &&
      valor >= 1900 &&
      valor <= 2100
      ? valor
      : null;
  } catch {
    return null;
  }
}

export const includeCarga = {
  clientes: { orderBy: { fila: "asc" as const } },
  auditorias: {
    where: { accion: "CARGA_SUBIDA" },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { detalles: true },
  },
};

export async function obtenerCarga(cargaId: string) {
  if (cargaId) {
    return prisma.marketingCarga.findUnique({
      where: { id: cargaId },
      include: includeCarga,
    });
  }
  return prisma.marketingCarga.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "desc" },
    include: includeCarga,
  });
}

export type CargaMarketing = NonNullable<
  Awaited<ReturnType<typeof obtenerCarga>>
>;

export function analizarCarga(carga: CargaMarketing) {
  return analizarCartera(
    {
      ...carga,
      semana: etiquetaCarga(carga),
      anioMinimoSinContrato: anioMinimoDeAuditoria(
        carga.auditorias[0]?.detalles ?? null,
      ),
    },
    carga.clientes.map(aClienteCartera),
  );
}

export async function datosDeEnvios() {
  const [auditorias, vendedores] = await Promise.all([
    prisma.marketingAuditoria.findMany({
      where: { accion: "ENVIO_TICKET" },
      orderBy: { createdAt: "desc" },
      select: { id: true, detalles: true, createdAt: true },
    }),
    prisma.usuario.findMany({
      where: { activo: true, rol: { nombre: "vendedor" } },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const registros = parsearRegistrosEnvio(auditorias);
  return {
    registros,
    vendedores,
    estados: estadosPorCliente(registros),
    conteos: conteosPorVendedor(registros),
  };
}

export function tabValida(valor: string): TabSemaforo {
  if (valor === "resumen" || valor === "general" || valor === "sin-contrato") {
    return valor;
  }
  if (GRUPOS_SEMAFORO.some((grupo) => grupo.id === valor)) {
    return valor as TabSemaforo;
  }
  return "resumen";
}

export function ordenDeParams(params: URLSearchParams): OrdenSemaforo | null {
  const columna = params.get("ordenColumna") ?? "";
  const direccion = params.get("ordenDireccion") ?? "asc";
  if (!esColumnaOrdenableSemaforo(columna)) return null;
  if (direccion !== "asc" && direccion !== "desc") return null;
  return { columna, direccion };
}

export function filtrosDeParams(params: URLSearchParams): FiltrosSemaforo {
  const filtros: FiltrosSemaforo = { ...FILTROS_SEMAFORO_VACIOS };
  for (const clave of Object.keys(filtros) as (keyof FiltrosSemaforo)[]) {
    filtros[clave] = params.get(clave) ?? "";
  }
  return filtros;
}

export function baseDocumentosDe(
  analisis: ReturnType<typeof analizarCarga>,
  tab: TabSemaforo,
): DocumentoAnalisis[] {
  if (tab === "sin-contrato") return analisis.sinContrato;
  if (tab === "general") return [...analisis.documentos, ...analisis.sinContrato];
  return [
    ...analisis.documentos,
    ...analisis.sinContrato.filter((documento) => documento.grupo === tab),
  ];
}
