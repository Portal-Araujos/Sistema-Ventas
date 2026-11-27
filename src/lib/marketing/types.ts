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

export type ClienteCartera = ClienteRow;

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

export type AccionAuditoriaMarketing =
  | "CARGA_SUBIDA"
  | "CARGA_ELIMINADA"
  | "MANTENIMIENTO"
  | "ENVIO_TICKET";
