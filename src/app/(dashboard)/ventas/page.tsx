"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  DollarSign, Plus, Upload, CheckCircle2, ShieldCheck, Edit3, Eye, AlertCircle, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const MESES_LISTA = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  
  const [userRol, setUserRol] = useState<string>('vendedor');
  const [userPermisos, setUserPermisos] = useState<string[]>([]); 

  const [filtros, setFiltros] = useState({ cantonId: '', institucionId: '', tipoCobroId: '', estadoContratoId: '', estadoClienteId: '', mesCobro: '' });

  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [institucionesDisponibles, setInstitucionesDisponibles] = useState<any[]>([]);

  // Estado Inicial del Formulario de Venta (Sirve para Crear y Editar)
  const hoyStr = new Date().toISOString().split('T')[0];
  const initialFormVenta = {
    id: '', cantonId: '', institucionId: '', fechaVenta: hoyStr, numContrato: '',
    valorContrato: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '',
    estadoClienteId: '', estadoContratoId: '', tipoCobroId: ''
  };
  const [formVenta, setFormVenta] = useState(initialFormVenta);

  const [factModal, setFactModal] = useState<{ open: boolean; venta: any }>({ open: false, venta: null });
  const [factData, setFactData] = useState({ observacionesFact: '', verificacionFact: '' });
  const [feedbackModal, setFeedbackModal] = useState({ open: false, texto: '', estado: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [masivoModal, setMasivoModal] = useState({ open: false, encontrados: [] as any[], noEncontrados: [] as any[] });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.cantonId) params.append('cantonId', filtros.cantonId);
      if (filtros.institucionId) params.append('institucionId', filtros.institucionId);
      if (filtros.mesCobro) params.append('mesCobro', filtros.mesCobro);

      const [resVentas, resCat, resInst] = await Promise.all([
        fetch(`/api/ventas?${params.toString()}`),
        fetch('/api/catalogos'),
        fetch('/api/instituciones')
      ]);

      const dataVentas = await resVentas.json();
      const dataCat = await resCat.json();
      
      setVentas(Array.isArray(dataVentas) ? dataVentas : []);
      setCatalogos(dataCat);
      setInstitucionesDisponibles(await resInst.json());
      
      if (dataCat.userRol) setUserRol(dataCat.userRol);
      if (dataCat.userPermisos) setUserPermisos(dataCat.userPermisos); 
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [filtros]);

  // --- LÓGICA DE EXCEL MASIVO ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      const encontrados: any[] = [];
      const noEncontrados: any[] = [];

      data.forEach((row: any) => {
        const contratoExcel = String(row.Contrato || row.contrato || '').trim();
        const ventaDB = ventas.find(v => v.numContrato === contratoExcel);

        if (ventaDB) {
          const verificacion = String(row.Verificacion || row.verificacion || '').trim();
          const observaciones = row.Observaciones || row.observaciones || '';
          const estadoTicket = verificacion === contratoExcel ? 'Validado ✅' : 'Rechazado ❌ - Número no coincide';
          encontrados.push({ id: ventaDB.id, contrato: contratoExcel, verificacion, observaciones, estadoTicket });
        } else {
          noEncontrados.push({ contratoExcel });
        }
      });

      setMasivoModal({ open: true, encontrados, noEncontrados });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const confirmarValidacionMasiva = async () => {
    setSaving(true);
    try {
      await fetch('/api/ventas/masivo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validaciones: masivoModal.encontrados })
      });
      setMasivoModal({ open: false, encontrados: [], noEncontrados: [] });
      alert("✅ ¡Validación masiva aplicada con éxito!");
      cargarDatos();
    } catch (e) { alert("Error al procesar el Excel."); } finally { setSaving(false); }
  };

  // Abre el formulario de Venta pre-llenando el contrato del Excel
  const handleOpenCreateFromExcel = (contrato: string) => {
    setMasivoModal({ ...masivoModal, open: false });
    setFormVenta({ ...initialFormVenta, numContrato: contrato });
    setOpenCreate(true);
  };

  // --- LÓGICA MANUAL (CREAR / EDITAR / AUDITAR) ---
  const handleOpenEdit = (v: any) => {
    setFormVenta({
      id: v.id,
      cantonId: v.cantonId.toString(),
      institucionId: v.institucionId,
      fechaVenta: hoyStr,
      numContrato: v.numContrato,
      valorContrato: v.valorContrato.toString(),
      meses: v.meses.toString(),
      mesCobro: v.mesCobro,
      cuotaMensual: v.cuotaMensual.toString(),
      estadoClienteId: v.estadoClienteId?.toString() || '',
      estadoContratoId: v.estadoContratoId?.toString() || '',
      tipoCobroId: v.tipoCobroId?.toString() || ''
    });
    setOpenCreate(true);
  };

  const handleCrearVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = formVenta.id ? 'PUT' : 'POST';
      await fetch('/api/ventas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formVenta) });
      setOpenCreate(false);
      setFormVenta(initialFormVenta);
      cargarDatos();
    } catch (e: any) {} finally { setSaving(false); }
  };

  const handleGuardarFacturacion = async () => {
    if (factData.verificacionFact && factData.verificacionFact !== factModal.venta.numContrato) {
      alert(`❌ BLOQUEO: El número de verificación (${factData.verificacionFact}) no coincide con el contrato N° ${factModal.venta.numContrato}.`);
      return; 
    }
    try {
      await fetch('/api/ventas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: factModal.venta.id, observacionesFact: factData.observacionesFact, verificacionFact: factData.verificacionFact })
      });
      setFactModal({ open: false, venta: null });
      cargarDatos();
    } catch (e) {}
  };

  const handleValorOMesesChange = (valor: string, meses: string) => {
    const valNum = parseFloat(valor) || 0;
    const mesNum = parseInt(meses) || 1;
    setFormVenta(prev => ({ ...prev, valorContrato: valor, meses, cuotaMensual: mesNum > 0 ? (valNum / mesNum).toFixed(2) : '0' }));
  };

  const puedeValidar = userPermisos.includes('ventas:validar') || userRol === 'super_admin' || userRol === 'administrador';
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
  const escuelasDelCanton = formVenta.cantonId ? institucionesDisponibles.filter(i => i.cantonId === parseInt(formVenta.cantonId)) : [];

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="text-emerald-600" /> Facturación y Tickets de Venta
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Control de contratos, cuotas y validación masiva</p>
        </div>

        <div className="flex gap-2">
          {puedeValidar && (
            <>
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Upload size={16} className="mr-2" /> Validar por Excel
              </Button>
            </>
          )}
          <Button onClick={() => { setFormVenta(initialFormVenta); setOpenCreate(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            <Plus size={18} className="mr-1" /> Registrar Venta
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-2 md:grid-cols-6 gap-3">
        <div><Label className="text-[11px] font-bold text-gray-500">Cantón</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.cantonId} onChange={e => setFiltros({ ...filtros, cantonId: e.target.value, institucionId: '' })}><option value="">Todos</option>{catalogos?.provincias?.flatMap((p: any) => p.cantones)?.map((c: any) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}</select></div>
        <div><Label className="text-[11px] font-bold text-gray-500">Institución</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.institucionId} onChange={e => setFiltros({ ...filtros, institucionId: e.target.value })}><option value="">Todas</option>{institucionesDisponibles.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}</select></div>
        <div><Label className="text-[11px] font-bold text-gray-500">Tipo Cobro</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.tipoCobroId} onChange={e => setFiltros({ ...filtros, tipoCobroId: e.target.value })}><option value="">Todos</option>{catalogos?.tiposCobro?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
        <div><Label className="text-[11px] font-bold text-gray-500">Estado Contrato</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.estadoContratoId} onChange={e => setFiltros({ ...filtros, estadoContratoId: e.target.value })}><option value="">Todos</option>{catalogos?.estadosContrato?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
        <div><Label className="text-[11px] font-bold text-gray-500">Estado Cliente</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.estadoClienteId} onChange={e => setFiltros({ ...filtros, estadoClienteId: e.target.value })}><option value="">Todos</option>{catalogos?.estadosCliente?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
        <div><Label className="text-[11px] font-bold text-gray-500">Mes Cobro</Label><select className="w-full h-9 border rounded-md px-2 text-xs" value={filtros.mesCobro} onChange={e => setFiltros({ ...filtros, mesCobro: e.target.value })}><option value="">Todos</option>{MESES_LISTA.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Contrato / Escuela</TableHead>
              <TableHead className="font-semibold text-gray-700">Vendedor</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Valor / Cuota</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Cobro / Mes</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Estados</TableHead>
              <TableHead className="font-semibold text-gray-700">Facturación & Verificación</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell></TableRow>
            : ventas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8">No hay ventas.</TableCell></TableRow>
            : ventas.map(v => (
              <TableRow key={v.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">N° {v.numContrato}</div>
                  <div className="text-xs text-primary font-semibold">{v.institucionNombre}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-bold text-gray-800">👤 {v.vendedorNombre}</div>
                  <div className="text-[10px] text-gray-400">{v.fechaVenta}</div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm font-extrabold text-emerald-700">${v.valorContrato.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-500">{v.meses} meses x ${v.cuotaMensual.toFixed(2)}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{v.tipoCobroNombre}</Badge>
                  <div className="text-xs font-semibold text-gray-700 mt-0.5">📅 {v.mesCobro}</div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="block text-[10px] px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-1">Cli: {v.estadoClienteNombre}</span>
                  <span className="block text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">Con: {v.estadoContratoNombre}</span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="text-xs font-bold text-gray-900">🔍 Ref: <span className={v.verificacionFact !== 'Sin validar' ? "text-emerald-600 font-mono" : "text-amber-600 italic"}>{v.verificacionFact !== 'Sin validar' ? v.verificacionFact : 'Pendiente'}</span></div>
                  <p className="text-[11px] text-gray-600 italic mt-0.5 line-clamp-2">{v.observacionesFact}</p>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {/* BOTÓN EDITAR (SOLO ADMINS) */}
                    {esAdmin && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEdit(v)} title="Editar Venta">
                        <Pencil size={14} />
                      </Button>
                    )}
                    {/* BOTÓN AUDITAR O VER FEEDBACK */}
                    {puedeValidar ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs text-primary border-primary/30" onClick={() => { setFactData({ observacionesFact: v.observacionesFact === 'Sin observaciones' ? '' : v.observacionesFact, verificacionFact: v.verificacionFact === 'Sin validar' ? '' : v.verificacionFact }); setFactModal({ open: true, venta: v }); }}>
                        <Edit3 size={14} className="mr-1" /> Auditar
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600 hover:bg-amber-50" onClick={() => setFeedbackModal({ open: true, texto: v.observacionesFact, estado: v.estadoTicket })}>
                        <Eye size={14} className="mr-1" /> Feedback
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL 1: REGISTRAR NUEVA VENTA (VENDEDOR) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="text-emerald-600" /> Registrar Contrato de Venta
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearVenta} className="space-y-4 mt-2">
            {/* 1. SELECCIÓN DE CANTÓN E INSTITUCIÓN */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <Label className="text-xs font-bold text-gray-700">1. Selecciona Cantón *</Label>
                <select 
                  required 
                  className="w-full h-10 border rounded-md px-2 text-xs bg-white mt-1" 
                  value={formVenta.cantonId} 
                  onChange={e => setFormVenta({ ...formVenta, cantonId: e.target.value, institucionId: '' })}
                >
                  <option value="">Seleccione Cantón...</option>
                  {catalogos?.provincias?.flatMap((p: any) => p.cantones)?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700">2. Escuela / Institución *</Label>
                <select 
                  required 
                  disabled={!formVenta.cantonId} 
                  className="w-full h-10 border rounded-md px-2 text-xs bg-white mt-1 disabled:bg-gray-100" 
                  value={formVenta.institucionId} 
                  onChange={e => setFormVenta({ ...formVenta, institucionId: e.target.value })}
                >
                  <option value="">Seleccione Escuela...</option>
                  {escuelasDelCanton.map((i: any) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
            </div>
            {/* 2. DATOS DEL CONTRATO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Fecha del Día *</Label>
                <Input type="date" disabled value={formVenta.fechaVenta} className="bg-gray-100 font-bold" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Número de Contrato (Solo Números) *</Label>
                <Input 
                  required 
                  type="text" 
                  pattern="[0-9]+" 
                  placeholder="Ej: 100234" 
                  value={formVenta.numContrato} 
                  onChange={e => setFormVenta({ ...formVenta, numContrato: e.target.value.replace(/\D/g, '') })} 
                />
              </div>
            </div>
            {/* 3. MONTOS Y CÁLCULO DE CUOTA */}
            <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <div>
                <Label className="text-xs font-semibold">Valor Contrato ($) *</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="1200.00" 
                  value={formVenta.valorContrato} 
                  onChange={e => handleValorOMesesChange(e.target.value, formVenta.meses)} 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Meses Plazo *</Label>
                <Input 
                  required 
                  type="number" 
                  min="1" 
                  value={formVenta.meses} 
                  onChange={e => handleValorOMesesChange(formVenta.valorContrato, e.target.value)} 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Cuota Mensual ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formVenta.cuotaMensual} 
                  onChange={e => setFormVenta({ ...formVenta, cuotaMensual: e.target.value })} 
                  className="font-bold text-emerald-800" 
                />
              </div>
            </div>
            {/* 4. MODALIDADES Y ESTADOS */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mes de Cobro *</Label>
                <select className="w-full h-10 border rounded-md px-2 text-xs bg-white" value={formVenta.mesCobro} onChange={e => setFormVenta({ ...formVenta, mesCobro: e.target.value })}>
                  {MESES_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Estado Cliente</Label>
                <select className="w-full h-10 border rounded-md px-2 text-xs bg-white" value={formVenta.estadoClienteId} onChange={e => setFormVenta({ ...formVenta, estadoClienteId: e.target.value })}>
                  {catalogos?.estadosCliente?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Estado Contrato</Label>
                <select className="w-full h-10 border rounded-md px-2 text-xs bg-white" value={formVenta.estadoContratoId} onChange={e => setFormVenta({ ...formVenta, estadoContratoId: e.target.value })}>
                  {catalogos?.estadosContrato?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Tipo de Cobro *</Label>
              <select required className="w-full h-10 border rounded-md px-2 text-xs bg-white" value={formVenta.tipoCobroId} onChange={e => setFormVenta({ ...formVenta, tipoCobroId: e.target.value })}>
                <option value="">Seleccione...</option>
                {catalogos?.tiposCobro?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            {/* CAMPOS DESHABILITADOS PARA EL VENDEDOR */}
            <div className="bg-gray-100 p-3 rounded-xl border border-gray-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase block mb-1">🔒 Sección de Facturación y Verificación (Solo Lectura)</span>
              <p className="text-xs text-gray-500 italic">Los campos de Observaciones y Número de Verificación serán completados por el departamento de Facturación.</p>
            </div>
            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 text-white font-bold">
                {saving ? 'Guardando...' : 'Guardar Venta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* MODAL EXCEL MASIVO */}
      <Dialog open={masivoModal.open} onOpenChange={val => setMasivoModal({ ...masivoModal, open: val })}>
        <DialogContent className="sm:max-w-2xl bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Resultado de Importación Excel</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={18}/> {masivoModal.encontrados.length} Contratos Coincidentes</h3>
              <div className="mt-2 max-h-32 overflow-y-auto text-[10px] font-mono bg-white p-2 rounded border border-emerald-200">
                {masivoModal.encontrados.map((n, i) => <div key={i}>Contrato N° {n.contrato}</div>)}
              </div>
            </div>
            
            {masivoModal.noEncontrados.length > 0 && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertCircle size={18}/> {masivoModal.noEncontrados.length} Contratos NO Encontrados</h3>
                <p className="text-xs text-red-600 mt-1 mb-2">No existen en la base de datos. Haz clic en "Registrar" para crearlos manualmente:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {masivoModal.noEncontrados.map((n, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-red-200">
                      <span className="text-xs font-mono text-gray-900">Contrato: {n.contratoExcel}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-primary text-primary" onClick={() => handleOpenCreateFromExcel(n.contratoExcel)}>
                        <Plus size={12} className="mr-1"/> Registrar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setMasivoModal({ open: false, encontrados: [], noEncontrados: [] })}>Cancelar</Button>
            <Button className="bg-emerald-600 text-white font-bold" disabled={saving || masivoModal.encontrados.length === 0} onClick={confirmarValidacionMasiva}>Aplicar Validaciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MANUAL: FACTURACION */}
      <Dialog open={factModal.open} onOpenChange={val => setFactModal({ ...factModal, open: val })}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold text-gray-900">Auditoría / Facturación</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-xs font-semibold text-red-600">Verificación (Si es incorrecto, el sistema te bloqueará)</Label>
              <Input type="text" pattern="[0-9]+" placeholder="Ej: 100234" value={factData.verificacionFact} onChange={e => setFactData({ ...factData, verificacionFact: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Observaciones</Label>
              <textarea className="w-full border rounded-md p-2 text-xs bg-white h-24" value={factData.observacionesFact} onChange={e => setFactData({ ...factData, observacionesFact: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setFactModal({ open: false, venta: null })}>Cancelar</Button><Button className="bg-primary text-white font-bold" onClick={handleGuardarFacturacion}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}