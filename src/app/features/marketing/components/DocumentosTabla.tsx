"use client";

import {
  CAMPO_POR_COLUMNA,
  COLUMNAS_SEMAFORO,
  esColumnaOrdenableSemaforo,
  type DocumentoAnalisis,
  type EstadoSemaforo,
  type OrdenSemaforo,
} from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CLASES_ESTADO: Record<EstadoSemaforo, string> = {
  VERDE: "bg-green-100 hover:bg-green-200",
  AMARILLO: "bg-yellow-100 hover:bg-yellow-200",
  NARANJA: "bg-orange-100 hover:bg-orange-200",
  ROJO: "bg-red-100 hover:bg-red-200",
  REVISION: "bg-gray-200 hover:bg-gray-300",
  SIN_CONTRATO: "",
};

type Props = {
  documentos: DocumentoAnalisis[];
  columnasVisibles: string[];
  onConfigurar: () => void;
  pagina: number;
  porPagina: number;
  total: number;
  onPagina: (pagina: number) => void;
  onVerPagados: (identificacion: string) => void;
  esSinContrato?: boolean;
  orden: OrdenSemaforo | null;
  onOrden: (orden: OrdenSemaforo) => void;
};

export default function DocumentosTabla({
  documentos,
  columnasVisibles,
  onConfigurar,
  pagina,
  porPagina,
  total,
  onPagina,
  onVerPagados,
  esSinContrato = false,
  orden,
  onOrden,
}: Props) {
  const visibles = new Set(columnasVisibles);
  const columnas = COLUMNAS_SEMAFORO.filter((columna) => visibles.has(columna));
  const paginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {total.toLocaleString("es-EC")}{" "}
          {esSinContrato ? "clientes" : "documentos"}
        </p>
        <Button type="button" variant="outline" onClick={onConfigurar}>
          Configurar columnas
        </Button>
      </div>

      {documentos.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          No hay {esSinContrato ? "clientes" : "documentos"} para mostrar con
          los filtros seleccionados.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columnas.map((columna) => {
                if (!esColumnaOrdenableSemaforo(columna)) {
                  return <TableHead key={columna}>{columna}</TableHead>;
                }
                const ascendente =
                  orden?.columna === columna && orden.direccion === "asc";
                const descendente =
                  orden?.columna === columna && orden.direccion === "desc";
                const Icono = ascendente
                  ? ArrowUp
                  : descendente
                    ? ArrowDown
                    : ArrowUpDown;
                return (
                  <TableHead key={columna}>
                    <button
                      type="button"
                      onClick={() =>
                        onOrden({
                          columna,
                          direccion: ascendente ? "desc" : "asc",
                        })
                      }
                      title={`Ordenar por ${columna} ${
                        ascendente ? "descendentemente" : "ascendentemente"
                      }`}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      {columna}
                      <Icono size={14} aria-hidden="true" />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((documento) => (
              <TableRow key={documento.id} className={CLASES_ESTADO[documento.estado]}>
                {columnas.map((columna) => {
                  const campo = CAMPO_POR_COLUMNA[columna];
                  const valor = documento[campo] ?? "";
                  return (
                    <TableCell key={columna} className="max-w-xs truncate">
                      {columna === "Identificación" ? (
                        <button
                          type="button"
                          onClick={() =>
                            onVerPagados(documento.identificacion)
                          }
                          title="Consultar documentos pagados"
                          className="font-semibold text-blue-700 underline"
                        >
                          {String(valor) || "—"}
                        </button>
                      ) : (
                        String(valor) || "—"
                      )}
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
            disabled={pagina <= 1}
            onClick={() => onPagina(Math.max(1, pagina - 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pagina >= paginas}
            onClick={() => onPagina(Math.min(paginas, pagina + 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
