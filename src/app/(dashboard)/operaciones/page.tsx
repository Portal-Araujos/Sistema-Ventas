"use client";

import React, { useState, useEffect } from 'react';
import { Factory, Search, Filter, Calendar, Eye, CalendarClock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, PackageSearch, Lock } from 'lucide-react';
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
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // MODALES
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);

  const [modalReprogramar, setModalReprogramar] = useState(false);
  const [contratoSel, setContratoSel] = useState<any>(null);
  
  // Formulario de Reprogramación
  const [formReprogramar, setFormReprogramar] = useState({
    estado: '', fechaRequerida: '', motivoCambioFecha: '', operarioAsignado: ''
  });
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resOps, resInst] = await Promise.all([
        fetch(`/api/operaciones?fechaInicio=${fechaDesde}&fechaFin=${fechaHasta}`),
        fetch('/api/instituciones')
      ]);
      const jsonOps = await resOps.json();
      const jsonInst = await resInst.json();

      if (jsonOps.tabla) {
        setData(jsonOps.tabla);
        setKpis(jsonOps.kpis);
        setEstadosCatalogo(jsonOps.catalogos?.estados || []);
      }
      setInstitucionesList(Array.isArray(jsonInst) ? jsonInst : (jsonInst.data || []));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [fechaDesde, fechaHasta]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, selectedEstadoFilter]);

  const handleOpenDetalle = (grupo: any) => {
    setGrupoDetalle(grupo);
    setContratoExpandido(null);
    setModalDetalleOpen(true);
  };

  const handleOpenReprogramar = (contrato: any) => {
    setContratoSel(contrato);
    setFormReprogramar({
      estado: contrato.estado || '',
      fechaRequerida: contrato.fechaRequerida ? new Date(contrato.fechaRequerida).toISOString().split('T')[0] : '',
      motivoCambioFecha: contrato.motivoCambioFecha || '',
      operarioAsignado: contrato.operarioAsignado || ''
    });
    setModalReprogramar(true);
  };

  const handleGuardarOperacion = async () => {
    if (!formReprogramar.estado) { showToast('error', 'Seleccione un estado'); return; }
    
    setSaving(true);
    try {
      const res = await fetch('/api/operaciones', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contratoSel.id,
          estado: formReprogramar.estado,
          fechaRequerida: formReprogramar.fechaRequerida || null,
          motivoCambioFecha: formReprogramar.motivoCambioFecha,
          operarioAsignado: formReprogramar.operarioAsignado
        })
      });

      if (!res.ok) throw new Error();
      showToast('exito', 'Contrato actualizado con éxito.');
      setModalReprogramar(false);
      setModalDetalleOpen(false); 
      cargarDatos();
    } catch (e) { showToast('error', 'Error al guardar.'); } finally { setSaving(false); }
  };

  // 🔥 NUEVO: APROBACIÓN MASIVA PARA MANDAR A PRODUCCIÓN 🔥
  const handleAprobarEscuela = async (institucionId: string) => {
    if (!confirm('¿Confirmas que hay STOCK para toda esta escuela? Se enviarán todos sus paquetes a Producción.')) return;
    try {
      const res = await fetch('/api/operaciones', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'aprobar_escuela', institucionId })
      });
      if (!res.ok) throw new Error();
      showToast('exito', '¡Escuela enviada a Producción exitosamente!');
      cargarDatos();
    } catch (e) { showToast('error', 'Error al aprobar la escuela.'); }
  };

  const getEstadoColor = (estado: string) => {
    if (estado?.includes('Pendiente')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (estado?.includes('producción')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (estado?.includes('empaque')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (estado?.includes('Despachado') || estado?.includes('Listos')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // 🔥 CORRECCIÓN DEL FILTRO: Usamos estadosArray 🔥
  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoPedido?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.id === selectedInstFilter : true;
    
    // Aquí validamos que si es un solo estado o si la escuela tiene varios
    const matchEstado = selectedEstadoFilter 
      ? g.estadoActual === selectedEstadoFilter || (g.estadosArray && g.estadosArray.includes(selectedEstadoFilter)) 
      : true;
      
    return matchSearch && matchInst && matchEstado;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Factory className="text-primary" /> Módulo de Operaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Revisión de Stock y Envío a Taller.</p>
        </div>
      </div>

      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">En Revisión</p>
          <p className="text-2xl font-black text-amber-600">{kpis.enRevision || 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">En Producción</p>
          <p className="text-2xl font-black text-blue-600">{kpis.enProduccion || 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">En Empaque</p>
          <p className="text-2xl font-black text-purple-600">{kpis.enEmpaque || 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Listos Despacho</p>
          <p className="text-2xl font-black text-teal-600">{kpis.listosDespacho || 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Despachos Hoy</p>
          <p className="text-2xl font-black text-emerald-600">{kpis.despachosHoy || 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Pendientes</p>
          <p className="text-2xl font-black text-gray-800">{kpis.totalPendientes || 0}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-xl border border-red-200 shadow-sm text-center">
          <p className="text-[10px] font-bold text-red-600 uppercase flex items-center justify-center gap-1"><AlertTriangle size={12}/> Atrasados</p>
          <p className="text-2xl font-black text-red-700">{kpis.atrasados || 0}</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 items-center">
        <div className="relative col-span-1 md:col-span-2 lg:col-span-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50 border-gray-200" placeholder="Buscar Institución o Código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold bg-gray-50 text-gray-700 w-full" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
          <option value="">🏫 Todas las Instituciones</option>
          {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
        </select>

        <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold bg-gray-50 text-gray-700 w-full" value={selectedEstadoFilter} onChange={e => setSelectedEstadoFilter(e.target.value)}>
          <option value="">⚙️ Todos los Estados</option>
          {estadosCatalogo.map((e: any) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
        </select>

        <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100 col-span-1 md:col-span-2 lg:col-span-2">
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
          <p className="font-bold text-lg text-gray-700">No hay operaciones que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-700px">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-black uppercase border-b border-gray-200">
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5">Vendedor</th>
                  <th className="p-3.5">Fecha Ingreso</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Estado Actual</th>
                  <th className="p-3.5 text-center">Fecha Requerida</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-black text-blue-600">{item.codigoPedido}</td>
                    <td className="p-3.5 font-bold text-gray-900 truncate max-w-150px">{item.institucionNombre}</td>
                    <td className="p-3.5 text-gray-600 font-semibold">{item.vendedorNombre}</td>
                    <td className="p-3.5 text-gray-500">{item.fechaIngresoTexto}</td>
                    <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                    <td className="p-3.5 text-center">
                      <Badge className={getEstadoColor(item.estadoActual)}>{item.estadoActual}</Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`font-bold px-2 py-1 rounded border ${item.esAtrasado ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {item.fechaRequeridaTexto}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.estadoActual === 'Pendiente en revisión' && (
                          <Button size="icon" variant="ghost" title="Aprobar Todo a Producción" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleAprobarEscuela(item.id)}>
                            <CheckCircle2 size={16} />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Ver Detalle" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDetalle(item)}>
                          <Eye size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* CONTROL DE PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">
                  <ChevronLeft size={14} className="mr-1" /> Ant.
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">
                  Sig. <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 👁️ MODAL: VER DETALLES / GESTIONAR */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <span>Control de Operaciones</span>
              <Badge className="bg-primary text-white text-xs">{grupoDetalle?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">FECHA INGRESO</span><span className="font-extrabold text-gray-700">{grupoDetalle?.fechaIngresoTexto}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">TOTAL PRENDAS</span><span className="font-black text-emerald-600 text-sm">{grupoDetalle?.totalPrendas}</span></div>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Contratos (Cambiar Estado / Reprogramar):</p>
            
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                const reqDate = ped.fechaRequerida ? new Date(ped.fechaRequerida).toLocaleDateString('es-EC') : 'Sin Asignar';
                
                const esEditable = ped.estado === 'Pendiente en revisión' || ped.estado === 'En Operaciones' || ped.estado === 'Borrador';

                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/80">
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">
                            C. #{ped.numContrato}
                          </Badge>
                          <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] mt-1">
                          <Badge className={getEstadoColor(ped.estado)}>{ped.estado}</Badge>
                          <span className="font-bold text-gray-500 flex items-center gap-1"><CalendarClock size={12}/> Entrega: {reqDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {esEditable ? (
                          <Button size="sm" variant="secondary" className="text-xs font-bold w-full md:w-auto h-8 bg-white border border-gray-300 text-gray-800 hover:border-emerald-500 hover:text-emerald-700" onClick={() => handleOpenReprogramar(ped)}>
                            ✅ Aprobar / Reprogramar
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 font-bold px-3 py-1.5 flex items-center gap-1">
                            <Lock size={12}/> Enviado a Taller
                          </Badge>
                        )}

                        <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1 w-full md:w-auto h-8" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                          <Eye size={14} /> {isExpanded ? 'Ocultar' : 'Ver Prendas'}
                        </Button>
                      </div>
                    </div>

                    {ped.motivoCambioFecha && (
                      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                        <p><strong>Motivo Reprogramación:</strong> {ped.motivoCambioFecha}</p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-550px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                              <th className="pb-2">SKU</th><th className="pb-2">Prenda</th><th className="pb-2">Color</th><th className="pb-2">Sexo</th><th className="pb-2">Talla</th><th className="pb-2 text-center">Cant.</th><th className="pb-2">Bordado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ped.detalles?.map((p: any, i: number) => (
                              <tr key={i} className="hover:bg-white">
                                <td className="py-2 font-mono font-bold text-blue-600">{p.skuCodigo}</td>
                                <td className="py-2 font-bold text-gray-800">{p.tipoRopa}</td>
                                <td className="py-2 text-gray-600">{p.color}</td>
                                <td className="py-2 font-semibold text-purple-700">{p.genero}</td>
                                <td className="py-2 font-bold text-primary">{p.talla}</td>
                                <td className="py-2 text-center font-black">{p.cantidad}</td>
                                <td className="py-2 text-gray-600 italic">{p.bordado || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

      {/* 🗓️ MODAL DE APROBACIÓN / ESTADO */}
      <Dialog open={modalReprogramar} onOpenChange={setModalReprogramar}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <CalendarClock className="text-primary"/> Cambiar Estado / Fecha
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
              <p className="text-[11px] text-blue-800 font-medium">Al cambiar el estado a <strong>"En producción"</strong>, este paquete se bloqueará en esta pantalla y viajará a la bandeja del Jefe de Taller.</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500">Estado de Operación *</Label>
              <select className="w-full h-10 border rounded-xl px-3 text-sm font-bold bg-white mt-1 focus:ring-primary" value={formReprogramar.estado} onChange={e => setFormReprogramar({...formReprogramar, estado: e.target.value})}>
                <option value="">Seleccione estado...</option>
                {estadosCatalogo.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-bold text-gray-500">Fecha Requerida de Entrega 🗓️</Label>
                <Input type="date" className="h-10 text-xs mt-1 border-primary/50 bg-primary/5 font-bold" value={formReprogramar.fechaRequerida} onChange={e => setFormReprogramar({...formReprogramar, fechaRequerida: e.target.value})} />
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Label className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1"><AlertCircle size={12}/> Motivo de Reprogramación / Demora</Label>
              <textarea 
                className="w-full mt-2 border-amber-200 rounded-lg p-2 text-xs bg-white min-h-70px focus:ring-amber-500" 
                placeholder="Obligatorio si se cambia la fecha original. Ej: Demora del proveedor de hilos..." 
                value={formReprogramar.motivoCambioFecha} 
                onChange={e => setFormReprogramar({...formReprogramar, motivoCambioFecha: e.target.value})} 
              />
            </div>
          </div>

          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalReprogramar(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold" disabled={saving} onClick={handleGuardarOperacion}>
              {saving ? 'Guardando...' : 'Aprobar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOAST GLOBAL */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}