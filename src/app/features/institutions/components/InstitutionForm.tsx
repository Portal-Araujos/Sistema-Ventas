"use client";

import React, { useState, useEffect } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  onSuccess?: () => void;
}

export function InstitutionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Catálogos y Rol
  const [catalogos, setCatalogos] = useState<any>(null);
  const [userRol, setUserRol] = useState<string>("vendedor");
  const [cantonesDisponibles, setCantonesDisponibles] = useState<any[]>([]);
  const [parroquiasDisponibles, setParroquiasDisponibles] = useState<any[]>([]);

  // Selección Geográfica
  const [selectedProvincia, setSelectedProvincia] = useState("");
  const [selectedCanton, setSelectedCanton] = useState("");

  // Formulario Principal
  const [formData, setFormData] = useState({
    nombre: "",
    jornadaId: "",
    sostenimientoId: "",
    parroquiaId: "",
    docentesHombres: "",
    docentesMujeres: "",
    nivelEducativoId: "",
    areaId: "",
    regimenId: "",
    jurisdiccionId: "",
    modalidadId: "",
    accesoEdificioId: "",
  });

  // Modal para Crear en Catálogo
  const [modalCatalog, setModalCatalog] = useState<{
    open: boolean;
    tipo: string;
    titulo: string;
  }>({
    open: false,
    tipo: "",
    titulo: "",
  });
  const [nuevoItemNombre, setNuevoItemNombre] = useState("");
  const [savingCatalog, setSavingCatalog] = useState(false);

  const cargarCatalogos = async () => {
    try {
      const res = await fetch("/api/catalogos");
      const data = await res.json();
      setCatalogos(data);
      if (data.userRol) setUserRol(data.userRol);

      if (selectedProvincia) {
        const prov = data.provincias?.find(
          (p: any) => p.id === parseInt(selectedProvincia),
        );
        setCantonesDisponibles(prov ? prov.cantones : []);
        if (selectedCanton) {
          const cant = prov?.cantones?.find(
            (c: any) => c.id === parseInt(selectedCanton),
          );
          setParroquiasDisponibles(cant ? cant.parroquias : []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) cargarCatalogos();
  }, [open]);

  const handleProvinciaChange = (provId: string) => {
    setSelectedProvincia(provId);
    setSelectedCanton("");
    setFormData((prev) => ({ ...prev, parroquiaId: "" }));
    setParroquiasDisponibles([]);

    const prov = catalogos?.provincias?.find(
      (p: any) => p.id === parseInt(provId),
    );
    setCantonesDisponibles(prov ? prov.cantones : []);
  };

  const handleCantonChange = (cantonId: string) => {
    setSelectedCanton(cantonId);
    setFormData((prev) => ({ ...prev, parroquiaId: "" }));

    const cant = cantonesDisponibles.find(
      (c: any) => c.id === parseInt(cantonId),
    );
    setParroquiasDisponibles(cant ? cant.parroquias : []);
  };

  const totalDocentesCalculado =
    (Number(formData.docentesHombres) || 0) +
    (Number(formData.docentesMujeres) || 0);

  const handleAgregarCatalogItem = async () => {
    if (!nuevoItemNombre.trim()) return;
    setSavingCatalog(true);

    try {
      const res = await fetch("/api/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: modalCatalog.tipo,
          nombre: nuevoItemNombre,
          provinciaId: selectedProvincia,
          cantonId: selectedCanton,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al agregar");
      }

      setNuevoItemNombre("");
      setModalCatalog({ open: false, tipo: "", titulo: "" });
      await cargarCatalogos();
    } catch (error: any) {
      alert(error.message || "Error al guardar el nuevo elemento.");
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parroquiaId) {
      alert("Por favor selecciona una Provincia, Cantón y Parroquia válidos.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/instituciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al guardar");

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      alert(error.message || "Error al guardar la institución.");
    } finally {
      setLoading(false);
    }
  };

  const esAdmin = userRol === "super_admin" || userRol === "administrador";

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 shadow-sm w-full sm:w-auto">
            <Plus size={18} />
            Nueva Institución
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full ´sm:max-w-md´ overflow-y-auto bg-white ´sm:max-w-xl´">
          <SheetHeader className="mb-6 border-b border-gray-100 pb-4">
            <SheetTitle className="text-xl font-bold text-gray-900">
              Registrar Institución
            </SheetTitle>
            <p className="text-xs text-gray-500">
              Ingresa los datos para agregar una nueva escuela al sistema.
            </p>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GENERALES */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Datos Generales
              </h3>
              <div>
                <Label className="text-xs font-semibold">
                  Nombre de la Institución *
                </Label>
                <Input
                  required
                  placeholder="Ej. U.E. San José"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Sostenimiento *
                    </Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "sostenimiento",
                            titulo: "Nuevo Sostenimiento",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    required
                    className="w-full h-10 border rounded-md px-3 text-sm"
                    value={formData.sostenimientoId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sostenimientoId: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.sostenimientos?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Jornada */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Jornada *</Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "jornada",
                            titulo: "Nueva Jornada",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    required
                    className="w-full h-10 border rounded-md px-3 text-sm"
                    value={formData.jornadaId}
                    onChange={(e) =>
                      setFormData({ ...formData, jornadaId: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.jornadas?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* GEOGRAFÍA EN CASCADA */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Ubicación Geográfica
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Provincia *</Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "provincia",
                            titulo: "Nueva Provincia",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    required
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={selectedProvincia}
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.provincias?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Cantón *</Label>
                    {esAdmin && selectedProvincia && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "canton",
                            titulo: "Nuevo Cantón",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    disabled={!selectedProvincia}
                    required
                    className="w-full h-10 border rounded-md px-2 text-xs disabled:bg-gray-100"
                    value={selectedCanton}
                    onChange={(e) => handleCantonChange(e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {cantonesDisponibles.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Parroquia *</Label>
                    {esAdmin && selectedCanton && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "parroquia",
                            titulo: "Nueva Parroquia",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    disabled={!selectedCanton}
                    required
                    className="w-full h-10 border rounded-md px-2 text-xs disabled:bg-gray-100"
                    value={formData.parroquiaId}
                    onChange={(e) =>
                      setFormData({ ...formData, parroquiaId: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {parroquiasDisponibles.map((parr: any) => (
                      <option key={parr.id} value={parr.id}>
                        {parr.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* DOCENTES */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Personal Docente
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">
                    Docentes Hombres
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.docentesHombres}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        docentesHombres: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Docentes Mujeres
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.docentesMujeres}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        docentesMujeres: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Total Calculado
                  </Label>
                  <Input
                    disabled
                    value={
                      (parseInt(formData.docentesHombres as string) || 0) +
                      (parseInt(formData.docentesMujeres as string) || 0)
                    }
                    className="bg-gray-100 font-bold text-primary"
                  />
                </div>
              </div>
            </div>

            {/* CATÁLOGOS DINÁMICOS */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Clasificación Educativa
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Nivel Educativo
                    </Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "nivel",
                            titulo: "Nuevo Nivel Educativo",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.nivelEducativoId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nivelEducativoId: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.niveles?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Área</Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "area",
                            titulo: "Nueva Área",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.areaId}
                    onChange={(e) =>
                      setFormData({ ...formData, areaId: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.areas?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Régimen Escolar
                    </Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "regimen",
                            titulo: "Nuevo Régimen",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.regimenId}
                    onChange={(e) =>
                      setFormData({ ...formData, regimenId: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.regimenes?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Modalidad</Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "modalidad",
                            titulo: "Nueva Modalidad",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.modalidadId}
                    onChange={(e) =>
                      setFormData({ ...formData, modalidadId: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.modalidades?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Jurisdicción (Bilingüe, Hispana) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Jurisdicción
                    </Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "jurisdiccion",
                            titulo: "Nueva Jurisdicción",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.jurisdiccionId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jurisdiccionId: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.jurisdicciones?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Acceso Edificio (Terrestre, Fluvial) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Acceso Edificio
                    </Label>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalCatalog({
                            open: true,
                            tipo: "acceso",
                            titulo: "Nuevo Acceso",
                          })
                        }
                        className="text-primary text-xs hover:underline font-bold"
                      >
                        + Crear
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full h-10 border rounded-md px-2 text-xs"
                    value={formData.accesoEdificioId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accesoEdificioId: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {catalogos?.accesos?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-6 pt-4 border-t flex gap-3">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full">
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white"
              >
                <Save size={16} className="mr-2" />
                {loading ? "Guardando..." : "Guardar Institución"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* MINI MODAL EXCLUSIVO PARA ADMINISTRADORES */}
      {esAdmin && (
        <Dialog
          open={modalCatalog.open}
          onOpenChange={(val) =>
            setModalCatalog({ ...modalCatalog, open: val })
          }
        >
          <DialogContent className="sm:max-w-md bg-white p-5 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">
                {modalCatalog.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-3 space-y-3">
              <Label className="text-xs font-semibold text-gray-700">
                Nombre del nuevo elemento
              </Label>
              <Input
                value={nuevoItemNombre}
                onChange={(e) => setNuevoItemNombre(e.target.value)}
                placeholder="Escribe el nombre..."
                className="h-10 text-sm"
              />
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setModalCatalog({ open: false, tipo: "", titulo: "" })
                }
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-primary text-white"
                disabled={savingCatalog}
                onClick={handleAgregarCatalogItem}
              >
                {savingCatalog ? "Guardando..." : "Guardar en Catálogo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
