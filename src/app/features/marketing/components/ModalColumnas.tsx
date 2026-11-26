"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  COLUMNAS_SEMAFORO,
  type ColumnaSemaforo,
} from "@/lib/marketing";

type Props = {
  columnasVisibles: string[];
  onAplicar: (columnas: string[]) => void;
  onCerrar: () => void;
};

export default function ModalColumnas({
  columnasVisibles,
  onAplicar,
  onCerrar,
}: Props) {
  const [seleccionadas, setSeleccionadas] = useState<string[]>(columnasVisibles);

  const alternar = (columna: ColumnaSemaforo) => {
    setSeleccionadas((actuales) =>
      actuales.includes(columna)
        ? actuales.filter((nombre) => nombre !== columna)
        : [...actuales, columna],
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar();
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar columnas</DialogTitle>
          <DialogDescription>
            Selecciona las columnas que deseas ver. Los datos no se modifican.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-2">
          {COLUMNAS_SEMAFORO.map((columna) => (
            <label
              key={columna}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={seleccionadas.includes(columna)}
                onChange={() => alternar(columna)}
                className="h-4 w-4 accent-blue-600"
              />
              {columna}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSeleccionadas([...COLUMNAS_SEMAFORO])}
          >
            Restablecer
          </Button>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onAplicar(seleccionadas)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
