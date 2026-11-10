"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Edit3,
  ShieldAlert,
  Check,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { PERMISSION_MODULES as MODULOS_PERMISOS } from "@/lib/permissions";
import { usePermissions, Allowed } from "@/components/shared/PermissionsProvider";

export default function RolesPage() {
  const { can } = usePermissions();
  const [error, setError] = useState("");
  const [moduloActivo, setModuloActivo] = useState(MODULOS_PERMISOS[0].modulo);
  const [buscarPermiso, setBuscarPermiso] = useState("");
  const modulo = MODULOS_PERMISOS.find(m => m.modulo === moduloActivo) || MODULOS_PERMISOS[0];
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formRol, setFormRol] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    permisos: [] as string[],
  });

  const cargarRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los roles");
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la operación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRoles();
  }, []);

  const handleCheckboxChange = (permisoId: string) => {
    setFormRol((prev) => {
      const tienePermiso = prev.permisos.includes(permisoId);
      if (tienePermiso) {
        return {
          ...prev,
          permisos: prev.permisos.filter((p) => p !== permisoId),
        };
      } else {
        const modulo = MODULOS_PERMISOS.find(m => m.permisos.some(p => p.id === permisoId));
        const consulta = modulo?.permisos.find(p => p.id.endsWith(":ver"))?.id;
        return { ...prev, permisos: [...new Set([...prev.permisos, ...(consulta ? [consulta] : []), permisoId])] };
      }
    });
  };

  const handleGuardarRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = formRol.id ? "PUT" : "POST";
      const res = await fetch("/api/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formRol),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron guardar los permisos");
      setError(""); setModalOpen(false);
      cargarRoles();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la operación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Gestión de Roles y Permisos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Controla exactamente qué puede ver y hacer cada perfil en el
            sistema.
          </p>
        </div>
        <Allowed permission="roles:crear">        <Button
          onClick={() => {
            setFormRol({ id: "", nombre: "", descripcion: "", permisos: [] });
            setModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white font-bold"
        >
          <Plus size={18} className="mr-1" /> Nuevo Rol
        </Button></Allowed>
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">
                Rol del Sistema
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">
                Usuarios Asignados
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                Permisos Activos
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Cargando roles...
                </TableCell>
              </TableRow>
            ) : (
              roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-sm uppercase">
                      {r.nombre.replace("_", " ")}
                    </div>
                    <div className="text-xs text-gray-500">{r.descripcion}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {r.usuariosCount} Usuarios
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {r.nombre === "super_admin" ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        Acceso Total e Irrestricto
                      </Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.permisos.slice(0, 4).map((p: string) => (
                          <span
                            key={p}
                            className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100"
                          >
                            {p}
                          </span>
                        ))}
                        {r.permisos.length > 4 && (
                          <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            +{r.permisos.length - 4} más
                          </span>
                        )}
                        {r.permisos.length === 0 && (
                          <span className="text-[10px] text-red-500 italic font-bold">
                            Sin accesos
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.nombre !== "super_admin" && can("roles:editar") ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormRol({
                            id: r.id,
                            nombre: r.nombre,
                            descripcion: r.descripcion,
                            permisos: r.permisos,
                          });
                          setModalOpen(true);
                        }}
                        className="text-primary h-8 border-primary/20 hover:bg-primary/5"
                      >
                        <Edit3 size={14} className="mr-1" /> Editar Permisos
                      </Button>
                    ) : (
                      <div
                        title="Rol de sistema protegido"
                        className="flex justify-center"
                      >
                        <ShieldAlert size={18} className="text-gray-300" />{" "}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DE EDICIÓN DE MATRIZ DE PERMISOS */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto border-t-4 border-t-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-primary" />{" "}
              {formRol.id
                ? `Editar Permisos: ${formRol.nombre}`
                : "Crear Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarRol} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase">
                  Nombre del Rol (Ej: Bodeguero)
                </Label>
                <Input
                  required
                  disabled={!!formRol.id}
                  value={formRol.nombre}
                  onChange={(e) =>
                    setFormRol({ ...formRol, nombre: e.target.value })
                  }
                  className="mt-1 bg-white"
                  placeholder="Ej: logistica"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase">
                  Breve Descripción
                </Label>
                <Input
                  required
                  value={formRol.descripcion}
                  onChange={(e) =>
                    setFormRol({ ...formRol, descripcion: e.target.value })
                  }
                  className="mt-1 bg-white"
                  placeholder="Encargado de empacar y despachar"
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <Input value={buscarPermiso} onChange={e => setBuscarPermiso(e.target.value)} placeholder="Buscar permiso o módulo…" aria-label="Buscar permisos" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[210px_1fr]">
                <div className="max-h-36 overflow-y-auto rounded-lg border bg-gray-50 p-2 md:max-h-80">
                  {MODULOS_PERMISOS.filter(m => !buscarPermiso || `${m.modulo} ${m.permisos.map(p => p.label).join(" ")}`.toLowerCase().includes(buscarPermiso.toLowerCase())).map(m => <button key={m.modulo} type="button" onClick={() => setModuloActivo(m.modulo)} className={`mb-1 flex w-full items-center justify-between rounded p-2 text-left text-xs ${moduloActivo === m.modulo ? "bg-blue-100 font-bold text-blue-800" : "hover:bg-gray-100"}`}><span>{m.modulo}</span><span>{m.permisos.filter(p => formRol.permisos.includes(p.id)).length}/{m.permisos.length}</span></button>)}
                </div>
                <div className="min-h-48 max-h-80 overflow-y-auto rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold">{modulo.modulo}</h3><button type="button" className="text-xs text-blue-700" onClick={() => setFormRol(prev => { const ids = modulo.permisos.map(p => p.id); const todos = ids.every(id => prev.permisos.includes(id)); return { ...prev, permisos: todos ? prev.permisos.filter(p => !ids.includes(p)) : [...new Set([...prev.permisos, ...ids])] }; })}>Seleccionar / quitar todos</button></div>
                  {modulo.permisos.filter(p => !buscarPermiso || `${modulo.modulo} ${p.label} ${p.id}`.toLowerCase().includes(buscarPermiso.toLowerCase())).map(p => <label key={p.id} className="mb-2 flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-gray-50"><input type="checkbox" checked={formRol.permisos.includes(p.id)} onChange={() => handleCheckboxChange(p.id)} className="mt-1" /><span>{p.label}</span></label>)}
                </div>
              </div>
              <p className="text-xs text-gray-500">{formRol.permisos.length} permisos seleccionados. Para usar un módulo, asigna también su permiso de consulta.</p>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-3 mt-3 border-t border-gray-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-sm"
              >
                {saving ? "Guardando..." : "Guardar Matriz de Rol"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
