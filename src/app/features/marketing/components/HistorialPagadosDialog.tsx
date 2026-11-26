"use client";

import {
  CAMPO_POR_COLUMNA,
  COLUMNAS_SEMAFORO,
  type DocumentoPagado,
} from "@/lib/marketing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  identificacion: string;
  documentos: DocumentoPagado[];
  cargando: boolean;
  onCerrar: () => void;
};

export default function HistorialPagadosDialog({
  identificacion,
  documentos,
  cargando,
  onCerrar,
}: Props) {
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar();
      }}
    >
      <DialogContent
        className="max-h-[85vh] max-w-[95vw] overflow-y-auto bg-white p-5 sm:max-w-6xl"
        overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
      >
        <DialogHeader>
          <DialogTitle>Documentos pagados</DialogTitle>
          <DialogDescription>
            Historial de la identificación {identificacion}. Se muestran todas
            las cargas disponibles.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <p className="p-6 text-center text-sm text-gray-500">Consultando…</p>
        ) : documentos.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            No hay documentos pagados para esta identificación.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
            <Table className="min-w-[1500px] text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-50">
                <TableRow>
                  {COLUMNAS_SEMAFORO.map((columna) => (
                    <TableHead key={columna} className="whitespace-nowrap">
                      {columna}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento, indice) => (
                  <TableRow key={`${documento.cargaId}-${documento.fila}-${indice}`}>
                    {COLUMNAS_SEMAFORO.map((columna) => (
                      <TableCell key={columna} className="whitespace-nowrap">
                        {String(documento[CAMPO_POR_COLUMNA[columna]] ?? "") || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
