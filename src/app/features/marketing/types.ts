import type {
  AnalisisCartera,
  DocumentoAnalisis,
  DocumentoPagado,
  FiltrosSemaforo,
  GrupoSemaforoId,
  IndicadoresSemaforo,
  ResumenSemaforo,
  TabSemaforo,
} from "@/lib/marketing";

export type {
  DocumentoAnalisis,
  DocumentoPagado,
  FiltrosSemaforo,
  TabSemaforo,
};

export type CargaDisponible = {
  id: string;
  nombreArchivo: string;
  createdAt: string;
  semana: string;
  activo: boolean;
};

export type CarteraCarga = AnalisisCartera["carga"];

export type HistorialCarga = {
  id: string;
  nombreArchivo: string;
  activo: boolean;
  totalRegistros: number;
  clientes: number;
  createdAt: string;
  creadoPor: string;
  semana: string;
  fechaCorte: string | null;
  identificacionesUnicas: number | null;
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

export type SemaforoResponse = {
  carga: CarteraCarga | null;
  cargasDisponibles: CargaDisponible[];
  resumen: ResumenSemaforo;
  indicadores: IndicadoresSemaforo;
  documentos: DocumentoAnalisis[];
  totalDocumentos: number;
  pagina: number;
  porPagina: number;
  categorias: string[];
  categoriasPorGrupo: Record<GrupoSemaforoId, string[]>;
  provincias: string[];
  cuotas: number[];
};

export type DocumentosPagadosResponse = {
  documentos: DocumentoPagado[];
};
