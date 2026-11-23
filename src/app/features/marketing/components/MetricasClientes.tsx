"use client";

import type { FiltroMetricaMarketing, MetricasMarketing } from "@/lib/marketing";

type Props = {
  metricas: MetricasMarketing;
  seleccionada: FiltroMetricaMarketing;
  onSeleccionar: (filtro: FiltroMetricaMarketing) => void;
  deshabilitado?: boolean;
};

const TARJETAS: {
  etiqueta: string;
  filtro: FiltroMetricaMarketing;
  valor: (metricas: MetricasMarketing) => number;
}[] = [
  {
    etiqueta: "Registros leídos",
    filtro: "TODOS",
    valor: (metricas) => metricas.registrosLeidos,
  },
  {
    etiqueta: "Clientes con vendedor antiguo",
    filtro: "CON_VENDEDOR_ANTIGUO",
    valor: (metricas) => metricas.clientesHistoricos,
  },
  {
    etiqueta: "Clientes a los que se les asignó un vendedor actual",
    filtro: "NUEVA_RELACION",
    valor: (metricas) => metricas.nuevasRelaciones,
  },
  {
    etiqueta: "Ya tienen a un vendedor actual",
    filtro: "YA_ASIGNADO",
    valor: (metricas) => metricas.yaEstabanAsignados,
  },
  {
    etiqueta: "Pendientes de revisión",
    filtro: "PENDIENTE",
    valor: (metricas) => metricas.pendientesRevision,
  },
];

export default function MetricasClientes({
  metricas,
  seleccionada,
  onSeleccionar,
  deshabilitado = false,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {TARJETAS.map(({ etiqueta, filtro, valor }) => {
        const activa = seleccionada === filtro;
        const bloqueada = deshabilitado && filtro !== "TODOS";
        return (
          <button
            key={filtro}
            type="button"
            disabled={bloqueada}
            aria-pressed={activa}
            onClick={() => onSeleccionar(activa ? "TODOS" : filtro)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              activa
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
            } ${bloqueada ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <p className="text-xs font-medium text-gray-500">{etiqueta}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {valor(metricas).toLocaleString("es-EC")}
            </p>
          </button>
        );
      })}
    </div>
  );
}
