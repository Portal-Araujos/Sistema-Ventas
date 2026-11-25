import { claveUbicacion, claveVendedor, normalizarTexto } from "./normalize";
import { VENDEDORES_ACTUALES } from "./vendedores";
import type {
  ClienteDistribuido,
  FiltroMetricaMarketing,
  FiltrosMarketing,
  OpcionFiltro,
} from "./types";

export const FILTRO_TODOS = "";
const FILTRO_SIN = "__SIN__";

export const FILTROS_VACIOS: FiltrosMarketing = {
  vendedor: FILTRO_TODOS,
  provincia: FILTRO_TODOS,
  ciudad: FILTRO_TODOS,
};

export function opcionesVendedor(): OpcionFiltro[] {
  return VENDEDORES_ACTUALES.map((nombre) => ({
    clave: claveVendedor(nombre),
    etiqueta: nombre,
  }));
}

export function opcionesConVacio(
  valores: string[],
  etiquetaVacio: string,
): OpcionFiltro[] {
  const mapa = new Map<string, string>();
  for (const valor of valores) {
    const texto = valor.trim();
    const clave = claveUbicacion(texto);
    if (!clave) {
      mapa.set(FILTRO_SIN, etiquetaVacio);
    } else if (!mapa.has(clave)) {
      mapa.set(clave, texto);
    }
  }
  return [...mapa.entries()]
    .map(([clave, etiqueta]) => ({ clave, etiqueta }))
    .sort((a, b) => {
      if (a.clave === FILTRO_SIN) return -1;
      if (b.clave === FILTRO_SIN) return 1;
      return a.etiqueta.localeCompare(b.etiqueta);
    });
}

function coincide(valorFiltro: string, claveFila: string): boolean {
  if (valorFiltro === FILTRO_TODOS) return true;
  if (valorFiltro === FILTRO_SIN) return claveFila === "";
  return claveFila === valorFiltro;
}

export function aplicarFiltros(
  filas: ClienteDistribuido[],
  filtros: FiltrosMarketing,
): ClienteDistribuido[] {
  return filas.filter(
    (fila) =>
      coincide(filtros.vendedor, claveVendedor(fila.vendedorAsignado)) &&
      coincide(filtros.provincia, fila.provinciaKey) &&
      coincide(filtros.ciudad, fila.ciudadKey),
  );
}

const CAMPOS_BUSQUEDA: (keyof ClienteDistribuido)[] = [
  "identificacion",
  "nombreCliente",
  "numDocumento",
  "fechaEmision",
  "fechaVence",
  "total",
  "ctas",
  "abonado",
  "cob",
  "saldo",
  "ven",
  "dias",
  "movil",
  "vendedor",
  "cuota",
  "saldoFecha",
  "categoriaOrigen",
  "provincia",
  "ciudad",
  "direccion",
  "vendedorAsignado",
];

export function buscarClientes(
  filas: ClienteDistribuido[],
  consulta: string,
): ClienteDistribuido[] {
  const texto = normalizarTexto(consulta);
  if (!texto) return filas;
  return filas.filter((fila) =>
    normalizarTexto(
      CAMPOS_BUSQUEDA.map((campo) => fila[campo] ?? "").join(" "),
    ).includes(texto),
  );
}

export function aplicarFiltroMetrica(
  filas: ClienteDistribuido[],
  filtro: FiltroMetricaMarketing,
): ClienteDistribuido[] {
  if (filtro === "TODOS") return filas;
  const delGrupo =
    filtro === "CON_VENDEDOR_ANTIGUO"
      ? filas.filter((fila) => fila.categoria !== "SIN_CAMBIO")
      : filas.filter((fila) => fila.categoria === filtro);
  const vistos = new Set<string>();
  return delGrupo.filter((fila) => {
    if (!fila.esRepresentante || vistos.has(fila.claveCliente)) return false;
    vistos.add(fila.claveCliente);
    return true;
  });
}
