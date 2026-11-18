"use client";

import { useEffect, useMemo, useState } from "react";
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
import SelectorColumnas from "./SelectorColumnas";
import TablaClientes from "./TablaClientes";

export default function DistribuidorVendedor() {
  const [datos, setDatos] = useState<CarteraResponse | null>(null);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<FiltrosMarketing>(FILTROS_VACIOS);
  const [columnasVisibles, setColumnasVisibles] = useState<Set<string>>(
    () => new Set(COLUMNAS_TABLA),
  );

  useEffect(() => {
    const cargar = async () => {
      try {
        const respuesta = await fetch("/api/marketing/cartera", { cache: "no-store" });
        if (!respuesta.ok) throw new Error("No autorizado");
        setDatos((await respuesta.json()) as CarteraResponse);
      } catch {
        setError("No se pudo cargar tu cartera de Marketing.");
      }
    };
    void cargar();
  }, []);

  const filas = datos?.aplicado ?? [];
  const provincias = useMemo(
    () => opcionesConVacio(filas.map((fila) => fila.provincia), "(Sin provincia)"),
    [filas],
  );
  const ciudades = useMemo(() => {
    const previas = aplicarFiltros(filas, {
      ...borrador,
      vendedor: FILTRO_TODOS,
      ciudad: FILTRO_TODOS,
    });
    return opcionesConVacio(previas.map((fila) => fila.ciudad), "(Sin ciudad)");
  }, [filas, borrador.provincia]);

  const visibles = useMemo(() => aplicarFiltros(filas, aplicados), [filas, aplicados]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!datos) return <p className="text-sm text-gray-500">Cargando cartera…</p>;
  if (!datos.carga?.enviadoEn) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        La cartera aún no ha sido enviada. Espera a que administración publique la
        distribución.
      </div>
    );
  }
  if (filas.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No tienes clientes asignados en la cartera enviada.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-gray-500">
        Cartera enviada el {new Date(datos.carga.enviadoEn).toLocaleString("es-EC")}
      </p>
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
      <TablaClientes
        filas={visibles}
        columnasVisibles={columnasVisibles}
        distribucionAplicada
      />
    </div>
  );
}
