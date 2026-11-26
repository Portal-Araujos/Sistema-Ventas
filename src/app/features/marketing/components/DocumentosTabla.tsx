"use client";

import {
  CAMPO_POR_COLUMNA,
  COLUMNAS_SEMAFORO,
  type DocumentoAnalisis,
  type EstadoSemaforo,
} from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CLASES_ESTADO: Record<EstadoSemaforo, string> = {
  VERDE: "bg-green-50 hover:bg-green-100",
  AMARILLO: "bg-yellow-50 hover:bg-yellow-100",
  NARANJA: "bg-orange-50 hover:bg-orange-100",
  ROJO: "bg-red-50 hover:bg-red-100",
  REVISION: "bg-gray-100 hover:bg-gray-200",
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
}: Props) {
  const visibles = new Set(columnasVisibles);
  const columnas = COLUMNAS_SEMAFORO.filter((columna) => visibles.has(columna));
  const paginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {total.toLocaleString("es-EC")} documentos
        </p>
        <Button type="button" variant="outline" onClick={onConfigurar}>
          Configurar columnas
        </Button>
      </div>

      {documentos.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          No hay documentos para mostrar con los filtros seleccionados.
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
