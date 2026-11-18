import { normalizarTexto } from "./normalize";

export const COLUMNAS_TABLA = [
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
