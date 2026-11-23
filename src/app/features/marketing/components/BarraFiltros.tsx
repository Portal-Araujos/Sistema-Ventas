"use client";

import { RotateCcw } from "lucide-react";
import { FILTRO_TODOS, type FiltrosMarketing, type OpcionFiltro } from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import SelectorFiltro from "./SelectorFiltro";

type Props = {
  vendedores?: OpcionFiltro[];
  provincias: OpcionFiltro[];
  ciudades: OpcionFiltro[];
  value: FiltrosMarketing;
  onChange: (filtros: FiltrosMarketing) => void;
  onAplicar: () => void;
  onLimpiarTodo: () => void;
  resultados?: number;
  mostrarVendedor?: boolean;
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
  mostrarVendedor = true,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
      {mostrarVendedor && (
        <SelectorFiltro
          etiqueta="Vendedor"
          valor={value.vendedor}
          opciones={vendedores ?? []}
          onChange={(vendedor) => onChange({ ...value, vendedor })}
        />
      )}
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
      <div className="flex flex-wrap items-center gap-2 md:mb-0 md:shrink-0">
        <Button type="button" onClick={onAplicar}>
          Aplicar filtros
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onLimpiarTodo}
          title="Restablece tarjetas, filtros, búsqueda y columnas visibles"
        >
          <RotateCcw aria-hidden="true" />
          Limpiar todo
        </Button>
      </div>
      {typeof resultados === "number" && (
        <p className="w-full text-xs text-gray-500 md:w-auto">
          {resultados.toLocaleString("es-EC")} clientes coinciden con esta selección
        </p>
      )}
    </div>
  );
}
