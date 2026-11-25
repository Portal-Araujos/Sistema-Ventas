import { aplicarFiltros, FILTRO_TODOS } from "./filtros";
import type { ClienteDistribuido, FiltrosMarketing } from "./types";

export type FiltrosAsignacionManual = Pick<FiltrosMarketing, "provincia" | "ciudad">;

export type SolicitudAsignacionManual = {
  cargaId?: string;
  vendedorId: string;
  filtros: FiltrosAsignacionManual;
  cantidad: number;
  semilla: string;
  filas?: number[];
};

export type ClienteAsignable = Pick<
  ClienteDistribuido,
  | "fila"
  | "identificacion"
  | "nombreCliente"
  | "movil"
  | "provincia"
  | "ciudad"
  | "direccion"
  | "vendedorOriginal"
  | "vendedorAsignado"
>;

const CANTIDAD_MAXIMA = 50_000;

function esFiltrosAsignacion(valor: unknown): valor is FiltrosAsignacionManual {
  if (!valor || typeof valor !== "object") return false;
  const objeto = valor as Record<string, unknown>;
  return (
    typeof objeto.provincia === "string" &&
    typeof objeto.ciudad === "string"
  );
}

export function conFiltrosVacios(
  filtros: FiltrosAsignacionManual,
): FiltrosMarketing {
  return {
    vendedor: FILTRO_TODOS,
    provincia: filtros.provincia,
    ciudad: filtros.ciudad,
  };
}

export function normalizarSolicitudAsignacion(
  valor: unknown,
): SolicitudAsignacionManual | null {
  if (!valor || typeof valor !== "object") return null;
  const objeto = valor as Record<string, unknown>;

  if (
    (objeto.cargaId !== undefined &&
      (typeof objeto.cargaId !== "string" || !objeto.cargaId.trim())) ||
    typeof objeto.vendedorId !== "string" ||
    !objeto.vendedorId.trim() ||
    !esFiltrosAsignacion(objeto.filtros) ||
    typeof objeto.cantidad !== "number" ||
    !Number.isSafeInteger(objeto.cantidad) ||
    objeto.cantidad < 1 ||
    objeto.cantidad > CANTIDAD_MAXIMA ||
    typeof objeto.semilla !== "string" ||
    !objeto.semilla.trim() ||
    objeto.semilla.length > 200
  ) {
    return null;
  }

  let filas: number[] | undefined;
  if (objeto.filas !== undefined) {
    if (
      !Array.isArray(objeto.filas) ||
      !objeto.filas.every(
        (fila) => typeof fila === "number" && Number.isSafeInteger(fila) && fila > 0,
      )
    ) {
      return null;
    }
    filas = [...new Set(objeto.filas)];
  }

  return {
    ...(objeto.cargaId ? { cargaId: objeto.cargaId.trim() } : {}),
    vendedorId: objeto.vendedorId.trim(),
    filtros: {
      provincia: objeto.filtros.provincia,
      ciudad: objeto.filtros.ciudad,
    },
    cantidad: objeto.cantidad,
    semilla: objeto.semilla.trim(),
    ...(filas ? { filas } : {}),
  };
}

function crearGenerador(semilla: string): () => number {
  let estado = 2166136261;
  for (let indice = 0; indice < semilla.length; indice += 1) {
    estado ^= semilla.charCodeAt(indice);
    estado = Math.imul(estado, 16777619);
  }

  return () => {
    estado += 0x6d2b79f5;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

export function seleccionarAleatoriamente<T>(
  filas: T[],
  cantidad: number,
  semilla: string,
): T[] {
  if (!Number.isSafeInteger(cantidad) || cantidad < 1) return [];
  if (filas.length === 0) return [];

  const copia = [...filas];
  const aleatorio = crearGenerador(semilla);

  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const otro = Math.floor(aleatorio() * (indice + 1));
    [copia[indice], copia[otro]] = [copia[otro], copia[indice]];
  }

  return copia.slice(0, Math.min(cantidad, copia.length));
}

export function aplicarAsignacionesPersistidas(
  filas: ClienteDistribuido[],
  asignadosPorFila: Map<number, string>,
): ClienteDistribuido[] {
  if (asignadosPorFila.size === 0) return filas;
  return filas.map((fila) => {
    const canonico = asignadosPorFila.get(fila.fila);
    return canonico ? { ...fila, vendedorAsignado: canonico } : fila;
  });
}

export function clientesCandidatos(
  filas: ClienteDistribuido[],
  filtros: FiltrosAsignacionManual,
  vendedorCanonico: string,
): ClienteDistribuido[] {
  return aplicarFiltros(filas, conFiltrosVacios(filtros)).filter(
    (fila) => fila.vendedorAsignado !== vendedorCanonico,
  );
}

export function aClienteAsignable(
  fila: ClienteDistribuido,
): ClienteAsignable {
  return {
    fila: fila.fila,
    identificacion: fila.identificacion,
    nombreCliente: fila.nombreCliente,
    movil: fila.movil,
    provincia: fila.provincia,
    ciudad: fila.ciudad,
    direccion: fila.direccion,
    vendedorOriginal: fila.vendedorOriginal,
    vendedorAsignado: fila.vendedorAsignado,
  };
}

export function describirFiltros(filtros: FiltrosAsignacionManual): string {
  const partes = [
    filtros.provincia === FILTRO_TODOS
      ? "Provincia: todas"
      : `Provincia: ${filtros.provincia}`,
    filtros.ciudad === FILTRO_TODOS ? "Ciudad: todas" : `Ciudad: ${filtros.ciudad}`,
  ];
  return partes.join(" · ");
}
