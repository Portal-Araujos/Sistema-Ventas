"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Shuffle, Ticket } from "lucide-react";
import {
  aplicarFiltros,
  conFiltrosVacios,
  FILTRO_TODOS,
  opcionesConVacio,
  type ClienteDistribuido,
  type FiltrosAsignacionManual,
  type OpcionFiltro,
} from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import type {
  RespuestaEnvioAsignacion,
  RespuestaPrevisualizacionAsignacion,
} from "../types";
import SelectorFiltro from "./SelectorFiltro";

type VendedorUsuario = { id: string; nombre: string; email: string };

type Props = {
  cargaId: string;
  semana: string;
  deshabilitado: boolean;
  filasBase: ClienteDistribuido[];
  onEnviado: (resultado: RespuestaEnvioAsignacion) => void;
};

function generarSemilla(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AsignacionManual({
  cargaId,
  semana,
  deshabilitado,
  filasBase,
  onEnviado,
}: Props) {
  const [vendedores, setVendedores] = useState<VendedorUsuario[]>([]);
  const [vendedorId, setVendedorId] = useState("");
  const [filtros, setFiltros] = useState<FiltrosAsignacionManual>({
    provincia: FILTRO_TODOS,
    ciudad: FILTRO_TODOS,
  });
  const [cantidad, setCantidad] = useState("10");
  const [semilla, setSemilla] = useState("");
  const [previsualizacion, setPrevisualizacion] =
    useState<RespuestaPrevisualizacionAsignacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const cargoVendedoresRef = useRef(false);

  useEffect(() => {
    if (cargoVendedoresRef.current) return;
    cargoVendedoresRef.current = true;
    const cargar = async () => {
      try {
        const respuesta = await fetch("/api/usuarios/vendedores", {
          cache: "no-store",
        });
        if (!respuesta.ok) throw new Error("No se pudieron cargar los vendedores");
        setVendedores((await respuesta.json()) as VendedorUsuario[]);
      } catch {
        setError("No se pudieron cargar los vendedores del sistema.");
      }
    };
    void cargar();
  }, []);

  const opcionesVendedores = useMemo<OpcionFiltro[]>(
    () => vendedores.map((vendedor) => ({ clave: vendedor.id, etiqueta: vendedor.nombre })),
    [vendedores],
  );

  const provincias = useMemo(
    () => opcionesConVacio(filasBase.map((fila) => fila.provincia), "(Sin provincia)"),
    [filasBase],
  );

  const ciudades = useMemo(() => {
    const previas = aplicarFiltros(
      filasBase,
      conFiltrosVacios({
        provincia: filtros.provincia,
        ciudad: FILTRO_TODOS,
      }),
    );
    return opcionesConVacio(previas.map((fila) => fila.ciudad), "(Sin ciudad)");
  }, [filasBase, filtros.provincia]);

  const invalidarPrevisualizacion = () => {
    setPrevisualizacion(null);
    setError("");
  };

  const numeroCantidad = Number(cantidad);
  const cantidadValida =
    Number.isSafeInteger(numeroCantidad) && numeroCantidad > 0 && numeroCantidad <= 50_000;

  const construirSolicitud = (semillaActual: string, filas?: number[]) => ({
    cargaId,
    vendedorId,
    filtros,
    cantidad: numeroCantidad,
    semilla: semillaActual,
    ...(filas ? { filas } : {}),
  });

  const previsualizar = async () => {
    if (!vendedorId) {
      setError("Selecciona el vendedor destino.");
      return;
    }
    if (!cantidadValida) {
      setError("Ingresa una cantidad válida de clientes.");
      return;
    }

    const semillaNueva = generarSemilla();
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/marketing/asignacion/previsualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirSolicitud(semillaNueva)),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo previsualizar");
      setSemilla(semillaNueva);
      setPrevisualizacion(
        cuerpo as RespuestaPrevisualizacionAsignacion,
      );
    } catch (fallo) {
      setPrevisualizacion(null);
      setError(fallo instanceof Error ? fallo.message : "No se pudo previsualizar");
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!previsualizacion || !semilla) return;
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/marketing/asignacion/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          construirSolicitud(
            semilla,
            previsualizacion.clientes.map((cliente) => cliente.fila),
          ),
        ),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo enviar la asignación");
      onEnviado(cuerpo as RespuestaEnvioAsignacion);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo enviar la asignación");
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Ticket size={18} aria-hidden="true" /> Asignación manual y envío por ticket
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Elige el vendedor destino, filtra por provincia y ciudad, y envíale el grupo
            mediante un ticket. La selección es aleatoria y reproducible.
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs text-blue-900">
          {semana}
        </span>
      </div>

      <fieldset
        disabled={deshabilitado || cargando}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end disabled:opacity-60"
      >
        <SelectorFiltro
          etiqueta="Vendedor destino"
          valor={vendedorId}
          opciones={opcionesVendedores}
          permitirTodos={false}
          onChange={(valor) => {
            setVendedorId(valor);
            invalidarPrevisualizacion();
          }}
        />
        <SelectorFiltro
          etiqueta="Provincia"
          valor={filtros.provincia}
          opciones={provincias}
          onChange={(provincia) => {
            setFiltros((actuales) => ({
              ...actuales,
              provincia,
              ciudad: FILTRO_TODOS,
            }));
            invalidarPrevisualizacion();
          }}
        />
        <SelectorFiltro
          etiqueta="Ciudad"
          valor={filtros.ciudad}
          opciones={ciudades}
          onChange={(ciudad) => {
            setFiltros((actuales) => ({ ...actuales, ciudad }));
            invalidarPrevisualizacion();
          }}
        />
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold text-gray-600">Cantidad</span>
          <input
            type="number"
            min={1}
            max={50000}
            step={1}
            value={cantidad}
            onChange={(evento) => {
              setCantidad(evento.target.value);
              invalidarPrevisualizacion();
            }}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          />
        </label>
        <div className="flex sm:col-span-2">
          <Button
            type="button"
            onClick={() => void previsualizar()}
            disabled={!cantidadValida || !vendedorId}
          >
            <Shuffle size={16} aria-hidden="true" className="mr-2" />
            {cargando ? "Procesando…" : "Previsualizar selección"}
          </Button>
        </div>
      </fieldset>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {previsualizacion && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-blue-900">
              <strong>{previsualizacion.clientes.length}</strong> clientes seleccionados
              para <strong>{previsualizacion.vendedor.nombre}</strong>. Disponibles con
              estos filtros: {previsualizacion.elegibles.toLocaleString("es-EC")}.
            </p>
            <span className="text-xs text-gray-500">
              Semilla: {previsualizacion.semilla}
            </span>
          </div>
          <div className="mt-3 max-h-72 overflow-auto rounded-md border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2">Identificación</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Provincia</th>
                  <th className="px-2 py-2">Ciudad</th>
                  <th className="px-2 py-2">Vendedor actual</th>
                </tr>
              </thead>
              <tbody>
                {previsualizacion.clientes.map((cliente) => (
                  <tr key={cliente.fila} className="border-t border-gray-100">
                    <td className="px-2 py-2">{cliente.identificacion || "—"}</td>
                    <td className="px-2 py-2">{cliente.nombreCliente}</td>
                    <td className="px-2 py-2">{cliente.provincia || "—"}</td>
                    <td className="px-2 py-2">{cliente.ciudad || "—"}</td>
                    <td className="px-2 py-2">{cliente.vendedorAsignado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Se creará un ticket asignado a {previsualizacion.vendedor.nombre}.
            </p>
            <Button type="button" onClick={() => void confirmar()} disabled={cargando}>
              Confirmar y enviar ticket
              <ArrowRight size={16} aria-hidden="true" className="ml-2" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
