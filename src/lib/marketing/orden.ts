import { normalizarTexto } from "./normalize";
import type {
  ClienteDistribuido,
  ColumnaOrdenableMarketing,
  OrdenMarketing,
} from "./types";

const VALOR_COLUMNA: Record<ColumnaOrdenableMarketing, keyof ClienteDistribuido> = {
  "Nombre Cliente": "nombreCliente",
  Provincia: "provincia",
  Ciudad: "ciudad",
  Vendedor: "vendedorOriginal",
};

export function ordenarClientes(
  filas: ClienteDistribuido[],
  orden: OrdenMarketing | null,
): ClienteDistribuido[] {
  if (!orden) return filas;

  const columna = VALOR_COLUMNA[orden.columna];
  const factor = orden.direccion === "asc" ? 1 : -1;

  return [...filas].sort((a, b) => {
    const textoA = normalizarTexto(a[columna]);
    const textoB = normalizarTexto(b[columna]);
    const comparacion = textoA.localeCompare(textoB, "es");
    return comparacion !== 0 ? comparacion * factor : a.fila - b.fila;
  });
}
