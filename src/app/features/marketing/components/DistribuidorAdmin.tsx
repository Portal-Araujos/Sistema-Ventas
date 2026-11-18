"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
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
import HistorialAuditoria from "./HistorialAuditoria";
import MetricasClientes from "./MetricasClientes";
import SelectorColumnas from "./SelectorColumnas";
import TablaClientes from "./TablaClientes";

export default function DistribuidorAdmin() {
  const [datos, setDatos] = useState<CarteraResponse | null>(null);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [distribucionAplicada, setDistribucionAplicada] = useState(false);
  const [columnasVisibles, setColumnasVisibles] = useState<Set<string>>(
    () => new Set(COLUMNAS_TABLA),
  );
  const [historialKey, setHistorialKey] = useState(0);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const respuesta = await fetch("/api/marketing/cartera", { cache: "no-store" });
      if (!respuesta.ok) throw new Error("No se pudo cargar la cartera");
      setDatos((await respuesta.json()) as CarteraResponse);
    } catch {
      setError("No se pudo cargar la cartera de Marketing.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const recargarTodo = useCallback(async () => {
    await cargar();
    setHistorialKey((valor) => valor + 1);
  }, [cargar]);

  const fuente = distribucionAplicada
    ? (datos?.aplicado ?? [])
    : (datos?.original ?? []);

  const provincias = useMemo(
    () => opcionesConVacio(fuente.map((fila) => fila.provincia), "(Sin provincia)"),
    [fuente],
  );
  const ciudades = useMemo(() => {
    const previas = aplicarFiltros(fuente, {
      ...borrador,
      vendedor: FILTRO_TODOS,
      ciudad: FILTRO_TODOS,
    });
    return opcionesConVacio(previas.map((fila) => fila.ciudad), "(Sin ciudad)");
  }, [fuente, borrador.provincia]);

  const filas = useMemo(() => aplicarFiltros(fuente, aplicados), [fuente, aplicados]);

  return (
    <div className="flex flex-col gap-5">
      <CargaExcel onCargado={recargarTodo} />

      {datos?.carga && (
        <p className="text-xs text-gray-500">
          Carga actual: <strong>{datos.carga.nombreArchivo}</strong> ·{" "}
          {new Date(datos.carga.createdAt).toLocaleString("es-EC")} ·{" "}
          {datos.carga.totalRegistros.toLocaleString("es-EC")} registros
        </p>
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
            deshabilitado={!datos?.carga}
            enviadoEn={datos?.carga?.enviadoEn ?? null}
            onEnviado={recargarTodo}
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

      <HistorialAuditoria
        refreshKey={historialKey}
        onCambiado={recargarTodo}
      />
    </div>
  );
}
