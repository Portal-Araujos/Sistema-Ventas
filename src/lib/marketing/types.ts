export type ClienteRow = {
  fila: number;
  identificacion: string;
  nombreCliente: string;
  movil: string;
  provincia: string;
  ciudad: string;
  direccion: string;
  vendedor: string;
};

export type ClienteDistribuido = ClienteRow & {
  claveCliente: string;
  claveVendedor: string;
  provinciaKey: string;
  ciudadKey: string;
  vendedorOriginal: string;
  vendedorAsignado: string;
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

export type OpcionFiltro = { clave: string; etiqueta: string };

export const ACCIONES_AUDITORIA_MARKETING = [
  "CARGA_SUBIDA",
  "CARTERA_ENVIADA",
  "CARGA_ELIMINADA",
  "MANTENIMIENTO",
] as const;

export type AccionAuditoriaMarketing =
  (typeof ACCIONES_AUDITORIA_MARKETING)[number];
