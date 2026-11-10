"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Datos = { skuCodigo?: string; tipoRopa?: string; talla?: string; color?: string; genero?: string };
export type CambioPrenda = { id: string; usuarioNombre: string; createdAt: string; motivo: string; anterior: Datos; nuevo: Datos };
const descripcion = (d: Datos) => [d.skuCodigo, d.tipoRopa, d.color, d.genero, d.talla].filter(Boolean).join(" · ");

export default function HistorialCambioPrenda({ cambios }: { cambios: CambioPrenda[] }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="icon" variant="outline" className="h-7 w-7 text-amber-700" title="Ver historial de cambios de prenda" aria-label="Ver historial de cambios de prenda" onClick={() => setOpen(true)}><History size={14} /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader><DialogTitle>Historial de cambios de prenda</DialogTitle></DialogHeader>
        {cambios.map(c => <div key={c.id} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">{c.usuarioNombre} · {new Date(c.createdAt).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</p>
          <p><strong>Antes:</strong> {descripcion(c.anterior)}</p>
          <p><strong>Después:</strong> {descripcion(c.nuevo)}</p>
          <p><strong>Motivo:</strong> {c.motivo}</p>
        </div>)}
      </DialogContent>
    </Dialog>
  </>;
}
