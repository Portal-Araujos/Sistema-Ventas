"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Map, BookOpen, Layers, Edit2, Sliders, CheckCircle2, AlertCircle, Plus, Navigation, Power, PowerOff } from 'lucide-react';
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
  { id: 'estadoComercial', icon: <Layers size={18} />, label: 'Estados Com.(Visitas)' },
  { id: 'estadoCliente', icon: <Layers size={18} />, label: 'Estados de Cli. (Ventas)' },
  { id: 'estadoContrato', icon: <Layers size={18} />, label: 'Estados de Contrato' },
  { id: 'tipoCobro', icon: <BookOpen size={18} />, label: 'Tipos de Cobro' },
  { id: 'tipoGestion', icon: <Navigation size={18} />, label: 'Tipos de Gestión' },
  { id: 'estadoOperacion', icon: <Settings size={18} />, label: 'Estados de Operación' },
  { id: 'estadoProduccion', icon: <Settings size={18} />, label: 'Estados de Producción' },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('reglaTamano');
  const [catalogos, setCatalogos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, id: 0, nombre: '', tipo: '' });
  const [tamanoModal, setTamanoModal] = useState({ open: false, id: 0, nombre: '', minDocentes: 0, maxDocentes: 9999 });
  const [createModal, setCreateModal] = useState({ open: false, nombre: '', provinciaId: '', cantonId: '' });
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => { setToastMsg({ tipo, texto }); setTimeout(() => setToastMsg(null), 5000); };
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogos');
      const data = await res.json();
      setCatalogos(data);
    } catch (error) { showToast('error', 'Error de conexión al cargar los catálogos.'); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

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
      case 'estadoComercial': return catalogos.estadosComerciales || [];
      case 'estadoCliente': return catalogos.estadosCliente || [];
      case 'estadoContrato': return catalogos.estadosContrato || [];
      case 'tipoCobro': return catalogos.tiposCobro || [];
      case 'tipoGestion': return catalogos.tiposGestion || [];
      case 'estadoOperacion': return catalogos.estadosOperacion || [];
      case 'estadoProduccion': return catalogos.estadosProduccion || [];
      default: return [];
    }
  };

  const handleCreateSave = async () => {
    if (!createModal.nombre.trim()) { showToast('alerta', 'El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const body: any = { tipo: activeTab, nombre: createModal.nombre };
      if (activeTab === 'canton') body.provinciaId = createModal.provinciaId;
      if (activeTab === 'parroquia') body.cantonId = createModal.cantonId;

      const res = await fetch('/api/catalogos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Error al crear');
      setCreateModal({ open: false, nombre: '', provinciaId: '', cantonId: '' });
      showToast('exito', 'Registro creado exitosamente.');
      await cargarDatos();
    } catch (error) { showToast('error', 'Hubo un error al crear el registro.'); } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/catalogos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editModal.id, tipo: editModal.tipo, nombre: editModal.nombre }) });
      if (!res.ok) throw new Error('Error al actualizar');
      setEditModal({ open: false, id: 0, nombre: '', tipo: '' });
      showToast('exito', 'Registro actualizado correctamente.');
      await cargarDatos();
    } catch (error) { showToast('error', 'Hubo un error al guardar los cambios.'); } finally { setSaving(false); }
  };

  const handleTamanoSave = async () => {
    const minNuevo = tamanoModal.minDocentes; const maxNuevo = tamanoModal.maxDocentes;
    if (minNuevo > maxNuevo) { showToast('alerta', 'El valor mínimo no puede ser mayor al máximo.'); return; }
    if (!tamanoModal.nombre.trim()) { showToast('alerta', 'El nombre no puede estar vacío.'); return; }
    const reglasActuales = catalogos.reglasTamano.filter((r: any) => r.id !== tamanoModal.id);
    const hayChoque = reglasActuales.some((regla: any) => (minNuevo <= regla.maxDocentes && maxNuevo >= regla.minDocentes));

    if (hayChoque) { showToast('error', '¡Choque de Rangos! Revisa que los números no se crucen.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/catalogos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tamanoModal.id, tipo: 'reglaTamano', nombre: tamanoModal.nombre, minDocentes: minNuevo, maxDocentes: maxNuevo }) });
      if (!res.ok) throw new Error('Error al actualizar regla');
      setTamanoModal({ open: false, id: 0, nombre: '', minDocentes: 0, maxDocentes: 9999 });
      await cargarDatos();
      showToast('exito', `Rango guardado. Escuelas reclasificadas a "${tamanoModal.nombre}" automáticamente.`);
    } catch (error: any) { showToast('error', 'Error al actualizar regla de tamaño.'); } finally { setSaving(false); }
  };

  const handleToggleActivo = async (item: any) => {
    setSaving(true);
    try {
      await fetch('/api/catalogos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, tipo: activeTab, activo: !item.activo })
      });
      await cargarDatos();
      showToast('exito', !item.activo ? 'Registro Reactivado.' : 'Registro Apagado (Soft Delete).');
    } catch (e) {
      showToast('error', 'Error al cambiar estado.');
    } finally {
      setSaving(false);
    }
  };

  const listaActual = getListaActual();

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-background">
      <div>
        <h1 className="text-h1 tracking-tight flex items-center gap-2">
          <Settings className="text-primary" /> Configuración del Sistema
        </h1>
        <p className="text-secondary mt-1">Administra las tablas maestras y catálogos dinámicos.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/80 border-b border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parámetros</h3>
            </div>
            <div className="p-2 flex flex-col gap-1 overflow-y-auto max-h-[70vh]">
              {MENU_OPCIONES.map((opcion) => (
                <button
                  key={opcion.id}
                  onClick={() => setActiveTab(opcion.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === opcion.id ? 'bg-primary text-white shadow-sm' : 'text-foreground hover:bg-muted'
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
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            
            <div className="p-4 md:p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground capitalize">
                {activeTab === 'reglaTamano' ? 'Clasificación por N° Docentes' : `Catálogo: ${MENU_OPCIONES.find(o => o.id === activeTab)?.label}`}
              </h2>
              {activeTab !== 'reglaTamano' && (
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold h-9 text-xs" onClick={() => setCreateModal({ open: true, nombre: '', provinciaId: '', cantonId: '' })}>
                  <Plus size={16} className="mr-1" /> Nuevo Registro
                </Button>
              )}
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-12 text-center text-secondary">Cargando datos...</div>
              ) : activeTab === 'reglaTamano' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Clasificación</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase text-center">Docentes Mín.</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase text-center">Docentes Máx.</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {listaActual.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 text-sm font-bold text-foreground">{item.nombre}</td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-blue-600">{item.minDocentes}</td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-emerald-600">{item.maxDocentes >= 9999 ? 'En adelante' : item.maxDocentes}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="outline" size="sm" className="h-8 border-border text-blue-600 hover:bg-blue-50" onClick={() => setTamanoModal({ open: true, id: item.id, nombre: item.nombre, minDocentes: item.minDocentes, maxDocentes: item.maxDocentes })}>
                            <Edit2 size={14} className="mr-1" /> Configurar Rango
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">ID</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Nombre</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase text-right">Acciones (Soft Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {listaActual.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-6 text-secondary">No hay registros creados.</td></tr>
                    )}
                    {listaActual.map((item: any) => (
                      <tr key={item.id} className={`hover:bg-muted/30 ${!item.activo ? 'opacity-60 bg-gray-50' : ''}`}>
                        <td className="px-6 py-4 text-sm text-secondary font-medium">#{item.id}</td>
                        <td className="px-6 py-4 text-sm text-foreground font-semibold">
                          {item.nombre}
                          {!item.activo && (<span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Apagado</span>)}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 border-border text-blue-600 hover:bg-blue-50" onClick={() => setEditModal({ open: true, id: item.id, nombre: item.nombre, tipo: activeTab })}>
                            <Edit2 size={14} className="mr-1" /> Editar
                          </Button>
                          <Button 
                            variant="outline" size="sm" 
                            className={`h-8 border-border hover:bg-gray-100 ${!item.activo ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-600 hover:text-red-700'}`}
                            onClick={() => handleToggleActivo(item)}
                            disabled={saving}
                          >
                            {!item.activo ? <Power size={14} className="mr-1" /> : <PowerOff size={14} className="mr-1" />}
                            {!item.activo ? 'Activar' : 'Apagar'}
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
      <Dialog open={createModal.open} onOpenChange={(val) => setCreateModal({ ...createModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl border-t-4 border-t-primary">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Crear Nuevo Registro</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-4">
            {activeTab === 'canton' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Provincia a la que pertenece</Label>
                <select className="w-full h-11 border rounded-md px-3 text-sm bg-white" value={createModal.provinciaId} onChange={e => setCreateModal({...createModal, provinciaId: e.target.value})}>
                  <option value="">Seleccione provincia...</option>
                  {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}
            {activeTab === 'parroquia' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Cantón al que pertenece</Label>
                <select className="w-full h-11 border rounded-md px-3 text-sm bg-white" value={createModal.cantonId} onChange={e => setCreateModal({...createModal, cantonId: e.target.value})}>
                  <option value="">Seleccione cantón...</option>
                  {catalogos?.provincias?.flatMap((p: any) => p.cantones).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Nombre de la nueva opción</Label>
              <Input placeholder="Ej. Visita por Zoom" value={createModal.nombre} onChange={e => setCreateModal({...createModal, nombre: e.target.value})} className="h-11" />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCreateModal({ ...createModal, open: false })}>Cancelar</Button>
            <Button className="bg-primary text-white font-bold" disabled={saving || !createModal.nombre} onClick={handleCreateSave}>{saving ? 'Creando...' : 'Crear Registro'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editModal.open} onOpenChange={(val) => setEditModal({ ...editModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Editar Registro</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Nombre</Label>
              <Input value={editModal.nombre} onChange={e => setEditModal({...editModal, nombre: e.target.value})} className="h-11" />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditModal({ ...editModal, open: false })}>Cancelar</Button>
            <Button className="bg-primary text-white font-bold" disabled={saving || !editModal.nombre} onClick={handleEditSave}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={tamanoModal.open} onOpenChange={(val) => setTamanoModal({ ...tamanoModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Configurar Rango</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Nombre de la Clasificación *</Label>
              <Input value={tamanoModal.nombre} onChange={e => setTamanoModal({...tamanoModal, nombre: e.target.value})} className="h-11 font-bold" />
            </div>
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
            <Button className="bg-primary text-white font-bold" disabled={saving} onClick={handleTamanoSave}>{saving ? 'Procesando...' : 'Guardar y Recalcular'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-[#34c759] text-white' : toastMsg.tipo === 'alerta' ? 'bg-[#ff9500] text-white' : 'bg-[#ff3b30] text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </div>
  );
}