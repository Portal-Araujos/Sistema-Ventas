"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  buscarClientes,
  COLUMNAS_TABLA,
  ordenarClientes,
  type ClienteDistribuido,
  type ColumnaOrdenableMarketing,
  type OrdenMarketing,
} from "@/lib/marketing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const POR_COLUMNA: Record<string, keyof ClienteDistribuido> = {
  "Identificación": "identificacion",
  "Nombre Cliente": "nombreCliente",
  "Móvil": "movil",
  "Provincia": "provincia",
  "Ciudad": "ciudad",
  "Dirección": "direccion",
};

const TAMANO_PAGINA = 50;
const COLUMNAS_ORDENABLES = new Set<string>([
  "Nombre Cliente",
  "Provincia",
  "Ciudad",
  "Vendedor",
]);

type Props = {
  filas: ClienteDistribuido[];
  columnasVisibles: Set<string>;
  distribucionAplicada: boolean;
  claveVista: string;
  consulta: string;
  onConsultaChange: (valor: string) => void;
  orden: OrdenMarketing | null;
  onOrdenChange: (orden: OrdenMarketing | null) => void;
};

export default function TablaClientes({
  filas,
  columnasVisibles,
  distribucionAplicada,
  claveVista,
  consulta,
  onConsultaChange,
  orden,
  onOrdenChange,
}: Props) {
  const claveOrden = orden ? `${orden.columna}|${orden.direccion}` : "";
  const [pagina, setPagina] = useState(1);
  const [firmaAnterior, setFirmaAnterior] = useState({
    consulta,
    claveVista,
    claveOrden,
  });

  if (
    consulta !== firmaAnterior.consulta ||
    claveVista !== firmaAnterior.claveVista ||
    claveOrden !== firmaAnterior.claveOrden
  ) {
    setFirmaAnterior({ consulta, claveVista, claveOrden });
    setPagina(1);
  }

  const alternarOrden = (columna: string) => {
    const destino = columna as ColumnaOrdenableMarketing;
    if (!orden || orden.columna !== destino) {
      onOrdenChange({ columna: destino, direccion: "asc" });
    } else if (orden.direccion === "asc") {
      onOrdenChange({ columna: destino, direccion: "desc" });
    } else {
      onOrdenChange(null);
    }
  };

  const columnas = COLUMNAS_TABLA.filter((columna) => columnasVisibles.has(columna));
  const filtradas = useMemo(() => buscarClientes(filas, consulta), [filas, consulta]);
  const ordenadas = useMemo(
    () => ordenarClientes(filtradas, orden),
    [filtradas, orden],
  );
  const paginas = Math.max(1, Math.ceil(ordenadas.length / TAMANO_PAGINA));

  const visibles = ordenadas.slice(
    (pagina - 1) * TAMANO_PAGINA,
    pagina * TAMANO_PAGINA,
  );

  const valor = (fila: ClienteDistribuido, columna: string): ReactNode => {
    if (columna === "Vendedor") {
      if (
        distribucionAplicada &&
        fila.vendedorAsignado &&
        fila.vendedorAsignado !== fila.vendedorOriginal
      ) {
        return (
          <span className="flex flex-wrap items-center gap-1">
            <span className="text-gray-500">{fila.vendedorOriginal || "—"}</span>
            <span aria-hidden="true">→</span>
            <span className="font-semibold text-green-700">
              {fila.vendedorAsignado}
            </span>
          </span>
        );
      }
      return distribucionAplicada ? fila.vendedorAsignado : fila.vendedorOriginal;
    }
    const clave = POR_COLUMNA[columna];
    return clave ? String(fila[clave] ?? "") : "";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {filtradas.length.toLocaleString("es-EC")} clientes
        </p>
        <Input
          value={consulta}
          onChange={(evento) => onConsultaChange(evento.target.value)}
          placeholder="Buscar por identificación, cliente o vendedor"
          className="sm:w-80"
        />
      </div>

      {visibles.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          Ningún registro coincide con los filtros o la búsqueda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columnas.map((columna) => {
                const ordenable = COLUMNAS_ORDENABLES.has(columna);
                const activa = orden?.columna === columna;
                const direccion = activa ? orden?.direccion : undefined;
                const Icono =
                  direccion === "asc"
                    ? ArrowUp
                    : direccion === "desc"
                      ? ArrowDown
                      : ArrowUpDown;

                return (
                  <TableHead
                    key={columna}
                    aria-sort={
                      direccion === "asc"
                        ? "ascending"
                        : direccion === "desc"
                          ? "descending"
                          : ordenable
                            ? "none"
                            : undefined
                    }
                  >
                    {ordenable ? (
                      <button
                        type="button"
                        onClick={() => alternarOrden(columna)}
                        aria-label={`Ordenar por ${columna}${
                          activa
                            ? `, actualmente ${direccion === "asc" ? "ascendente" : "descendente"}`
                            : ""
                        }`}
                        className={`flex items-center gap-1 text-left hover:text-blue-700 ${activa ? "text-blue-700" : ""}`}
                      >
                        {columna}
                        <Icono
                          size={14}
                          aria-hidden="true"
                          className={activa ? "text-blue-600" : "text-gray-400"}
                        />
                      </button>
                    ) : (
                      columna
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((fila) => (
              <TableRow key={`${fila.fila}-${fila.claveCliente}`}>
                {columnas.map((columna) => (
                  <TableCell key={columna} className="max-w-xs truncate">
                    {valor(fila, columna) || "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 p-3 text-xs text-gray-600">
        <span>
          Página {pagina} de {paginas}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagina === 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pagina === paginas}
            onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
