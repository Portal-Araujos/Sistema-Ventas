"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Megaphone } from "lucide-react";
import {
  aplicarFiltros,
  COLUMNAS_TABLA,
  FILTRO_TODOS,
  FILTROS_VACIOS,
  opcionesConVacio,
  opcionesVendedor,
  type FiltrosMarketing,
} from "@/lib/marketing";
import type { CarteraResponse } from "../types";
import BarraFiltros from "./BarraFiltros";
import BotonDistribucion from "./BotonDistribucion";
import BotonEnvio from "./BotonEnvio";
import CargaExcel from "./CargaExcel";
import MetricasClientes from "./MetricasClientes";
import SelectorColumnas from "./SelectorColumnas";
import TablaClientes from "./TablaClientes";

export default function DistribuidorAdmin() {
  const [datos, setDatos] = useState<CarteraResponse | null>(null);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [distribucionAplicada, setDistribucionAplicada] = useState(false);
  const [cargaIdSeleccionada, setCargaIdSeleccionada] = useState("");
  const [columnasVisibles, setColumnasVisibles] = useState<Set<string>>(
    () => new Set(COLUMNAS_TABLA),
  );

  const cargar = useCallback(
    async (id?: string) => {
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
    },
    [cargaIdSeleccionada],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const despuesDeCargar = async () => {
    setCargaIdSeleccionada("");
    setDistribucionAplicada(false);
    await cargar("");
  };

  const cambiarSemana = (id: string) => {
    setCargaIdSeleccionada(id);
    setDistribucionAplicada(false);
  };

  const fuente = useMemo(
    () => (distribucionAplicada ? (datos?.aplicado ?? []) : (datos?.original ?? [])),
    [distribucionAplicada, datos],
  );

  const provincias = useMemo(
    () => opcionesConVacio(fuente.map((fila) => fila.provincia), "(Sin provincia)"),
    [fuente],
  );
  const ciudades = useMemo(() => {
    const previas = aplicarFiltros(fuente, {
      vendedor: FILTRO_TODOS,
      provincia: borrador.provincia,
      ciudad: FILTRO_TODOS,
    });
    return opcionesConVacio(previas.map((fila) => fila.ciudad), "(Sin ciudad)");
  }, [fuente, borrador.provincia]);

  const filas = useMemo(() => aplicarFiltros(fuente, aplicados), [fuente, aplicados]);

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
          <p className="mt-1">
            Respecto a la semana anterior: {datos.carga.cambios.altas} altas ·{" "}
            {datos.carga.cambios.bajas} bajas · {datos.carga.cambios.cambios} cambios
          </p>
        </div>
      )}

      {datos?.carga && !datos.carga.esActiva && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Carga inactiva · solo lectura</p>
            <p className="text-xs">
              No se puede aplicar distribución ni enviar una semana anterior.
            </p>
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

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">Envío a vendedores</p>
            <p className="text-xs text-blue-700">
              Hasta que no envíes, los vendedores no verán clientes en su apartado.
            </p>
          </div>
          <BotonEnvio
            deshabilitado={!datos?.carga || !datos.carga.esActiva}
            enviadoEn={datos?.carga?.enviadoEn ?? null}
            onEnviado={cargar}
          />
        </div>
        {datos && datos.resumenEnvio.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-blue-200 pt-3">
            {datos.resumenEnvio.map((item) => (
              <span
                key={item.vendedor}
                className="rounded-full bg-white px-3 py-1 text-xs text-blue-900"
              >
                {item.vendedor}: <strong>{item.clientes}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <MetricasClientes
        metricas={datos?.metricas ?? {
          registrosLeidos: 0,
          clientesHistoricos: 0,
          nuevasRelaciones: 0,
          yaEstabanAsignados: 0,
          pendientesRevision: 0,
        }}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Megaphone size={18} />
            Redistribución de clientes de vendedores anteriores
          </div>
          <BotonDistribucion
            aplicada={distribucionAplicada}
            onToggle={() => setDistribucionAplicada((valor) => !valor)}
            deshabilitado={!datos?.carga?.esActiva}
          />
        </div>
      </div>

      <BarraFiltros
        vendedores={opcionesVendedor()}
        provincias={provincias}
        ciudades={ciudades}
        value={borrador}
        onChange={setBorrador}
        onAplicar={() => setAplicados(borrador)}
      />

      <SelectorColumnas
        visibles={columnasVisibles}
        onChange={setColumnasVisibles}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <TablaClientes
        filas={filas}
        columnasVisibles={columnasVisibles}
        distribucionAplicada={distribucionAplicada}
      />
    </div>
  );
}
