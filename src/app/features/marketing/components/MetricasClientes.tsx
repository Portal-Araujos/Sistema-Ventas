"use client";

import type { MetricasMarketing } from "@/lib/marketing";

export default function MetricasClientes({ metricas }: { metricas: MetricasMarketing }) {
  const tarjetas: [string, string][] = [
    ["Registros leídos", metricas.registrosLeidos.toLocaleString("es-EC")],
    ["Clientes históricos", metricas.clientesHistoricos.toLocaleString("es-EC")],
    ["Nuevas relaciones", metricas.nuevasRelaciones.toLocaleString("es-EC")],
    ["Ya estaban asignados", metricas.yaEstabanAsignados.toLocaleString("es-EC")],
    ["Pendientes de revisión", metricas.pendientesRevision.toLocaleString("es-EC")],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tarjetas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">{etiqueta}</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{valor}</p>
        </div>
      ))}
    </div>
  );
}
