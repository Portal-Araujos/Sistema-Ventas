import { normalizarTexto } from "./normalize";
import type { ClienteCartera } from "./types";

export const GRUPOS_SEMAFORO = [
  {
    id: "mediaciones",
    etiqueta: "Mediaciones",
    categorias: [
      "MEDIACION",
      "MEDIACION BANCO",
      "MEDIACION REFINANCIAMIENTO",
    ],
  },
  {
    id: "cobro-particular",
    etiqueta: "Cobro Particular",
    categorias: ["COBRO PARTICULAR"],
  },
  {
    id: "debito-bancario",
    etiqueta: "Débito Bancario",
    categorias: ["DEBITO BANCARIO"],
  },
  {
    id: "refinanciamiento",
    etiqueta: "Refinanciamiento",
    categorias: ["REFINANCIAMIENTO", "REFINANCIAMIENTO BANCO"],
  },
] as const;

export type GrupoSemaforoId = (typeof GRUPOS_SEMAFORO)[number]["id"];
export type TabSemaforo =
  | "resumen"
  | "general"
  | "sin-contrato"
  | "envios"
  | GrupoSemaforoId;
export type EstadoSemaforo =
  | "VERDE"
  | "AMARILLO"
  | "NARANJA"
  | "ROJO"
  | "REVISION"
  | "SIN_CONTRATO";

export const COLUMNAS_SEMAFORO = [
  "Identificación",
  "Nombre Cliente",
  "Núm. Documento",
  "Fecha Emisión",
  "Fecha Vence",
  "$ Total",
  "$ Abonado",
  "$ Saldo",
  "Saldo Fecha",
  "# Ctas",
  "# Cob",
  "# Ven",
  "$ Cuota",
  "Días",
  "Móvil",
  "Vendedor",
  "Categoría",
  "Ciudad",
  "Provincia",
  "Dirección",
] as const;

export type ColumnaSemaforo = (typeof COLUMNAS_SEMAFORO)[number];

export const CAMPO_POR_COLUMNA: Record<ColumnaSemaforo, keyof ClienteCartera> = {
  "Identificación": "identificacion",
  "Nombre Cliente": "nombreCliente",
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
  Móvil: "movil",
  Vendedor: "vendedor",
  "$ Cuota": "cuota",
  "Saldo Fecha": "saldoFecha",
  Categoría: "categoriaOrigen",
  Ciudad: "ciudad",
  Provincia: "provincia",
  Dirección: "direccion",
};

export const COLUMNAS_ORDENABLES_SEMAFORO = [
  "Nombre Cliente",
  "# Ctas",
  "# Cob",
  "# Ven",
  "Vendedor",
  "Categoría",
  "Ciudad",
  "Provincia",
] as const;

export type ColumnaOrdenableSemaforo =
  (typeof COLUMNAS_ORDENABLES_SEMAFORO)[number];

export type OrdenSemaforo = {
  columna: ColumnaOrdenableSemaforo;
  direccion: "asc" | "desc";
};

export function esColumnaOrdenableSemaforo(
  columna: string,
): columna is ColumnaOrdenableSemaforo {
  return (COLUMNAS_ORDENABLES_SEMAFORO as readonly string[]).includes(columna);
}

export type DocumentoAnalisis = ClienteCartera & {
  id: string;
  grupo: GrupoSemaforoId;
  categoriaOriginal: string;
  estado: EstadoSemaforo;
  cuotasPendientes: number | null;
  fechaVenceISO: string | null;
  finGraciaISO: string | null;
  esReventa: boolean;
  inconsistente: boolean;
  motivoRevision?: string;
};

export type DocumentoPagado = ClienteCartera & {
  cargaId: string;
  semana: string;
  fechaCarga: string;
  grupo: GrupoSemaforoId;
  categoriaOriginal: string;
};

export type FilaResumenSemaforo = {
  categoria: string;
  etiqueta: string;
  e: number;
  r: number;
};

export type FilaSinContratoSemaforo = {
  categoria: string;
  etiqueta: string;
  total: number;
};

