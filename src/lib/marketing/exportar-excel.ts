import ExcelJS from "exceljs";
import {
  etiquetaMotivos,
  type CandidatoEnvio,
  type ConteoVendedor,
  type EstadoFiltroEnvio,
  type RegistroEnvio,
} from "./envios";
import {
  CAMPO_POR_COLUMNA,
  COLUMNAS_SEMAFORO,
  type AnalisisCartera,
  type ColumnaSemaforo,
  type DocumentoAnalisis,
  type EstadoSemaforo,
} from "./semaforo";

export const RELLENOS_ESTADO: Record<EstadoSemaforo, string | null> = {
  VERDE: "FFDCFCE7",
  AMARILLO: "FFFEF9C3",
  NARANJA: "FFFFEDD5",
  ROJO: "FFFEE2E2",
  REVISION: "FFE5E7EB",
  SIN_CONTRATO: null,
};

const RELLENO_ENCABEZADO = "FFE5E7EB";
const RELLENO_ENVIADO = "FFDCFCE7";
const RELLENO_PENDIENTE = "FFF3F4F6";

function relleno(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function nombreHojaSeguro(valor: string): string {
  return valor.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || "Datos";
}

function formatearFecha(valor: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

function ajustarColumnas(
  hoja: ExcelJS.Worksheet,
  columnas: string[],
  filas: string[][],
): void {
  columnas.forEach((columna, indice) => {
    let ancho = columna.length;
    for (const fila of filas.slice(0, 300)) {
      ancho = Math.max(ancho, (fila[indice] ?? "").length);
    }
    hoja.getColumn(indice + 1).width = Math.min(50, Math.max(11, ancho + 3));
  });
}

function escribirTabla({
  hoja,
  columnas,
  filas,
  rellenoPorFila,
  resaltarGeneral,
}: {
  hoja: ExcelJS.Worksheet;
  columnas: string[];
  filas: string[][];
  rellenoPorFila?: (fila: string[], indice: number) => string | null;
  resaltarGeneral?: boolean;
}): void {
  const encabezado = hoja.addRow(columnas);
  encabezado.font = { bold: true, color: { argb: "FF111827" } };
  encabezado.fill = relleno(RELLENO_ENCABEZADO);
  encabezado.alignment = { vertical: "middle", wrapText: true };
  encabezado.height = 24;

  filas.forEach((valores, indice) => {
    const fila = hoja.addRow(valores);
    const color = rellenoPorFila?.(valores, indice) ?? null;
    const esGeneral = resaltarGeneral && valores[0] === "General";
    if (color || esGeneral) {
      fila.eachCell({ includeEmpty: true }, (celda) => {
        if (color) celda.fill = relleno(color);
        if (esGeneral) celda.font = { bold: true };
      });
    }
  });

  if (filas.length > 0) {
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: filas.length + 1, column: columnas.length },
    };
  }
  ajustarColumnas(hoja, columnas, filas);
}

export function columnasValidas(
  columnas: string[],
): ColumnaSemaforo[] {
  const permitidas = columnas.filter((columna): columna is ColumnaSemaforo =>
    (COLUMNAS_SEMAFORO as readonly string[]).includes(columna),
  );
  return permitidas.length > 0 ? permitidas : [...COLUMNAS_SEMAFORO];
}

export function libroDocumentos({
  documentos,
  columnas,
  nombreHoja,
}: {
  documentos: DocumentoAnalisis[];
  columnas: ColumnaSemaforo[];
  nombreHoja: string;
}): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Sistema de Ventas";
  libro.created = new Date();

  const hoja = libro.addWorksheet(nombreHojaSeguro(nombreHoja), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const filas = documentos.map((documento) =>
    columnas.map((columna) => String(documento[CAMPO_POR_COLUMNA[columna]] ?? "")),
  );

  escribirTabla({
    hoja,
    columnas: [...columnas],
    filas,
    rellenoPorFila: (fila, indice) =>
      RELLENOS_ESTADO[documentos[indice].estado] ?? null,
  });

  return libro;
}

