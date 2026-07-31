"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  DollarSign, Plus, Upload, CheckCircle2, ShieldCheck, Edit3, Eye, AlertCircle, Pencil, Search, Download, ChevronLeft, ChevronRight
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

  // FILTROS DINÁMICOS Y BUSCADOR
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ vendedorNombre: '', estadoContratoId: '', estadoClienteId: '', mesCobro: '' });
  const [filtroTarjeta, setFiltroTarjeta] = useState<'Todas' | 'Pendientes' | 'Novedades' | 'Aprobadas'>('Todas');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Notificación Flotante
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 4000); 
  };

  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [institucionesDisponibles, setInstitucionesDisponibles] = useState<any[]>([]);

  const hoyStr = new Date().toISOString().split('T')[0];
  const initialFormVenta = {
    id: '', cantonId: '', institucionId: '', fechaVenta: hoyStr, numContrato: '',
    valorContrato: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '',
    estadoClienteId: '', estadoContratoId: '', tipoCobroId: '',
    observacionesFact: '', verificacionFact: ''
  };
  const [formVenta, setFormVenta] = useState(initialFormVenta);

  const [factModal, setFactModal] = useState<{ open: boolean; venta: any }>({ open: false, venta: null });
  const [factData, setFactData] = useState({ observacionesFact: '', verificacionFact: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [masivoModal, setMasivoModal] = useState({ open: false, encontrados: [] as any[], noEncontrados: [] as any[] });

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filtros, filtroTarjeta]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resVentas, resCat, resInst] = await Promise.all([
        fetch('/api/ventas'), 
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

  useEffect(() => { cargarDatos(); }, []);

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
      showToast('exito', "¡Validación masiva aplicada con éxito!");
      cargarDatos();
    } catch (e) { showToast('error', "Error al procesar el Excel."); } finally { setSaving(false); }
  };

  const handleOpenCreateFromExcel = (contrato: string) => {
    setMasivoModal({ ...masivoModal, open: false });
    setFormVenta({ ...initialFormVenta, numContrato: contrato });
    setOpenCreate(true);
  };

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
      tipoCobroId: v.tipoCobroId?.toString() || '',
      observacionesFact: v.observacionesFact === 'Sin observaciones' ? '' : (v.observacionesFact || ''),
      verificacionFact: v.verificacionFact === 'Sin validar' ? '' : (v.verificacionFact || '')
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
      showToast('exito', formVenta.id ? 'Contrato actualizado con éxito' : 'Contrato registrado con éxito');
      cargarDatos();
    } catch (e: any) { showToast('error', "Hubo un problema al guardar."); } finally { setSaving(false); }
  };

  const handleGuardarFacturacion = async () => {
    if (factData.verificacionFact && factData.verificacionFact !== factModal.venta.numContrato) {
      showToast('alerta', `El número de verificación (${factData.verificacionFact}) no coincide con el contrato N° ${factModal.venta.numContrato}.`);
      return; 
    }
    try {
      await fetch('/api/ventas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: factModal.venta.id, observacionesFact: factData.observacionesFact, verificacionFact: factData.verificacionFact })
      });
      setFactModal({ open: false, venta: null });
      showToast('exito', 'Auditoría guardada con éxito.');
      cargarDatos();
    } catch (e) { showToast('error', "Hubo un error al guardar la auditoría."); }
  };

  const handleValorOMesesChange = (valor: string, meses: string) => {
    const valNum = parseFloat(valor) || 0;
    const mesNum = parseInt(meses) || 1;
    setFormVenta(prev => ({ ...prev, valorContrato: valor, meses, cuotaMensual: mesNum > 0 ? (valNum / mesNum).toFixed(2) : '0' }));
  };

  const puedeValidar = userPermisos.includes('ventas:validar') || userRol === 'super_admin' || userRol === 'administrador';
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
  
  const vendedoresUnicos = Array.from(new Set(ventas.map(v => v.vendedorNombre))).filter(Boolean);
  const escuelasDelCanton = formVenta.cantonId ? institucionesDisponibles.filter(i => i.cantonId === parseInt(formVenta.cantonId)) : [];

  const kpiPendientes = ventas.filter(v => (!v.verificacionFact || v.verificacionFact === 'Sin validar') && (!v.observacionesFact || v.observacionesFact === 'Sin observaciones' || v.observacionesFact.trim() === '')).length;
  const kpiNovedades = ventas.filter(v => v.observacionesFact && v.observacionesFact !== 'Sin observaciones' && v.observacionesFact.trim() !== '').length;
  const kpiAprobadas = ventas.filter(v => v.verificacionFact && v.verificacionFact !== 'Sin validar').length;

  let ventasFiltradas = ventas.filter(v => {
    if (filtroTarjeta === 'Pendientes') return (!v.verificacionFact || v.verificacionFact === 'Sin validar') && (!v.observacionesFact || v.observacionesFact === 'Sin observaciones' || v.observacionesFact.trim() === '');
    if (filtroTarjeta === 'Novedades') return v.observacionesFact && v.observacionesFact !== 'Sin observaciones' && v.observacionesFact.trim() !== '';
    if (filtroTarjeta === 'Aprobadas') return v.verificacionFact && v.verificacionFact !== 'Sin validar';
    return true; 
  });

  if (searchTerm) {
    ventasFiltradas = ventasFiltradas.filter(v => String(v.numContrato).includes(searchTerm));
  }

  if (filtros.vendedorNombre) ventasFiltradas = ventasFiltradas.filter(v => v.vendedorNombre === filtros.vendedorNombre);
  if (filtros.estadoContratoId) ventasFiltradas = ventasFiltradas.filter(v => String(v.estadoContratoId) === filtros.estadoContratoId);
  if (filtros.estadoClienteId) ventasFiltradas = ventasFiltradas.filter(v => String(v.estadoClienteId) === filtros.estadoClienteId);
  if (filtros.mesCobro) ventasFiltradas = ventasFiltradas.filter(v => v.mesCobro === filtros.mesCobro);

  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / itemsPerPage));
  const ventasPaginadas = ventasFiltradas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportarExcel = () => {
    const dataToExport = ventasFiltradas.map(v => ({
      'N° Contrato': v.numContrato,
      'Institución / Escuela': v.institucionNombre,
      'Vendedor': v.vendedorNombre,
      'Fecha de Venta': v.fechaVenta,
      'Monto Contrato ($)': v.valorContrato,
      'Meses Plazo': v.meses,
      'Cuota Mensual ($)': v.cuotaMensual,
      'Mes de Cobro': v.mesCobro,
      'Tipo de Cobro': v.tipoCobroNombre,
      'Estado del Cliente': v.estadoClienteNombre,
      'Estado del Contrato': v.estadoContratoNombre,
      'Verificación Facturación': v.verificacionFact !== 'Sin validar' ? v.verificacionFact : 'Pendiente',
      'Observaciones / Novedades': v.observacionesFact !== 'Sin observaciones' ? v.observacionesFact : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base_Ventas");
    XLSX.writeFile(wb, "Reporte_Ventas_Sistema.xlsx");
  };

  return (
    <>
      <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <DollarSign className="text-emerald-600" /> Facturación y Tickets de Venta
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">Control de contratos, validación y reportes gerenciales</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportarExcel} className="text-blue-700 border-blue-200 hover:bg-blue-50">
              <Download size={16} className="mr-2" /> Exportar a Excel
            </Button>
            {puedeValidar && (
              <>
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  <Upload size={16} className="mr-2" /> Validar Masivo
                </Button>
              </>
            )}
            <Button onClick={() => { setFormVenta(initialFormVenta); setOpenCreate(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <Plus size={18} className="mr-1" /> Registrar Venta
            </Button>
          </div>
        </div>

        {/* TARJETAS KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div onClick={() => setFiltroTarjeta('Todas')} className={`p-4 rounded-xl border cursor-pointer transition-all ${filtroTarjeta === 'Todas' ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:border-blue-300'}`}>
            <p className={`text-[10px] font-bold uppercase ${filtroTarjeta === 'Todas' ? 'text-blue-100' : 'text-gray-500'}`}>📘 Total Ventas</p>
            <h3 className="text-2xl font-extrabold mt-1">{ventas.length}</h3>
          </div>
          <div onClick={() => setFiltroTarjeta('Pendientes')} className={`p-4 rounded-xl border cursor-pointer transition-all ${filtroTarjeta === 'Pendientes' ? 'bg-gray-600 text-white shadow-md' : 'bg-white hover:border-gray-400'}`}>
            <p className={`text-[10px] font-bold uppercase ${filtroTarjeta === 'Pendientes' ? 'text-gray-200' : 'text-gray-500'}`}>⏳ Pendientes Auditoría</p>
            <h3 className="text-2xl font-extrabold mt-1">{kpiPendientes}</h3>
          </div>
          <div onClick={() => setFiltroTarjeta('Novedades')} className={`p-4 rounded-xl border cursor-pointer transition-all ${filtroTarjeta === 'Novedades' ? 'bg-amber-500 text-white shadow-md' : 'bg-white hover:border-amber-400'}`}>
            <p className={`text-[10px] font-bold uppercase ${filtroTarjeta === 'Novedades' ? 'text-amber-100' : 'text-amber-600'}`}>⚠️ Con Novedades</p>
            <h3 className="text-2xl font-extrabold mt-1">{kpiNovedades}</h3>
          </div>
          <div onClick={() => setFiltroTarjeta('Aprobadas')} className={`p-4 rounded-xl border cursor-pointer transition-all ${filtroTarjeta === 'Aprobadas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white hover:border-emerald-300'}`}>
            <p className={`text-[10px] font-bold uppercase ${filtroTarjeta === 'Aprobadas' ? 'text-emerald-100' : 'text-emerald-600'}`}>✅ Aprobadas / Validadas</p>
            <h3 className="text-2xl font-extrabold mt-1">{kpiAprobadas}</h3>
          </div>
        </div>

        {/* FILTROS DINÁMICOS */}
        <div className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 gap-3 ${esAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="relative">
            <Label className="text-[11px] font-bold text-gray-500">Buscar Contrato</Label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <Input 
                placeholder="Ej: 100234" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-8 h-9 text-xs focus-visible:ring-blue-500" 
              />
            </div>
          </div>

          {esAdmin && (
            <div>
              <Label className="text-[11px] font-bold text-gray-500">Vendedor</Label>
              <select className="w-full h-9 border rounded-md px-2 text-xs mt-1 bg-white outline-none" value={filtros.vendedorNombre} onChange={e => setFiltros({ ...filtros, vendedorNombre: e.target.value })}>
                <option value="">Todos los Vendedores</option>
                {vendedoresUnicos.map(v => <option key={v as string} value={v as string}>{v as string}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label className="text-[11px] font-bold text-gray-500">Estado Contrato</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs mt-1 bg-white outline-none" value={filtros.estadoContratoId} onChange={e => setFiltros({ ...filtros, estadoContratoId: e.target.value })}>
              <option value="">Todos</option>
              {catalogos?.estadosContrato?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Estado Cliente</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs mt-1 bg-white outline-none" value={filtros.estadoClienteId} onChange={e => setFiltros({ ...filtros, estadoClienteId: e.target.value })}>
              <option value="">Todos</option>
              {catalogos?.estadosCliente?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Mes Cobro</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs mt-1 bg-white outline-none" value={filtros.mesCobro} onChange={e => setFiltros({ ...filtros, mesCobro: e.target.value })}>
              <option value="">Todos</option>
              {MESES_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* TABLA DE VENTAS CON TABLE-FIXED PARA QUE NUNCA SE DESFORME */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto flex flex-col">
          <Table className="w-full table-fixed min-w-900px">
            <TableHeader className="bg-gray-50/80">
              <TableRow>
                <TableHead className="font-semibold text-gray-700 w-44">Contrato / Escuela</TableHead>
                <TableHead className="font-semibold text-gray-700 w-36">Vendedor</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-32">Valor / Cuota</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-28">Cobro / Mes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-32">Estados</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-28">Verificación</TableHead>
                
                {/* ANCHO ESTRICTO DE 192px PARA OBSERVACIONES */}
                <TableHead className="font-semibold text-gray-700 w-48">Observaciones</TableHead>
                
                <TableHead className="font-semibold text-gray-700 text-center w-28">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
              : ventasPaginadas.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8">No hay ventas que coincidan con este filtro.</TableCell></TableRow>
              : ventasPaginadas.map(v => (
                <TableRow key={v.id} className="hover:bg-gray-50">
                  <TableCell className="w-44">
                    <div className="font-bold text-gray-900 text-sm truncate" title={v.numContrato}>N° {v.numContrato}</div>
                    <div className="text-xs text-primary font-semibold truncate" title={v.institucionNombre}>{v.institucionNombre}</div>
                  </TableCell>
                  <TableCell className="w-36">
                    <div className="text-xs font-bold text-gray-800 truncate" title={v.vendedorNombre}>👤 {v.vendedorNombre}</div>
                    <div className="text-[10px] text-gray-400">{v.fechaVenta}</div>
                  </TableCell>
                  <TableCell className="text-center w-32">
                    <div className="text-sm font-extrabold text-emerald-700">${v.valorContrato.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500">{v.meses} m x ${v.cuotaMensual.toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-center w-28">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] truncate max-w-full block">{v.tipoCobroNombre}</Badge>
                    <div className="text-xs font-semibold text-gray-700 mt-0.5">📅 {v.mesCobro}</div>
                  </TableCell>
                  <TableCell className="text-center w-32">
                    <span className="block text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-1 truncate" title={v.estadoClienteNombre}>Cli: {v.estadoClienteNombre}</span>
                    <span className="block text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 truncate" title={v.estadoContratoNombre}>Con: {v.estadoContratoNombre}</span>
                  </TableCell>
                  
                  <TableCell className="text-center w-28">
                    <span className={`text-xs px-2 py-1 rounded-md font-bold block truncate ${v.verificacionFact !== 'Sin validar' ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-gray-100 text-gray-500"}`}>
                      {v.verificacionFact !== 'Sin validar' ? v.verificacionFact : 'Pendiente'}
                    </span>
                  </TableCell>
                  
                  {/* CELDA DE OBSERVACIONES BLOQUEADA EN ANCHO Y CORTADA EN 2 LÍNEAS */}
                  <TableCell className="w-48 max-w-192px align-middle">
                    <div 
                      className={`text-[11px] font-medium italic wrap-break-word line-clamp-2 max-w-192px overflow-hidden ${v.observacionesFact !== 'Sin observaciones' && v.observacionesFact.trim() !== '' ? 'text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200' : 'text-gray-400'}`} 
                      title={v.observacionesFact}
                    >
                      {v.observacionesFact}
                    </div>
                  </TableCell>

                  <TableCell className="text-center w-28">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 text-blue-600 hover:bg-blue-50 p-0" onClick={() => handleOpenEdit(v)} title="Editar / Ver Notas">
                        <Pencil size={14} />
                      </Button>
                      
                      {puedeValidar && (
                        <Button variant="outline" size="sm" className="h-8 text-xs text-primary border-primary/30 px-2" onClick={() => { setFactData({ observacionesFact: v.observacionesFact === 'Sin observaciones' ? '' : v.observacionesFact, verificacionFact: v.verificacionFact === 'Sin validar' ? '' : v.verificacionFact }); setFactModal({ open: true, venta: v }); }}>
                          <Edit3 size={14} className="mr-1" /> Auditar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* CONTROLES DE PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50 rounded-b-xl">
              <span className="text-xs text-gray-500 font-medium">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, ventasFiltradas.length)} de {ventasFiltradas.length} contratos
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

        {/* MODAL 1: REGISTRAR O EDITAR VENTA */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="sm:max-w-xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="text-emerald-600" /> {formVenta.id ? 'Editar Contrato de Venta' : 'Registrar Contrato de Venta'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCrearVenta} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <Label className="text-xs font-bold text-gray-700">1. Selecciona Cantón *</Label>
                  <select required className="w-full h-10 border rounded-md px-2 text-xs bg-white mt-1" value={formVenta.cantonId} onChange={e => setFormVenta({ ...formVenta, cantonId: e.target.value, institucionId: '' })}>
                    <option value="">Seleccione Cantón...</option>
                    {catalogos?.provincias?.flatMap((p: any) => p.cantones)?.map((c: any) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">2. Escuela / Institución *</Label>
                  <select required disabled={!formVenta.cantonId} className="w-full h-10 border rounded-md px-2 text-xs bg-white mt-1 disabled:bg-gray-100" value={formVenta.institucionId} onChange={e => setFormVenta({ ...formVenta, institucionId: e.target.value })}>
                    <option value="">Seleccione Escuela...</option>
                    {escuelasDelCanton.map((i: any) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Fecha del Día *</Label>
                  <Input type="date" disabled value={formVenta.fechaVenta} className="bg-gray-100 font-bold" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Número de Contrato (Solo Números) *</Label>
                  <Input required type="text" pattern="[0-9]+" placeholder="Ej: 100234" value={formVenta.numContrato} onChange={e => setFormVenta({ ...formVenta, numContrato: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div>
                  <Label className="text-xs font-semibold">Valor Contrato ($) *</Label>
                  <Input required type="number" step="0.01" min="0" placeholder="1200.00" value={formVenta.valorContrato} onChange={e => handleValorOMesesChange(e.target.value, formVenta.meses)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Meses Plazo *</Label>
                  <Input required type="number" min="1" value={formVenta.meses} onChange={e => handleValorOMesesChange(formVenta.valorContrato, e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Cuota Mensual ($)</Label>
                  <Input type="number" step="0.01" value={formVenta.cuotaMensual} onChange={e => setFormVenta({ ...formVenta, cuotaMensual: e.target.value })} className="font-bold text-emerald-800" />
                </div>
              </div>

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
                    <option value="">Seleccione...</option>
                    {catalogos?.estadosCliente?.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Estado Contrato</Label>
                  <select className="w-full h-10 border rounded-md px-2 text-xs bg-white" value={formVenta.estadoContratoId} onChange={e => setFormVenta({ ...formVenta, estadoContratoId: e.target.value })}>
                    <option value="">Seleccione...</option>
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

              <div className={`p-4 rounded-xl border ${formVenta.observacionesFact ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-[11px] font-bold uppercase 'block' mb-2 flex items-center gap-1 ${formVenta.observacionesFact ? 'text-amber-800' : 'text-gray-600'}`}>
                  <ShieldCheck size={14} /> {puedeValidar ? 'Sección de Auditoría (Tú puedes editar)' : 'Notas de Auditoría (Solo Lectura)'}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <div className="md:col-span-1">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase">Verificación (Aprobación)</Label>
                      <Input
                         type="text"
                         readOnly={!puedeValidar}
                         className={`h-9 text-xs mt-1 font-mono ${!puedeValidar ? 'bg-gray-100/80 cursor-not-allowed text-gray-500' : 'bg-white focus-visible:ring-amber-500 border-amber-300'}`}
                         value={formVenta.verificacionFact}
                         onChange={e => setFormVenta({...formVenta, verificacionFact: e.target.value.replace(/\D/g, '')})}
                         placeholder="Ej: 100234"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase">Observaciones / Novedades</Label>
                      <textarea
                         readOnly={!puedeValidar}
                         className={`w-full border rounded-md p-2 text-xs mt-1 min-h-60px outline-none ${!puedeValidar ? 'bg-gray-100/80 cursor-not-allowed text-gray-700 font-medium' : 'bg-white focus:ring-2 focus:ring-amber-500 border-amber-300 shadow-sm'}`}
                         value={formVenta.observacionesFact}
                         onChange={e => setFormVenta({...formVenta, observacionesFact: e.target.value})}
                         placeholder={puedeValidar ? "Escribe aquí si hay errores en el contrato..." : "Sin observaciones aún..."}
                      />
                   </div>
                </div>
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
                <textarea className="w-full border rounded-md p-2 text-xs bg-white h-24 outline-none focus:ring-2 focus:ring-amber-400" value={factData.observacionesFact} onChange={e => setFactData({ ...factData, observacionesFact: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setFactModal({ open: false, venta: null })}>Cancelar</Button><Button className="bg-primary text-white font-bold" onClick={handleGuardarFacturacion}>Guardar</Button></DialogFooter>
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