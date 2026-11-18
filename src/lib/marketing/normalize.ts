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

export function claveVendedor(valor: unknown): string {
  return normalizarTexto(valor)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function claveUbicacion(valor: unknown): string {
  return normalizarTexto(valor);
}

export function limpiarTelefono(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let texto: string;
  if (typeof valor === "number" && Number.isFinite(valor)) {
    texto = Number.isInteger(valor) ? String(valor) : String(valor);
  } else {
    texto = String(valor).trim();
  }
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 9 ? `0${digitos}` : digitos;
}

export function claveCliente(
  identificacion: unknown,
  nombreCliente: unknown,
  movil: unknown,
): string {
  const id = normalizarTexto(identificacion).replace(/\s+/g, "");
  if (id) return id;
  return `${normalizarTexto(nombreCliente)}|${limpiarTelefono(movil)}`;
}
