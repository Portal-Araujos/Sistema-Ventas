"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  etiquetaMotivos,
  ordenarPorUbicacion,
  ubicacionDe,
  type CandidatoEnvio,
  type ConteoVendedor,
  type EstadoFiltroEnvio,
  type OrdenUbicacion,
  type VendedorEnvio,
} from "@/lib/marketing";
import EnviarTicket from "./EnviarTicket";
import FiltrosEnvios from "./FiltrosEnvios";

const POR_PAGINA = 15;

type Props = {
  cargaId: string;
  busqueda: string;
  onBusqueda: (valor: string) => void;
  estado: EstadoFiltroEnvio;
  onEstado: (valor: EstadoFiltroEnvio) => void;
  ubicacion: string;
  onUbicacion: (valor: string) => void;
  ordenUbicacion: OrdenUbicacion | null;
  onOrdenUbicacion: (valor: OrdenUbicacion | null) => void;
};

type RegistroResumen = {
  id: string;
  ticketId: number | null;
  ticketCodigo: string | null;
  vendedorNombre: string | null;
  fecha: string;
  cantidad: number;
};

type EnvioResponse = {
  carga: { id: string; semana: string } | null;
  vendedores: VendedorEnvio[];
  candidatos: CandidatoEnvio[];
  conteos: ConteoVendedor[];
  registros: RegistroResumen[];
};

