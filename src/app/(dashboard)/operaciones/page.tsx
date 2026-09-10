"use client";

import React, { useState, useEffect } from 'react';
import { 
  Factory, Search, Calendar, Eye, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, AlertTriangle, Edit2,PackageSearch, Calculator, Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function OperacionesPage() {
  const [data, setData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [estadosCatalogo, setEstadosCatalogo] = useState<any[]>([]);
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTROS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('TODOS');
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // MODALES
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);
  const [modalGestionOpen, setModalGestionOpen] = useState(false);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState<string[]>([]);
  const [nuevoEstadoSel, setNuevoEstadoSel] = useState('');
  const [fechaConfeccionSel, setFechaConfeccionSel] = useState('');
  const [observacionOpSel, setObservacionOpSel] = useState('');
  const [modalStockOpen, setModalStockOpen] = useState(false);
  const [grupoStock, setGrupoStock] = useState<any>(null);
  const [resumenStock, setResumenStock] = useState<any[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [prendasCustomCount, setPrendasCustomCount] = useState(0);
  const [fechaStockProduccion, setFechaStockProduccion] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };
  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [pedidoIdsReq, setPedidoIdsReq] = useState<string[]>([]);
  const [nuevaFechaReq, setNuevaFechaReq] = useState('');
  const [motivoFechaReq, setMotivoFechaReq] = useState('');

  const abrirModalFechaMasiva = () => {
    if (!grupoDetalle || !grupoDetalle.pedidosAsociados) return;
    
    // Extraemos todos los IDs de los contratos de este grupo
    const ids = Array.from(grupoDetalle.pedidosAsociados.values()).map((p: any) => p.id);
    setPedidoIdsReq(ids);
    
    // Tomamos la fecha del primer contrato como referencia
    const primerPedido = Array.from(grupoDetalle.pedidosAsociados.values())[0] as any;
    setNuevaFechaReq(primerPedido?.fechaRequerida ? new Date(primerPedido.fechaRequerida).toISOString().split('T')[0] : '');
    setMotivoFechaReq('');
    setModalFechaOpen(true);
  };

  const handleGuardarFechaReq = async () => {
    if (!nuevaFechaReq) return showToast('error', 'Seleccione la nueva fecha.');
    if (motivoFechaReq.trim().length < 10) return showToast('error', 'Justificación muy corta. Explique el motivo (mínimo 10 letras).');
    
    setSaving(true);
    try {
      const res = await fetch('/api/operaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'cambiar_fecha_requerida', pedidoIds: pedidoIdsReq, nuevaFecha: nuevaFechaReq, motivo: motivoFechaReq })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast('exito', 'Fechas de entrega reprogramadas en todos los contratos.');
      setModalFechaOpen(false);
      await cargarDatos();
    } catch (e: any) {
      showToast('error', e.message || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resOps, resInst] = await Promise.all([
        fetch(`/api/operaciones?estado=${selectedEstadoFilter}&fechaInicio=${fechaDesde}&fechaFin=${fechaHasta}`),
        fetch('/api/instituciones')
      ]);
      const jsonOps = await resOps.json();
      const jsonInst = await resInst.json();

      if (jsonOps.tabla) {
        setData(jsonOps.tabla);
        setKpis(jsonOps.kpis || {});
        setEstadosCatalogo(jsonOps.catalogos?.estados || []);
        if (jsonOps.catalogos?.estados?.length > 0 && !nuevoEstadoSel) {
           setNuevoEstadoSel(jsonOps.catalogos.estados[0].nombre);
        }
      }
      setInstitucionesList(Array.isArray(jsonInst) ? jsonInst : (jsonInst.data || []));
    } catch (e) {
      showToast('error', 'Error al cargar operaciones.');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [selectedEstadoFilter, fechaDesde, fechaHasta]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter]);

  useEffect(() => {
    if (grupoDetalle && data.length > 0) {
      const grupoActualizado = data.find(g => g.id === grupoDetalle.id);
      if (grupoActualizado) setGrupoDetalle(grupoActualizado);
    }
  }, [data]);

  const handleOpenDetalle = (grupo: any) => {
    setGrupoDetalle(grupo); setContratoExpandido(null); setPrendasSeleccionadas([]); setModalDetalleOpen(true);
  };
  const handleOpenStock = (grupo: any) => {
    setGrupoStock(grupo);
    let customCount = 0;
    const mapaGenericas = new Map();

    grupo.pedidosAsociados.forEach((ped: any) => {
      ped.detalles.forEach((det: any) => {
        if (det.estadoOperacion !== 'Pendiente en revision') return;

        // Nueva regla: Solo si tiene observación escrita es "Personalizada/Obligatoria a Producción"
        const tieneObservacion = (det.observacion && det.observacion.trim() !== '');

        if (tieneObservacion) {
          customCount += det.cantidad;
        }

        // AHORA AGRUPAMOS TODAS (tengan o no observación) para que la tabla muestre el Total Real de la escuela
        const sku = det.skuCodigo || 'S/N';
        const ropa = det.tipoRopa || 'Prenda';
        const color = det.color || '-';
        const talla = det.talla || '-';
        const genero = det.genero || '-';
        const observacion = det.observacion || '-';
        const bordado = det.bordado || '-';
        
        const key = `${sku}|${ropa}|${color}|${talla}|${genero}|${observacion}|${bordado}`;

        if (!mapaGenericas.has(key)) {
          mapaGenericas.set(key, { key, sku, prenda: ropa, color, talla,genero, observacion, bordado,  totalSolicitado: 0 });
        }
        mapaGenericas.get(key).totalSolicitado += det.cantidad;
      });
    });

    setPrendasCustomCount(customCount);
    const arrayStock = Array.from(mapaGenericas.values());
    
    if (arrayStock.length === 0) {
      return showToast('error', 'No hay prendas en "Pendiente en revisión" para balancear.');
    }
    arrayStock.sort((a: any, b: any) => a.sku.localeCompare(b.sku));

    setResumenStock(arrayStock);
    const initInputs: Record<string, number> = {};
    arrayStock.forEach(item => { initInputs[item.key] = 0; });
    setStockInputs(initInputs);

    setModalStockOpen(true);
  };

  const handleGuardarStock = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/operaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'asignacion_stock',
          institucionId: grupoStock.id,
          stockAsignado: stockInputs,
          fechaEstimadaConfeccion: fechaStockProduccion || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast('exito', '¡Balance de Stock aplicado a Producción y Despachos!');
      setModalStockOpen(false);
      await cargarDatos();
    } catch (e: any) {
      showToast('error', e.message || 'Error al guardar stock.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSeleccionPrenda = (id: string) => {
    if (prendasSeleccionadas.includes(id)) {
      setPrendasSeleccionadas(prendasSeleccionadas.filter(pId => pId !== id));
    } else {
      setPrendasSeleccionadas([...prendasSeleccionadas, id]);
    }
  };

  const abrirModalGestion = (pIds: string[]) => {
    if (pIds.length === 0) return showToast('error', 'Seleccione al menos una prenda.');
    setPrendasSeleccionadas(pIds); setFechaConfeccionSel(''); setObservacionOpSel(''); setModalGestionOpen(true);
  };

  const handleGuardarGestion = async () => {
    if (!nuevoEstadoSel) return showToast('error', 'Seleccione un estado del catálogo.');
    setSaving(true);
    try {
      const res = await fetch('/api/operaciones', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prendaIds: prendasSeleccionadas, nuevoEstado: nuevoEstadoSel, fechaEstimadaConfeccion: fechaConfeccionSel || undefined, observacionOperaciones: observacionOpSel })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast('exito', '¡Actualizado con éxito!');
      setModalGestionOpen(false); setPrendasSeleccionadas([]); await cargarDatos();
    } catch (e: any) { showToast('error', e.message || 'Error al guardar.'); } finally { setSaving(false); }
  };

  const getEstadoColor = (estado: string) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('varios')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (e.includes('revision')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (e.includes('producci')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (e.includes('empaque')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (e.includes('listos')) return 'bg-teal-100 text-teal-800 border-teal-200';
    if (e.includes('despacho')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoPedido?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.institucionId === selectedInstFilter : true;
    return matchSearch && matchInst;
  });
  
  // ▼ 1. COPIA Y PEGA DESDE AQUÍ HASTA paginatedData ▼
  const sortedData = [...filteredData].sort((a, b) => {
    const isFantasmaA = !a.fechaRequeridaTexto || a.fechaRequeridaTexto.includes('1969') || a.fechaRequeridaTexto.includes('1970');
    const isFantasmaB = !b.fechaRequeridaTexto || b.fechaRequeridaTexto.includes('1969') || b.fechaRequeridaTexto.includes('1970');

    // Mandar fantasmas (sin fecha) al final
    if (isFantasmaA && !isFantasmaB) return 1;
    if (!isFantasmaA && isFantasmaB) return -1;
    if (isFantasmaA && isFantasmaB) return 0;
    if (a.esAtrasado && !b.esAtrasado) return -1;
    if (!a.esAtrasado && b.esAtrasado) return 1;
    const parseDate = (dStr: string) => {
      if (!dStr) return new Date(8640000000000000).getTime();
      if (dStr.includes('-')) return new Date(dStr).getTime();
      const p = dStr.split('/');
      return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : new Date(dStr).getTime();
    };

    return parseDate(a.fechaRequerida || a.fechaRequeridaTexto) - parseDate(b.fechaRequerida || b.fechaRequeridaTexto);
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  // ▲ FIN DE LA COPIA ▲
  
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Factory className="text-primary" /> Módulo de Operaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de Producción y Asignación Inteligente de Stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Tus KPIs... */}
        <button onClick={() => setSelectedEstadoFilter('PENDIENTES')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'PENDIENTES' ? 'bg-slate-800 text-white border-slate-900 shadow-md' : 'bg-white border-gray-200 hover:border-slate-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'PENDIENTES' ? 'text-white' : 'text-gray-500'}`}>Total Pendientes</p>
          <p className="text-2xl font-black mt-1">{kpis.totalPendientes || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('Pendiente en revision')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'Pendiente en revision' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'Pendiente en revision' ? 'text-white' : 'text-gray-500'}`}>En Revisión</p>
          <p className="text-2xl font-black mt-1">{kpis.enRevision || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('En produccion')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'En produccion' ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white border-gray-200 hover:border-purple-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'En produccion' ? 'text-white' : 'text-gray-500'}`}>En Producción</p>
          <p className="text-2xl font-black mt-1">{kpis.enProduccion || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('en empaque')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'en empaque' ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'en empaque' ? 'text-white' : 'text-gray-500'}`}>En Empaque</p>
          <p className="text-2xl font-black mt-1">{kpis.enEmpaque || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('Listos para el despacho')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'Listos para el despacho' ? 'bg-teal-600 text-white border-teal-700 shadow-md' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'Listos para el despacho' ? 'text-white' : 'text-gray-500'}`}>Listos Despacho</p>
          <p className="text-2xl font-black mt-1">{kpis.listosDespacho || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('HOY')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'HOY' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white border-gray-200 hover:border-emerald-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'HOY' ? 'text-white' : 'text-gray-500'}`}>Despachos Hoy</p>
          <p className="text-2xl font-black mt-1">{kpis.despachosHoy || 0}</p>
        </button>
        <button onClick={() => setSelectedEstadoFilter('ATRASADOS')} className={`p-3 rounded-xl border text-left transition-all ${selectedEstadoFilter === 'ATRASADOS' ? 'bg-red-600 text-white border-red-700 shadow-md' : 'bg-red-50 border-red-200 hover:border-red-300'}`}>
          <p className={`text-[10px] font-bold uppercase ${selectedEstadoFilter === 'ATRASADOS' ? 'text-white' : 'text-red-600'}`}>Atrasados</p>
          <p className="text-2xl font-black text-red-700 mt-1">{kpis.atrasados || 0}</p>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50 border-gray-200" placeholder="Buscar Institución o Código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold bg-gray-50 text-gray-700 w-full outline-none" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
          <option value="">🏫 Todas las Instituciones</option>
          {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Vista:</span>
          <Badge className="bg-primary text-white text-xs font-bold uppercase">{selectedEstadoFilter}</Badge>
          {selectedEstadoFilter !== 'TODOS' && (
            <Button size="sm" variant="ghost" className="text-xs text-red-500 font-bold h-8" onClick={() => setSelectedEstadoFilter('TODOS')}>Restablecer</Button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100">
          <Calendar size={16} className="text-blue-500 ml-1 shrink-0" />
          <div className="flex items-center gap-2 w-full">
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            <span className="text-xs font-bold text-gray-400">-</span>
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando operaciones...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageSearch size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay registros que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-auto max-h-[65vh] w-full">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                <tr className="text-gray-600 font-black uppercase border-b border-gray-300">
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5">Vendedor</th>
                  <th className="p-3.5">Fecha Ingreso</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Estado Actual</th>
                  <th className="p-3.5 text-center">Fecha Requerida</th>
                  <th className="p-3.5 text-center">Fecha Est. Confección</th>
                  <th className="p-3.5 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => {
                  const isFantasma = item.fechaRequeridaTexto?.includes('1969') || item.fechaRequeridaTexto?.includes('1970');
                  const fechaReqCorregida = isFantasma ? 'No asignada' : item.fechaRequeridaTexto;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-blue-600">{item.codigoPedido}</td>
                      <td className="p-3.5 font-bold text-gray-900 truncate max-w-150px">{item.institucionNombre}</td>
                      <td className="p-3.5 text-gray-600 font-semibold">{item.vendedorNombre}</td>
                      <td className="p-3.5 text-gray-500">{item.fechaIngresoTexto}</td>
                      <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                      <td className="p-3.5 text-center"><Badge className={getEstadoColor(item.estadoActual)}>{item.estadoActual}</Badge></td>
                      <td className="p-3.5 text-center">
                        <span className={`font-bold px-2 py-1 rounded border ${item.esAtrasado ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {fechaReqCorregida}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-gray-700">{item.fechaEstimadaConfeccionTexto}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" title="Balance de Stock / Producción" className="h-8 w-8 text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200" onClick={() => handleOpenStock(item)}>
                            <Calculator size={16} />
                          </Button>
                          <Button size="icon" variant="ghost" title="Gestionar Prendas Manualmente" className="h-8 w-8 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200" onClick={() => handleOpenDetalle(item)}>
                            <Eye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="sticky bottom-0 z-20 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/95 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <span className="text-xs text-gray-500 font-medium">Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14} className="mr-1" /> Ant.</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">Sig. <ChevronRight size={14} className="ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={modalStockOpen} onOpenChange={setModalStockOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="text-amber-600" /> Consolidación de Bodega / Producción
              </div>
              <Badge className="bg-primary text-white text-xs">{grupoStock?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
              <h3 className="text-sm font-black text-blue-900 uppercase">Institución: {grupoStock?.institucionNombre}</h3>
              <p className="text-xs text-blue-700 mt-1">Este panel agrupa prendas idénticas de todos los contratos "Pendientes de Revisión". Ingresa lo que tengas en bodega física y el sistema dividirá o desatascará los contratos automáticamente.</p>
            </div>

            {prendasCustomCount > 0 && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 flex items-center gap-3 mb-4">
                <AlertCircle className="text-purple-600 shrink-0" size={20}/>
                <p className="text-xs text-purple-800 font-medium">
                  <strong>Atención: {prendasCustomCount} prenda(s)</strong> de esta lista tiene una <strong className="font-black">Observación Especial</strong>. 
                  La tabla de abajo te muestra el <strong>Total General</strong>, pero al procesar, el sistema enviará obligatoriamente la prenda con observación a Producción, y usará tu Stock para asignarlo únicamente a las prendas regulares.
                </p>
              </div>
            
            )}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <Label className="text-xs font-black text-purple-900 uppercase">Fecha Est. Confección (Para Taller)</Label>
                <p className="text-[10px] text-purple-700 mt-0.5">Asigna el plazo de entrega a las prendas que se enviarán a Producción por falta de stock.</p>
              </div>
              <Input
                type="date"
                className="h-10 text-xs font-bold bg-white border-purple-300 w-full md:w-48 focus:ring-purple-500"
                value={fechaStockProduccion}
                onChange={e => setFechaStockProduccion(e.target.value)}
              />
            </div>

            {resumenStock.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 uppercase">
                      <th className="p-3 font-bold">Código SKU</th>
                      <th className="p-3 font-bold">Prenda</th>
                      <th className="p-3 text-center font-bold">Talla/Color/Genero</th>
                      <th className="p-3">Bordado/Obs</th>
                      <th className="p-3 text-center font-black">Total Solicitado</th>
                      <th className="p-3 text-center font-bold bg-amber-50/50 border-l border-amber-100 w-32">En Stock</th>
                      <th className="p-3 text-center font-bold text-red-600 bg-red-50/50">A Producción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {resumenStock.map(row => {
                      const currentStock = stockInputs[row.key] || 0;
                      const diff = row.totalSolicitado - currentStock;
                      return (
                        <tr key={row.key} className="hover:bg-gray-50">
                          <td className="p-3 font-mono font-bold text-blue-600">{row.sku}</td>
                          <td className="p-3 font-bold text-gray-800">{row.prenda}</td>
                          <td className="p-3 text-center text-gray-600">{row.talla} ({row.color}) ({row.genero})</td>
                          <td className="p-3 text-[10px]">
                          <div className="font-bold text-purple-700">{row.bordado || 'Sin bordado'}</div>
                          <div className="text-gray-500 italic mt-0.5">{row.observacion || 'Sin obs.'}</div>
                        </td>
                          <td className="p-3 text-center font-black text-gray-900 text-sm">{row.totalSolicitado}</td>
                          <td className="p-2 border-l border-amber-50 bg-amber-50/30 text-center">
                            <Input 
                              type="number" min="0" max={row.totalSolicitado}
                              className="h-9 text-center font-black text-amber-700 bg-white border-amber-300 focus-visible:ring-amber-500"
                              value={stockInputs[row.key] === 0 ? '' : stockInputs[row.key]}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setStockInputs({...stockInputs, [row.key]: Math.min(row.totalSolicitado, val)});
                              }}
                            />
                          </td>
                          <td className="p-3 text-center font-black text-red-600 bg-red-50/30 text-sm">
                            {diff > 0 ? diff : 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm font-bold text-gray-400 py-6">No hay prendas genéricas pendientes.</p>
            )}
          </div>

          <DialogFooter className="mt-5 flex justify-between items-center border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setModalStockOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-6 shadow-md" disabled={saving} onClick={handleGuardarStock}>
              {saving ? 'Calculando y Procesando...' : '⚙️ Procesar y Asignar (Desatascar)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-6xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[88vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <span>Control Operativo Manual - {grupoDetalle?.institucionNombre}</span>
              <Badge className="bg-primary text-white text-xs">{grupoDetalle?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">CÓDIGO PEDIDO</span><span className="font-mono font-black text-blue-600">{grupoDetalle?.codigoPedido}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">VENDEDOR</span><span className="font-extrabold text-gray-800">{grupoDetalle?.vendedorNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
            </div>
            <div className="mt-3 mb-2 bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={12}/> Entrega Prometida Global:</p>
                <p className={`text-sm font-black ${grupoDetalle?.esAtrasado ? 'text-red-600' : 'text-gray-900'}`}>
                  {grupoDetalle?.fechaRequeridaTexto || 'No asignada'}
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-blue-700 bg-white border-blue-300 hover:bg-blue-100 font-bold shadow-sm" onClick={abrirModalFechaMasiva}>
                <Edit2 size={14} className="mr-2"/> Reprogramar Entrega Completa
              </Button>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Desglose por Contrato y Prendas:</p>
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80 border-b border-gray-100">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">Contrato #{ped.numContrato}</Badge>
                          <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                          <Badge className={`ml-2 text-[10px] ${getEstadoColor(ped.estadoGlobalContrato)}`}>{ped.estadoGlobalContrato}</Badge>
                        </div>
                        {ped.motivoCambioFecha && (
                          <p className="text-[10px] text-red-700 font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle size={12}/> Motivo de reprogramación: {ped.motivoCambioFecha}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1 shrink-0" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                        <Eye size={14} /> {isExpanded ? 'Ocultar' : 'Ver Prendas'}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto space-y-3">
                        <table className="w-full text-left text-xs border-collapse min-w-650px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase text-[10px]">
                              <th className="p-2 text-center w-8">Sel.</th>
                              <th className="p-2">Código</th><th className="p-2">Prenda</th>
                              <th className="p-2">Color / Talla / Genero</th>
                              <th className="p-2 text-center">Cant.</th>
                              <th className="p-2">Bordado</th>
                              <th className="p-2">Observación</th>
                              <th className="p-2 text-center">Estado Operación</th>
                              <th className="p-2 text-center">Fecha Confección</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {[...ped.detalles].sort((a: any, b: any) => (a.skuCodigo || '').localeCompare(b.skuCodigo || '')).map((p: any) => (
                              <tr key={p.id} className="hover:bg-white">
                                <td className="p-2 text-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer" checked={prendasSeleccionadas.includes(p.id)} onChange={() => toggleSeleccionPrenda(p.id)} /></td>
                                <td className="p-2 font-mono font-bold text-blue-600">{p.skuCodigo || 'S/N'}</td>
                                <td className="p-2 font-bold text-gray-800">{p.tipoRopa}</td>
                                <td className="p-2 text-gray-600">{p.color} ({p.talla}) ({p.genero})</td>
                                <td className="p-2 text-center font-black">{p.cantidad}</td>
                                <td className="p-2 text-[11px]">{p.bordado ? <span className="font-bold text-purple-700">{p.bordado}</span> : <span className="text-gray-400 italic">Sin bordado</span>}</td>
                                <td className="p-2 text-[11px]">{(p.observacion || p.observacionOperaciones) ? <span className="text-gray-800 font-medium">{p.observacion || p.observacionOperaciones}</span> : <span className="text-gray-400 italic">Sin observaciones</span>}</td>
                                <td className="p-2 text-center"><Badge variant="outline" className={`font-bold text-[10px] ${getEstadoColor(p.estadoOperacion)}`}>{p.estadoOperacion}</Badge></td>
                                <td className="p-2 text-center font-semibold text-gray-700">{p.fechaEstimadaConfeccionTexto}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-end pt-2">
                          <Button size="sm" onClick={() => {
                            const seleccionadasDeEsteContrato = prendasSeleccionadas.filter(id => ped.detalles.some((p: any) => p.id === id));
                            if (seleccionadasDeEsteContrato.length === 0) return showToast('error', 'Seleccione al menos una prenda marcando las casillas de la izquierda.');
                            abrirModalGestion(seleccionadasDeEsteContrato);
                          }} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-8">
                            Actualizar Seleccionadas
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" size="sm" onClick={() => setModalDetalleOpen(false)}>Cerrar Panel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modalGestionOpen} onOpenChange={setModalGestionOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black text-gray-900 border-b pb-2">Actualizar Operaciones</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100 font-medium">Aplicando cambios a <strong>{prendasSeleccionadas.length}</strong> prenda(s).</p>
            <div>
              <Label className="text-xs font-bold text-gray-700">Estado de Operación *</Label>
              <select className="w-full h-10 border rounded-xl px-3 text-sm font-bold bg-white mt-1 outline-none" value={nuevoEstadoSel} onChange={e => setNuevoEstadoSel(e.target.value)}>
                {estadosCatalogo.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700">Fecha Estimada de Confección</Label>
              <Input type="date" className="h-10 text-xs font-bold bg-white mt-1" value={fechaConfeccionSel} onChange={e => setFechaConfeccionSel(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700">Observación / Motivo</Label>
              <Input className="h-10 text-xs bg-white mt-1" placeholder="Ej: Se envía parcial por tela..." value={observacionOpSel} onChange={e => setObservacionOpSel(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalGestionOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary text-white font-bold" disabled={saving} onClick={handleGuardarGestion}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 🔥 MODAL PARA REPROGRAMAR FECHA REQUERIDA 🔥 */}
      <Dialog open={modalFechaOpen} onOpenChange={setModalFechaOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black text-gray-900 border-b pb-2">Reprogramar Fecha de Entrega</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-800 font-medium leading-relaxed">
              Al cambiar la fecha, el vendedor visualizará este cambio en su panel. <br/><b>Debes justificar el motivo obligatoriamente para fines de auditoría.</b>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700">Nueva Fecha de Entrega Prometida *</Label>
              <Input type="date" className="h-10 text-xs font-bold bg-white mt-1 border-gray-300" value={nuevaFechaReq} onChange={e => setNuevaFechaReq(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700">Motivo del Cambio / Retraso (Auditoría) *</Label>
              <textarea 
                className="w-full h-24 border border-gray-300 rounded-lg p-3 text-xs bg-white mt-1 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none" 
                placeholder="Ej: Retraso por falta de tela del proveedor, o error en bordados..." 
                value={motivoFechaReq} 
                onChange={e => setMotivoFechaReq(e.target.value)} 
              />
              <p className={`text-[10px] font-bold mt-1 ${motivoFechaReq.length >= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {motivoFechaReq.length}/10 caracteres mínimos.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalFechaOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" disabled={saving || motivoFechaReq.trim().length < 10} onClick={handleGuardarFechaReq}>
              {saving ? 'Guardando...' : 'Confirmar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOAST GLOBAL */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}