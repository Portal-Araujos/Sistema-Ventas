"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Users, Trash2, CalendarCheck,Calendar, Navigation, DollarSign, FileText, CheckCircle2, AlertCircle, Pencil, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function FichaTecnicaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [inst, setInst] = useState<any>(null);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRol, setUserRol] = useState('vendedor');

  // PAGINACIÓN HISTORIAL (5)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 5000); 
  };
  const [editModal, setEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editProvincia, setEditProvincia] = useState('');
  const [editCanton, setEditCanton] = useState('');
  const [editCantones, setEditCantones] = useState<any[]>([]);
  const [editParroquias, setEditParroquias] = useState<any[]>([]);
  const cargarFicha = async () => {
    setLoading(true);
    try {
      const [resInst, resCat] = await Promise.all([
        fetch(`/api/instituciones/${resolvedParams.id}`),
        fetch('/api/catalogos')
      ]);
      const dataInst = await resInst.json();
      const dataCat = await resCat.json();
      if (dataCat.userRol) setUserRol(dataCat.userRol);
      setCatalogos(dataCat);
      setInst(dataInst);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargarFicha(); }, [resolvedParams.id]);
  const handleEliminar = async () => {
    if (!confirm(`¿Estás seguro de eliminar "${inst.nombre}"? Se perderá todo su historial.`)) return;
    try {
      const res = await fetch(`/api/instituciones/${resolvedParams.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      router.push('/instituciones');
    } catch (e) { showToast('error', "Error al eliminar institución."); }
  };
  // LOGICA PARA ABRIR Y GUARDAR EDICIÓN
  const handleOpenEdit = () => {
    setEditProvincia(inst.provinciaId?.toString() || '');
    setEditCanton(inst.cantonId?.toString() || '');
    const prov = catalogos?.provincias?.find((p: any) => p.id === inst.provinciaId);
    setEditCantones(prov ? prov.cantones : []);
    const cant = prov?.cantones?.find((c: any) => c.id === inst.cantonId);
    setEditParroquias(cant ? cant.parroquias : []);
    setEditFormData({
      id: inst.id, nombre: inst.nombre,
      parroquiaId: inst.parroquiaId || '', sostenimientoId: inst.sostenimientoId || '', jornadaId: inst.jornadaId || '',
      docentesHombres: inst.docentesHombres || 0, docentesMujeres: inst.docentesMujeres || 0,
      nivelEducativoId: inst.nivelEducativoId || '', areaId: inst.areaId || '', regimenId: inst.regimenId || '',
      jurisdiccionId: inst.jurisdiccionId || '', modalidadId: inst.modalidadId || '', accesoEdificioId: inst.accesoEdificioId || ''
    });
    setEditModal(true);
  };
  const handleProvinciaChangeEdit = (provId: string) => {
    setEditProvincia(provId); setEditCanton(''); setEditFormData({ ...editFormData, parroquiaId: '' });
    const prov = catalogos?.provincias?.find((p: any) => p.id === parseInt(provId));
    setEditCantones(prov ? prov.cantones : []); setEditParroquias([]);
  };
  const handleCantonChangeEdit = (cantonId: string) => {
    setEditCanton(cantonId); setEditFormData({ ...editFormData, parroquiaId: '' });
    const cant = editCantones.find((c: any) => c.id === parseInt(cantonId));
    setEditParroquias(cant ? cant.parroquias : []);
  };
  const handleGuardarEdicion = async () => {
    if (!editFormData.parroquiaId || !editFormData.sostenimientoId || !editFormData.jornadaId) {
      showToast('error', 'Provincia, Cantón, Parroquia, Sostenimiento y Jornada son obligatorios.'); return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/instituciones/${editFormData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFormData) });
      if (!res.ok) throw new Error();
      setEditModal(false);
      showToast('exito', 'Institución actualizada con éxito.');
      cargarFicha(); // Recargamos para ver los cambios instantáneamente
    } catch (e) { showToast('error', 'Error al guardar los cambios.'); } finally { setSavingEdit(false); }
  };
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
  if (loading) return <div className="p-12 text-center text-secondary font-medium">Cargando Ficha Técnica...</div>;
  if (!inst) return <div className="p-12 text-center text-primary font-bold text-subtitle">La institución no existe.</div>;
  const historial: any[] = [];
  if (inst.visitas) inst.visitas.forEach((v: any) => historial.push({ ...v, tipoHistorial: 'visita', fechaReal: new Date(v.createdAt) }));
  if (inst.ventas) inst.ventas.forEach((v: any) => historial.push({ ...v, tipoHistorial: 'venta', fechaReal: new Date(v.fechaVenta) }));
  historial.sort((a, b) => b.fechaReal.getTime() - a.fechaReal.getTime());
  const totalPages = Math.max(1, Math.ceil(historial.length / itemsPerPage));
  const paginatedHistorial = historial.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col gap-6 bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/agenda')} className="text-secondary hover:bg-gray-200 flex items-center gap-2">
          <ArrowLeft size={18} /> Volver a Lista
        </Button>
        {esAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenEdit} className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5 font-bold">
              <Pencil size={16} /> Editar Escuela
            </Button>
            <Button variant="outline" onClick={handleEliminar} className="text-primary border-primary/20 hover:bg-primary/5 flex items-center gap-1.5 font-bold">
              <Trash2 size={16} /> Eliminar
            </Button>
          </div>
        )}
      </div>
      <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-h1 mb-2">{inst.nombre}</h1> 
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge className="bg-foreground text-background text-xs px-3 py-1 font-semibold">{inst.tamano}</Badge>
            <Badge className="bg-primary/10 text-primary text-xs px-3 py-1 font-bold border border-primary/20">{inst.estadoComercial}</Badge>
          </div>
          <p className="text-normal text-secondary flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            {inst.parroquia?.canton?.provincia?.nombre} / {inst.parroquia?.canton?.nombre} / Parr. {inst.parroquia?.nombre}
          </p>
        </div>
        <div className="bg-muted p-5 rounded-xl border border-border min-w-260px">
          <span className="text-secondary text-[11px] font-bold block uppercase tracking-wider mb-2">Vendedor Responsable</span>
          {inst.vendedor ? (
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg">
                {inst.vendedor.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-card-title text-foreground">{inst.vendedor.nombre}</p>
                <p className="text-secondary text-xs">{inst.vendedor.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-normal font-bold text-amber-600 flex items-center gap-2"><AlertCircle size={16}/> Sin Asignar</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-card-title border-b border-border pb-3 flex items-center gap-2 mb-4">
              <Building2 className="text-primary" size={20} /> Datos de la Institución
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Sostenimiento</span><span className="text-normal font-semibold">{inst.sostenimiento?.nombre}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Jornada</span><span className="text-normal font-semibold">{inst.jornada?.nombre}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Nivel</span><span className="text-normal font-semibold">{inst.nivelEducativo?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Régimen</span><span className="text-normal font-semibold">{inst.regimen?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Modalidad</span><span className="text-normal font-semibold">{inst.modalidad?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-secondary">Área</span><span className="text-normal font-semibold">{inst.area?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Jurisdicción:</span><span className="font-semibold">{inst.jurisdiccion?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Modalidad:</span><span className="font-semibold">{inst.modalidad?.nombre || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Acceso Edificio:</span><span className="font-semibold">{inst.accesoEdificio?.nombre || 'N/A'}</span></div>
            </div>
          </div>
          {/* BLOQUE 3: AUDITORÍA */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <Calendar size={18} /> Auditoría del Registro
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-gray-500">Registrada por:</span>
              <span className="font-semibold">{inst.usuarioCreador?.nombre || 'Sistema'}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-gray-500">Fecha de creacion:</span>
              <span className="font-semibold">{new Date(inst.createdAt).toLocaleDateString('es-EC')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Visitas Realizadas:</span>
              <span className="font-bold text-emerald-600">{inst.visitas?.length || 0} visitas</span>
            </div>
          </div>
        </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-card-title border-b border-border pb-3 flex items-center gap-2 mb-4">
              <Users className="text-primary" size={20} /> Personal Docente
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider block">Hombres</span>
                <span className="text-subtitle font-bold text-blue-900">{inst.docentesHombres}</span>
              </div>
              <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                <span className="text-[11px] text-pink-600 font-bold uppercase tracking-wider block">Mujeres</span>
                <span className="text-subtitle font-bold text-pink-900">{inst.docentesMujeres}</span>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-xl text-center border border-border">
              <span className="text-secondary text-[11px] font-bold uppercase block tracking-wider">Total Oficial</span>
              <span className="text-h1 text-primary">{inst.totalDocentes}</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm h-full flex flex-col">
            <h2 className="text-subtitle mb-6 flex items-center gap-2 border-b border-border pb-4">
              <CalendarCheck className="text-primary" size={24} /> Historial de Relación Comercial
            </h2>
            {historial.length === 0 ? (
              <div className="text-center py-12 flex-1">
                <FileText size={48} className="mx-auto text-border mb-3" />
                <p className="text-normal font-bold text-foreground">Sin historial registrado</p>
                <p className="text-secondary mt-1">Aún no hay visitas ni ventas en esta escuela.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inst.visitas.map((visita: any) => (
                  <div key={visita.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white text-[10px]">{visita.tipoGestion}</Badge>
                        <span className="text-xs font-bold text-gray-700">{visita.estadoGestion}</span>
                        <span className="text-xs text-gray-400">• {new Date(visita.createdAt).toLocaleString('es-EC')}</span>
                      </div>
                      <div className="mt-2 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Observaciones y Acuerdos Alcanzados
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap overflow-wrap:anywhere leading-relaxed">
                          {visita.resumenAcuerdos || 'Sin observaciones detalladas.'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">Gestión realizada por: <strong>{visita.usuario?.nombre}</strong></p>
                    </div>
                    {visita.latitud && visita.longitud && (
                      <div className="shrink-0 flex items-center">
                        <a 
                          href={`https://maps.google.com/?q=${visita.latitud},${visita.longitud}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-100"
                        >
                          📍 Ver GPS en Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* CONTROLES DE PAGINACIÓN TIMELINE */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, historial.length)} de {historial.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">
                    <ChevronLeft size={14} className="mr-1" /> Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">
                    Siguiente <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* SÚPER MODAL DE EDICIÓN EN LA FICHA */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-2xl bg-card p-6 rounded-xl overflow-y-auto max-h-[85vh]">
          <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">Editar Institución Completa</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div><Label className="text-xs font-semibold">Nombre de la Institución *</Label><Input value={editFormData.nombre || ''} onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/50 p-3 rounded-lg border border-border">
              <div><Label className="text-xs font-semibold">Provincia *</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editProvincia} onChange={e => handleProvinciaChangeEdit(e.target.value)}><option value="">Seleccione...</option>{catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div><Label className="text-xs font-semibold">Cantón *</Label><select disabled={!editProvincia} className="w-full h-9 border rounded-md px-2 text-xs bg-white disabled:bg-gray-100" value={editCanton} onChange={e => handleCantonChangeEdit(e.target.value)}><option value="">Seleccione...</option>{editCantones.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div><Label className="text-xs font-semibold">Parroquia *</Label><select disabled={!editCanton} className="w-full h-9 border rounded-md px-2 text-xs bg-white disabled:bg-gray-100" value={editFormData.parroquiaId} onChange={e => setEditFormData({ ...editFormData, parroquiaId: e.target.value })}><option value="">Seleccione...</option>{editParroquias.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold">Sostenimiento *</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.sostenimientoId || ''} onChange={e => setEditFormData({ ...editFormData, sostenimientoId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.sostenimientos?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
              <div className="col-span-2"><Label className="text-xs font-semibold">Jornada *</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.jornadaId || ''} onChange={e => setEditFormData({ ...editFormData, jornadaId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.jornadas?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select></div>
              <div><Label className="text-xs font-semibold">Docentes (H)</Label><Input type="number" className="h-9 text-xs" min="0" value={editFormData.docentesHombres || 0} onChange={e => setEditFormData({ ...editFormData, docentesHombres: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs font-semibold">Docentes (M)</Label><Input type="number" className="h-9 text-xs" min="0" value={editFormData.docentesMujeres || 0} onChange={e => setEditFormData({ ...editFormData, docentesMujeres: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold">Nivel Educativo</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.nivelEducativoId || ''} onChange={e => setEditFormData({ ...editFormData, nivelEducativoId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.niveles?.map((n: any) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold">Régimen</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.regimenId || ''} onChange={e => setEditFormData({ ...editFormData, regimenId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.regimenes?.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
              <div className="col-span-2"><Label className="text-xs font-semibold">Área Educativa</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.areaId || ''} onChange={e => setEditFormData({ ...editFormData, areaId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.areas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
              <div className="col-span-2"><Label className="text-xs font-semibold">Jurisdicción</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.jurisdiccionId || ''} onChange={e => setEditFormData({ ...editFormData, jurisdiccionId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.jurisdicciones?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select></div>
              <div className="col-span-2"><Label className="text-xs font-semibold">Modalidad</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.modalidadId || ''} onChange={e => setEditFormData({ ...editFormData, modalidadId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.modalidades?.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
              <div className="col-span-4"><Label className="text-xs font-semibold">Acceso al Edificio</Label><select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={editFormData.accesoEdificioId || ''} onChange={e => setEditFormData({ ...editFormData, accesoEdificioId: e.target.value })}><option value="">Seleccione...</option>{catalogos?.accesos?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={savingEdit} onClick={handleGuardarEdicion}><Save size={14} className="mr-1" />{savingEdit ? 'Guardando...' : 'Guardar Todos los Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* TOAST GLOBAL */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} className="text-emerald-100" /> : <AlertCircle size={20} className="text-white/90" />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </div>
  );
}