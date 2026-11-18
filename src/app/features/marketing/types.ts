import type {
  ClienteDistribuido,
  MetricasMarketing,
} from "@/lib/marketing";

export type ResumenEnvio = { vendedor: string; clientes: number }[];

export type HistorialCarga = {
  id: string;
  nombreArchivo: string;
  activo: boolean;
  totalRegistros: number;
  clientes: number;
  enviadoEn: string | null;
  createdAt: string;
  creadoPor: string;
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

export type CarteraResponse = {
  carga: {
    nombreArchivo: string;
    createdAt: string;
    totalRegistros: number;
    enviadoEn: string | null;
  } | null;
  original: ClienteDistribuido[];
  aplicado: ClienteDistribuido[];
  metricas: MetricasMarketing;
  vendedores: string[];
  resumenEnvio: ResumenEnvio;
};
