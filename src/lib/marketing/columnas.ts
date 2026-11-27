import { normalizarTexto } from "./normalize";

export const COLUMNAS_TABLA = [
  "Identificación",
  "Nombre Cliente",
  "Móvil",
  "Provincia",
  "Ciudad",
  "Dirección",
  "Vendedor",
  "Núm. Documento",
  "Fecha Emisión",
  "Fecha Vence",
  "$ Total",
  "# Ctas",
  "$ Abonado",
  "# Cob",
  "$ Saldo",
  "# Ven",
  "Días",
  "$ Cuota",
  "Saldo Fecha",
  "Categoría (Excel)",
] as const;

export const COLUMNAS_TABLA_INICIALES = [
  "Identificación",
  "Nombre Cliente",
  "Móvil",
  "Provincia",
  "Ciudad",
  "Dirección",
  "Vendedor",
] as const;

const EQUIVALENCIAS: Record<string, string[]> = {
  Identificación: ["Identificación", "Identificacion", "Cédula", "Cedula", "RUC"],
  "Nombre Cliente": ["Nombre Cliente", "Cliente", "Nombre"],
  Móvil: ["Móvil", "Movil", "Teléfono", "Telefono", "Celular"],
  Provincia: ["Provincia"],
  Ciudad: ["Ciudad", "Cantón", "Canton"],
  Dirección: ["Dirección", "Direccion", "Domicilio"],
  Vendedor: ["Vendedor", "Asesor", "Comercial"],
  "Núm. Documento": [
    "Núm. Documento",
    "Num. Documento",
    "Número Documento",
    "Numero Documento",
    "Nro. Documento",
    "Nro Documento",
    "No. Documento",
  ],
  "Fecha Emisión": ["Fecha Emisión", "Fecha Emision", "F. Emisión", "F Emision"],
  "Fecha Vence": [
    "Fecha Vence",
    "Fecha de Vencimiento",
    "Fecha Vencimiento",
    "Vencimiento",
  ],
  "$ Total": ["$ Total", "$Total", "Total"],
  "# Ctas": ["# Ctas", "#Ctas", "Ctas", "N Ctas", "No Ctas"],
  "$ Abonado": ["$ Abonado", "$Abonado", "Abonado", "Total Abonado"],
  "# Cob": ["# Cob", "#Cob", "Cob", "Cobros"],
  "$ Saldo": ["$ Saldo", "$Saldo", "Saldo", "Total Saldo"],
  "# Ven": ["# Ven", "#Ven", "Ven", "Ventas"],
  Días: ["Días", "Dias", "Día", "Dia"],
  "$ Cuota": ["$ Cuota", "$Cuota", "Cuota", "Valor Cuota"],
  "Saldo Fecha": [
    "Saldo Fecha",
    "Saldo a la Fecha",
    "Saldo a Fecha",
    "Saldo Fecha",
  ],
  "Categoría (Excel)": ["Categoría", "Categoria", "Categoría Cliente", "Categoria Cliente"],
};

export function mapearColumnas(headers: string[]): {
  indices: Record<string, number>;
  faltantes: string[];
} {
  const porNombre = new Map<string, number>();
  headers.forEach((header, index) => {
    const clave = normalizarTexto(header);
    if (clave && !porNombre.has(clave)) porNombre.set(clave, index);
  });

  const indices: Record<string, number> = {};
  const faltantes: string[] = [];
  for (const [estandar, opciones] of Object.entries(EQUIVALENCIAS)) {
    const encontrada = opciones
      .map((opcion) => porNombre.get(normalizarTexto(opcion)))
      .find((indice) => indice !== undefined);
    if (encontrada === undefined) faltantes.push(estandar);
    else indices[estandar] = encontrada;
  }
  return { indices, faltantes };
}
