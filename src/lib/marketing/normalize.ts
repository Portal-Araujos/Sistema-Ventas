export function textoExacto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

export function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .trim()
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function limpiarTelefono(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto =
    typeof valor === "number" && Number.isFinite(valor)
      ? String(valor)
      : String(valor).trim();
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 9 ? `0${digitos}` : digitos;
}
