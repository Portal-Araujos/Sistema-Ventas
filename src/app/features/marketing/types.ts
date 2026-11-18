import type {
  ClienteDistribuido,
  MetricasMarketing,
} from "@/lib/marketing";

export type CarteraResponse = {
  carga: {
    nombreArchivo: string;
    createdAt: string;
    totalRegistros: number;
  } | null;
  original: ClienteDistribuido[];
  aplicado: ClienteDistribuido[];
  metricas: MetricasMarketing;
  vendedores: string[];
};
