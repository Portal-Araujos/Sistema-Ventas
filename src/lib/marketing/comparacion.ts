import { claveCliente, limpiarTelefono, normalizarTexto } from "./normalize";
import type {
  CambioMarketing,
  ClienteRow,
  ResumenCambiosMarketing,
} from "./types";

const CAMPOS = [
  { campo: "nombreCliente", etiqueta: "Cliente", normalizar: normalizarTexto },
  { campo: "movil", etiqueta: "Móvil", normalizar: limpiarTelefono },
  { campo: "provincia", etiqueta: "Provincia", normalizar: normalizarTexto },
  { campo: "ciudad", etiqueta: "Ciudad", normalizar: normalizarTexto },
  { campo: "direccion", etiqueta: "Dirección", normalizar: normalizarTexto },
  { campo: "fechaEmision", etiqueta: "Fecha Emisión", normalizar: normalizarTexto },
  { campo: "fechaVence", etiqueta: "Fecha Vence", normalizar: normalizarTexto },
  { campo: "total", etiqueta: "$ Total", normalizar: normalizarTexto },
  { campo: "ctas", etiqueta: "# Ctas", normalizar: normalizarTexto },
  { campo: "abonado", etiqueta: "$ Abonado", normalizar: normalizarTexto },
  { campo: "cob", etiqueta: "# Cob", normalizar: normalizarTexto },
  { campo: "saldo", etiqueta: "$ Saldo", normalizar: normalizarTexto },
  { campo: "ven", etiqueta: "# Ven", normalizar: normalizarTexto },
  { campo: "dias", etiqueta: "Días", normalizar: normalizarTexto },
  { campo: "cuota", etiqueta: "$ Cuota", normalizar: normalizarTexto },
  { campo: "saldoFecha", etiqueta: "Saldo Fecha", normalizar: normalizarTexto },
  {
    campo: "categoriaOrigen",
    etiqueta: "Categoría",
    normalizar: normalizarTexto,
  },
] as const;

function valor(fila: ClienteRow, campo: keyof ClienteRow): string {
  return String(fila[campo] ?? "").trim();
}

function claveComparacion(fila: ClienteRow): string {
  const base = claveCliente(fila.identificacion, fila.nombreCliente, fila.movil);
  if (!base || base === "|") return "";
  return `${base}|${normalizarTexto(fila.numDocumento)}`;
}

function indice(filas: ClienteRow[]): Map<string, ClienteRow> {
  const mapa = new Map<string, ClienteRow>();
  for (const fila of filas) {
    const clave = claveComparacion(fila);
    if (clave && !mapa.has(clave)) mapa.set(clave, fila);
  }
  return mapa;
}

const ORDEN_TIPO: Record<CambioMarketing["tipo"], number> = {
  ALTA: 0,
  CAMBIO: 1,
  BAJA: 2,
};

/** Compara dos carteras por cliente y número de documento. */
export function compararCargas(
  anteriores: ClienteRow[],
  nuevas: ClienteRow[],
): { cambios: CambioMarketing[]; resumen: ResumenCambiosMarketing } {
  const anterior = indice(anteriores);
  const nueva = indice(nuevas);
  const cambios: CambioMarketing[] = [];

  for (const [clave, fila] of nueva) {
    const previa = anterior.get(clave);
    if (!previa) {
      cambios.push({
        claveCliente: clave,
        identificacion: valor(fila, "identificacion"),
        nombreCliente: valor(fila, "nombreCliente"),
        tipo: "ALTA",
        campo: null,
        valorAnterior: null,
        valorNuevo: null,
      });
      continue;
    }
    for (const definicion of CAMPOS) {
      const antes = valor(previa, definicion.campo);
      const ahora = valor(fila, definicion.campo);
      if (definicion.normalizar(antes) === definicion.normalizar(ahora)) continue;
      cambios.push({
        claveCliente: clave,
        identificacion: valor(fila, "identificacion"),
        nombreCliente: valor(fila, "nombreCliente"),
        tipo: "CAMBIO",
        campo: definicion.etiqueta,
        valorAnterior: antes,
        valorNuevo: ahora,
      });
    }
  }

  for (const [clave, fila] of anterior) {
    if (nueva.has(clave)) continue;
    cambios.push({
      claveCliente: clave,
      identificacion: valor(fila, "identificacion"),
      nombreCliente: valor(fila, "nombreCliente"),
      tipo: "BAJA",
      campo: null,
      valorAnterior: null,
      valorNuevo: null,
    });
  }

  cambios.sort(
    (a, b) =>
      ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo] ||
      a.identificacion.localeCompare(b.identificacion, "es") ||
      (a.campo ?? "").localeCompare(b.campo ?? "", "es"),
  );

  const altas = cambios.filter((cambio) => cambio.tipo === "ALTA").length;
  const bajas = cambios.filter((cambio) => cambio.tipo === "BAJA").length;
  const totalCambios = cambios.filter((cambio) => cambio.tipo === "CAMBIO").length;

  return {
    cambios,
    resumen: {
      altas,
      bajas,
      cambios: totalCambios,
      total: cambios.length,
    },
  };
}

export function resumenVacio(): ResumenCambiosMarketing {
  return { altas: 0, bajas: 0, cambios: 0, total: 0 };
}
