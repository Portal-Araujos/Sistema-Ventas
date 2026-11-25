"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/shared/PermissionsProvider";
import type { CambiosResponse, HistorialResponse } from "../types";

const ETIQUETAS_ACCION: Record<string, string> = {
  CARGA_SUBIDA: "Carga subida",
  CARTERA_ENVIADA: "Cartera enviada",
  ASIGNACION_MANUAL_ENVIADA: "Asignación manual enviada",
  CARGA_ELIMINADA: "Carga eliminada",
  MANTENIMIENTO: "Mantenimiento",
};

const ETIQUETAS_TIPO: Record<string, string> = {
  ALTA: "Alta",
  BAJA: "Baja",
  CAMBIO: "Cambio",
};

const MESES_OPCIONES = [3, 6, 9, 12] as const;

function numero(valor: unknown): number {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

export default function HistorialAuditoria() {
  const { can } = usePermissions();
  const puedeMantener = can("marketing:mantenimiento");
  const [datos, setDatos] = useState<HistorialResponse | null>(null);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [meses, setMeses] = useState("6");
  const [procesando, setProcesando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState("");
  const [cargaComparada, setCargaComparada] = useState("");
  const [comparacion, setComparacion] = useState<CambiosResponse | null>(null);
  const [errorComparacion, setErrorComparacion] = useState("");

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/marketing/historial", {
        cache: "no-store",
      });
      if (!respuesta.ok) throw new Error("No se pudo cargar el historial");
      setDatos((await respuesta.json()) as HistorialResponse);
      setError("");
    } catch {
      setError("No se pudo cargar el historial de Marketing.");
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("carga");
    queueMicrotask(() => {
      void cargar();
      if (id) setCargaComparada(id);
    });
  }, [cargar]);

  useEffect(() => {
    let vigente = true;
    if (!cargaComparada) {
      queueMicrotask(() => {
        if (!vigente) return;
        setComparacion(null);
        setErrorComparacion("");
      });
      return () => {
        vigente = false;
      };
    }
    const consultar = async () => {
      setErrorComparacion("");
      try {
        const respuesta = await fetch(
          `/api/marketing/cargas/${encodeURIComponent(cargaComparada)}/cambios`,
          { cache: "no-store" },
        );
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo comparar");
        if (vigente) setComparacion(cuerpo as CambiosResponse);
      } catch (fallo) {
        if (vigente) {
          setComparacion(null);
          setErrorComparacion(
            fallo instanceof Error ? fallo.message : "No se pudieron cargar los cambios",
          );
        }
      }
    };
    queueMicrotask(() => {
      void consultar();
    });
    return () => {
      vigente = false;
    };
  }, [cargaComparada]);

  const abrirComparacion = (id: string) => {
    setCargaComparada(id);
    document.getElementById("comparacion-cargas")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const ejecutarMantenimiento = async () => {
    const numero = Number(meses);
    if (!MESES_OPCIONES.some((opcion) => opcion === numero)) {
      setError("Selecciona un número de meses válido.");
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar las cargas inactivas más antiguas de ${numero} meses? Se conservarán la activa y las 2 inactivas más recientes.`,
      )
    )
      return;
    setProcesando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/marketing/mantenimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meses: numero }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "Error al limpiar");
      setModalAbierto(false);
      await cargar();
      window.alert(
        `Mantenimiento exitoso: ${cuerpo.eliminadas} cargas y ${cuerpo.clientesEliminados} clientes eliminados.`,
      );
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error inesperado");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarCarga = async (id: string, nombre: string, registros: number) => {
    if (
      !window.confirm(
        `¿Eliminar la carga "${nombre}" y sus ${registros} registros? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setEliminandoId(id);
    setError("");
    try {
      const respuesta = await fetch(`/api/marketing/cargas/${id}`, {
        method: "DELETE",
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "Error al eliminar");
      if (cargaComparada === id) setCargaComparada("");
      await cargar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error inesperado");
    } finally {
      setEliminandoId("");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">Carteras registradas</p>
            <p className="text-xs text-gray-500">
              Archivos cargados, envíos y limpiezas realizadas.
            </p>
          </div>
          {puedeMantener && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAbierto(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <HardDrive size={16} className="mr-2" /> Mantenimiento
            </Button>
          )}
        </div>

        {error && <p className="px-4 pt-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="p-3 text-left">Semana</th>
                <th className="p-3 text-left">Archivo</th>
                <th className="p-3 text-left">Subida</th>
                <th className="p-3 text-left">Por</th>
                <th className="p-3 text-right">Registros</th>
                <th className="p-3 text-left">Enviada</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {(datos?.cargas ?? []).map((carga) => (
                <tr key={carga.id} className="border-b border-gray-100">
                  <td className="p-3 text-xs font-semibold text-gray-700">
                    {carga.semana}
                  </td>
                  <td className="p-3 font-medium text-gray-800">
                    {carga.nombreArchivo}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {new Date(carga.createdAt).toLocaleString("es-EC")}
                  </td>
                  <td className="p-3 text-gray-600">{carga.creadoPor}</td>
                  <td className="p-3 text-right text-gray-700">
                    {carga.clientes.toLocaleString("es-EC")}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {carga.enviadoEn
                      ? new Date(carga.enviadoEn).toLocaleString("es-EC")
                      : "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        carga.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {carga.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => abrirComparacion(carga.id)}
                        className="font-bold text-primary hover:underline"
                      >
                        Ver cambios
                      </button>
                      {puedeMantener && !carga.activo && (
                        <button
                          type="button"
                          title="Eliminar carga"
                          disabled={eliminandoId === carga.id}
                          onClick={() =>
                            eliminarCarga(carga.id, carga.nombreArchivo, carga.clientes)
                          }
                          className="text-red-600 hover:text-red-800 disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!datos?.cargas.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-gray-500">
                    No hay cargas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            Últimos eventos
          </p>
          <div className="flex flex-col gap-2">
            {(datos?.auditorias ?? []).map((auditoria) => {
              const detalles = auditoria.detalles;
              const resumen =
                auditoria.accion === "CARGA_SUBIDA" && detalles
                  ? ` · ${numero(detalles.altas)} altas, ${numero(detalles.bajas)} bajas, ${numero(detalles.cambios)} cambios`
                  : "";
              return (
                <div
                  key={auditoria.id}
                  className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <strong className="text-gray-800">
                      {ETIQUETAS_ACCION[auditoria.accion] ?? auditoria.accion}
                    </strong>
                    {auditoria.nombreArchivo ? ` · ${auditoria.nombreArchivo}` : ""}
                    {resumen}
                    {auditoria.usuario ? ` · ${auditoria.usuario}` : ""}
                  </span>
                  <span className="text-gray-500">
                    {new Date(auditoria.createdAt).toLocaleString("es-EC")}
                  </span>
                </div>
              );
            })}
            {!datos?.auditorias.length && (
              <p className="text-sm text-gray-500">Sin eventos registrados.</p>
            )}
          </div>
        </div>
      </div>

      <div
        id="comparacion-cargas"
        className="rounded-xl border border-gray-200 bg-white"
      >
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">
              Comparación con la semana anterior
            </p>
            <p className="text-xs text-gray-500">
              {comparacion
                ? `${comparacion.carga.semana} · ${comparacion.carga.nombreArchivo}`
                : "Selecciona una carga para ver altas, bajas y cambios."}
            </p>
          </div>
          {comparacion && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCargaComparada("")}
            >
              <X size={16} className="mr-2" /> Cerrar
            </Button>
          )}
        </div>
        {errorComparacion && (
          <p className="px-4 pt-3 text-sm text-red-600">{errorComparacion}</p>
        )}
        {comparacion && (
          <>
            <div className="flex flex-wrap gap-2 p-4 pb-0 text-xs">
              <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-800">
                {comparacion.resumen.altas} altas
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
                {comparacion.resumen.cambios} cambios
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-800">
                {comparacion.resumen.bajas} bajas
              </span>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Cliente</th>
                    <th className="p-3 text-left">Identificación</th>
                    <th className="p-3 text-left">Campo</th>
                    <th className="p-3 text-left">Antes</th>
                    <th className="p-3 text-left">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {comparacion.cambios.map((cambio) => (
                    <tr key={cambio.id} className="border-b border-gray-100">
                      <td className="p-3 font-bold text-gray-700">
                        {ETIQUETAS_TIPO[cambio.tipo] ?? cambio.tipo}
                      </td>
                      <td className="p-3 text-gray-800">{cambio.nombreCliente}</td>
                      <td className="p-3 text-xs text-gray-600">
                        {cambio.identificacion}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {cambio.campo ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {cambio.valorAnterior ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {cambio.valorNuevo ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {!comparacion.cambios.length && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-gray-500">
                        Esta cartera es idéntica a la anterior.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <p className="text-lg font-bold text-gray-900">Mantenimiento</p>
            <p className="mt-1 text-sm text-gray-500">
              Elimina cargas inactivas más antiguas que el número de meses
              indicado. La carga activa y las 2 inactivas más recientes se
              conservan.
            </p>
            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Meses
              <select
                value={meses}
                onChange={(evento) => setMeses(evento.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                {MESES_OPCIONES.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion} meses
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAbierto(false)}
                disabled={procesando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={ejecutarMantenimiento}
                disabled={procesando}
              >
                {procesando ? "Limpiando…" : "Ejecutar limpieza"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
