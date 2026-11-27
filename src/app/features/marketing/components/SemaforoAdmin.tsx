"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COLUMNAS_SEMAFORO,
  FILTROS_SEMAFORO_VACIOS,
  GRUPOS_SEMAFORO,
  type EstadoFiltroEnvio,
  type FiltrosSemaforo,
  type GrupoSemaforoId,
  type OrdenSemaforo,
  type OrdenUbicacion,
  type TabSemaforo,
} from "@/lib/marketing";
import type {
  DocumentoPagado,
  DocumentosPagadosResponse,
  SemaforoResponse,
} from "../types";
import CargaExcel from "./CargaExcel";
import DocumentosTabla from "./DocumentosTabla";
import EnviosVendedores from "./EnviosVendedores";
import FiltrosDocumentos from "./FiltrosDocumentos";
import HistorialPagadosDialog from "./HistorialPagadosDialog";
import ModalColumnas from "./ModalColumnas";
import ResumenGeneral from "./ResumenGeneral";

type Snapshot = {
  cargaId: string;
  tab: TabSemaforo;
  filtros: FiltrosSemaforo;
  pagina: number;
  orden: OrdenSemaforo | null;
};

const PESTANAS: { id: TabSemaforo; etiqueta: string }[] = [
  { id: "resumen", etiqueta: "Resumen General" },
  ...GRUPOS_SEMAFORO.map((grupo) => ({
    id: grupo.id as TabSemaforo,
    etiqueta: grupo.etiqueta,
  })),
  { id: "general", etiqueta: "General" },
  { id: "sin-contrato", etiqueta: "Sin Contrato" },
  { id: "envios", etiqueta: "Envío a vendedores" },
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
  const [orden, setOrden] = useState<OrdenSemaforo | null>(null);
  const [columnasVisibles, setColumnasVisibles] = useState<string[]>([
    ...COLUMNAS_SEMAFORO,
  ]);
  const [modalColumnas, setModalColumnas] = useState(false);
  const [identificacionPagados, setIdentificacionPagados] = useState("");
  const [pagados, setPagados] = useState<DocumentoPagado[]>([]);
  const [cargandoPagados, setCargandoPagados] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [busquedaEnvios, setBusquedaEnvios] = useState("");
  const [estadoEnvios, setEstadoEnvios] = useState<EstadoFiltroEnvio>("todos");
  const [ubicacionEnvios, setUbicacionEnvios] = useState("");
  const [ordenUbicacionEnvios, setOrdenUbicacionEnvios] =
    useState<OrdenUbicacion | null>(null);
  const claveCargadaRef = useRef<string | null>(null);

  const cargar = useCallback(async (snapshot: Snapshot) => {
    setError("");
    if (snapshot.tab === "envios") return;
    try {
      const parametros = new URLSearchParams();
      if (snapshot.cargaId) parametros.set("cargaId", snapshot.cargaId);
      parametros.set("tab", snapshot.tab);
      parametros.set("pagina", String(snapshot.pagina));
      for (const [clave, valor] of Object.entries(snapshot.filtros)) {
        if (valor) parametros.set(clave, valor);
      }
      if (snapshot.orden) {
        parametros.set("ordenColumna", snapshot.orden.columna);
        parametros.set("ordenDireccion", snapshot.orden.direccion);
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
    orden,
  };

  useEffect(() => {
    const claveActual = claveDe(snapshotActual);
    if (claveCargadaRef.current === claveActual) return;
    recargar(snapshotActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargaIdSeleccionada, tab, filtros, pagina, orden, recargar]);

  const cambiarSemana = (id: string) => {
    setCargaIdSeleccionada(id);
    setPagina(1);
    recargar({ ...snapshotActual, cargaId: id, pagina: 1 });
  };

  const cambiarTab = (siguiente: TabSemaforo) => {
    const filtrosSiguientes = {
      ...snapshotActual.filtros,
      color: "",
      categoria: "",
      provincia: "",
      cuotas: "",
    };
    setTab(siguiente);
    setFiltros(filtrosSiguientes);
    setPagina(1);
    recargar({
      ...snapshotActual,
      tab: siguiente,
      filtros: filtrosSiguientes,
      pagina: 1,
    });
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

  const cambiarOrden = (siguiente: OrdenSemaforo) => {
    setOrden(siguiente);
    setPagina(1);
    recargar({ ...snapshotActual, orden: siguiente, pagina: 1 });
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

  const exportarExcel = async () => {
    setExportando(true);
    setError("");
    try {
      const parametros = new URLSearchParams();
      if (cargaIdSeleccionada) parametros.set("cargaId", cargaIdSeleccionada);
      parametros.set("tab", tab);

      if (tab !== "resumen" && tab !== "envios") {
        for (const [clave, valor] of Object.entries(filtros)) {
          if (valor) parametros.set(clave, valor);
        }
        if (orden) {
          parametros.set("ordenColumna", orden.columna);
          parametros.set("ordenDireccion", orden.direccion);
        }
        parametros.set("columnas", columnasVisibles.join(","));
      }

      if (tab === "envios") {
        if (busquedaEnvios) parametros.set("busqueda", busquedaEnvios);
        if (estadoEnvios !== "todos") parametros.set("estado", estadoEnvios);
        if (ubicacionEnvios) parametros.set("ubicacion", ubicacionEnvios);
        if (ordenUbicacionEnvios) {
          parametros.set("ordenUbicacion", ordenUbicacionEnvios);
        }
      }

      const respuesta = await fetch(
        `/api/marketing/exportar?${parametros.toString()}`,
        { cache: "no-store" },
      );
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(cuerpo.error || "No se pudo exportar");
      }

      const blob = await respuesta.blob();
      const disposicion = respuesta.headers.get("content-disposition") ?? "";
      const coincidencia = disposicion.match(/filename="?([^";]+)"?/);
      const nombre = coincidencia?.[1] ?? `Marketing_${tab}.xlsx`;
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (errorExportar) {
      setError(
        errorExportar instanceof Error
          ? errorExportar.message
          : "No se pudo exportar a Excel.",
      );
    } finally {
      setExportando(false);
    }
  };

  const esVistaGeneral = tab === "general" || tab === "sin-contrato";
  const categoriasVisibles = esVistaGeneral
    ? (datos?.categorias ?? [])
    : (datos?.categoriasPorGrupo[tab as GrupoSemaforoId] ?? []);

  return (
    <div className="flex flex-col gap-5">
      <CargaExcel onCargado={despuesDeCargar} />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportarExcel()}
            disabled={exportando}
            className="self-start"
          >
            <Download size={16} className="mr-2" aria-hidden="true" />
            {exportando ? "Exportando…" : "Exportar Excel"}
          </Button>
        </div>
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
                ? pestana.id === "sin-contrato"
                  ? "border border-b-0 border-green-200 bg-green-50 text-green-700"
                  : "border border-b-0 border-gray-200 bg-white text-primary"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {pestana.etiqueta}
          </button>
        ))}
      </div>

      {tab === "envios" ? (
        <EnviosVendedores
          key={cargaIdSeleccionada || "vigente"}
          cargaId={cargaIdSeleccionada}
          busqueda={busquedaEnvios}
          onBusqueda={setBusquedaEnvios}
          estado={estadoEnvios}
          onEstado={setEstadoEnvios}
          ubicacion={ubicacionEnvios}
          onUbicacion={setUbicacionEnvios}
          ordenUbicacion={ordenUbicacionEnvios}
          onOrdenUbicacion={setOrdenUbicacionEnvios}
        />
      ) : tab === "resumen" ? (
        datos ? (
          <ResumenGeneral datos={datos} />
        ) : (
          <p className="text-sm text-gray-500">Cargando resumen…</p>
        )
      ) : (
        <>
          <FiltrosDocumentos
            tab={tab}
            filtros={filtros}
            onChange={cambiarFiltros}
            categorias={categoriasVisibles}
            provincias={datos?.provincias ?? []}
            cuotas={datos?.cuotas ?? []}
          />
          <DocumentosTabla
            documentos={datos?.documentos ?? []}
            columnasVisibles={columnasVisibles}
            onConfigurar={() => setModalColumnas(true)}
            pagina={datos?.pagina ?? pagina}
            porPagina={datos?.porPagina ?? 15}
            total={datos?.totalDocumentos ?? 0}
            onPagina={cambiarPagina}
            onVerPagados={(identificacion) => void verPagados(identificacion)}
            esSinContrato={tab === "sin-contrato"}
            orden={orden}
            onOrden={cambiarOrden}
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
