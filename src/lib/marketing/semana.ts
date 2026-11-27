export const MESES_DEL_ANIO = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

function nombreMes(mes: number): string {
  return MESES_DEL_ANIO[mes - 1] ?? String(mes);
}

/** Etiqueta ISO de respaldo, usada solo cuando la carga no tiene semana elegida. */
function etiquetaSemana(fecha: Date | string): string {
  const valor = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dia = new Date(
    Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()),
  );
  const diaSemana = dia.getUTCDay() || 7;
  dia.setUTCDate(dia.getUTCDate() + 4 - diaSemana);
  const anio = dia.getUTCFullYear();
  const inicioAnio = new Date(Date.UTC(anio, 0, 1));
  const numero = Math.ceil(
    ((dia.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7,
  );
  return `Semana ${numero} · ${anio}`;
}

type DatosCarga = {
  semanaNumero?: number | null;
  mes?: number | null;
  anio?: number | null;
  createdAt: Date | string;
};

/** Etiqueta elegida al subir la carga, p. ej. "Semana 2 · Noviembre 2026". */
export function etiquetaCarga(carga: DatosCarga): string {
  const { semanaNumero, mes, anio } = carga;
  if (
    Number.isInteger(semanaNumero) &&
    Number.isInteger(mes) &&
    Number.isInteger(anio) &&
    semanaNumero! >= 1 &&
    semanaNumero! <= 5 &&
    mes! >= 1 &&
    mes! <= 12 &&
    anio! >= 1900 &&
    anio! <= 2100
  ) {
    const nombre = nombreMes(mes!);
    return `Semana ${semanaNumero} · ${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
  }
  return etiquetaSemana(carga.createdAt);
}
