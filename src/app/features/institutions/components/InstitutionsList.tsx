"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, UserCheck, Save } from 'lucide-react';
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

  // 1. MODAL REASIGNAR VENDEDOR
  const [assignModal, setAssignModal] = useState<{ open: boolean; instId: string; instNombre: string; vendedorIdActual: string }>({
    open: false, instId: '', instNombre: '', vendedorIdActual: ''
  });
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // 2. MODAL EDITAR INSTITUCIÓN
  const [editModal, setEditModal] = useState<{ open: boolean; inst: any }>({ open: false, inst: null });
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  // LÓGICA DE FILTRADO MULTICRITERIO
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

  // Guardar Reasignación de Vendedor
  const handleGuardarAsignacion = async () => {
    setSavingAssign(true);
    try {
      const res = await fetch('/api/instituciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institucionId: assignModal.instId,
          vendedorId: selectedVendedor
        })
      });

      if (!res.ok) throw new Error('Error asignando');

      setAssignModal({ open: false, instId: '', instNombre: '', vendedorIdActual: '' });
      fetchInstituciones();
    } catch (e) {
      alert("Error al cambiar vendedor asignado.");
    } finally {
      setSavingAssign(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (inst: any) => {
    setEditFormData({
      id: inst.id,
      nombre: inst.nombre,
      sostenimientoId: inst.sostenimientoId || '',
      jornadaId: inst.jornadaId || '',
      docentesHombres: inst.docentesHombres || 0,
      docentesMujeres: inst.docentesMujeres || 0,
      nivelEducativoId: inst.nivelEducativoId || '',
      areaId: inst.areaId || '',
      regimenId: inst.regimenId || ''
    });
    setEditModal({ open: true, inst });
  };

  // Guardar Edición de Institución
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
      fetchInstituciones();
    } catch (e) {
      alert("Error al guardar los cambios de la institución.");
    } finally {
      setSavingEdit(false);
    }
  };

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando base de datos...</div>;

  return (
    <>
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
                
                {/* VENDEDOR RESPONSABLE */}
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

                {/* TRES BOTONES DE ACCIÓN */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    
                    {/* BOTÓN 1: VER FICHA TÉCNICA (OJITO) */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary hover:bg-primary/10 rounded-lg h-8 w-8"
                      onClick={() => router.push(`/instituciones/${inst.id}`)}
                      title="Ver Ficha Técnica"
                    >
                      <Eye size={16} />
                    </Button>

                    {/* BOTÓN 2: EDITAR */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8"
                      onClick={() => handleOpenEdit(inst)}
                      title="Editar Institución"
                    >
                      <Pencil size={16} />
                    </Button>

                    {/* BOTÓN 3: REASIGNAR (SOLO PARA ADMINS) */}
                    {esAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-emerald-600 hover:bg-emerald-50 rounded-lg h-8 w-8"
                        onClick={() => {
                          setSelectedVendedor(inst.vendedorId || '');
                          setAssignModal({ open: true, instId: inst.id, instNombre: inst.nombre, vendedorIdActual: inst.vendedorId });
                        }}
                        title="Reasignar Vendedor Responsable"
                      >
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
            <p className="text-xs text-gray-600">
              Escuela: <strong className="text-gray-900">{assignModal.instNombre}</strong>
            </p>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Selecciona el vendedor encargado:</label>
              <select 
                className="w-full h-10 border rounded-md px-3 text-sm bg-white"
                value={selectedVendedor}
                onChange={e => setSelectedVendedor(e.target.value)}
              >
                <option value="">-- Liberar (Sin Vendedor) --</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre} ({v.email})</option>
                ))}
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
              <Input 
                value={editFormData.nombre || ''} 
                onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Sostenimiento</Label>
                <select 
                  className="w-full h-10 border rounded-md px-3 text-sm bg-white"
                  value={editFormData.sostenimientoId || ''}
                  onChange={e => setEditFormData({ ...editFormData, sostenimientoId: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {catalogos?.sostenimientos?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Jornada</Label>
                <select 
                  className="w-full h-10 border rounded-md px-3 text-sm bg-white"
                  value={editFormData.jornadaId || ''}
                  onChange={e => setEditFormData({ ...editFormData, jornadaId: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {catalogos?.jornadas?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Docentes Hombres</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={editFormData.docentesHombres || 0} 
                  onChange={e => setEditFormData({ ...editFormData, docentesHombres: parseInt(e.target.value) || 0 })} 
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Docentes Mujeres</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={editFormData.docentesMujeres || 0} 
                  onChange={e => setEditFormData({ ...editFormData, docentesMujeres: parseInt(e.target.value) || 0 })} 
                />
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
    </>
  );
}