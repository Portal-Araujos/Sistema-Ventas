"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Eye, Pencil, UserCheck, Save, Upload, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
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

  // NOTIFICACIONES TOAST GLOBALES
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 5000); 
  };

  const [assignModal, setAssignModal] = useState<{ open: boolean; instId: string; instNombre: string; vendedorIdActual: string }>({
    open: false, instId: '', instNombre: '', vendedorIdActual: ''
  });
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const [editModal, setEditModal] = useState<{ open: boolean; inst: any }>({ open: false, inst: null });
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // IMPORTACIÓN EXCEL MASIVA
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    nombre: '', provincia: '', canton: '', parroquia: '',
    sostenimiento: '', jornada: '', docentesHombres: '', docentesMujeres: '',
    totalDocentes: '', nivelEducativo: '', area: '', regimen: '',
    jurisdiccion: '', modalidad: '', accesoEdificio: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ actual: 0, total: 0 });

  const fetchInstituciones = async () => {
    try {
      const [resInst, resVend, resCat] = await Promise.all([
        fetch('/api/instituciones'),
        fetch('/api/usuarios/vendedores'),
        fetch('/api/catalogos')
      ]);
      const dataInst = await resInst.json();
      const dataVend = await resVend.json();
      const dataCat = await resCat.json();
      setInstitutions(dataInst);
      setVendedores(dataVend);
      setCatalogos(dataCat);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstituciones();
  }, []);

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

  const handleGuardarAsignacion = async () => {
    setSavingAssign(true);
    try {
      const res = await fetch('/api/instituciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institucionId: assignModal.instId, vendedorId: selectedVendedor })
      });
      if (!res.ok) throw new Error('Error asignando');
      setAssignModal({ open: false, instId: '', instNombre: '', vendedorIdActual: '' });
      showToast('exito', 'Vendedor asignado correctamente.');
      fetchInstituciones();
    } catch (e) {
      showToast('error', 'Error al cambiar vendedor asignado.');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleOpenEdit = (inst: any) => {
    setEditFormData({
      id: inst.id, nombre: inst.nombre, sostenimientoId: inst.sostenimientoId || '',
      jornadaId: inst.jornadaId || '', docentesHombres: inst.docentesHombres || 0,
      docentesMujeres: inst.docentesMujeres || 0, nivelEducativoId: inst.nivelEducativoId || '',
      areaId: inst.areaId || '', regimenId: inst.regimenId || ''
    });
    setEditModal({ open: true, inst });
  };

  const handleGuardarEdicion = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/instituciones/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setEditModal({ open: false, inst: null });
      showToast('exito', 'Institución actualizada correctamente.');
      fetchInstituciones();
    } catch (e) {
      showToast('error', 'Error al guardar los cambios de la institución.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length > 0) {
        const cols = Object.keys(data[0] as object);
        setExcelColumns(cols);
        setExcelData(data);

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

        setMapping(autoMap);
        setImportModal(true);
      } else {
        showToast('alerta', "El archivo Excel que subiste está vacío.");
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarImportacion = async () => {
    if (!mapping.nombre || !mapping.provincia || !mapping.canton || !mapping.parroquia) {
      showToast('error', "OBLIGATORIO: Debes mapear al menos el Nombre, Provincia, Cantón y Parroquia.");
      return;
    }

    setIsImporting(true);
    setImportProgress({ actual: 0, total: excelData.length });

    const dataTransformada = excelData.map(row => ({
      nombre: row[mapping.nombre],
      provincia: row[mapping.provincia],
      canton: row[mapping.canton],
      parroquia: row[mapping.parroquia],
      sostenimiento: mapping.sostenimiento ? row[mapping.sostenimiento] : null,
      jornada: mapping.jornada ? row[mapping.jornada] : null,
      docentesHombres: mapping.docentesHombres ? row[mapping.docentesHombres] : 0,
      docentesMujeres: mapping.docentesMujeres ? row[mapping.docentesMujeres] : 0,
      totalDocentes: mapping.totalDocentes ? row[mapping.totalDocentes] : 0,
      nivelEducativo: mapping.nivelEducativo ? row[mapping.nivelEducativo] : null,
      area: mapping.area ? row[mapping.area] : null,
      regimen: mapping.regimen ? row[mapping.regimen] : null,
      jurisdiccion: mapping.jurisdiccion ? row[mapping.jurisdiccion] : null,
      modalidad: mapping.modalidad ? row[mapping.modalidad] : null,
      accesoEdificio: mapping.accesoEdificio ? row[mapping.accesoEdificio] : null,
    }));

    const chunkSize = 500;
    let procesados = 0;
    let totalNuevos = 0;
    let totalDuplicados = 0;

    for (let i = 0; i < dataTransformada.length; i += chunkSize) {
      const chunk = dataTransformada.slice(i, i + chunkSize);
      try {
        const res = await fetch('/api/instituciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isBulk: true, instituciones: chunk })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fallo al procesar el paquete');
        
        totalNuevos += (data.guardados || 0);
        totalDuplicados += (data.duplicados || 0);
        procesados += chunk.length;
        setImportProgress({ actual: procesados, total: excelData.length });
      } catch (error) {
        showToast('error', `Hubo un error de red cerca del registro ${i}. El proceso se detuvo.`);
        setIsImporting(false);
        return;
      }
    }

    // Mensaje dinámico y preciso
    showToast('exito', `¡Terminado! De ${excelData.length} escuelas: ${totalNuevos} creadas, ${totalDuplicados} omitidas por duplicado.`);
    
    setIsImporting(false);
    setImportModal(false);
    fetchInstituciones();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando base de datos...</div>;

  return (
    <>
      <div className="flex flex-col gap-4">
        {esAdmin && (
          <div className="flex justify-end">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm font-bold">
              <Upload size={16} className="mr-2" /> 📥 Importar Base MinEduc (Excel)
            </Button>
          </div>
        )}

        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/70">
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Institución</TableHead>
                <TableHead className="font-semibold text-gray-700">Ubicación</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Docentes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Clasificación</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Vendedor Responsable</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutions.map((inst) => (
                <TableRow key={inst.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="font-semibold text-gray-900 text-sm">{inst.nombre}</div>
                    <div className="text-xs text-gray-500">{inst.sostenimiento} • {inst.jornada}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-800">{inst.provincia} / {inst.canton}</div>
                    <div className="text-xs text-gray-400">Parroquia. {inst.parroquia}</div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-gray-800">
                    {inst.docentes} Docentes
                    <div className="text-xs text-gray-400">H. {inst.docentesHombres} M. {inst.docentesMujeres}  </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-primary">{inst.tamano}</span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{inst.estado}</div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {inst.vendedorId ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-xs px-2.5 py-1">
                        👤 {inst.vendedorNombre}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-400 border-dashed text-xs">
                        Sin Vendedor
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-lg h-8 w-8" onClick={() => router.push(`/instituciones/${inst.id}`)} title="Ver Ficha Técnica">
                        <Eye size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8" onClick={() => handleOpenEdit(inst)} title="Editar Institución">
                        <Pencil size={16} />
                      </Button>
                      {esAdmin && (
                        <Button variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50 rounded-lg h-8 w-8" onClick={() => { setSelectedVendedor(inst.vendedorId || ''); setAssignModal({ open: true, instId: inst.id, instNombre: inst.nombre, vendedorIdActual: inst.vendedorId }); }} title="Reasignar Vendedor">
                          <UserCheck size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredInstitutions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron escuelas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* MODAL 1: REASIGNAR VENDEDOR */}
        <Dialog open={assignModal.open} onOpenChange={val => setAssignModal({ ...assignModal, open: val })}>
          <DialogContent className="sm:max-w-md bg-white p-5 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">Asignar Vendedor Responsable</DialogTitle>
            </DialogHeader>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-600">Escuela: <strong className="text-gray-900">{assignModal.instNombre}</strong></p>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Selecciona el vendedor encargado:</label>
                <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={selectedVendedor} onChange={e => setSelectedVendedor(e.target.value)}>
                  <option value="">-- Liberar (Sin Vendedor) --</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.email})</option>)}
                </select>
              </div>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAssignModal({ ...assignModal, open: false })}>Cancelar</Button>
              <Button size="sm" className="bg-primary text-white" disabled={savingAssign} onClick={handleGuardarAsignacion}>
                {savingAssign ? 'Guardando...' : 'Guardar Asignación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: EDITAR INSTITUCIÓN */}
        <Dialog open={editModal.open} onOpenChange={val => setEditModal({ ...editModal, open: val })}>
          <DialogContent className="sm:max-w-lg bg-white p-6 rounded-xl overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">Editar Institución</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div>
                <Label className="text-xs font-semibold">Nombre de la Institución *</Label>
                <Input value={editFormData.nombre || ''} onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Sostenimiento</Label>
                  <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={editFormData.sostenimientoId || ''} onChange={e => setEditFormData({ ...editFormData, sostenimientoId: e.target.value })}>
                    <option value="">Seleccione...</option>
                    {catalogos?.sostenimientos?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Jornada</Label>
                  <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={editFormData.jornadaId || ''} onChange={e => setEditFormData({ ...editFormData, jornadaId: e.target.value })}>
                    <option value="">Seleccione...</option>
                    {catalogos?.jornadas?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Docentes Hombres</Label>
                  <Input type="number" min="0" value={editFormData.docentesHombres || 0} onChange={e => setEditFormData({ ...editFormData, docentesHombres: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Docentes Mujeres</Label>
                  <Input type="number" min="0" value={editFormData.docentesMujeres || 0} onChange={e => setEditFormData({ ...editFormData, docentesMujeres: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditModal({ open: false, inst: null })}>Cancelar</Button>
              <Button size="sm" className="bg-primary text-white" disabled={savingEdit} onClick={handleGuardarEdicion}>
                <Save size={14} className="mr-1" />
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: MAPEO Y CARGA EXCEL MASIVA */}
        <Dialog open={importModal} onOpenChange={(val) => !isImporting && setImportModal(val)}>
          <DialogContent className="sm:max-w-2xl bg-white p-6 rounded-xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">Mapear Columnas del Excel</DialogTitle>
              <p className="text-xs text-gray-500">Se detectaron <strong>{excelData.length} registros</strong>. Relaciona las columnas del Excel con los campos de tu Base de Datos. Lo que no necesites, déjalo como "Ignorar".</p>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 pr-2 mt-4 space-y-2.5">
              {[
                { key: 'nombre', label: 'Nombre Institución *' },
                { key: 'provincia', label: 'Provincia *' },
                { key: 'canton', label: 'Cantón *' },
                { key: 'parroquia', label: 'Parroquia *' },
                { key: 'sostenimiento', label: 'Sostenimiento' },
                { key: 'jornada', label: 'Jornada' },
                { key: 'docentesHombres', label: 'Docentes Hombres' },
                { key: 'docentesMujeres', label: 'Docentes Mujeres' },
                { key: 'totalDocentes', label: 'Total Docentes' },
                { key: 'nivelEducativo', label: 'Nivel Educativo' },
                { key: 'area', label: 'Área' },
                { key: 'regimen', label: 'Régimen Escolar' },
                { key: 'jurisdiccion', label: 'Jurisdicción' },
                { key: 'modalidad', label: 'Modalidad' },
                { key: 'accesoEdificio', label: 'Acceso Edificio' }
              ].map(field => (
                <div key={field.key} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                  <Label className={`text-xs font-bold w-1/3 ${field.label.includes('*') ? 'text-primary' : 'text-gray-700'}`}>{field.label}</Label>
                  <div className="w-2/3 flex items-center gap-2">
                    <ArrowRight size={14} className="text-gray-400" />
                    <select
                      className="flex-1 h-9 border border-gray-300 rounded-md px-2 text-xs bg-white font-medium focus:ring-primary focus:border-primary"
                      value={mapping[field.key]}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      disabled={isImporting}
                    >
                      <option value="">-- Ignorar (No importar) --</option>
                      {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* BARRA DE PROGRESO DE IMPORTACIÓN */}
            {isImporting && (
               <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex justify-between text-xs font-bold text-blue-800 mb-2">
                    <span>Procesando registros en la nube...</span>
                    <span>{importProgress.actual} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${Math.max(5, Math.round((importProgress.actual / Math.max(1, importProgress.total)) * 100))}%` }}></div>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-2 text-center font-semibold animate-pulse">¡ATENCIÓN! No cierres esta ventana. Se están filtrando los duplicados.</p>
               </div>
            )}

            <DialogFooter className="mt-4 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setImportModal(false)} disabled={isImporting}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={ejecutarImportacion} disabled={isImporting}>
                {isImporting ? 'Importando...' : 'Iniciar Importación Masiva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TOAST GLOBAL */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : toastMsg.tipo === 'alerta' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} className="text-emerald-100" /> : <AlertCircle size={20} className="text-white/90" />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}