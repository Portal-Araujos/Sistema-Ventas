"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FILTROS_SEMAFORO_VACIOS,
  type FiltrosSemaforo,
} from "@/lib/marketing";

type Props = {
  filtros: FiltrosSemaforo;
  onChange: (filtros: FiltrosSemaforo) => void;
  categorias: string[];
  provincias: string[];
  cuotas: number[];
};

export default function FiltrosDocumentos({
  filtros,
  onChange,
  categorias,
  provincias,
  cuotas,
}: Props) {
  const actualizar = (clave: keyof FiltrosSemaforo, valor: string) => {
    onChange({ ...filtros, [clave]: valor });
  };

  const claseCampo =
    "flex flex-col gap-1 text-xs font-semibold text-gray-700";
  const claseControl =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={claseCampo}>
          Buscar
          <Input
            value={filtros.busqueda}
            onChange={(evento) => actualizar("busqueda", evento.target.value)}
            placeholder="Cliente, documento, vendedor o categoría"
            className="text-sm font-normal"
          />
        </label>
        <label className={claseCampo}>
          Categoría
          <select
            className={claseControl}
            value={filtros.categoria}
            onChange={(evento) => actualizar("categoria", evento.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </label>
        <label className={claseCampo}>
          Provincia
          <select
            className={claseControl}
            value={filtros.provincia}
            onChange={(evento) => actualizar("provincia", evento.target.value)}
          >
            <option value="">Todas</option>
            {provincias.map((provincia) => (
              <option key={provincia} value={provincia}>
                {provincia}
              </option>
            ))}
          </select>
        </label>
        <label className={claseCampo}>
          Color
          <select
            className={claseControl}
            value={filtros.color}
            onChange={(evento) => actualizar("color", evento.target.value)}
          >
            <option value="">Todos</option>
            <option value="VERDE">Verde</option>
            <option value="AMARILLO">Amarillo</option>
            <option value="NARANJA">Naranja</option>
            <option value="ROJO">Rojo</option>
            <option value="REVISION">Revisión</option>
          </select>
        </label>
        <label className={claseCampo}>
          Cuotas pendientes
          <select
            className={claseControl}
            value={filtros.cuotas}
            onChange={(evento) => actualizar("cuotas", evento.target.value)}
          >
            <option value="">Todas</option>
            {cuotas.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={claseCampo}>
          Oportunidad de reventa
          <select
            className={claseControl}
            value={filtros.reventa}
            onChange={(evento) => actualizar("reventa", evento.target.value)}
          >
            <option value="">Todas</option>
            <option value="si">Con reventa</option>
            <option value="no">Sin reventa</option>
          </select>
        </label>
        <label className={claseCampo}>
          Fecha vence desde
          <input
            type="date"
            className={claseControl}
            value={filtros.fechaVenceDesde}
            onChange={(evento) =>
              actualizar("fechaVenceDesde", evento.target.value)
            }
          />
        </label>
        <label className={claseCampo}>
          Fecha vence hasta
          <input
            type="date"
            className={claseControl}
            value={filtros.fechaVenceHasta}
            onChange={(evento) =>
              actualizar("fechaVenceHasta", evento.target.value)
            }
          />
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange({ ...FILTROS_SEMAFORO_VACIOS })}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
