"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

type Persona = { id: string; nombre: string; rolNombre?: string; rol?: string | { nombre?: string }; departamentoNombre?: string };
type Props = { usuarios: Persona[]; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean };
const normalizar = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function TicketAssignees({ usuarios, value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const personas = usuarios.filter((u, index) => usuarios.findIndex(p => p.id === u.id) === index);
  const rol = (u: Persona) => u.rolNombre || (typeof u.rol === "string" ? u.rol : u.rol?.nombre) || "";
  const filtradas = personas.filter(u => normalizar(`${u.nombre} ${rol(u)} ${u.departamentoNombre || ""}`).includes(normalizar(query)));
  function toggle(id: string) { onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]); }
  return <div className="space-y-2">
    {value.length > 0 && <div className="flex flex-wrap gap-2">{value.map(id => <span key={id} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
      {personas.find(u => u.id === id)?.nombre || "Usuario seleccionado"}
      <button type="button" disabled={disabled} aria-label={`Quitar a ${personas.find(u => u.id === id)?.nombre || "usuario"}`} onClick={() => toggle(id)}><X size={14} /></button>
    </span>)}</div>}
    <button type="button" disabled={disabled} aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-700">
      {value.length ? `${value.length} persona(s) seleccionada(s)` : "Seleccionar personas…"}<ChevronDown size={16} />
    </button>
    {open && <div id={listId} className="rounded-md border border-gray-200 bg-white p-2 shadow-sm">
      <input aria-label="Buscar personas para asignar" className="mb-2 w-full rounded border border-gray-300 p-2 text-sm" placeholder="Buscar por nombre o rol…" value={query} onChange={e => setQuery(e.target.value)} disabled={disabled} />
      <div className="max-h-48 overflow-y-auto" role="group" aria-label="Personas disponibles">
        {filtradas.map(u => <button type="button" role="checkbox" aria-checked={value.includes(u.id)} disabled={disabled} key={u.id} onClick={() => toggle(u.id)} className={`flex w-full items-center justify-between rounded p-2 text-left text-sm hover:bg-blue-50 ${value.includes(u.id) ? "bg-blue-50 text-blue-800" : "text-gray-800"}`}>
          <span>{u.nombre}{rol(u) && <span className="block text-xs text-gray-500">{rol(u)}</span>}</span>{value.includes(u.id) && <Check size={16} />}
        </button>)}
        {!filtradas.length && <p className="p-2 text-sm text-gray-500">No hay personas disponibles.</p>}
      </div>
      <button type="button" className="mt-2 text-sm font-semibold text-blue-700" onClick={() => setOpen(false)}>Listo</button>
    </div>}
  </div>;
}
