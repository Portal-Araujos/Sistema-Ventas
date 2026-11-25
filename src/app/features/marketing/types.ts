import type {
  ClienteDistribuido,
  MetricasMarketing,
  ResumenCambiosMarketing,
} from "@/lib/marketing";

export type ResumenEnvio = { vendedor: string; clientes: number }[];

export type { ResumenCambiosMarketing };

export type CargaDisponible = {
  id: string;
  nombreArchivo: string;
  createdAt: string;
  semana: string;
  activo: boolean;
};

export type CambioCarga = {
  id: string;
  identificacion: string;
  nombreCliente: string;
  tipo: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
};

export type CambiosResponse = {
  carga: {
    id: string;
    nombreArchivo: string;
    semana: string;
    activo: boolean;
    createdAt: string;
  };
  resumen: ResumenCambiosMarketing;
  cambios: CambioCarga[];
};

export type HistorialCarga = {
  id: string;
  nombreArchivo: string;
  activo: boolean;
  totalRegistros: number;
  clientes: number;
  enviadoEn: string | null;
  createdAt: string;
  creadoPor: string;
  semana: string;
  cambios: ResumenCambiosMarketing;
};

export type AuditoriaMarketing = {
  id: string;
  accion: string;
  nombreArchivo: string | null;
  detalles: Record<string, unknown> | null;
  usuario: string | null;
  createdAt: string;
};

export type HistorialResponse = {
  cargas: HistorialCarga[];
  auditorias: AuditoriaMarketing[];
};

export type ClienteAsignableVista = {
  fila: number;
  identificacion: string;
  nombreCliente: string;
  movil: string;
  provincia: string;
  ciudad: string;
  direccion: string;
  vendedorOriginal: string;
  vendedorAsignado: string;
};

export type RespuestaPrevisualizacionAsignacion = {
  carga: {
    id: string;
    nombreArchivo: string;
    semana: string;
    totalRegistros: number;
  };
  vendedor: {
    id: string;
    nombre: string;
    canonico: string;
  };
  elegibles: number;
  semilla: string;
  clientes: ClienteAsignableVista[];
};

export type RespuestaEnvioAsignacion = {
  enviadoEn: string;
  totalAsignados: number;
  ticket: {
    id: number;
    codigo: string;
    url: string;
  };
};

export type CarteraResponse = {
  carga: {
    id: string;
    nombreArchivo: string;
    createdAt: string;
    semana: string;
    esActiva: boolean;
    totalRegistros: number;
    enviadoEn: string | null;
    cambios: ResumenCambiosMarketing;
  } | null;
  original: ClienteDistribuido[];
  aplicado: ClienteDistribuido[];
  metricas: MetricasMarketing;
  vendedores: string[];
  resumenEnvio: ResumenEnvio;
  cargasDisponibles: CargaDisponible[];
};
