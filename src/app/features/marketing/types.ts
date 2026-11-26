import type { ClienteCartera } from "@/lib/marketing";

export type CargaDisponible = {
  id: string;
  nombreArchivo: string;
  createdAt: string;
  semana: string;
  activo: boolean;
};

export type HistorialCarga = {
  id: string;
  nombreArchivo: string;
  activo: boolean;
  totalRegistros: number;
  clientes: number;
  createdAt: string;
  creadoPor: string;
  semana: string;
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
    id: string;
    nombreArchivo: string;
    createdAt: string;
    semana: string;
    esActiva: boolean;
    totalRegistros: number;
  } | null;
  clientes: ClienteCartera[];
  cargasDisponibles: CargaDisponible[];
};
