"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { CarteraResponse } from "../types";
import CargaExcel from "./CargaExcel";
import TablaClientes from "./TablaClientes";

export default function CarteraAdmin() {
  const [datos, setDatos] = useState<CarteraResponse | null>(null);
  const [error, setError] = useState("");
  const [cargaIdSeleccionada, setCargaIdSeleccionada] = useState("");
  const claveCargadaRef = useRef<string | null>(null);

  const cargar = useCallback(async (id?: string) => {
    setError("");
    try {
      const cargaId = id ?? cargaIdSeleccionada;
      const url = cargaId
        ? `/api/marketing/cartera?cargaId=${encodeURIComponent(cargaId)}`
        : "/api/marketing/cartera";
      const respuesta = await fetch(url, { cache: "no-store" });
      if (!respuesta.ok) throw new Error("No se pudo cargar la cartera");
      setDatos((await respuesta.json()) as CarteraResponse);
    } catch {
      setError("No se pudo cargar la cartera de Marketing.");
    }
  }, [cargaIdSeleccionada]);

  const recargar = useCallback(
    (id?: string) => {
      const clave = id ?? cargaIdSeleccionada;
      claveCargadaRef.current = clave;
      void cargar(clave);
    },
    [cargar, cargaIdSeleccionada],
  );

  useEffect(() => {
    if (claveCargadaRef.current === cargaIdSeleccionada) return;
    recargar(cargaIdSeleccionada);
  }, [cargaIdSeleccionada, recargar]);

  const despuesDeCargar = () => {
    setCargaIdSeleccionada("");
    recargar("");
  };

  const cambiarSemana = (id: string) => {
    setCargaIdSeleccionada(id);
  };

  return (
    <div className="flex flex-col gap-5">
      <CargaExcel onCargado={despuesDeCargar} />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-2 text-sm text-gray-700 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 font-semibold">
            <CalendarDays size={18} /> Semana consultada
          </span>
          <select
            value={cargaIdSeleccionada}
            onChange={(evento) => cambiarSemana(evento.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 sm:max-w-md"
          >
            <option value="">Semana vigente</option>
            {(datos?.cargasDisponibles ?? []).map((carga) => (
              <option key={carga.id} value={carga.id}>
                {carga.semana} — {carga.nombreArchivo}
                {carga.activo ? " (vigente)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {datos?.carga && (
        <div className="text-xs text-gray-500">
          <p>
            Carga consultada: <strong>{datos.carga.semana}</strong> ·{" "}
            <strong>{datos.carga.nombreArchivo}</strong> ·{" "}
            {new Date(datos.carga.createdAt).toLocaleString("es-EC")} ·{" "}
            {datos.carga.totalRegistros.toLocaleString("es-EC")} registros
          </p>
        </div>
      )}

      {datos?.carga && !datos.carga.esActiva && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Carga inactiva · solo lectura</p>
            <p className="text-xs">Estás consultando una semana anterior.</p>
          </div>
          <button
            type="button"
            onClick={() => cambiarSemana("")}
            className="self-start font-bold underline"
          >
            Volver a la semana vigente
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <TablaClientes
        filas={datos?.clientes ?? []}
        claveVista={`${datos?.carga?.id ?? "sin-carga"}`}
      />
    </div>
  );
}
