"use client";

import { useEffect, useMemo, useState } from "react";
import { buscarClientes, COLUMNAS_TABLA, type ClienteDistribuido } from "@/lib/marketing";
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

type Props = {
  filas: ClienteDistribuido[];
  columnasVisibles: Set<string>;
  distribucionAplicada: boolean;
};

export default function TablaClientes({
  filas,
  columnasVisibles,
  distribucionAplicada,
}: Props) {
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);

  const columnas = COLUMNAS_TABLA.filter((columna) => columnasVisibles.has(columna));
  const filtradas = useMemo(() => buscarClientes(filas, consulta), [filas, consulta]);
  const paginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA));

  useEffect(() => setPagina(1), [filas, consulta, distribucionAplicada]);

  const visibles = filtradas.slice(
    (pagina - 1) * TAMANO_PAGINA,
    pagina * TAMANO_PAGINA,
  );

  const valor = (fila: ClienteDistribuido, columna: string): string => {
    if (columna === "Vendedor")
      return distribucionAplicada ? fila.vendedorAsignado : fila.vendedorOriginal;
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
          onChange={(evento) => setConsulta(evento.target.value)}
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
              {columnas.map((columna) => (
                <TableHead key={columna}>{columna}</TableHead>
              ))}
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
