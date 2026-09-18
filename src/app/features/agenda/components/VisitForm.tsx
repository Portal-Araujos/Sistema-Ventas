"use client";

import React from "react";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function VisitForm({ institutionName }: { institutionName: string }) {
  return (
    <Dialog>
      {/* Botón que dispara este formulario (Reemplazará al que pusimos antes) */}
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
        >
          Registrar visita <ArrowRight size={14} className="ml-1" />
        </Button>
      </DialogTrigger>

      {/* Contenedor del Formulario */}
      <DialogContent className="sm:max-w-md bg-white rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Resultado de la Visita
          </DialogTitle>
          <p className="text-xs font-medium text-primary mt-1">
            {institutionName}
          </p>
        </DialogHeader>

        <form className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Estado de la gestión <span className="text-red-500">*</span>
            </Label>
            <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Seleccione...</option>
              <option>Completada - Con interés</option>
              <option>Completada - Sin interés</option>
              <option>Reprogramada</option>
              <option>Cancelada</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Resumen y Acuerdos <span className="text-red-500">*</span>
            </Label>
            {/* Usamos un textarea nativo de HTML estilizado con Tailwind */}
            <textarea
              className="flex min-h-100px w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Ej: Hablé con el rector, se mostraron muy interesados en el paquete..."
            ></textarea>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Fecha del próximo contacto
            </Label>
            <Input type="date" className="h-10 text-gray-700" />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto text-gray-600 bg-white hover:bg-gray-50"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white font-medium"
            >
              <Save size={16} className="mr-2" />
              Guardar registro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
