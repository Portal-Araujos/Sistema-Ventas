"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit3, ShieldAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// MATRIZ DEFINITIVA DE PERMISOS DEL SISTEMA
const MODULOS_PERMISOS = [
  { modulo: 'Panel de Inicio', permisos: [{ id: 'inicio:ver', label: 'Ver Panel de Métricas Generales' }] },
  { modulo: 'Instituciones', permisos: [
    { id: 'instituciones:ver', label: 'Ver Base de Instituciones' },
    { id: 'instituciones:crear', label: 'Registrar Nuevas Instituciones' },
    { id: 'instituciones:editar', label: 'Editar Datos de Instituciones' }
  ]},
  { modulo: 'Ventas y Facturación', permisos: [
    { id: 'ventas:ver', label: 'Ver Historial de Ventas' },
    { id: 'ventas:crear', label: 'Registrar Nuevos Contratos' },
    { id: 'ventas:validar', label: 'Auditar / Llenar Campos de Facturación' }
  ]},
  { modulo: 'Agenda de Campo', permisos: [{ id: 'agenda:ver', label: 'Ver Agenda y Registrar Visitas' }] },
  { modulo: 'Auditoría', permisos: [{ id: 'visitas:ver', label: 'Auditoría de Visitas y GPS' }]},
  { modulo: 'Reportes e Indicadores', permisos: [
    { id: 'indicadores:ver', label: 'Ver Indicadores y Cierre Semanal' },
    { id: 'indicadores:metas', label: 'Definir Metas Semanales' }
  ]},
  { modulo: 'Administración', permisos: [
    { id: 'usuarios:gestionar', label: 'Crear y Administrar Usuarios' },
    { id: 'configuracion:ver', label: 'Gestionar Catálogos del Sistema' }
  ]}
];
export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formRol, setFormRol] = useState({ id: '', nombre: '', descripcion: '', permisos: [] as string[] });
  const cargarRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      setRoles(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => { cargarRoles(); }, []);
  const handleCheckboxChange = (permisoId: string) => {
    setFormRol(prev => {
      const tienePermiso = prev.permisos.includes(permisoId);
      if (tienePermiso) {
        return { ...prev, permisos: prev.permisos.filter(p => p !== permisoId) };
      } else {
        return { ...prev, permisos: [...prev.permisos, permisoId] };
      }
    });
  };
  const handleGuardarRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = formRol.id ? 'PUT' : 'POST';
      await fetch('/api/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formRol) });
      setModalOpen(false);
      cargarDatos();
    } catch (e) {} finally { setSaving(false); }
  };
  const cargarDatos = () => { cargarRoles(); };
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6  min-h-screen">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Gestión de Roles y Permisos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Controla exactamente qué puede ver y hacer cada perfil en el sistema.</p>
        </div>
        <Button onClick={() => { setFormRol({ id: '', nombre: '', descripcion: '', permisos: [] }); setModalOpen(true); }} className="bg-primary text-white">
          <Plus size={18} className="mr-1" /> Nuevo Rol
        </Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Rol del Sistema</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Usuarios Asignados</TableHead>
              <TableHead className="font-semibold text-gray-700">Permisos Activos</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando roles...</TableCell></TableRow> : 
              roles.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-sm uppercase">{r.nombre.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">{r.descripcion}</div>
                  </TableCell>
                  <TableCell className="text-center"><Badge variant="secondary" className="font-bold">{r.usuariosCount} Usuarios</Badge></TableCell>
                  <TableCell className="max-w-md">
                    {r.nombre === 'super_admin' ? (
                      <Badge className="bg-purple-100 text-purple-800">Acceso Total e Irrestricto</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.permisos.slice(0, 4).map((p: string) => <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{p}</span>)}
                        {r.permisos.length > 4 && <span className="text-[10px] text-gray-500 font-bold">+{r.permisos.length - 4} más...</span>}
                        {r.permisos.length === 0 && <span className="text-[10px] text-red-500 italic">Sin accesos</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.nombre !== 'super_admin' ? (
                      <Button variant="outline" size="sm" onClick={() => { setFormRol({ id: r.id, nombre: r.nombre, descripcion: r.descripcion, permisos: r.permisos }); setModalOpen(true); }} className="text-primary h-8">
                        <Edit3 size={14} className="mr-1" /> Editar Permisos
                      </Button>
                    ) : (<div title="Rol de sistema protegido" className="flex justify-center"><ShieldAlert size={18} className="text-gray-300" /> </div>)}
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-primary" /> {formRol.id ? `Editar Permisos: ${formRol.nombre}` : 'Crear Nuevo Rol'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarRol} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Nombre del Rol (Ej: Facturación)</Label>
                <Input required disabled={!!formRol.id} value={formRol.nombre} onChange={e => setFormRol({ ...formRol, nombre: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Breve Descripción</Label>
                <Input required value={formRol.descripcion} onChange={e => setFormRol({ ...formRol, descripcion: e.target.value })} />
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Matriz de Acceso a Módulos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULOS_PERMISOS.map((mod) => (
                  <div key={mod.modulo} className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                    <h4 className="text-xs font-bold text-primary uppercase mb-2 border-b pb-1">{mod.modulo}</h4>
                    <div className="space-y-2">
                      {mod.permisos.map((permiso) => {
                        const isChecked = formRol.permisos.includes(permiso.id);
                        return (
                          <label key={permiso.id} className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                              {isChecked && <Check size={12} className="text-white" />}
                            </div>
                            <span className={`text-xs ${isChecked ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{permiso.label}</span>
                            <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleCheckboxChange(permiso.id)} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-4"><Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-primary text-white">Guardar Rol</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}