export function libroResumen({
  analisis,
}: {
  analisis: AnalisisCartera;
}): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Sistema de Ventas";
  libro.created = new Date();

  const { carga, resumen, indicadores } = analisis;
  const hojaResumen = libro.addWorksheet("Resumen");
  escribirTabla({
    hoja: hojaResumen,
    columnas: ["Dato", "Valor"],
    filas: [
      ["Semana", carga.semana],
      ["Fecha y hora de carga", carga.createdAt],
      ["Fecha de corte", carga.fechaCorteISO],
      ["Registros cargados", carga.totalRegistros.toLocaleString("es-EC")],
      [
        "Identificaciones únicas",
        carga.identificacionesUnicas.toLocaleString("es-EC"),
      ],
      [
        "Año mínimo sin contrato",
        carga.anioMinimoSinContrato
          ? String(carga.anioMinimoSinContrato)
          : "Sin filtro",
      ],
      ["Clientes únicos", indicadores.clientesUnicos.toLocaleString("es-EC")],
      [
        "Oportunidades de reventa",
        indicadores.oportunidadesReventa.toLocaleString("es-EC"),
      ],
    ],
  });

  const hojaOperativa = libro.addWorksheet("Tabla Operativa");
  escribirTabla({
    hoja: hojaOperativa,
    columnas: ["Categoría", "E", "R"],
    filas: [...resumen.grupos, resumen.general].map((fila) => [
      fila.etiqueta,
      fila.e.toLocaleString("es-EC"),
      fila.r.toLocaleString("es-EC"),
    ]),
    resaltarGeneral: true,
  });

  const hojaReventa = libro.addWorksheet("Oportunidades Reventa");
  escribirTabla({
    hoja: hojaReventa,
    columnas: ["Categoría", "Total"],
    filas: [...resumen.sinContrato.grupos, resumen.sinContrato.general].map(
      (fila) => [fila.etiqueta, fila.total.toLocaleString("es-EC")],
    ),
    resaltarGeneral: true,
  });

  return libro;
}

export function filtrarCandidatos(
  candidatos: CandidatoEnvio[],
  busqueda: string,
  estado: EstadoFiltroEnvio,
): CandidatoEnvio[] {
  const texto = busqueda.trim().toUpperCase();
  return candidatos.filter((cliente) => {
    if (estado === "pendientes" && cliente.enviado) return false;
    if (estado === "enviados" && !cliente.enviado) return false;
    if (!texto) return true;
    return [cliente.identificacion, cliente.nombreCliente, cliente.provincia]
      .join(" ")
      .toUpperCase()
      .includes(texto);
  });
}

export function libroEnvios({
  candidatos,
  conteos,
  registros,
}: {
  candidatos: CandidatoEnvio[];
  conteos: ConteoVendedor[];
  registros: RegistroEnvio[];
}): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Sistema de Ventas";
  libro.created = new Date();

  const hojaClientes = libro.addWorksheet("Candidatos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const columnasClientes = [
    "Identificación",
    "Nombre Cliente",
    "Motivo",
    "Categoría",
    "Ubicación",
    "Vendedor",
    "Móvil",
    "Fecha Vence",
    "Estado",
    "Ticket",
    "Fecha envío",
    "Vendedor asignado",
  ];
  const filasClientes = candidatos.map((cliente) => [
    cliente.identificacion,
    cliente.nombreCliente,
    etiquetaMotivos(cliente.motivos),
    cliente.categoria || "—",
    [cliente.provincia, cliente.ciudad].filter(Boolean).join(" / ") || "—",
    cliente.vendedorAnterior || "—",
    cliente.movil || "—",
    cliente.fechaVence || "—",
    cliente.enviado ? "Enviado" : "Pendiente",
    cliente.ticketCodigo || "—",
    cliente.enviado ? formatearFecha(cliente.fechaEnvio) : "—",
    cliente.vendedorNombre || "—",
  ]);
  escribirTabla({
    hoja: hojaClientes,
    columnas: columnasClientes,
    filas: filasClientes,
    rellenoPorFila: (fila) =>
      fila[8] === "Enviado" ? RELLENO_ENVIADO : RELLENO_PENDIENTE,
  });

  const hojaVendedores = libro.addWorksheet("Enviados por vendedor");
  escribirTabla({
    hoja: hojaVendedores,
    columnas: ["Vendedor", "Enviados"],
    filas: conteos.map((conteo) => [
      conteo.vendedorNombre,
      conteo.total.toLocaleString("es-EC"),
    ]),
  });

  const hojaTickets = libro.addWorksheet("Últimos tickets");
  escribirTabla({
    hoja: hojaTickets,
    columnas: ["Ticket", "Vendedor", "Fecha", "Clientes"],
    filas: registros.map((registro) => [
      registro.ticketCodigo ?? "—",
      registro.vendedorNombre ?? "—",
      formatearFecha(registro.fecha),
      registro.clientes.length.toLocaleString("es-EC"),
    ]),
  });

  return libro;
}

export async function libroABuffer(
  libro: ExcelJS.Workbook,
): Promise<Uint8Array> {
  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