export type ResumenSemaforo = {
  grupos: FilaResumenSemaforo[];
  general: FilaResumenSemaforo;
  sinContrato: {
    grupos: FilaSinContratoSemaforo[];
    general: FilaSinContratoSemaforo;
  };
};

export type IndicadoresSemaforo = {
  clientesUnicos: number;
  oportunidadesReventa: number;
};

export type DatosCargaSemaforo = {
  id: string;
  nombreArchivo: string;
  createdAt: Date | string;
  activo: boolean;
  totalRegistros: number;
  semanaNumero?: number | null;
  mes?: number | null;
  anio?: number | null;
  anioMinimoSinContrato?: number | null;
  semana: string;
};

export type AnalisisCartera = {
  carga: {
    id: string;
    nombreArchivo: string;
    createdAt: string;
    semana: string;
    fechaCorteISO: string;
    esActiva: boolean;
    totalRegistros: number;
    identificacionesUnicas: number;
    anioMinimoSinContrato: number | null;
  };
  resumen: ResumenSemaforo;
  indicadores: IndicadoresSemaforo;
  documentos: DocumentoAnalisis[];
  sinContrato: DocumentoAnalisis[];
  pagados: DocumentoPagado[];
  idsReventa: string[];
  categorias: string[];
  categoriasPorGrupo: Record<GrupoSemaforoId, string[]>;
  provincias: string[];
};

export type FiltrosSemaforo = {
  busqueda: string;
  categoria: string;
  provincia: string;
  color: string;
  reventa: string;
  fechaVenceDesde: string;
  fechaVenceHasta: string;
  cuotas: string;
};

export const FILTROS_SEMAFORO_VACIOS: FiltrosSemaforo = {
  busqueda: "",
  categoria: "",
  provincia: "",
  color: "",
  reventa: "",
  fechaVenceDesde: "",
  fechaVenceHasta: "",
  cuotas: "",
};

export function grupoDeCategoria(categoria: string): GrupoSemaforoId | null {
  const clave = normalizarTexto(categoria);
  for (const grupo of GRUPOS_SEMAFORO) {
    if (grupo.categorias.some((nombre) => normalizarTexto(nombre) === clave)) {
      return grupo.id;
    }
  }
  return null;
}

export function etiquetaGrupo(id: GrupoSemaforoId): string {
  return GRUPOS_SEMAFORO.find((grupo) => grupo.id === id)?.etiqueta ?? id;
}

export function claveIdentificacion(valor: string): string {
  return normalizarTexto(valor) || "SIN-IDENTIFICACION";
}

