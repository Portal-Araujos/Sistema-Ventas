"use client";

import { type EstadoFiltroEnvio } from "@/lib/marketing";

type Props = {
  busqueda: string;
  onBusqueda: (valor: string) => void;
  estado: EstadoFiltroEnvio;
  onEstado: (valor: EstadoFiltroEnvio) => void;
  ubicacion: string;
  onUbicacion: (valor: string) => void;
  ubicaciones: string[];
  onLimpiar: () => void;
};

export default function FiltrosEnvios({
  busqueda,
  onBusqueda,
  estado,
  onEstado,
  ubicacion,
  onUbicacion,
  ubicaciones,
  onLimpiar,
}: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Filtros
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Buscar
          <input
            value={busqueda}
            onChange={(evento) => onBusqueda(evento.target.value)}
            placeholder="Identificación, nombre o provincia"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Estado
          <select
            value={estado}
            onChange={(evento) =>
              onEstado(evento.target.value as EstadoFiltroEnvio)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="todos">Todos</option>
            <option value="pendientes">Pendientes</option>
            <option value="enviados">Enviados</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Ubicación
          <select
            value={ubicacion}
            onChange={(evento) => onUbicacion(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="">Todas</option>
            {ubicaciones.map((valor) => (
              <option key={valor} value={valor}>
                {valor === "—" ? "Sin ubicación" : valor}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onLimpiar}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
