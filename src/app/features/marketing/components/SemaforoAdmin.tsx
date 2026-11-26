"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  COLUMNAS_SEMAFORO,
  FILTROS_SEMAFORO_VACIOS,
  GRUPOS_SEMAFORO,
  etiquetaGrupo,
  type FiltrosSemaforo,
  type TabSemaforo,
} from "@/lib/marketing";
import type {
  DocumentoPagado,
  DocumentosPagadosResponse,
  SemaforoResponse,
} from "../types";
import CargaExcel from "./CargaExcel";
import DocumentosTabla from "./DocumentosTabla";
import FiltrosDocumentos from "./FiltrosDocumentos";
import HistorialPagadosDialog from "./HistorialPagadosDialog";
import ModalColumnas from "./ModalColumnas";
import ResumenGeneral from "./ResumenGeneral";

type Snapshot = {
  cargaId: string;
  tab: TabSemaforo;
  filtros: FiltrosSemaforo;
  pagina: number;
};

const PESTANAS: { id: TabSemaforo; etiqueta: string }[] = [
  { id: "resumen", etiqueta: "Resumen General" },
  ...GRUPOS_SEMAFORO.map((grupo) => ({
    id: grupo.id as TabSemaforo,
    etiqueta: grupo.etiqueta,
  })),
  { id: "general", etiqueta: "General" },
];

function claveDe(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export default function SemaforoAdmin() {
  const [datos, setDatos] = useState<SemaforoResponse | null>(null);
  const [error, setError] = useState("");
  const [cargaIdSeleccionada, setCargaIdSeleccionada] = useState("");
  const [tab, setTab] = useState<TabSemaforo>("resumen");
  const [filtros, setFiltros] = useState<FiltrosSemaforo>({
    ...FILTROS_SEMAFORO_VACIOS,
  });
  const [pagina, setPagina] = useState(1);
  const [columnasVisibles, setColumnasVisibles] = useState<string[]>([
    ...COLUMNAS_SEMAFORO,
  ]);
  const [modalColumnas, setModalColumnas] = useState(false);
  const [identificacionPagados, setIdentificacionPagados] = useState("");
  const [pagados, setPagados] = useState<DocumentoPagado[]>([]);
  const [cargandoPagados, setCargandoPagados] = useState(false);
  const claveCargadaRef = useRef<string | null>(null);

  const cargar = useCallback(async (snapshot: Snapshot) => {
    setError("");
    try {
      const parametros = new URLSearchParams();
      if (snapshot.cargaId) parametros.set("cargaId", snapshot.cargaId);
      parametros.set("tab", snapshot.tab);
      parametros.set("pagina", String(snapshot.pagina));
      for (const [clave, valor] of Object.entries(snapshot.filtros)) {
        if (valor) parametros.set(clave, valor);
      }
      const respuesta = await fetch(
        `/api/marketing/cartera?${parametros.toString()}`,
        { cache: "no-store" },
      );
      if (!respuesta.ok) throw new Error("No se pudo cargar la cartera");
      setDatos((await respuesta.json()) as SemaforoResponse);
    } catch {
      setError("No se pudo cargar la cartera de Marketing.");
    }
  }, []);

  const recargar = useCallback(
    (snapshot: Snapshot) => {
      claveCargadaRef.current = claveDe(snapshot);
      void cargar(snapshot);
    },
    [cargar],
  );

  const snapshotActual: Snapshot = {
    cargaId: cargaIdSeleccionada,
    tab,
    filtros,
    pagina,
  };

  useEffect(() => {
    const claveActual = claveDe(snapshotActual);
    if (claveCargadaRef.current === claveActual) return;
    recargar(snapshotActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargaIdSeleccionada, tab, filtros, pagina, recargar]);

  const cambiarSemana = (id: string) => {
    setCargaIdSeleccionada(id);
    setPagina(1);
    recargar({ ...snapshotActual, cargaId: id, pagina: 1 });
  };

  const cambiarTab = (siguiente: TabSemaforo) => {
    setTab(siguiente);
    setPagina(1);
    recargar({ ...snapshotActual, tab: siguiente, pagina: 1 });
  };

  const cambiarFiltros = (siguientes: FiltrosSemaforo) => {
    setFiltros(siguientes);
    setPagina(1);
    recargar({ ...snapshotActual, filtros: siguientes, pagina: 1 });
  };

  const cambiarPagina = (siguiente: number) => {
    setPagina(siguiente);
    recargar({ ...snapshotActual, pagina: siguiente });
  };

  const despuesDeCargar = () => {
    setCargaIdSeleccionada("");
    setPagina(1);
    recargar({ ...snapshotActual, cargaId: "", pagina: 1 });
  };

  const verPagados = async (identificacion: string) => {
    const texto = identificacion.trim();
    if (!texto) {
      setError("Escribe una identificación para consultar sus pagos.");
      return;
    }
    setIdentificacionPagados(texto);
    setPagados([]);
    setCargandoPagados(true);
    try {
      const respuesta = await fetch(
        `/api/marketing/documentos-pagados?identificacion=${encodeURIComponent(texto)}`,
        { cache: "no-store" },
      );
      if (!respuesta.ok) throw new Error("No se pudo consultar");
      const cuerpo = (await respuesta.json()) as DocumentosPagadosResponse;
      setPagados(cuerpo.documentos);
    } catch {
      setError("No se pudo consultar el historial de documentos pagados.");
    } finally {
      setCargandoPagados(false);
    }
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
            <strong>{datos.carga.nombreArchivo}</strong> · Corte{" "}
            {datos.carga.fechaCorteISO} ·{" "}
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

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => cambiarTab(pestana.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-semibold ${
              tab === pestana.id
                ? "border border-b-0 border-gray-200 bg-white text-primary"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {pestana.id === "resumen"
              ? pestana.etiqueta
              : pestana.id === "general"
                ? "General"
                : etiquetaGrupo(pestana.id as (typeof GRUPOS_SEMAFORO)[number]["id"])}
          </button>
        ))}
      </div>

      {tab === "resumen" ? (
        datos ? (
          <ResumenGeneral datos={datos} />
        ) : (
          <p className="text-sm text-gray-500">Cargando resumen…</p>
        )
      ) : (
        <>
          <FiltrosDocumentos
            filtros={filtros}
            onChange={cambiarFiltros}
            categorias={datos?.categorias ?? []}
            onVerPagados={() => void verPagados(filtros.identificacion)}
          />
          <DocumentosTabla
            documentos={datos?.documentos ?? []}
            columnasVisibles={columnasVisibles}
            onConfigurar={() => setModalColumnas(true)}
            pagina={datos?.pagina ?? pagina}
            porPagina={datos?.porPagina ?? 50}
            total={datos?.totalDocumentos ?? 0}
            onPagina={cambiarPagina}
            onVerPagados={(identificacion) => void verPagados(identificacion)}
          />
        </>
      )}

      {modalColumnas && (
        <ModalColumnas
          columnasVisibles={columnasVisibles}
          onAplicar={(columnas) => {
            setColumnasVisibles(columnas);
            setModalColumnas(false);
          }}
          onCerrar={() => setModalColumnas(false)}
        />
      )}

      {identificacionPagados && (
        <HistorialPagadosDialog
          identificacion={identificacionPagados}
          documentos={pagados}
          cargando={cargandoPagados}
          onCerrar={() => setIdentificacionPagados("")}
        />
      )}
    </div>
  );
}
