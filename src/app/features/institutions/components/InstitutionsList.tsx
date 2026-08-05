"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Eye, Pencil, UserCheck, Save, Upload, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FiltrosAvanzadosState } from './InstitutionsFilters';

interface Props {
  filtros: FiltrosAvanzadosState;
  userRol: string;
  onRefreshNeeded: () => void;
}

export function InstitutionsList({ filtros, userRol, onRefreshNeeded }: Props) {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // PAGINACIÓN TABLA (15)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 5000); 
  };

  const [assignModal, setAssignModal] = useState<{ open: boolean; instId: string; instNombre: string; vendedorIdActual: string }>({ open: false, instId: '', instNombre: '', vendedorIdActual: '' });
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // EDICIÓN FULL CAMPOS
  const [editModal, setEditModal] = useState<{ open: boolean; inst: any }>({ open: false, inst: null });
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Estados para Cascada de Edición
  const [editProvincia, setEditProvincia] = useState('');
  const [editCanton, setEditCanton] = useState('');
  const [editCantones, setEditCantones] = useState<any[]>([]);
  const [editParroquias, setEditParroquias] = useState<any[]>([]);

  // IMPORTACIÓN EXCEL
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    nombre: '', provincia: '', canton: '', parroquia: '', sostenimiento: '', jornada: '', docentesHombres: '', docentesMujeres: '', totalDocentes: '', nivelEducativo: '', area: '', regimen: '', jurisdiccion: '', modalidad: '', accesoEdificio: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [importProgress, setImportProgress] = useState({ actual: 0, total: 0 });
  const [duplicateModal, setDuplicateModal] = useState({ open: false, duplicadosCount: 0, nuevosCount: 0 });

  const fetchInstituciones = async () => {
    try {
      const [resInst, resVend, resCat] = await Promise.all([ fetch('/api/instituciones'), fetch('/api/usuarios/vendedores'), fetch('/api/catalogos') ]);
      setInstitutions(await resInst.json());
      setVendedores(await resVend.json());
      setCatalogos(await resCat.json());
    } catch (error) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchInstituciones(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filtros]);

  const filteredInstitutions = institutions.filter((inst) => {
    if (filtros.search && !inst.nombre.toLowerCase().includes(filtros.search.toLowerCase())) return false;
    if (filtros.provinciaId && inst.provinciaId !== parseInt(filtros.provinciaId)) return false;
    if (filtros.cantonId && inst.cantonId !== parseInt(filtros.cantonId)) return false;
    if (filtros.parroquiaId && inst.parroquiaId !== parseInt(filtros.parroquiaId)) return false;
    if (filtros.tamano && inst.tamano !== filtros.tamano) return false;
    if (filtros.estado && inst.estado !== filtros.estado) return false;
    if (filtros.sostenimientoId && inst.sostenimientoId !== parseInt(filtros.sostenimientoId)) return false;
    if (filtros.vendedorId) {
      if (filtros.vendedorId === 'sin_asignar' && inst.vendedorId !== null) return false;
      if (filtros.vendedorId !== 'sin_asignar' && inst.vendedorId !== filtros.vendedorId) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / itemsPerPage));
  const currentInstitutions = filteredInstitutions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleGuardarAsignacion = async () => {
    setSavingAssign(true);
    try {
      const res = await fetch('/api/instituciones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institucionId: assignModal.instId, vendedorId: selectedVendedor }) });
      if (!res.ok) throw new Error();
      setAssignModal({ open: false, instId: '', instNombre: '', vendedorIdActual: '' });
      showToast('exito', 'Vendedor asignado correctamente.');
      fetchInstituciones();
    } catch (e) { showToast('error', 'Error al asignar.'); } finally { setSavingAssign(false); }
  };

  const handleOpenEdit = (inst: any) => {
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
    setEditModal({ open: true, inst });
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
      showToast('error', 'Provincia, Cantón, Parroquia, Sostenimiento y Jornada son obligatorios.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/instituciones/${editFormData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFormData) });
      if (!res.ok) throw new Error();
      setEditModal({ open: false, inst: null });
      showToast('exito', 'Institución actualizada con éxito.');
      fetchInstituciones();
    } catch (e) { showToast('error', 'Error al guardar los cambios.'); } finally { setSavingEdit(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' }); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (data.length > 0) {
        const cols = Object.keys(data[0] as object); setExcelColumns(cols); setExcelData(data);
        const autoMap: Record<string, string> = { ...mapping };
        cols.forEach(col => {
          const cLower = col.toLowerCase();
          if (cLower.includes('nombre') || cLower.includes('institucion')) autoMap.nombre = col;
          if (cLower === 'provincia') autoMap.provincia = col;
          if (cLower === 'canton' || cLower === 'cantón') autoMap.canton = col;
          if (cLower === 'parroquia') autoMap.parroquia = col;
          if (cLower.includes('sostenimiento')) autoMap.sostenimiento = col;
          if (cLower.includes('jornada')) autoMap.jornada = col;
          if (cLower.includes('femenino')) autoMap.docentesMujeres = col;
          if (cLower.includes('masculino')) autoMap.docentesHombres = col;
          if (cLower.includes('total_docentes') || cLower === 'total docentes') autoMap.totalDocentes = col;
          if (cLower.includes('nivel')) autoMap.nivelEducativo = col;
          if (cLower.includes('area') || cLower.includes('área')) autoMap.area = col;
          if (cLower.includes('regimen') || cLower.includes('régimen')) autoMap.regimen = col;
          if (cLower.includes('jurisdiccion') || cLower.includes('jurisdicción')) autoMap.jurisdiccion = col;
          if (cLower.includes('modallidad') || cLower.includes('modalidad')) autoMap.modalidad = col;
          if (cLower.includes('acceso')) autoMap.accesoEdificio = col;
        });
        setMapping(autoMap); setImportModal(true);
      } else { showToast('alerta', "El archivo Excel está vacío."); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };
  const handleExportarExcel = () => {
    if (institutions.length === 0) {
      showToast('alerta', 'No hay datos para exportar.');
      return;
    }
    
    // Mapeamos los datos al formato que verá el gerente
    const dataToExport = institutions.map(inst => ({
      'ID Interno': inst.id,
      'Nombre Institución': inst.nombre,
      'Provincia': inst.provincia,
      'Cantón': inst.canton,
      'Parroquia': inst.parroquia,
      'Sostenimiento': inst.sostenimiento,
      'Jornada': inst.jornada,
      'Nivel Educativo': inst.nivelEducativo,
      'Área': inst.area,
      'Régimen': inst.regimen,
      'Docentes Hombres': inst.docentesHombres,
      'Docentes Mujeres': inst.docentesMujeres,
      'Total Docentes': inst.docentes,
      'Tamaño Calculado': inst.tamano,
      'Estado Comercial': inst.estado,
      'Vendedor Responsable': inst.vendedorNombre
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instituciones");
    XLSX.writeFile(wb, "Reporte_Base_Instituciones.xlsx");
    
    showToast('exito', 'Excel descargado exitosamente.');
  };

  const getTransformedData = () => {
    return excelData.map(row => ({
      nombre: row[mapping.nombre], provincia: row[mapping.provincia], canton: row[mapping.canton], parroquia: row[mapping.parroquia], sostenimiento: mapping.sostenimiento ? row[mapping.sostenimiento] : null, jornada: mapping.jornada ? row[mapping.jornada] : null, docentesHombres: mapping.docentesHombres ? row[mapping.docentesHombres] : 0, docentesMujeres: mapping.docentesMujeres ? row[mapping.docentesMujeres] : 0, totalDocentes: mapping.totalDocentes ? row[mapping.totalDocentes] : 0, nivelEducativo: mapping.nivelEducativo ? row[mapping.nivelEducativo] : null, area: mapping.area ? row[mapping.area] : null, regimen: mapping.regimen ? row[mapping.regimen] : null, jurisdiccion: mapping.jurisdiccion ? row[mapping.jurisdiccion] : null, modalidad: mapping.modalidad ? row[mapping.modalidad] : null, accesoEdificio: mapping.accesoEdificio ? row[mapping.accesoEdificio] : null,
    }));
  };

  const ejecutarImportacion = async () => {
    if (!mapping.nombre || !mapping.provincia || !mapping.canton || !mapping.parroquia) {
      showToast('error', "Debes mapear al menos el Nombre, Provincia, Cantón y Parroquia."); return;
    }
    setIsImporting(true); setImportProgress({ actual: 0, total: excelData.length });
    const dataTransformada = getTransformedData();
    const chunkSize = 500; let procesados = 0, totalNuevos = 0, totalDuplicados = 0;

    for (let i = 0; i < dataTransformada.length; i += chunkSize) {
      const chunk = dataTransformada.slice(i, i + chunkSize);
      try {
        const res = await fetch('/api/instituciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBulk: true, instituciones: chunk }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        totalNuevos += (data.guardados || 0); totalDuplicados += (data.duplicados || 0); procesados += chunk.length;
        setImportProgress({ actual: procesados, total: excelData.length });
      } catch (error) { showToast('error', `Error de red cerca del registro ${i}.`); setIsImporting(false); return; }
    }
    setIsImporting(false); setImportModal(false);
    if (totalDuplicados > 0) { setDuplicateModal({ open: true, duplicadosCount: totalDuplicados, nuevosCount: totalNuevos });
    } else {
      showToast('exito', `¡Terminado! ${totalNuevos} escuelas creadas correctamente.`);
      fetchInstituciones(); if (onRefreshNeeded) onRefreshNeeded();
    }
  };

  const ejecutarActualizacionDuplicados = async () => {
    setDuplicateModal({ ...duplicateModal, open: false }); setImportModal(true); setIsUpdating(true); setImportProgress({ actual: 0, total: excelData.length });
    const dataTransformada = getTransformedData(); const chunkSize = 500; let procesados = 0;
    for (let i = 0; i < dataTransformada.length; i += chunkSize) {
      const chunk = dataTransformada.slice(i, i + chunkSize);
      try {
        const res = await fetch('/api/instituciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBulkUpdate: true, instituciones: chunk }) });
        if (!res.ok) throw new Error();
        procesados += chunk.length; setImportProgress({ actual: procesados, total: excelData.length });
      } catch (error) { showToast('error', `Error de red actualizando.`); setIsUpdating(false); return; }
    }
    setIsUpdating(false); setImportModal(false); showToast('exito', `¡Base de datos actualizada con los nuevos datos!`);
    fetchInstituciones(); if (onRefreshNeeded) onRefreshNeeded();
  };

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
  if (loading) return <div className="p-8 text-center text-secondary">Cargando base de datos...</div>;

  return (
    <>
      <div className="flex flex-col gap-4">
        {esAdmin && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleExportarExcel} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm font-bold">
              <Download size={16} className="mr-2" /> 📤 Exportar Excel
            </Button>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-primary border-primary/30 hover:bg-primary/5 shadow-sm font-bold">
              <Upload size={16} className="mr-2" /> 📥 Importar Base MinEduc
            </Button>
          </div>
        )}
        <div className="w-full bg-card rounded-xl shadow-sm border border-border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Institución</TableHead>
                <TableHead className="font-semibold text-foreground">Ubicación</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Docentes</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Clasificación</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Vendedor Responsable</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentInstitutions.map((inst) => (
                <TableRow key={inst.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm">{inst.nombre}</div>
                    <div className="text-xs text-muted-foreground">{inst.sostenimiento} • {inst.jornada}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{inst.provincia} / {inst.canton}</div>
                    <div className="text-xs text-muted-foreground">Parroquia. {inst.parroquia}</div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-foreground">
                    {inst.docentes} Docentes
                    <div className="text-xs text-muted-foreground">H. {inst.docentesHombres} M. {inst.docentesMujeres}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">{inst.tamano}</span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{inst.estado}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {inst.vendedorId ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-xs px-2.5 py-1">👤 {inst.vendedorNombre}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-dashed text-xs">Sin Vendedor</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-lg h-8 w-8" onClick={() => router.push(`/instituciones/${inst.id}`)} title="Ver Ficha Técnica">
                        <Eye size={16} />
                      </Button>
                      {esAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8" onClick={() => handleOpenEdit(inst)} title="Editar Institución">
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50 rounded-lg h-8 w-8" onClick={() => { setSelectedVendedor(inst.vendedorId || ''); setAssignModal({ open: true, instId: inst.id, instNombre: inst.nombre, vendedorIdActual: inst.vendedorId }); }} title="Reasignar Vendedor">
                            <UserCheck size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInstitutions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-secondary">No se encontraron escuelas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {/* PAGINACIÓN DE 15 EN 15 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-between items-center bg-muted/30">
              <span className="text-xs text-muted-foreground font-medium">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredInstitutions.length)} de {filteredInstitutions.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={14} className="mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Siguiente <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL REASIGNAR VENDEDOR */}
        <Dialog open={assignModal.open} onOpenChange={val => setAssignModal({ ...assignModal, open: val })}>
          <DialogContent className="sm:max-w-md bg-card p-5 rounded-xl"><DialogHeader><DialogTitle className="text-base font-bold text-foreground">Asignar Vendedor</DialogTitle></DialogHeader><div className="mt-3 space-y-3"><p className="text-xs text-muted-foreground">Escuela: <strong className="text-foreground">{assignModal.instNombre}</strong></p><select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={selectedVendedor} onChange={e => setSelectedVendedor(e.target.value)}><option value="">-- Liberar (Sin Vendedor) --</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select></div><DialogFooter className="mt-4 flex gap-2 justify-end"><Button variant="outline" size="sm" onClick={() => setAssignModal({ ...assignModal, open: false })}>Cancelar</Button><Button size="sm" className="bg-primary text-primary-foreground" disabled={savingAssign} onClick={handleGuardarAsignacion}>{savingAssign ? 'Guardando...' : 'Guardar'}</Button></DialogFooter></DialogContent>
        </Dialog>

        {/* SÚPER MODAL DE EDICIÓN CON TODOS LOS CAMPOS */}
        <Dialog open={editModal.open} onOpenChange={val => setEditModal({ ...editModal, open: val })}>
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
              <Button variant="outline" size="sm" onClick={() => setEditModal({ open: false, inst: null })}>Cancelar</Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={savingEdit} onClick={handleGuardarEdicion}><Save size={14} className="mr-1" />{savingEdit ? 'Guardando...' : 'Guardar Todos los Cambios'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE IMPORTACIÓN */}
        <Dialog open={importModal} onOpenChange={(val) => !(isImporting || isUpdating) && setImportModal(val)}>
          <DialogContent className="sm:max-w-2xl bg-card p-6 rounded-xl max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">Mapear Columnas del Excel</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2 mt-4 space-y-2.5">
              {[{ key: 'nombre', label: 'Nombre Institución *' }, { key: 'provincia', label: 'Provincia *' }, { key: 'canton', label: 'Cantón *' }, { key: 'parroquia', label: 'Parroquia *' }, { key: 'sostenimiento', label: 'Sostenimiento' }, { key: 'jornada', label: 'Jornada' }, { key: 'docentesHombres', label: 'Docentes Hombres' }, { key: 'docentesMujeres', label: 'Docentes Mujeres' }, { key: 'totalDocentes', label: 'Total Docentes' }, { key: 'nivelEducativo', label: 'Nivel Educativo' }, { key: 'area', label: 'Área' }, { key: 'regimen', label: 'Régimen Escolar' }, { key: 'jurisdiccion', label: 'Jurisdicción' }, { key: 'modalidad', label: 'Modalidad' }, { key: 'accesoEdificio', label: 'Acceso Edificio' }].map(field => (
                <div key={field.key} className="flex items-center justify-between bg-muted/50 p-2 rounded border border-border">
                  <Label className={`text-xs font-bold w-1/3 ${field.label.includes('*') ? 'text-primary' : 'text-foreground'}`}>{field.label}</Label>
                  <div className="w-2/3 flex items-center gap-2"><ArrowRight size={14} className="text-muted-foreground" /><select className="flex-1 h-9 border border-input rounded-md px-2 text-xs bg-white focus:ring-primary focus:border-primary" value={mapping[field.key]} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })} disabled={isImporting || isUpdating}><option value="">-- Ignorar (No importar) --</option>{excelColumns.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
                </div>
              ))}
            </div>
            {(isImporting || isUpdating) && (<div className="mt-5 p-4 bg-primary/10 border border-primary/20 rounded-xl"><div className="flex justify-between text-xs font-bold text-primary mb-2"><span>Procesando...</span><span>{importProgress.actual} / {importProgress.total}</span></div><div className="w-full bg-primary/20 rounded-full h-3"><div className="bg-primary h-3 rounded-full transition-all duration-300" style={{ width: `${Math.max(5, Math.round((importProgress.actual / Math.max(1, importProgress.total)) * 100))}%` }}></div></div></div>)}
            <DialogFooter className="mt-4 flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => setImportModal(false)} disabled={isImporting || isUpdating}>Cancelar</Button><Button className="bg-primary text-primary-foreground font-bold" onClick={ejecutarImportacion} disabled={isImporting || isUpdating}>{(isImporting || isUpdating) ? 'Procesando...' : 'Iniciar Importación'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* POPUP INTELIGENTE DE DUPLICADOS */}
        <Dialog open={duplicateModal.open} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl border-t-4 border-amber-500">
            <DialogHeader><DialogTitle className="text-lg font-bold text-amber-600 flex items-center gap-2"><RefreshCw size={20} /> Escuelas Existentes Detectadas</DialogTitle></DialogHeader>
            <div className="mt-2 space-y-3"><p className="text-sm text-gray-700">Se han creado <strong>{duplicateModal.nuevosCount} escuelas nuevas</strong> exitosamente.</p><div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">Detectamos que <strong>{duplicateModal.duplicadosCount} escuelas de tu Excel ya existían</strong> en tu base de datos.</div><p className="text-xs text-gray-500">¿Deseas sobreescribir y actualizar los datos administrativos de estas escuelas con la información fresca del Excel? <br/><br/><em>*Tranquilo, los vendedores asignados y el estado de visitas no se borrarán.</em></p></div>
            <DialogFooter className="mt-5 flex gap-2 justify-end"><Button variant="outline" onClick={() => { setDuplicateModal({ open: false, duplicadosCount: 0, nuevosCount: 0 }); showToast('exito', 'Importación finalizada.'); fetchInstituciones(); if (onRefreshNeeded) onRefreshNeeded(); }} className="text-gray-500">No, dejarlas como están</Button><Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={ejecutarActualizacionDuplicados}>Sí, Actualizar Datos</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : toastMsg.tipo === 'alerta' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} className="text-emerald-100" /> : <AlertCircle size={20} className="text-white/90" />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}