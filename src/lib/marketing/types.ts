export type ClienteRow = {
  fila: number;
  identificacion: string;
  nombreCliente: string;
  numDocumento: string;
  fechaEmision: string;
  fechaVence: string;
  total: string;
  ctas: string;
  abonado: string;
  cob: string;
  saldo: string;
  ven: string;
  dias: string;
  movil: string;
  vendedor: string;
  cuota: string;
  saldoFecha: string;
  categoriaOrigen: string;
  provincia: string;
  ciudad: string;
  direccion: string;
};

export type CategoriaClienteMarketing =
  | "NUEVA_RELACION"
  | "YA_ASIGNADO"
  | "PENDIENTE"
  | "SIN_CAMBIO";

export type FiltroMetricaMarketing =
  | "TODOS"
  | "CON_VENDEDOR_ANTIGUO"
  | CategoriaClienteMarketing;

export type ClienteDistribuido = ClienteRow & {
  claveCliente: string;
  claveVendedor: string;
  provinciaKey: string;
  ciudadKey: string;
  vendedorOriginal: string;
  vendedorAsignado: string;
  categoria: CategoriaClienteMarketing;
  esRepresentante: boolean;
};

export type MetricasMarketing = {
  registrosLeidos: number;
  clientesHistoricos: number;
  nuevasRelaciones: number;
  yaEstabanAsignados: number;
  pendientesRevision: number;
};

export type ResultadoDistribucion = {
  original: ClienteDistribuido[];
  aplicado: ClienteDistribuido[];
  metricas: MetricasMarketing;
};

export type FiltrosMarketing = {
  vendedor: string;
  provincia: string;
  ciudad: string;
};

export type ColumnaOrdenableMarketing =
  | "Nombre Cliente"
  | "Provincia"
  | "Ciudad"
  | "Vendedor"
  | "Núm. Documento"
  | "Fecha Emisión"
  | "Fecha Vence"
  | "$ Total"
  | "# Ctas"
  | "$ Abonado"
  | "# Cob"
  | "$ Saldo"
  | "# Ven"
  | "Días"
  | "$ Cuota"
  | "Saldo Fecha"
  | "Categoría (Excel)";

export type OrdenMarketing = {
  columna: ColumnaOrdenableMarketing;
  direccion: "asc" | "desc";
};

export type OpcionFiltro = { clave: string; etiqueta: string };

export type TipoCambioMarketing = "ALTA" | "BAJA" | "CAMBIO";

export type CambioMarketing = {
  claveCliente: string;
  identificacion: string;
  nombreCliente: string;
  tipo: TipoCambioMarketing;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
};

export type ResumenCambiosMarketing = {
  altas: number;
  bajas: number;
  cambios: number;
  total: number;
};

export type AccionAuditoriaMarketing =
  | "CARGA_SUBIDA"
  | "CARTERA_ENVIADA"
  | "ASIGNACION_MANUAL_ENVIADA"
  | "CARGA_ELIMINADA"
  | "MANTENIMIENTO";
