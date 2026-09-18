"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  FileDown,
  UploadCloud,
  MapPin,
  Calendar,
  Plus,
  Ticket,
  FileText,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RadarCobranzasPage() {
  const hoyStr = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }),
  )
    .toISOString()
    .split("T")[0];
  const proximos7 = new Date();
  proximos7.setDate(proximos7.getDate() + 7);
  const proximos7Str = proximos7.toISOString().split("T")[0];

  const [filtros, setFiltros] = useState({
    fechaDesde: hoyStr,
    fechaHasta: proximos7Str,
    vendedorId: "",
  });
  const [radarData, setRadarData] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 ESTADOS PARA PAGINACIÓN 🔥
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [instSeleccionada, setInstSeleccionada] = useState<any>(null);

  const [form, setForm] = useState({
    deudor: "",
    monto: "",
    instrucciones: "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/usuarios/vendedores")
      .then((res) => res.json())
      .then((data) => setVendedores(data))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    cargarRadar();
  }, [filtros]);

  // Si busca algo o filtra, regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtros]);

  const cargarRadar = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filtros).toString();
      const res = await fetch(`/api/cobranzas/radar?${query}`);
      setRadarData(await res.json());
    } catch (e) {
      console.error("Error al cargar radar");
    } finally {
      setLoading(false);
    }
  };

  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(
                  new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  }),
                );
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.6,
          );
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileComprimido = await comprimirImagen(file);
    setArchivo(fileComprimido);
  };

  const handleAsignarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("institucionId", instSeleccionada.id);
      formData.append("vendedorId", instSeleccionada.vendedorId || "");
      formData.append("deudor", form.deudor);
      formData.append("monto", form.monto);
      formData.append("instrucciones", form.instrucciones);
      if (archivo) formData.append("file", archivo);

      const res = await fetch("/api/cobranzas/radar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setModalOpen(false);
        setForm({ deudor: "", monto: "", instrucciones: "" });
        setArchivo(null);
        cargarRadar();
        alert("¡Ticket de Cobro asignado correctamente al vendedor!");
      }
    } catch (e) {
      alert("Error al asignar cobro");
    } finally {
      setSaving(false);
    }
  };

  const formatearFecha = (fecha: string | null) =>
    fecha
      ? new Date(fecha).toLocaleDateString("es-EC", {
          timeZone: "America/Guayaquil",
        })
      : "N/A";

  // 🔥 LÓGICA DE PAGINACIÓN A 15 🔥
  const escuelasFiltradas = radarData.filter((i) =>
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(escuelasFiltradas.length / itemsPerPage),
  );
  const itemsPaginados = escuelasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <ShieldAlert className="text-primary" /> Radar Táctico de Cobranzas
        </h1>
        <p className="text-sm text-gray-500">
          Solo verás las escuelas que tienen visitas programadas en el rango de
          fechas.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-250px">
          <Label className="text-[10px] font-bold text-gray-500 uppercase">
            Buscar Escuela
          </Label>
          <Search size={14} className="absolute left-3 top-7 text-gray-400" />
          <Input
            placeholder="Escribe el nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 h-10 mt-1"
          />
        </div>
        <div className="w-full md:w-250px">
          <Label className="text-[10px] font-bold text-gray-500 uppercase">
            Filtrar Vendedor
          </Label>
          <select
            className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm mt-1 bg-white outline-none"
            value={filtros.vendedorId}
            onChange={(e) =>
              setFiltros({ ...filtros, vendedorId: e.target.value })
            }
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] font-bold text-gray-500 uppercase">
            Desde
          </Label>
          <Input
            type="date"
            className="h-10 mt-1 w-100px"
            value={filtros.fechaDesde}
            onChange={(e) =>
              setFiltros({ ...filtros, fechaDesde: e.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold text-gray-500 uppercase">
            Hasta
          </Label>
          <Input
            type="date"
            className="h-10 mt-1 w-100px"
            value={filtros.fechaHasta}
            onChange={(e) =>
              setFiltros({ ...filtros, fechaHasta: e.target.value })
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-800px">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">
                  Institución a Visitar
                </TableHead>
                <TableHead className="font-bold">Vendedor en Ruta</TableHead>
                <TableHead className="font-bold">Visita Programada</TableHead>
                <TableHead className="font-bold text-center">
                  Tickets de Cobro
                </TableHead>
                <TableHead className="font-bold text-center">
                  Acción Logística
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center p-8 text-gray-500 font-bold animate-pulse"
                  >
                    Rastreando agenda de vendedores...
                  </TableCell>
                </TableRow>
              ) : escuelasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center p-8 text-gray-500 font-bold"
                  >
                    No hay visitas programadas en este rango de fechas.
                  </TableCell>
                </TableRow>
              ) : (
                itemsPaginados.map((inst) => (
                  <TableRow key={inst.id} className="hover:bg-slate-50">
                    <TableCell>
                      <p
                        className="font-black text-sm text-gray-900 truncate max-w-250px"
                        title={inst.nombre}
                      >
                        {inst.nombre}
                      </p>
                      <p
                        className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 truncate max-w-250px"
                        title={inst.ubicacion}
                      >
                        <MapPin size={12} /> {inst.ubicacion}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-xs text-gray-800">
                        {inst.vendedorNombre}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-blue-600 font-black flex items-center gap-1">
                        <Calendar size={12} />{" "}
                        {formatearFecha(inst.proximaVisita)}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 ml-4">
                        <Clock size={10} className="inline mr-1" />
                        {inst.horaProgramada
                          ? `Aprox. a las ${inst.horaProgramada}`
                          : "Hora no definida"}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      {inst.ticketsActivos > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse">
                          {inst.ticketsActivos} Pendientes
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Sin pendientes
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          setInstSeleccionada(inst);
                          setModalOpen(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-8"
                      >
                        <Plus size={14} className="mr-1" /> Asignar Cobro
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 🔥 CONTROLES DE PAGINACIÓN 🔥 */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-xl">
            <span className="text-xs text-gray-500 font-medium">
              Página {currentPage} de {totalPages} ({escuelasFiltradas.length}{" "}
              resultados)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs font-bold bg-white"
              >
                <ChevronLeft size={14} className="mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8 text-xs font-bold bg-white"
              >
                Siguiente <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Ticket className="text-primary" /> Nuevo Ticket de Cobranza
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAsignarCobro} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-[10px] font-bold text-blue-800 uppercase">
                Institución Destino
              </p>
              <p className="text-sm font-black text-blue-900">
                {instSeleccionada?.nombre}
              </p>
              <p className="text-[11px] font-bold text-emerald-700 mt-1">
                El vendedor <u>{instSeleccionada?.vendedorNombre}</u> visitará
                esta escuela el{" "}
                {formatearFecha(instSeleccionada?.proximaVisita)}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">
                  Deudor / Contacto *
                </Label>
                <Input
                  required
                  placeholder="Ej: Prof. Carlos"
                  value={form.deudor}
                  onChange={(e) => setForm({ ...form, deudor: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700">
                  Monto Esperado ($) *
                </Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Ej: 150.00"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">
                Instrucciones al Vendedor *
              </Label>
              <textarea
                required
                className="w-full border rounded-md p-2 text-xs h-20 outline-none focus:border-primary mt-1"
                placeholder="Ej: Tratar de cobrar mínimo 2 cuotas atrasadas..."
                value={form.instrucciones}
                onChange={(e) =>
                  setForm({ ...form, instrucciones: e.target.value })
                }
              />
            </div>

            {/* ZONA DE SUBIDA DE ARCHIVO Y COMPRESIÓN */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                id="fileCobro"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="fileCobro"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <UploadCloud className="text-gray-400" size={24} />
                <span className="text-xs font-bold text-gray-600">
                  Adjuntar Evidencia (PDF o Imagen)
                </span>
                <span className="text-[10px] text-gray-400">
                  Las imágenes se comprimirán automáticamente
                </span>
              </label>
              {archivo && (
                <div className="mt-3 bg-emerald-50 text-emerald-700 text-xs font-bold p-2 rounded-md border border-emerald-200 flex items-center justify-between">
                  <span className="truncate max-w-200px">
                    <FileText size={12} className="inline mr-1" />
                    {archivo.name}
                  </span>
                  <span className="text-[10px]">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white font-bold"
              >
                {saving ? "Generando..." : "Despachar Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
