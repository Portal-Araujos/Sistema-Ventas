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
  onVerPagados: () => void;
};

export default function FiltrosDocumentos({
  filtros,
  onChange,
  categorias,
  onVerPagados,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={filtros.busqueda}
          onChange={(evento) => actualizar("busqueda", evento.target.value)}
          placeholder="Buscar por cliente, documento, vendedor o categoría"
          className="sm:w-96"
        />
        <Button type="button" variant="outline" onClick={onVerPagados}>
          Ver documentos pagados
        </Button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          Filtros avanzados
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={claseCampo}>
            Identificación
            <input
              className={claseControl}
              value={filtros.identificacion}
              onChange={(evento) =>
                actualizar("identificacion", evento.target.value)
              }
            />
          </label>
          <label className={claseCampo}>
            Nombre del cliente
            <input
              className={claseControl}
              value={filtros.nombre}
              onChange={(evento) => actualizar("nombre", evento.target.value)}
            />
          </label>
          <label className={claseCampo}>
            Número de documento
            <input
              className={claseControl}
              value={filtros.documento}
              onChange={(evento) =>
                actualizar("documento", evento.target.value)
              }
            />
          </label>
          <label className={claseCampo}>
            Categoría
            <select
              className={claseControl}
              value={filtros.categoria}
              onChange={(evento) =>
                actualizar("categoria", evento.target.value)
              }
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
            Estado del contrato
            <select
              className={claseControl}
              value={filtros.estado}
              onChange={(evento) => actualizar("estado", evento.target.value)}
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
            Vence desde
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
            Vence hasta
            <input
              type="date"
              className={claseControl}
              value={filtros.fechaVenceHasta}
              onChange={(evento) =>
                actualizar("fechaVenceHasta", evento.target.value)
              }
            />
          </label>
          <label className={claseCampo}>
            Cuotas pendientes desde
            <input
              type="number"
              min="0"
              className={claseControl}
              value={filtros.cuotasMin}
              onChange={(evento) =>
                actualizar("cuotasMin", evento.target.value)
              }
            />
          </label>
          <label className={claseCampo}>
            Cuotas pendientes hasta
            <input
              type="number"
              min="0"
              className={claseControl}
              value={filtros.cuotasMax}
              onChange={(evento) =>
                actualizar("cuotasMax", evento.target.value)
              }
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange({ ...FILTROS_SEMAFORO_VACIOS })}
          >
            Limpiar filtros
          </Button>
        </div>
      </details>
    </div>
  );
}
