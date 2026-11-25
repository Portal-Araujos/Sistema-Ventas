"use client";

import { RotateCcw } from "lucide-react";
import { FILTRO_TODOS, type FiltrosMarketing, type OpcionFiltro } from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import SelectorFiltro from "./SelectorFiltro";

type Props = {
  vendedores: OpcionFiltro[];
  provincias: OpcionFiltro[];
  ciudades: OpcionFiltro[];
  value: FiltrosMarketing;
  onChange: (filtros: FiltrosMarketing) => void;
  onAplicar: () => void;
  onLimpiarTodo: () => void;
  resultados?: number;
};

export default function BarraFiltros({
  vendedores,
  provincias,
  ciudades,
  value,
  onChange,
  onAplicar,
  onLimpiarTodo,
  resultados,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
      <SelectorFiltro
        etiqueta="Vendedor"
        valor={value.vendedor}
        opciones={vendedores}
        onChange={(vendedor) => onChange({ ...value, vendedor })}
      />
      <SelectorFiltro
        etiqueta="Provincia"
        valor={value.provincia}
        opciones={provincias}
        onChange={(provincia) => onChange({ ...value, provincia, ciudad: FILTRO_TODOS })}
      />
      <SelectorFiltro
        etiqueta="Ciudad"
        valor={value.ciudad}
        opciones={ciudades}
        onChange={(ciudad) => onChange({ ...value, ciudad })}
      />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="button" onClick={onAplicar}>
          Aplicar filtros
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onLimpiarTodo}
          title="Restablece tarjetas, filtros, búsqueda, columnas y asignación manual"
        >
          <RotateCcw aria-hidden="true" />
          Limpiar todo
        </Button>
      </div>
      {typeof resultados === "number" && (
        <p className="col-span-full text-xs text-gray-500">
          {resultados.toLocaleString("es-EC")} clientes coinciden con esta selección
        </p>
      )}
    </div>
  );
}
