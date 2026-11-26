"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  buscarClientes,
  COLUMNAS_TABLA,
  ordenarClientes,
  type ClienteCartera,
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

const POR_COLUMNA: Record<string, keyof ClienteCartera> = {
  "Identificación": "identificacion",
  "Nombre Cliente": "nombreCliente",
  "Móvil": "movil",
  "Provincia": "provincia",
  "Ciudad": "ciudad",
  "Dirección": "direccion",
  "Vendedor": "vendedor",
  "Núm. Documento": "numDocumento",
  "Fecha Emisión": "fechaEmision",
  "Fecha Vence": "fechaVence",
  "$ Total": "total",
  "# Ctas": "ctas",
  "$ Abonado": "abonado",
  "# Cob": "cob",
  "$ Saldo": "saldo",
  "# Ven": "ven",
  "Días": "dias",
  "$ Cuota": "cuota",
  "Saldo Fecha": "saldoFecha",
  "Categoría (Excel)": "categoriaOrigen",
};

const TAMANO_PAGINA = 50;
const COLUMNAS_ORDENABLES = new Set<string>([
  "Nombre Cliente",
  "Provincia",
  "Ciudad",
  "Vendedor",
  "Núm. Documento",
  "Fecha Emisión",
  "Fecha Vence",
  "$ Total",
  "# Ctas",
  "$ Abonado",
  "# Cob",
  "$ Saldo",
  "# Ven",
  "Días",
  "$ Cuota",
  "Saldo Fecha",
  "Categoría (Excel)",
]);

type Props = {
  filas: ClienteCartera[];
  claveVista: string;
};

export default function TablaClientes({ filas, claveVista }: Props) {
  const [consulta, setConsulta] = useState("");
  const [orden, setOrden] = useState<OrdenMarketing | null>(null);
  const [pagina, setPagina] = useState(1);
  const claveOrden = orden ? `${orden.columna}|${orden.direccion}` : "";
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
      setOrden({ columna: destino, direccion: "asc" });
    } else if (orden.direccion === "asc") {
      setOrden({ columna: destino, direccion: "desc" });
    } else {
      setOrden(null);
    }
  };

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

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {filtradas.length.toLocaleString("es-EC")} clientes
        </p>
        <Input
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          placeholder="Buscar por cliente, documento, vendedor o cualquier dato de la cartera"
          className="sm:w-80"
        />
      </div>

      {visibles.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          {filas.length === 0
            ? "No hay una cartera cargada para mostrar."
            : "Ningún registro coincide con la búsqueda."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNAS_TABLA.map((columna) => {
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
              <TableRow key={`${fila.fila}-${fila.numDocumento}-${fila.identificacion}`}>
                {COLUMNAS_TABLA.map((columna) => {
                  const clave = POR_COLUMNA[columna];
                  const valor = clave ? fila[clave] ?? "" : "";
                  return (
                    <TableCell key={columna} className="max-w-xs truncate">
                      {String(valor) || "—"}
                    </TableCell>
                  );
                })}
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
