import * as XLSX from "xlsx";
import { mapearColumnas } from "./columnas";
import { limpiarTelefono } from "./normalize";
import type { ClienteRow } from "./types";

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

export function parsearExcel(buffer: ArrayBuffer): {
  filas: ClienteRow[];
  faltantes: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja) return { filas: [], faltantes: ["Hoja"] };

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  const headers = (matriz[0] ?? []).map((valor) => texto(valor));
  const { indices, faltantes } = mapearColumnas(headers);
  if (faltantes.length) return { filas: [], faltantes };

  const filas: ClienteRow[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const fila = matriz[i] ?? [];
    if (!fila.some((valor) => texto(valor) !== "")) continue;
    filas.push({
      fila: i,
      identificacion: texto(fila[indices.Identificación]),
      nombreCliente: texto(fila[indices["Nombre Cliente"]]),
      movil: limpiarTelefono(fila[indices.Móvil]),
      provincia: texto(fila[indices.Provincia]),
      ciudad: texto(fila[indices.Ciudad]),
      direccion: texto(fila[indices.Dirección]),
      vendedor: texto(fila[indices.Vendedor]),
    });
  }
  return { filas, faltantes: [] };
}
