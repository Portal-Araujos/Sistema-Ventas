import * as XLSX from "xlsx";
import { mapearColumnas } from "./columnas";
import { limpiarTelefono, normalizarTexto } from "./normalize";
import type { ClienteRow } from "./types";

const CAMPOS_MONETARIOS = new Set([
  "$ Total",
  "$ Abonado",
  "$ Saldo",
  "$ Cuota",
  "Saldo Fecha",
]);

const CAMPOS_FECHA = new Set(["Fecha Emisión", "Fecha Vence"]);

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

function parsearNumero(valor: unknown): number | null {
  const limpio = String(valor ?? "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!limpio) return null;

  const puntos = (limpio.match(/\./g) ?? []).length;
  const comas = (limpio.match(/,/g) ?? []).length;
  let normal = limpio;

  if (puntos > 0 && comas > 0) {
    const decimal =
      limpio.lastIndexOf(",") > limpio.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    normal = limpio.split(miles).join("").replace(decimal, ".");
  } else if (comas === 1) {
    const [enteros, decimales] = limpio.split(",");
    normal =
      decimales.length <= 2
        ? `${enteros}.${decimales}`
        : limpio.replace(",", "");
  } else if (puntos === 1) {
    const [enteros, decimales] = limpio.split(".");
    normal =
      decimales.length <= 2
        ? `${enteros}.${decimales}`
        : limpio.replace(".", "");
  } else {
    normal = limpio.replace(/[.,]/g, "");
  }

  const resultado = Number(normal);
  return Number.isFinite(resultado) ? resultado : null;
}

function formatearMonto(valor: number): string {
  const [enteros, decimales] = Math.abs(valor).toFixed(2).split(".");
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}$${conMiles},${decimales}`;
}

/** Detecta montos desplazados ×10 o ÷10 comparándolos con un valor de referencia. */
function factorDeEscala(valor: number, referencia: number): number {
  const errorBase = Math.abs(valor - referencia);
  const tolerancia = Math.max(0.01, Math.abs(referencia) * 0.05);
  if (errorBase <= tolerancia) return 1;

  let mejorFactor = 1;
  let menorError = errorBase;
  for (const factor of [0.1, 10]) {
    const error = Math.abs(valor * factor - referencia);
    if (error < menorError) {
      menorError = error;
      mejorFactor = factor;
    }
  }
  return mejorFactor !== 1 && menorError <= tolerancia ? mejorFactor : 1;
}

function normalizarMontos(fila: ClienteRow): ClienteRow {
  const total = parsearNumero(fila.total);
  if (total === null || total <= 0) return fila;

  const cuota = parsearNumero(fila.cuota);
  const abonado = parsearNumero(fila.abonado);
  const saldo = parsearNumero(fila.saldo);
  const saldoFecha = parsearNumero(fila.saldoFecha);
  const ctas = parsearNumero(fila.ctas);
  const cob = parsearNumero(fila.cob);

  let cuotaFinal = cuota;
  if (cuota !== null && cuota > 0 && ctas !== null && ctas > 0) {
    cuotaFinal = cuota * factorDeEscala(cuota, total / ctas);
  }

  let factorAbono = 1;
  if (abonado !== null) {
    const errores = ([1, 0.1, 10] as const).map((factor) => {
      let error = 0;
      let criterios = 0;
      if (saldo !== null) {
        error += Math.abs((abonado + saldo) * factor - total);
        criterios++;
      }
      if (cuotaFinal !== null && cuotaFinal > 0 && cob !== null && cob > 0) {
        error += Math.abs(abonado * factor - cuotaFinal * cob);
        criterios++;
      }
      return criterios ? error / criterios : Number.POSITIVE_INFINITY;
    });
    if (errores[1] < errores[0] / 2 && errores[1] <= errores[2]) {
      factorAbono = 0.1;
    } else if (errores[2] < errores[0] / 2 && errores[2] < errores[1]) {
      factorAbono = 10;
    }
  }

  const abonadoFinal = abonado === null ? null : abonado * factorAbono;
  const saldoFinal = saldo === null ? null : saldo * factorAbono;

  let saldoFechaFinal = saldoFecha;
  if (saldoFecha !== null && saldoFinal !== null) {
    saldoFechaFinal =
      saldoFecha * factorDeEscala(saldoFecha, saldoFinal);
  }

  return {
    ...fila,
    ...(cuotaFinal !== null ? { cuota: formatearMonto(cuotaFinal) } : {}),
    ...(abonadoFinal !== null ? { abonado: formatearMonto(abonadoFinal) } : {}),
    ...(saldoFinal !== null ? { saldo: formatearMonto(saldoFinal) } : {}),
    ...(saldoFechaFinal !== null
      ? { saldoFecha: formatearMonto(saldoFechaFinal) }
      : {}),
  };
}

function valorCelda(celda: XLSX.CellObject | undefined, etiqueta: string): string {
  if (!celda) return "";
  const monetario = CAMPOS_MONETARIOS.has(etiqueta);

  if (celda.t === "n" && typeof celda.v === "number") {
    if (monetario) return formatearMonto(celda.v);
    if (CAMPOS_FECHA.has(etiqueta)) {
      const formato = celda.z && celda.z !== "General" ? celda.z : "dd-mm-yyyy";
      return texto(celda.w ?? XLSX.SSF.format(formato, celda.v));
    }
    return String(celda.v);
  }

  const crudo = texto(celda.w ?? celda.v ?? "");
  if (!monetario) return crudo;
  const numero = parsearNumero(crudo);
  return numero === null ? crudo : formatearMonto(numero);
}

function esConsumidorFinal(fila: ClienteRow): boolean {
  return (
    normalizarTexto(fila.identificacion) === "CFN 9999999999999" &&
    normalizarTexto(fila.nombreCliente) === "CONSUMIDOR FINAL"
  );
}

export function parsearExcel(buffer: ArrayBuffer): {
  filas: ClienteRow[];
  faltantes: string[];
  descartados: number;
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja || !hoja["!ref"]) {
    return { filas: [], faltantes: ["Hoja"], descartados: 0 };
  }

  const rango = XLSX.utils.decode_range(hoja["!ref"]);
  const headers: string[] = [];
  for (let columna = rango.s.c; columna <= rango.e.c; columna++) {
    const celda = hoja[XLSX.utils.encode_cell({ r: rango.s.r, c: columna })];
    headers.push(texto(celda?.v ?? celda?.w ?? ""));
  }

  const { indices, faltantes } = mapearColumnas(headers);
  if (faltantes.length) return { filas: [], faltantes, descartados: 0 };

  const filas: ClienteRow[] = [];
  let descartados = 0;
  for (let filaExcel = rango.s.r + 1; filaExcel <= rango.e.r; filaExcel++) {
    const vacia = Array.from(
      { length: rango.e.c - rango.s.c + 1 },
      (_, desplazamiento) =>
        hoja[XLSX.utils.encode_cell({ r: filaExcel, c: rango.s.c + desplazamiento })],
    ).every((celda) => texto(celda?.v ?? celda?.w ?? "") === "");
    if (vacia) continue;

    const valor = (etiqueta: string) =>
      valorCelda(
        hoja[XLSX.utils.encode_cell({ r: filaExcel, c: indices[etiqueta] })],
        etiqueta,
      );

    const filaNormalizada = normalizarMontos({
      fila: filaExcel + 1,
      identificacion: valor("Identificación"),
      nombreCliente: valor("Nombre Cliente"),
      numDocumento: valor("Núm. Documento"),
      fechaEmision: valor("Fecha Emisión"),
      fechaVence: valor("Fecha Vence"),
      total: valor("$ Total"),
      ctas: valor("# Ctas"),
      abonado: valor("$ Abonado"),
      cob: valor("# Cob"),
      saldo: valor("$ Saldo"),
      ven: valor("# Ven"),
      dias: valor("Días"),
      movil: limpiarTelefono(valor("Móvil")),
      vendedor: valor("Vendedor"),
      cuota: valor("$ Cuota"),
      saldoFecha: valor("Saldo Fecha"),
      categoriaOrigen: valor("Categoría (Excel)"),
      provincia: valor("Provincia"),
      ciudad: valor("Ciudad"),
      direccion: valor("Dirección"),
    });

    if (esConsumidorFinal(filaNormalizada)) {
      descartados++;
      continue;
    }
    filas.push(filaNormalizada);
  }
  return { filas, faltantes: [], descartados };
}
