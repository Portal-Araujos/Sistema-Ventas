"use client";

import { FILTRO_TODOS, type FiltrosMarketing, type OpcionFiltro } from "@/lib/marketing";
import { Button } from "@/components/ui/button";

type Props = {
  vendedores: OpcionFiltro[];
  provincias: OpcionFiltro[];
  ciudades: OpcionFiltro[];
  value: FiltrosMarketing;
  onChange: (filtros: FiltrosMarketing) => void;
  onAplicar: () => void;
};

function Select({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
  onChange: (valor: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-xs font-semibold text-gray-600">{etiqueta}</span>
      <select
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800"
      >
        <option value={FILTRO_TODOS}>(Todos)</option>
        {opciones.map((opcion) => (
          <option key={opcion.clave} value={opcion.clave}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function BarraFiltros({
  vendedores,
  provincias,
  ciudades,
  value,
  onChange,
  onAplicar,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <Select
        etiqueta="Vendedor"
        valor={value.vendedor}
        opciones={vendedores}
        onChange={(vendedor) => onChange({ ...value, vendedor })}
      />
      <Select
        etiqueta="Provincia"
        valor={value.provincia}
        opciones={provincias}
        onChange={(provincia) => onChange({ ...value, provincia, ciudad: FILTRO_TODOS })}
      />
      <Select
        etiqueta="Ciudad"
        valor={value.ciudad}
        opciones={ciudades}
        onChange={(ciudad) => onChange({ ...value, ciudad })}
      />
      <Button type="button" onClick={onAplicar} className="md:mb-0 md:shrink-0">
        Aplicar filtros
      </Button>
    </div>
  );
}
