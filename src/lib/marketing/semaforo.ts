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
export type TabSemaforo = "resumen" | "general" | GrupoSemaforoId;
export type EstadoSemaforo =
  | "VERDE"
  | "AMARILLO"
  | "NARANJA"
  | "ROJO"
  | "REVISION";

export const COLUMNAS_SEMAFORO = [
  "Identificación",
  "Nombre Cliente",
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
  "Móvil",
  "Vendedor",
  "$ Cuota",
  "Saldo Fecha",
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

export type ResumenSemaforo = {
  grupos: FilaResumenSemaforo[];
  general: FilaResumenSemaforo;
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
  };
  resumen: ResumenSemaforo;
  indicadores: IndicadoresSemaforo;
  documentos: DocumentoAnalisis[];
  pagados: DocumentoPagado[];
  categorias: string[];
};

export type FiltrosSemaforo = {
  busqueda: string;
  identificacion: string;
  nombre: string;
  documento: string;
  categoria: string;
  estado: string;
  reventa: string;
  fechaVenceDesde: string;
  fechaVenceHasta: string;
  cuotasMin: string;
  cuotasMax: string;
};

export const FILTROS_SEMAFORO_VACIOS: FiltrosSemaforo = {
  busqueda: "",
  identificacion: "",
  nombre: "",
  documento: "",
  categoria: "",
  estado: "",
  reventa: "",
  fechaVenceDesde: "",
  fechaVenceHasta: "",
  cuotasMin: "",
  cuotasMax: "",
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

  const existentes = new Map<GrupoSemaforoId, Set<string>>();
  const reventa = new Map<GrupoSemaforoId, Set<string>>();
  const estadoCliente = new Map<
    GrupoSemaforoId,
    Map<string, { tienePendiente: boolean; bloqueado: boolean }>
  >();

  for (const grupo of GRUPOS_SEMAFORO) {
    existentes.set(grupo.id, new Set());
    reventa.set(grupo.id, new Set());
    estadoCliente.set(grupo.id, new Map());
  }

  const existentesGenerales = new Set<string>();
  const reventaGeneral = new Set<string>();
  const documentos: DocumentoAnalisis[] = [];
  const pagados: DocumentoPagado[] = [];
  const categorias = new Set<string>();
  const documentosVistos = new Set<string>();

  for (const fila of filas) {
    const grupo = grupoDeCategoria(fila.categoriaOrigen);
    if (!grupo) continue;

    const categoriaOriginal =
      String(fila.categoriaOrigen ?? "").trim() || "SIN CATEGORÍA";
    const idKey = claveIdentificacion(fila.identificacion);
    categorias.add(categoriaOriginal);
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
      const limite = finGracia(vence);
      if (fechaCorteMs > limite.getTime()) {
        estado = "ROJO";
      } else if (cuotas === 1) {
        estado = "VERDE";
      } else if (cuotas === 2) {
        estado = "AMARILLO";
      } else {
        estado = "NARANJA";
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
      if (!estado.bloqueado) {
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
    },
    resumen,
    indicadores: {
      clientesUnicos: existentesGenerales.size,
      oportunidadesReventa: reventaGeneral.size,
    },
    documentos,
    pagados,
    categorias: [...categorias].sort((a, b) => a.localeCompare(b, "es")),
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
  };
}

export function filtrarDocumentos(
  documentos: DocumentoAnalisis[],
  filtros: FiltrosSemaforo,
  tab: TabSemaforo,
): DocumentoAnalisis[] {
  if (tab === "resumen") return [];

  const busqueda = normalizarTexto(filtros.busqueda);
  const identificacion = normalizarTexto(filtros.identificacion);
  const nombre = normalizarTexto(filtros.nombre);
  const documento = normalizarTexto(filtros.documento);
  const categoria = normalizarTexto(filtros.categoria);
  const cuotasMin = filtros.cuotasMin === "" ? null : Number(filtros.cuotasMin);
  const cuotasMax = filtros.cuotasMax === "" ? null : Number(filtros.cuotasMax);

  return documentos.filter((fila) => {
    if (tab !== "general" && fila.grupo !== tab) return false;
    if (
      busqueda &&
      !normalizarTexto(
        [
          fila.identificacion,
          fila.nombreCliente,
          fila.numDocumento,
          fila.vendedor,
          fila.categoriaOriginal,
        ].join(" "),
      ).includes(busqueda)
    ) {
      return false;
    }
    if (
      identificacion &&
      !normalizarTexto(fila.identificacion).includes(identificacion)
    ) {
      return false;
    }
    if (
      nombre &&
      !normalizarTexto(fila.nombreCliente).includes(nombre)
    ) {
      return false;
    }
    if (
      documento &&
      !normalizarTexto(fila.numDocumento).includes(documento)
    ) {
      return false;
    }
    if (
      categoria &&
      !normalizarTexto(fila.categoriaOriginal).includes(categoria)
    ) {
      return false;
    }
    if (filtros.estado && fila.estado !== filtros.estado) return false;
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
      cuotasMin !== null &&
      (fila.cuotasPendientes === null || fila.cuotasPendientes < cuotasMin)
    ) {
      return false;
    }
    if (
      cuotasMax !== null &&
      (fila.cuotasPendientes === null || fila.cuotasPendientes > cuotasMax)
    ) {
      return false;
    }
    return true;
  });
}

export function ordenarDocumentos(
  documentos: DocumentoAnalisis[],
): DocumentoAnalisis[] {
  return [...documentos].sort((a, b) => {
    const fechaA = a.fechaVenceISO ?? "9999-12-31";
    const fechaB = b.fechaVenceISO ?? "9999-12-31";
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    return a.fila - b.fila;
  });
}
