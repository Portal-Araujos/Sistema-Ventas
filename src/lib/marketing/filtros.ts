import { normalizarTexto } from "./normalize";
import type { ClienteCartera } from "./types";

const CAMPOS_BUSQUEDA: (keyof ClienteCartera)[] = [
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
];

export function buscarClientes(
  filas: ClienteCartera[],
  consulta: string,
): ClienteCartera[] {
  const texto = normalizarTexto(consulta);
  if (!texto) return filas;
  return filas.filter((fila) =>
    normalizarTexto(
      CAMPOS_BUSQUEDA.map((campo) => fila[campo] ?? "").join(" "),
    ).includes(texto),
  );
}
