"use client";

import { ClipboardEvent, useId } from "react";
import { Paperclip, X } from "lucide-react";

export function agregarArchivosTicket(actuales: File[], nuevos: File[]) {
  const archivos = [...actuales, ...nuevos];
  if (archivos.length > 10) throw new Error("Puedes adjuntar hasta 10 archivos por envío.");
  if (archivos.some(f => !f.size || f.size > 10 * 1024 * 1024)) throw new Error("Cada archivo debe tener contenido y pesar hasta 10 MB.");
  if (archivos.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024) throw new Error("Los adjuntos no pueden superar 50 MB por envío.");
  return archivos;
}

export function pegarArchivosTicket(e: ClipboardEvent, archivos: File[], onChange: (files: File[]) => void) {
  const pegados = Array.from(e.clipboardData.items).filter(item => item.kind === "file").map(item => item.getAsFile()).filter((file): file is File => file !== null);
  if (!pegados.length) return;
  e.preventDefault(); e.stopPropagation();
  try { onChange(agregarArchivosTicket(archivos, pegados)); }
  catch (error) { alert(error instanceof Error ? error.message : "No se pudieron pegar los archivos"); }
}

export default function TicketAttachments({ archivos, onChange, disabled }: { archivos: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const id = useId();
  function agregar(files: File[]) {
    try { onChange(agregarArchivosTicket(archivos, files)); }
    catch (error) { alert(error instanceof Error ? error.message : "No se pudieron agregar los archivos"); }
  }
  return <div className="space-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2" tabIndex={0} aria-label="Adjuntos del ticket" onPaste={e => { if (!disabled) pegarArchivosTicket(e, archivos, onChange); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (!disabled) agregar(Array.from(e.dataTransfer.files)); }}>
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-blue-700"><Paperclip size={15} /> Agregar archivos o pegar captura (Ctrl+V)</label>
    <input id={id} type="file" multiple disabled={disabled} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,audio/*" className="block w-full text-xs" onChange={e => { agregar(Array.from(e.target.files || [])); e.target.value = ""; }} />
    <p className="text-[10px] text-gray-500">Hasta 10 archivos · 10 MB por archivo · 50 MB en total. También puedes arrastrarlos aquí.</p>
    {archivos.map((f, i) => <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded bg-white p-1.5 text-xs"><span className="truncate">{f.name} ({Math.ceil(f.size / 1024)} KB)</span><button type="button" disabled={disabled} aria-label={`Quitar ${f.name}`} onClick={() => onChange(archivos.filter((_, index) => index !== i))}><X size={14} /></button></div>)}
  </div>;
}