function fechaCorta(valor: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

export default function EnviosVendedores({
  cargaId,
  busqueda,
  onBusqueda,
  estado,
  onEstado,
  ubicacion,
  onUbicacion,
  ordenUbicacion,
  onOrdenUbicacion,
}: Props) {
  const [datos, setDatos] = useState<EnvioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const parametros = new URLSearchParams();
      if (cargaId) parametros.set("cargaId", cargaId);
      const respuesta = await fetch(`/api/marketing/envios?${parametros}`, {
        cache: "no-store",
      });
      if (!respuesta.ok) throw new Error("No se pudo consultar");
      const cuerpo = (await respuesta.json()) as EnvioResponse;
      const disponibles = new Set(
        cuerpo.candidatos
          .filter((cliente) => !cliente.enviado)
          .map((cliente) => cliente.clave),
      );
      setSeleccion((actual) => {
        const validas = new Set(
          [...actual].filter((clave) => disponibles.has(clave)),
        );
        return validas.size === actual.size ? actual : validas;
      });
      setDatos(cuerpo);
    } catch {
      setError("No se pudo cargar la información de envíos.");
    } finally {
      setCargando(false);
    }
  }, [cargaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const ubicaciones = useMemo(() => {
    const valores = new Set(
      (datos?.candidatos ?? []).map((cliente) => ubicacionDe(cliente)),
    );
    return [...valores].sort((a, b) => a.localeCompare(b, "es"));
  }, [datos]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toUpperCase();
    const ubicacionBuscada = ubicacion.trim();
    const resultados = (datos?.candidatos ?? []).filter((cliente) => {
      if (estado === "pendientes" && cliente.enviado) return false;
      if (estado === "enviados" && !cliente.enviado) return false;
      if (ubicacionBuscada && ubicacionDe(cliente) !== ubicacionBuscada) {
        return false;
      }
      if (!texto) return true;
      return [cliente.identificacion, cliente.nombreCliente, cliente.provincia]
        .join(" ")
        .toUpperCase()
        .includes(texto);
    });
    return ordenUbicacion
      ? ordenarPorUbicacion(resultados, ordenUbicacion)
      : resultados;
  }, [datos, estado, busqueda, ubicacion, ordenUbicacion]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filtrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );
  const pendientesVisibles = visibles.filter((cliente) => !cliente.enviado);
  const todosVisiblesSeleccionados =
    pendientesVisibles.length > 0 &&
    pendientesVisibles.every((cliente) => seleccion.has(cliente.clave));

  const alternar = (cliente: CandidatoEnvio) => {
    if (cliente.enviado) return;
    setSeleccion((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(cliente.clave)) siguiente.delete(cliente.clave);
      else siguiente.add(cliente.clave);
      return siguiente;
    });
  };

  const alternarPagina = () => {
    setSeleccion((actual) => {
      const siguiente = new Set(actual);
      for (const cliente of pendientesVisibles) {
        if (todosVisiblesSeleccionados) siguiente.delete(cliente.clave);
        else siguiente.add(cliente.clave);
      }
      return siguiente;
    });
  };

  const cambiarOrdenUbicacion = () => {
    onOrdenUbicacion(ordenUbicacion === "asc" ? "desc" : "asc");
    setPagina(1);
  };

  const cambiarBusqueda = (valor: string) => {
    onBusqueda(valor);
    setPagina(1);
  };

  const cambiarEstado = (valor: EstadoFiltroEnvio) => {
    onEstado(valor);
    setPagina(1);
  };

  const cambiarUbicacion = (valor: string) => {
    onUbicacion(valor);
    setPagina(1);
  };

  const limpiarFiltros = () => {
    onBusqueda("");
    onEstado("todos");
    onUbicacion("");
    onOrdenUbicacion(null);
    setPagina(1);
  };

  const despuesDeEnviar = async () => {
    setSeleccion(new Set());
    await cargar();
  };

  const conteos = new Map(
    (datos?.conteos ?? []).map((conteo) => [conteo.vendedorId, conteo.total]),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">
              Envío de clientes a vendedores
            </p>
            <p className="text-xs text-gray-500">
              Clientes con oportunidad de reventa o sin contrato. Los ya enviados
              no se pueden volver a seleccionar.
            </p>
          </div>
          {datos?.carga && (
            <p className="text-xs text-gray-500">
              Carga: <strong>{datos.carga.semana}</strong>
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FiltrosEnvios
            busqueda={busqueda}
            onBusqueda={cambiarBusqueda}
            estado={estado}
            onEstado={cambiarEstado}
            ubicacion={ubicacion}
            onUbicacion={cambiarUbicacion}
            ubicaciones={ubicaciones}
            onLimpiar={limpiarFiltros}
          />
          <EnviarTicket
            cargaId={cargaId}
            vendedores={datos?.vendedores ?? []}
            claves={[...seleccion]}
            onEnviado={despuesDeEnviar}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="w-10 py-2">
                  <input
                    type="checkbox"
                    checked={todosVisiblesSeleccionados}
                    disabled={pendientesVisibles.length === 0}
                    onChange={alternarPagina}
                    className="h-4 w-4 accent-primary"
                    aria-label="Seleccionar pendientes de esta página"
                  />
                </th>
                <th className="py-2">Identificación</th>
                <th className="py-2">Nombre Cliente</th>
                <th className="py-2">Motivo</th>
                <th className="py-2">Categoría</th>
                <th
                  className="py-2"
                  aria-sort={
                    ordenUbicacion === "asc"
                      ? "ascending"
                      : ordenUbicacion === "desc"
                        ? "descending"
                        : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={cambiarOrdenUbicacion}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                    aria-label={`Ordenar por ubicación ${
                      ordenUbicacion === "asc" ? "descendente" : "ascendente"
                    }`}
                  >
                    Ubicación
                    {ordenUbicacion === "asc" ? (
                      <ArrowUp size={14} />
                    ) : ordenUbicacion === "desc" ? (
                      <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-50" />
                    )}
                  </button>
                </th>
                <th className="py-2">Vendedor</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">
                    Cargando clientes…
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">
                    No hay clientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                visibles.map((cliente) => (
                  <tr key={cliente.clave} className="border-b border-gray-100">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={seleccion.has(cliente.clave)}
                        disabled={cliente.enviado}
                        onChange={() => alternar(cliente)}
                        className="h-4 w-4 accent-primary disabled:opacity-40"
                        aria-label={`Seleccionar ${cliente.identificacion}`}
                      />
                    </td>
                    <td className="py-2 font-semibold">{cliente.identificacion}</td>
                    <td className="py-2">{cliente.nombreCliente}</td>
                    <td className="py-2">{etiquetaMotivos(cliente.motivos)}</td>
                    <td className="py-2">{cliente.categoria || "—"}</td>
                    <td className="py-2">{ubicacionDe(cliente)}</td>
                    <td className="py-2">{cliente.vendedorAnterior || "—"}</td>
                    <td className="py-2">
                      {cliente.enviado ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          Enviado
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-gray-600">
                      {cliente.enviado ? (
                        <>
                          <p className="font-semibold">
                            {cliente.ticketCodigo ?? "—"}
                          </p>
                          <p>{fechaCorta(cliente.fechaEnvio)}</p>
                          <p>{cliente.vendedorNombre ?? "—"}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <button
            type="button"
            disabled={paginaActual <= 1}
            onClick={() => setPagina(paginaActual - 1)}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Página {paginaActual} de {paginas} · {filtrados.length} cliente(s)
          </span>
          <button
            type="button"
            disabled={paginaActual >= paginas}
            onClick={() => setPagina(paginaActual + 1)}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">
            Clientes enviados por vendedor
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="py-2">Vendedor</th>
                <th className="py-2 text-right">Enviados</th>
              </tr>
            </thead>
            <tbody>
              {(datos?.vendedores ?? []).map((vendedor) => (
                <tr key={vendedor.id} className="border-b border-gray-100">
                  <td className="py-2">{vendedor.nombre}</td>
                  <td className="py-2 text-right font-semibold">
                    {conteos.get(vendedor.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">
            Últimos tickets enviados
          </p>
          {(datos?.registros.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay envíos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2">Ticket</th>
                  <th className="py-2">Vendedor</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2 text-right">Clientes</th>
                </tr>
              </thead>
              <tbody>
                {(datos?.registros ?? []).slice(0, 10).map((registro) => (
                  <tr key={registro.id} className="border-b border-gray-100">
                    <td className="py-2 font-semibold">
                      {registro.ticketCodigo ?? "—"}
                    </td>
                    <td className="py-2">{registro.vendedorNombre ?? "—"}</td>
                    <td className="py-2">{fechaCorta(registro.fecha)}</td>
                    <td className="py-2 text-right">{registro.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