function numero(valor: unknown): number | null {
  const texto = String(valor ?? "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!texto) return null;

  const puntos = (texto.match(/\./g) ?? []).length;
  const comas = (texto.match(/,/g) ?? []).length;
  let normal = texto;

  if (puntos > 0 && comas > 0) {
    const decimal =
      texto.lastIndexOf(",") > texto.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    normal = texto.split(miles).join("").replace(decimal, ".");
  } else if (comas === 1) {
    const [enteros, decimales] = texto.split(",");
    normal =
      decimales.length <= 2
        ? `${enteros}.${decimales}`
        : texto.replace(",", "");
  } else if (puntos === 1) {
    const [enteros, decimales] = texto.split(".");
    normal =
      decimales.length <= 2
        ? `${enteros}.${decimales}`
        : texto.replace(".", "");
  } else {
    normal = texto.replace(/[.,]/g, "");
  }

  const resultado = Number(normal);
  return Number.isFinite(resultado) ? resultado : null;
}

function entero(valor: unknown): number | null {
  const resultado = numero(valor);
  return resultado !== null && Number.isInteger(resultado) && resultado >= 0
    ? resultado
    : null;
}

function porcentajePagado(parte: number | null, total: number | null): number | null {
  if (parte === null || total === null || total <= 0) return null;
  return parte / total;
}

export function parsearFechaVence(valor: unknown): Date | null {
  const coincidencia = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(
    String(valor ?? "").trim(),
  );
  if (!coincidencia) return null;
  const dia = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const anio = Number(coincidencia[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

export function finGracia(fechaVence: Date): Date {
  return new Date(
    Date.UTC(fechaVence.getUTCFullYear(), fechaVence.getUTCMonth() + 1, 0),
  );
}

export function fechaCorteDeCarga(carga: {
  createdAt: Date | string;
  semanaNumero?: number | null;
  mes?: number | null;
  anio?: number | null;
}): Date {
  const creada = new Date(carga.createdAt);
  const mes = carga.mes ?? creada.getUTCMonth() + 1;
  const anio = carga.anio ?? creada.getUTCFullYear();
  return new Date(Date.UTC(anio, mes - 1, 20));
}

export function aISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function analizarCartera(
  carga: DatosCargaSemaforo,
  filas: ClienteCartera[],
): AnalisisCartera {
  const fechaCorte = fechaCorteDeCarga(carga);
  const fechaCorteMs = fechaCorte.getTime();
  const anioMinimo = carga.anioMinimoSinContrato ?? null;

  const existentes = new Map<GrupoSemaforoId, Set<string>>();
  const reventa = new Map<GrupoSemaforoId, Set<string>>();
  const contratoFinalizado = new Map<GrupoSemaforoId, Set<string>>();
  const estadoCliente = new Map<
    GrupoSemaforoId,
    Map<string, { tienePendiente: boolean; bloqueado: boolean }>
  >();

  for (const grupo of GRUPOS_SEMAFORO) {
    existentes.set(grupo.id, new Set());
    reventa.set(grupo.id, new Set());
    contratoFinalizado.set(grupo.id, new Set());
    estadoCliente.set(grupo.id, new Map());
  }

  const existentesGenerales = new Set<string>();
  const reventaGeneral = new Set<string>();
  const contratoFinalizadoGeneral = new Set<string>();
  const documentos: DocumentoAnalisis[] = [];
  const pagados: DocumentoPagado[] = [];
  const categorias = new Set<string>();
  const categoriasPorGrupo = new Map<GrupoSemaforoId, Set<string>>();
  const provincias = new Set<string>();
  const documentosVistos = new Set<string>();

  for (const grupo of GRUPOS_SEMAFORO) {
    categoriasPorGrupo.set(grupo.id, new Set());
  }

  for (const fila of filas) {
    const grupo = grupoDeCategoria(fila.categoriaOrigen);
    if (!grupo) continue;

    const categoriaOriginal =
      String(fila.categoriaOrigen ?? "").trim() || "SIN CATEGORÍA";
    const idKey = claveIdentificacion(fila.identificacion);
    categorias.add(categoriaOriginal);
    categoriasPorGrupo.get(grupo)!.add(categoriaOriginal);
    const provincia = String(fila.provincia ?? "").trim();
    if (provincia) provincias.add(provincia);
    existentes.get(grupo)!.add(idKey);
    existentesGenerales.add(idKey);

    const porCliente = estadoCliente.get(grupo)!;
    if (!porCliente.has(idKey)) {
      porCliente.set(idKey, { tienePendiente: false, bloqueado: false });
    }
    const estadoDelCliente = porCliente.get(idKey)!;

    const documentoKey = `${idKey}|${normalizarTexto(fila.numDocumento) || `fila-${fila.fila}`}`;
    const duplicado = documentosVistos.has(documentoKey);
    documentosVistos.add(documentoKey);

    const total = numero(fila.total);
    const abonado = numero(fila.abonado);
    const ctas = entero(fila.ctas);
    const cob = entero(fila.cob);
    const vence = parsearFechaVence(fila.fechaVence);
    const cuotas = ctas !== null && cob !== null ? ctas - cob : null;
    const coincidenMontos =
      total !== null && abonado !== null && Math.abs(total - abonado) < 0.005;
    const coincidenCuotas = ctas !== null && cob !== null && ctas === cob;
    const pagado = coincidenMontos && coincidenCuotas;

    const inconsistente =
      duplicado ||
      total === null ||
      abonado === null ||
      ctas === null ||
      cob === null ||
      vence === null ||
      cuotas === null ||
      cuotas < 0 ||
      (total !== null && abonado !== null && abonado > total + 0.005) ||
      coincidenMontos !== coincidenCuotas;

    if (pagado && !inconsistente) {
      if (anioMinimo !== null && vence && vence.getUTCFullYear() >= anioMinimo) {
        contratoFinalizado.get(grupo)!.add(idKey);
        contratoFinalizadoGeneral.add(idKey);
      }
      pagados.push({
        ...fila,
        cargaId: carga.id,
        semana: carga.semana,
        fechaCarga: new Date(carga.createdAt).toISOString(),
        grupo,
        categoriaOriginal,
      });
      continue;
    }

    let estado: EstadoSemaforo = "REVISION";
    let motivo = "Datos inconsistentes";
    if (duplicado) {
      motivo = "Documento duplicado en la carga";
    } else if (!inconsistente && vence && cuotas !== null) {
      const pagoMontos = porcentajePagado(abonado, total);
      const pagoCuotas = porcentajePagado(cob, ctas);
      if (pagoMontos === null || pagoCuotas === null) {
        motivo = "No se pudo calcular el porcentaje pagado";
      } else {
        const peorPago = Math.min(pagoMontos, pagoCuotas);
        const limite = finGracia(vence);
        if (fechaCorteMs > limite.getTime()) {
          estado = "ROJO";
        } else if (cuotas === 1) {
          estado = "VERDE";
        } else if (peorPago > 0.75 && peorPago < 1) {
          estado = "AMARILLO";
        } else if (peorPago >= 0.5 && peorPago <= 0.75) {
          estado = "NARANJA";
        } else if (peorPago < 0.5) {
          estado = "ROJO";
        } else {
          motivo = "Porcentaje pagado fuera de rango";
        }
      }
    }

    estadoDelCliente.tienePendiente = true;
    if (estado !== "VERDE") estadoDelCliente.bloqueado = true;

    documentos.push({
      ...fila,
      id: `${carga.id}-${fila.fila}`,
      grupo,
      categoriaOriginal,
      estado,
      cuotasPendientes: cuotas,
      fechaVenceISO: vence ? aISO(vence) : null,
      finGraciaISO: vence ? aISO(finGracia(vence)) : null,
      esReventa: false,
      inconsistente: estado === "REVISION",
      motivoRevision: estado === "REVISION" ? motivo : undefined,
    });
  }

  for (const grupo of GRUPOS_SEMAFORO) {
    const conjunto = new Set<string>();
    for (const [idKey, estado] of estadoCliente.get(grupo.id)!) {
      if (
        !estado.bloqueado &&
        (anioMinimo === null || contratoFinalizado.get(grupo.id)!.has(idKey))
      ) {
        conjunto.add(idKey);
        reventaGeneral.add(idKey);
      }
    }
    reventa.set(grupo.id, conjunto);
  }

  for (const documento of documentos) {
    documento.esReventa =
      reventa.get(documento.grupo)?.has(claveIdentificacion(documento.identificacion)) ??
      false;
  }

  const conDocumentoActivo = new Set(
    documentos.map((documento) => claveIdentificacion(documento.identificacion)),
  );
  const ultimoPagado = new Map<
    string,
    { documento: DocumentoPagado; vence: Date | null; ms: number }
  >();

  for (const pagado of pagados) {
    const idKey = claveIdentificacion(pagado.identificacion);
    if (conDocumentoActivo.has(idKey)) continue;
    const vence = parsearFechaVence(pagado.fechaVence);
    if (anioMinimo !== null && (!vence || vence.getUTCFullYear() < anioMinimo)) {
      continue;
    }
    const ms = vence?.getTime() ?? Number.NEGATIVE_INFINITY;
    const anterior = ultimoPagado.get(idKey);
    if (!anterior || ms > anterior.ms) {
      ultimoPagado.set(idKey, { documento: pagado, vence, ms });
    }
  }

  const sinContrato: DocumentoAnalisis[] = [...ultimoPagado.values()].map(
    ({ documento, vence }) => ({
      ...documento,
      id: `${carga.id}-sc-${claveIdentificacion(documento.identificacion)}`,
      grupo: documento.grupo,
      categoriaOriginal: documento.categoriaOriginal,
      estado: "SIN_CONTRATO" as const,
      cuotasPendientes: 0,
      fechaVenceISO: vence ? aISO(vence) : null,
      finGraciaISO: vence ? aISO(finGracia(vence)) : null,
      esReventa:
        reventa
          .get(documento.grupo)
          ?.has(claveIdentificacion(documento.identificacion)) ?? false,
      inconsistente: false,
    }),
  );

  const totalesSinContrato = new Map<GrupoSemaforoId, number>();
  for (const grupo of GRUPOS_SEMAFORO) totalesSinContrato.set(grupo.id, 0);
  for (const documento of sinContrato) {
    totalesSinContrato.set(
      documento.grupo,
      (totalesSinContrato.get(documento.grupo) ?? 0) + 1,
    );
  }

  const resumen: ResumenSemaforo = {
    grupos: GRUPOS_SEMAFORO.map((grupo) => ({
      categoria: grupo.etiqueta,
      etiqueta: grupo.etiqueta,
      e: existentes.get(grupo.id)!.size,
      r: reventa.get(grupo.id)!.size,
    })),
    general: {
      categoria: "General",
      etiqueta: "General",
      e: existentesGenerales.size,
      r: reventaGeneral.size,
    },
    sinContrato: {
      grupos: GRUPOS_SEMAFORO.map((grupo) => ({
        categoria: grupo.etiqueta,
        etiqueta: grupo.etiqueta,
        total: totalesSinContrato.get(grupo.id) ?? 0,
      })),
      general: {
        categoria: "General",
        etiqueta: "General",
        total: sinContrato.length,
      },
    },
  };

  return {
    carga: {
      id: carga.id,
      nombreArchivo: carga.nombreArchivo,
      createdAt: new Date(carga.createdAt).toISOString(),
      semana: carga.semana,
      fechaCorteISO: aISO(fechaCorte),
      esActiva: carga.activo,
      totalRegistros: carga.totalRegistros,
      identificacionesUnicas: existentesGenerales.size,
      anioMinimoSinContrato: anioMinimo,
    },
    resumen,
    indicadores: {
      clientesUnicos: existentesGenerales.size,
      oportunidadesReventa: reventaGeneral.size,
    },
    documentos,
    sinContrato,
    pagados,
    idsReventa: [...reventaGeneral].sort((a, b) => a.localeCompare(b, "es")),
    categorias: [...categorias].sort((a, b) => a.localeCompare(b, "es")),
    categoriasPorGrupo: Object.fromEntries(
      [...categoriasPorGrupo].map(([id, conjunto]) => [
        id,
        [...conjunto].sort((a, b) => a.localeCompare(b, "es")),
      ]),
    ) as Record<GrupoSemaforoId, string[]>,
    provincias: [...provincias].sort((a, b) => a.localeCompare(b, "es")),
  };
}

export function resumenVacio(): ResumenSemaforo {
  return {
    grupos: GRUPOS_SEMAFORO.map((grupo) => ({
      categoria: grupo.etiqueta,
      etiqueta: grupo.etiqueta,
      e: 0,
      r: 0,
    })),
    general: { categoria: "General", etiqueta: "General", e: 0, r: 0 },
    sinContrato: {
      grupos: GRUPOS_SEMAFORO.map((grupo) => ({
        categoria: grupo.etiqueta,
        etiqueta: grupo.etiqueta,
        total: 0,
      })),
      general: { categoria: "General", etiqueta: "General", total: 0 },
    },
  };
}

export function provinciasDe(documentos: DocumentoAnalisis[]): string[] {
  const provincias = new Set<string>();
  for (const documento of documentos) {
    const provincia = String(documento.provincia ?? "").trim();
    if (provincia) provincias.add(provincia);
  }
  return [...provincias].sort((a, b) => a.localeCompare(b, "es"));
}

export function cuotasDe(documentos: DocumentoAnalisis[]): number[] {
  const cuotas = new Set<number>();
  for (const documento of documentos) {
    if (documento.cuotasPendientes !== null) {
      cuotas.add(documento.cuotasPendientes);
    }
  }
  return [...cuotas].sort((a, b) => a - b);
}

export function filtrarDocumentos(
  documentos: DocumentoAnalisis[],
  filtros: FiltrosSemaforo,
  tab: TabSemaforo,
): DocumentoAnalisis[] {
  if (tab === "resumen") return [];

  const busqueda = normalizarTexto(filtros.busqueda);
  const categoria = normalizarTexto(filtros.categoria);
  const provincia = normalizarTexto(filtros.provincia);
  const cuotas = filtros.cuotas.trim() === "" ? null : Number(filtros.cuotas);
  const vistaGeneral = tab === "general" || tab === "sin-contrato";

  return documentos.filter((fila) => {
    if (!vistaGeneral && fila.grupo !== tab) return false;
    if (
      busqueda &&
      !normalizarTexto(
        [
          fila.identificacion,
          fila.nombreCliente,
          fila.numDocumento,
          fila.vendedor,
          fila.categoriaOriginal,
          fila.provincia,
          fila.ciudad,
        ].join(" "),
      ).includes(busqueda)
    ) {
      return false;
    }
    if (
      categoria &&
      !normalizarTexto(fila.categoriaOriginal).includes(categoria)
    ) {
      return false;
    }
    if (provincia && !normalizarTexto(fila.provincia).includes(provincia)) {
      return false;
    }
    if (filtros.color && fila.estado !== filtros.color) return false;
    if (filtros.reventa === "si" && !fila.esReventa) return false;
    if (filtros.reventa === "no" && fila.esReventa) return false;
    if (
      filtros.fechaVenceDesde &&
      (!fila.fechaVenceISO || fila.fechaVenceISO < filtros.fechaVenceDesde)
    ) {
      return false;
    }
    if (
      filtros.fechaVenceHasta &&
      (!fila.fechaVenceISO || fila.fechaVenceISO > filtros.fechaVenceHasta)
    ) {
      return false;
    }
    if (
      cuotas !== null &&
      Number.isFinite(cuotas) &&
      fila.cuotasPendientes !== cuotas
    ) {
      return false;
    }
    return true;
  });
}

function numeroParaOrden(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  const numero = Number(
    texto.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(numero) ? numero : null;
}

export function ordenarDocumentos(
  documentos: DocumentoAnalisis[],
  orden: OrdenSemaforo | null = null,
): DocumentoAnalisis[] {
  const campo =
    orden && esColumnaOrdenableSemaforo(orden.columna)
      ? CAMPO_POR_COLUMNA[orden.columna]
      : null;
  const esNumerico = campo === "ctas" || campo === "cob" || campo === "ven";
  const factor = orden?.direccion === "desc" ? -1 : 1;

  return [...documentos].sort((a, b) => {
    if (!campo) {
      const fechaA = a.fechaVenceISO ?? "9999-12-31";
      const fechaB = b.fechaVenceISO ?? "9999-12-31";
      if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
      return a.fila - b.fila;
    }

    const valorA = String(a[campo] ?? "");
    const valorB = String(b[campo] ?? "");
    let comparacion: number;

    if (esNumerico) {
      const numeroA = numeroParaOrden(valorA);
      const numeroB = numeroParaOrden(valorB);
      comparacion =
        numeroA !== null && numeroB !== null
          ? numeroA - numeroB
          : valorA.localeCompare(valorB, "es");
    } else {
      comparacion = normalizarTexto(valorA).localeCompare(
        normalizarTexto(valorB),
        "es",
      );
    }

    return comparacion !== 0 ? comparacion * factor : a.fila - b.fila;
  });
}
