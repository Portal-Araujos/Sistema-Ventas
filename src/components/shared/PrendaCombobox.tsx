"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Sku = { codigo: string; tipoRopa: string; color: string; talla: string; genero: string };
type Props = { skus: Sku[]; value: string; onChange: (codigo: string) => void; disabled?: boolean };
const descripcion = (s: Sku) => `${s.codigo} · ${s.tipoRopa} · ${s.color} · ${s.genero} · ${s.talla}`;
const normalizar = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function PrendaCombobox({ skus, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const id = useId();
  const selected = skus.find(s => s.codigo === value);
  const resultados = skus.filter(s => normalizar(descripcion(s)).includes(normalizar(query)));
  function elegir(s: Sku) { onChange(s.codigo); setQuery(""); setOpen(false); setActive(0); }
  return <div className="space-y-1">
    <label htmlFor={id} className="block text-sm">Nueva prenda *</label>
    <p id={`${id}-help`} className="text-xs text-gray-500">Selecciona nueva prenda. Escribe el código o el nombre para buscar.</p>
    <div className="relative">
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-describedby={`${id}-help`} aria-activedescendant={open && resultados[active] ? `${id}-option-${active}` : undefined}
        autoComplete="off" disabled={disabled} className="w-full rounded-md border border-gray-300 bg-white p-2 pr-9 text-sm" placeholder="Selecciona nueva prenda…"
        value={open ? query : selected ? descripcion(selected) : ""}
        onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); onChange(""); }}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === "Escape") { setOpen(false); return; }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive(i => Math.max(0, Math.min(resultados.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))); }
          if (e.key === "Enter" && open) { e.preventDefault(); if (resultados[active]) elegir(resultados[active]); }
        }} />
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-gray-400" />
      {open && <div role="listbox" id={`${id}-list`} aria-label="Prendas disponibles" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
        {resultados.map((s, index) => <button key={s.codigo} id={`${id}-option-${index}`} role="option" aria-selected={s.codigo === value} type="button" onMouseDown={e => e.preventDefault()} onClick={() => elegir(s)} className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm hover:bg-blue-50 ${index === active ? "bg-blue-50" : ""}`}>
          <span>{descripcion(s)}</span>{s.codigo === value && <Check size={16} />}
        </button>)}
        {!resultados.length && <p className="p-3 text-sm text-gray-500">No se encontraron prendas.</p>}
      </div>}
    </div>
  </div>;
}
