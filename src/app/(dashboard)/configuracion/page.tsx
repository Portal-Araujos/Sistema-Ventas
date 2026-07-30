"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Map, BookOpen, Layers, Edit2, Trash2, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const MENU_OPCIONES = [
  { id: 'reglaTamano', icon: <Sliders size={18} />, label: 'Rangos de Tamaño' },
  { id: 'sostenimiento', icon: <Layers size={18} />, label: 'Sostenimiento' },
  { id: 'jornada', icon: <Layers size={18} />, label: 'Jornada' },
  { id: 'provincia', icon: <Map size={18} />, label: 'Provincias' },
  { id: 'canton', icon: <Map size={18} />, label: 'Cantones' },
  { id: 'parroquia', icon: <Map size={18} />, label: 'Parroquias' },
  { id: 'nivel', icon: <BookOpen size={18} />, label: 'Niveles Educativos' },
  { id: 'area', icon: <Layers size={18} />, label: 'Áreas' },
  { id: 'regimen', icon: <Layers size={18} />, label: 'Régimen Escolar' },
  { id: 'jurisdiccion', icon: <Layers size={18} />, label: 'Jurisdicción' },
  { id: 'modalidad', icon: <BookOpen size={18} />, label: 'Modalidad' },
  { id: 'acceso', icon: <Map size={18} />, label: 'Acceso Edificio' },
];
export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('reglaTamano');
  const [catalogos, setCatalogos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, id: 0, nombre: '', tipo: '' });
  const [tamanoModal, setTamanoModal] = useState({ open: false, id: 0, nombre: '', minDocentes: 0, maxDocentes: 9999 });
  const [saving, setSaving] = useState(false);
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogos');
      const data = await res.json();
      setCatalogos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    cargarDatos();
  }, []);
  const getListaActual = () => {
    if (!catalogos) return [];
    switch (activeTab) {
      case 'reglaTamano': return catalogos.reglasTamano || [];
      case 'sostenimiento': return catalogos.sostenimientos || [];
      case 'jornada': return catalogos.jornadas || [];
      case 'provincia': return catalogos.provincias || [];
      case 'canton': return catalogos.provincias?.flatMap((p: any) => p.cantones) || [];
      case 'parroquia': return catalogos.provincias?.flatMap((p: any) => p.cantones.flatMap((c: any) => c.parroquias)) || [];
      case 'nivel': return catalogos.niveles || [];
      case 'area': return catalogos.areas || [];
      case 'regimen': return catalogos.regimenes || [];
      case 'jurisdiccion': return catalogos.jurisdicciones || [];
      case 'modalidad': return catalogos.modalidades || [];
      case 'acceso': return catalogos.accesos || [];
      default: return [];
    }
  };
  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/catalogos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editModal.id, tipo: editModal.tipo, nombre: editModal.nombre })
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setEditModal({ open: false, id: 0, nombre: '', tipo: '' });
      await cargarDatos();
    } catch (error) {
      alert("Hubo un error al actualizar.");
    } finally {
      setSaving(false);
    }
  };
  const handleTamanoSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/catalogos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tamanoModal.id,
          tipo: 'reglaTamano',
          minDocentes: tamanoModal.minDocentes,
          maxDocentes: tamanoModal.maxDocentes
        })
      });
      if (!res.ok) throw new Error('Error al actualizar regla');
      setTamanoModal({ open: false, id: 0, nombre: '', minDocentes: 0, maxDocentes: 9999 });
      await cargarDatos();
    } catch (error) {
      alert("Error al actualizar la regla de tamaño.");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/catalogos?id=${id}&tipo=${activeTab}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al eliminar");
        return;
      }
      await cargarDatos();
    } catch (error) {
      alert("Error de conexión al eliminar.");
    }
  };
  const listaActual = getListaActual();
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="text-primary" /> Configuración del Sistema
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra las tablas maestras, catálogos y parámetros de clasificación del sistema.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50/80 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parámetros</h3>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {MENU_OPCIONES.map((opcion) => (
                <button
                  key={opcion.id}
                  onClick={() => setActiveTab(opcion.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === opcion.id ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opcion.icon}
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900 capitalize">
                {activeTab === 'reglaTamano' ? 'Clasificación de Tamaño por N° Docentes' : `Gestión de ${MENU_OPCIONES.find(o => o.id === activeTab)?.label}`}
              </h2>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="p-12 text-center text-gray-500">Cargando datos...</div>
              ) : activeTab === 'reglaTamano' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Clasificación</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Docentes Mínimos</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Docentes Máximos</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listaActual.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.nombre}</td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-blue-600">{item.minDocentes}</td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-emerald-600">{item.maxDocentes >= 9999 ? 'En adelante' : item.maxDocentes}</td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-gray-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => setTamanoModal({ open: true, id: item.id, nombre: item.nombre, minDocentes: item.minDocentes, maxDocentes: item.maxDocentes })}
                          >
                            <Edit2 size={14} className="mr-1" /> Configurar Rango
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* TABLA ESTÁNDAR DE CATÁLOGOS */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listaActual.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">#{item.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{item.nombre}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-gray-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditModal({ open: true, id: item.id, nombre: item.nombre, tipo: activeTab })}
                          >
                            <Edit2 size={14} className="mr-1" /> Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-gray-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(item.id, item.nombre)}
                          >
                            <Trash2 size={14} className="mr-1" /> Borrar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* MODAL EDITAR CATÁLOGO REGULAR */}
      <Dialog open={editModal.open} onOpenChange={(val) => setEditModal({ ...editModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Editar Registro</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Nombre</Label>
              <Input value={editModal.nombre} onChange={e => setEditModal({...editModal, nombre: e.target.value})} className="h-11" />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditModal({ ...editModal, open: false })}>Cancelar</Button>
            <Button className="bg-primary text-white" disabled={saving || !editModal.nombre} onClick={handleEditSave}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL CONFIGURAR RANGO DE TAMAÑO */}
      <Dialog open={tamanoModal.open} onOpenChange={(val) => setTamanoModal({ ...tamanoModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Configurar Rango: {tamanoModal.nombre}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Mínimo Docentes</Label>
                <Input type="number" min="0" value={tamanoModal.minDocentes} onChange={e => setTamanoModal({...tamanoModal, minDocentes: parseInt(e.target.value) || 0})} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Máximo Docentes</Label>
                <Input type="number" min="0" value={tamanoModal.maxDocentes} onChange={e => setTamanoModal({...tamanoModal, maxDocentes: parseInt(e.target.value) || 0})} className="h-11" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setTamanoModal({ ...tamanoModal, open: false })}>Cancelar</Button>
            <Button className="bg-primary text-white" disabled={saving} onClick={handleTamanoSave}>
              {saving ? 'Guardando...' : 'Guardar Rango'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}