import * as XLSX from "xlsx";
import { mapearColumnas } from "./columnas";
import { limpiarTelefono } from "./normalize";
import type { ClienteRow } from "./types";

const CAMPOS_MONETARIOS = new Set([
  "$ Total",
  "$ Abonado",
  "$ Saldo",
  "$ Cuota",
  "Saldo Fecha",
]);

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

/** SheetJS produce formatos en estilo US; la cartera trabaja con coma decimal y punto de miles. */
function aSeparadoresEuropeos(valor: string): string {
  return valor.replace(/\./g, "__PUNTO__").replace(/,/g, ".").replace(/__PUNTO__/g, ",");
}

function valorCelda(celda: XLSX.CellObject | undefined, etiqueta: string): string {
  if (!celda) return "";

  if (celda.t === "s") {
    return texto(celda.v ?? celda.w ?? "");
  }

  if (celda.t === "n" && typeof celda.v === "number") {
    const monetario = CAMPOS_MONETARIOS.has(etiqueta);
    const formato = celda.z && celda.z !== "General" ? celda.z : monetario ? "0.00" : "0";
    const base = texto(celda.w ?? XLSX.SSF.format(formato, celda.v));
    if (!monetario) return base;

    const convertido = aSeparadoresEuropeos(base);
    const conDecimales = convertido.includes(",") ? convertido : `${convertido},00`;
    return conDecimales.includes("$") ? conDecimales : `$${conDecimales}`;
  }

  return texto(celda.w ?? celda.v ?? "");
}

export function parsearExcel(buffer: ArrayBuffer): {
  filas: ClienteRow[];
  faltantes: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja || !hoja["!ref"]) return { filas: [], faltantes: ["Hoja"] };

  const rango = XLSX.utils.decode_range(hoja["!ref"]);
  const headers: string[] = [];
  for (let columna = rango.s.c; columna <= rango.e.c; columna++) {
    const celda = hoja[XLSX.utils.encode_cell({ r: rango.s.r, c: columna })];
    headers.push(texto(celda?.v ?? celda?.w ?? ""));
  }

  const { indices, faltantes } = mapearColumnas(headers);
  if (faltantes.length) return { filas: [], faltantes };

  const filas: ClienteRow[] = [];
  for (let filaExcel = rango.s.r + 1; filaExcel <= rango.e.r; filaExcel++) {
    const vacia = Array.from(
      { length: rango.e.c - rango.s.c + 1 },
      (_, desplazamiento) =>
        hoja[XLSX.utils.encode_cell({ r: filaExcel, c: rango.s.c + desplazamiento })],
    ).every((celda) => texto(celda?.v ?? celda?.w ?? "") === "");
    if (vacia) continue;

    const valor = (etiqueta: string) =>
      valorCelda(
        hoja[XLSX.utils.encode_cell({ r: filaExcel, c: indices[etiqueta] })],
        etiqueta,
      );

    filas.push({
      fila: filaExcel + 1,
      identificacion: valor("Identificación"),
      nombreCliente: valor("Nombre Cliente"),
      numDocumento: valor("Núm. Documento"),
      fechaEmision: valor("Fecha Emisión"),
      fechaVence: valor("Fecha Vence"),
      total: valor("$ Total"),
      ctas: valor("# Ctas"),
      abonado: valor("$ Abonado"),
      cob: valor("# Cob"),
      saldo: valor("$ Saldo"),
      ven: valor("# Ven"),
      dias: valor("Días"),
      movil: limpiarTelefono(valor("Móvil")),
      vendedor: valor("Vendedor"),
      cuota: valor("$ Cuota"),
      saldoFecha: valor("Saldo Fecha"),
      categoriaOrigen: valor("Categoría (Excel)"),
      provincia: valor("Provincia"),
      ciudad: valor("Ciudad"),
      direccion: valor("Dirección"),
    });
  }
  return { filas, faltantes: [] };
}
