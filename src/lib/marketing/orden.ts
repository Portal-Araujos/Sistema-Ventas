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
  "Núm. Documento": "numDocumento",
  "Fecha Emisión": "fechaEmision",
  "Fecha Vence": "fechaVence",
  "$ Total": "total",
  "# Ctas": "ctas",
  "$ Abonado": "abonado",
  "# Cob": "cob",
  "$ Saldo": "saldo",
  "# Ven": "ven",
  Días: "dias",
  "$ Cuota": "cuota",
  "Saldo Fecha": "saldoFecha",
  "Categoría (Excel)": "categoriaOrigen",
};

const CAMPOS_FECHA = new Set<keyof ClienteDistribuido>([
  "fechaEmision",
  "fechaVence",
]);

const CAMPOS_NUMERO = new Set<keyof ClienteDistribuido>([
  "total",
  "ctas",
  "abonado",
  "cob",
  "saldo",
  "ven",
  "dias",
  "cuota",
  "saldoFecha",
]);

function fechaParaOrden(valor: string): number | null {
  const coincidencia = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(valor.trim());
  if (!coincidencia) return null;
  const [, dia, mes, anio] = coincidencia;
  return Number(anio) * 10_000 + Number(mes) * 100 + Number(dia);
}

/** Solo para comparar durante la ordenación; el valor guardado y mostrado se deja intacto. */
function numeroParaOrden(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  const numero = Number(
    texto.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(numero) ? numero : null;
}

function valorParaOrden(
  fila: ClienteDistribuido,
  columna: keyof ClienteDistribuido,
): string | number {
  const valor = String(fila[columna] ?? "");
  if (CAMPOS_FECHA.has(columna)) return fechaParaOrden(valor) ?? valor;
  if (CAMPOS_NUMERO.has(columna)) return numeroParaOrden(valor) ?? valor;
  return normalizarTexto(valor);
}

export function ordenarClientes(
  filas: ClienteDistribuido[],
  orden: OrdenMarketing | null,
): ClienteDistribuido[] {
  if (!orden) return filas;

  const columna = VALOR_COLUMNA[orden.columna];
  const factor = orden.direccion === "asc" ? 1 : -1;

  return [...filas].sort((a, b) => {
    const valorA = valorParaOrden(a, columna);
    const valorB = valorParaOrden(b, columna);
    const comparacion =
      typeof valorA === "number" && typeof valorB === "number"
        ? valorA - valorB
        : String(valorA).localeCompare(String(valorB), "es");
    return comparacion !== 0 ? comparacion * factor : a.fila - b.fila;
  });
}
