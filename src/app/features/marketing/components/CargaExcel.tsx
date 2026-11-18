"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CargaExcel({ onCargado }: { onCargado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const subir = async () => {
    if (!archivo) return;
    setCargando(true);
    setError("");
    try {
      const datos = new FormData();
      datos.append("archivo", archivo);
      const respuesta = await fetch("/api/marketing/carga", {
        method: "POST",
        body: datos,
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        throw new Error(cuerpo.error ?? "No se pudo cargar el archivo");
      }
      setArchivo(null);
      onCargado();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Upload size={16} />
          Seleccionar Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          />
        </label>
        {archivo && <span className="text-sm text-gray-600">{archivo.name}</span>}
        <Button type="button" onClick={subir} disabled={!archivo || cargando}>
          {cargando ? "Procesando…" : "Cargar cartera"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
