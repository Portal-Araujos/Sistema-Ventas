import { claveVendedor, normalizarTexto } from "./normalize";

export const VENDEDORES_ACTUALES = [
  "Cristian Peñafiel",
  "Geraldine Zapata",
  "Franklin Andrade",
  "Saúl Torres",
  "Alexis Araujo",
  "Mario Rivera",
  "Anthony Vélez",
] as const;

export const VENDEDORES_ANTERIORES = [
  "ALVARADO WILMAN",
  "BURGOS BREYNER",
  "CAMILA TAMAYO",
  "CARRION CARLOS",
  "CUERO DARWIN",
  "CURILLO KEVIN",
  "DIEGO ANDRADE",
  "JESSICA RAMIREZ",
  "PATRICIA BENAVIDES",
  "PINARGOTE ERIKA",
  "PINOARGOTE ERIKA",
  "QUISHPILO ODALIS",
  "GUSTIN RAMIREZ",
  "REA WELLINGTON",
  "JOSE USCATEGUI",
  "VENTAS ARAUGAL",
  "VENTAS LOCAL LAGO AGRIO",
] as const;

const ALIAS: Record<string, string> = {
  [normalizarTexto("Cristian Peñafiel")]: "Cristian Peñafiel",
  [normalizarTexto("Cristian Penafiel")]: "Cristian Peñafiel",
  [normalizarTexto("Geraldine Zapata")]: "Geraldine Zapata",
  [normalizarTexto("Geraldine Garzon")]: "Geraldine Zapata",
  [normalizarTexto("Geraldine Zapata o Geraldine Garzon")]: "Geraldine Zapata",
  [normalizarTexto("Franklin Andrade")]: "Franklin Andrade",
  [normalizarTexto("Saúl Torres")]: "Saúl Torres",
  [normalizarTexto("Saul Torres")]: "Saúl Torres",
  [normalizarTexto("Alexis Araujo")]: "Alexis Araujo",
  [normalizarTexto("Mario Rivera")]: "Mario Rivera",
  [normalizarTexto("Anthony Vélez")]: "Anthony Vélez",
  [normalizarTexto("Anthony Velez")]: "Anthony Vélez",
};

const CLAVES_ACTUALES = new Map(
  VENDEDORES_ACTUALES.map((v) => [claveVendedor(v), v]),
);
const CLAVES_ANTERIORES = new Set(VENDEDORES_ANTERIORES.map(claveVendedor));

export function esVendedorActual(clave: string): boolean {
  return CLAVES_ACTUALES.has(clave);
}

export function esVendedorAnterior(clave: string): boolean {
  return CLAVES_ANTERIORES.has(clave);
}

export function nombreVendedorActual(clave: string): string {
  return CLAVES_ACTUALES.get(clave) ?? "";
}

/** Convierte el nombre del usuario logueado al nombre canónico del Excel. */
export function canonizarVendedor(nombre: string | null | undefined): string {
  if (!nombre) return "";
  const normalizado = normalizarTexto(nombre);
  if (ALIAS[normalizado]) return ALIAS[normalizado];
  return CLAVES_ACTUALES.get(claveVendedor(nombre)) ?? "";
}
