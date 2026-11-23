"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  FILTRO_TODOS,
  normalizarTexto,
  type OpcionFiltro,
} from "@/lib/marketing";
import { Input } from "@/components/ui/input";

type Props = {
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
  onChange: (valor: string) => void;
};

export default function SelectorFiltro({
  etiqueta,
  valor,
  opciones,
  onChange,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  const etiquetaActual =
    valor === FILTRO_TODOS
      ? "(Todos)"
      : (opciones.find((opcion) => opcion.clave === valor)?.etiqueta ?? "(Todos)");

  const coincidencias = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    if (!texto) return opciones;
    return opciones.filter((opcion) =>
      normalizarTexto(opcion.etiqueta).includes(texto),
    );
  }, [opciones, busqueda]);

  const elegir = (clave: string) => {
    onChange(clave);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div ref={contenedorRef} className="flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-xs font-semibold text-gray-600">{etiqueta}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((valorActual) => !valorActual)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 hover:border-blue-300"
      >
        <span className="truncate">{etiquetaActual}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-gray-500 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto && (
        <div className="mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
          <Input
            autoFocus
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder={`Buscar ${etiqueta.toLowerCase()}...`}
            aria-label={`Buscar opciones de ${etiqueta}`}
          />
          <div role="listbox" className="mt-2 max-h-56 overflow-y-auto">
            <button
              type="button"
              role="option"
              aria-selected={valor === FILTRO_TODOS}
              onClick={() => elegir(FILTRO_TODOS)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-blue-50"
            >
              <span>(Todos)</span>
              {valor === FILTRO_TODOS && <Check size={14} className="text-blue-600" />}
            </button>
            {coincidencias.map((opcion) => (
              <button
                key={opcion.clave}
                type="button"
                role="option"
                aria-selected={valor === opcion.clave}
                onClick={() => elegir(opcion.clave)}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-blue-50"
              >
                <span className="truncate">{opcion.etiqueta}</span>
                {valor === opcion.clave && (
                  <Check size={14} className="shrink-0 text-blue-600" />
                )}
              </button>
            ))}
            {coincidencias.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-gray-500">
                Sin coincidencias
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
