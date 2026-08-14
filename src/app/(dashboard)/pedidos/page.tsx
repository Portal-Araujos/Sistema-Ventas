"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Edit, Send, Plus, Trash2, CheckCircle2, AlertCircle, Search, Eye, PackageCheck, Filter, Shirt, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PedidosPage() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [tabActiva, setTabActiva] = useState<'Borrador' | 'Operaciones'>('Borrador');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [grupoEdit, setGrupoEdit] = useState<any>(null);
  const [pedidoEditSelId, setPedidoEditSelId] = useState<string>('');
  const [prendas, setPrendas] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [skuQuery, setSkuQuery] = useState('');
  const [skuResultados, setSkuResultados] = useState<any[]>([]);
  const [buscandoSku, setBuscandoSku] = useState(false);
  const [mostrarDropdownSku, setMostrarDropdownSku] = useState(false);
  const [skuSel, setSkuSel] = useState('');
  const [tipoRopa, setTipoRopa] = useState('');
  const [color, setColor] = useState('');
  const [genero, setGenero] = useState('UNISEX');
  const [talla, setTalla] = useState('M');
  const [cantidad, setCantidad] = useState('1');
  const [bordado, setBordado] = useState('');
  const [tipoPedido, setTipoPedido] = useState('Pedido');
  const [observacionGral, setObservacionGral] = useState('');
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };
  const cargarInstituciones = async () => {
    try {
      const res = await fetch('/api/instituciones');
      const data = await res.json();
      setInstitucionesList(Array.isArray(data) ? data : (data.data || []));
    } catch (e) {
      console.error(e);
    }
  };
  const cargarDatos = async () => {
    setLoading(true);
    try {
      let url = `/api/pedidos?estado=${tabActiva}&`;
      if (fechaDesde) url += `fechaInicio=${fechaDesde}&`;
      if (fechaHasta) url += `fechaFin=${fechaHasta}&`;
      if (selectedInstFilter) url += `institucionId=${selectedInstFilter}&`;
      const resPed = await fetch(url);
      const dataPed = await resPed.json();
      setGrupos(Array.isArray(dataPed) ? dataPed : []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };
  useEffect(() => { cargarInstituciones(); }, []);
  useEffect(() => { cargarDatos(); }, [tabActiva, fechaDesde, fechaHasta, selectedInstFilter]);
  useEffect(() => {
    if (skuQuery.trim().length < 2) {
      setSkuResultados([]);
      setMostrarDropdownSku(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoSku(true);
      try {
        const res = await fetch(`/api/pedidos/sku?q=${encodeURIComponent(skuQuery)}`);
        const data = await res.json();
        setSkuResultados(data.success && Array.isArray(data.raw) ? data.raw : []);
        setMostrarDropdownSku(true);
      } catch (e) {
        console.error(e);
      } finally {
        setBuscandoSku(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [skuQuery]);
  const seleccionarSkuBuscado = (item: any) => {
    setSkuSel(item.codigo);
    setTipoRopa(item.tipoRopa || '');
    setColor(item.color || '');
    setGenero(item.genero || 'UNISEX');
    setTalla(item.talla || 'M');
    setSkuQuery(`${item.codigo} - ${item.tipoRopa}`);
    setMostrarDropdownSku(false);
  };
  const handleOpenDetalle = (grupo: any) => {
    setGrupoDetalle(grupo);
    setContratoExpandido(null);
    setModalDetalleOpen(true);
  };
  const handleOpenEdit = (grupo: any) => {
    setGrupoEdit(grupo);
    if (grupo.pedidosAsociados && grupo.pedidosAsociados.length > 0) {
      seleccionarContratoParaEditar(grupo.pedidosAsociados[0]);
    }
    setModalEditOpen(true);
  };
  const seleccionarContratoParaEditar = (pedido: any) => {
    setPedidoEditSelId(pedido.id);
    setPrendas(pedido.detalles || []);
    setTipoPedido(pedido.tipoPedido || 'Pedido');
    setObservacionGral(pedido.observacion || '');
    setSkuQuery(''); setSkuSel('');
  };
  const handleEliminarGrupo = async (institucionId: string) => {
    if (!confirm('¿Eliminar TODOS los borradores de esta escuela?')) return;
    try {
      const res = await fetch(`/api/pedidos?institucionId=${institucionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('exito', 'Borradores eliminados.');
      cargarDatos();
    } catch (e) { showToast('error', 'Error al eliminar.'); }
  };
  const handleEnviarMasivo = async (institucionId: string) => {
    if (!confirm('¿Seguro que quieres enviar TODOS los contratos de esta escuela a Producción?')) return;
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'masivo', institucionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('exito', '¡Escuela enviada a Producción!');
      cargarDatos();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };
  const handleAgregarPrenda = () => {
    if (!tipoRopa) { showToast('error', 'Ingresa o selecciona la prenda.'); return; }
    const cantVal = parseInt(cantidad) || 1;
    if (cantVal <= 0) { showToast('error', 'La cantidad debe ser mayor a 0.'); return; }
    const yaExiste = prendas.some(p => 
      p.tipoRopa.toLowerCase().trim() === tipoRopa.toLowerCase().trim() &&
      p.talla.toLowerCase().trim() === talla.toLowerCase().trim() &&
      (p.color || '').toLowerCase().trim() === color.toLowerCase().trim() &&
      (p.genero || '').toLowerCase().trim() === genero.toLowerCase().trim()
    );

    if (yaExiste) {
      showToast('error', `¡Atención! La prenda "${tipoRopa} (${talla} - ${color} - ${genero})" ya está en la lista.`);
      return;
    }
    setPrendas([...prendas, {
      skuCodigo: skuSel || 'PERSONALIZADO',
      tipoRopa, color, genero, talla,
      cantidad: cantVal,
      bordado
    }]);
    setSkuSel(''); setSkuQuery(''); setTipoRopa(''); setColor(''); setBordado(''); setCantidad('1');
  };
  const handleGuardarContrato = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'individual',
          id: pedidoEditSelId,
          detalles: prendas,
          tipoPedido,
          observacion: observacionGral
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('exito', 'Contrato guardado exitosamente.');
      cargarDatos(); 
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };
  const filteredGrupos = grupos.filter(g =>
    g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.codigoPedido?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-primary" /> Módulo de Pedidos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Consolidado por Institución Educativa.</p>
        </div>
      </div>
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setTabActiva('Borrador')} className={`pb-3 px-3 text-sm font-black transition-all border-b-2 ${tabActiva === 'Borrador' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500'}`}>📝 Borradores Pendientes</button>
        <button onClick={() => setTabActiva('Operaciones')} className={`pb-3 px-3 text-sm font-black transition-all border-b-2 ${tabActiva === 'Operaciones' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500'}`}>🏭 Enviados a Operaciones</button>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50 border-gray-200" placeholder="Buscar por Institución o Código PED-..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full lg:w-auto">
          <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold bg-gray-50 text-gray-700 w-full" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
            <option value="">🏫 Todas las Instituciones</option>
            {institucionesList.map((inst: any) => (
              <option key={inst.id} value={inst.id}>{inst.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100 w-full lg:w-auto">
          <Calendar size={16} className="text-blue-500 ml-1 shrink-0" />
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-125px" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            <span className="text-xs font-bold text-gray-400">-</span>
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-125px" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando borradores...</div>
      ) : filteredGrupos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay escuelas en esta sección.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-650px">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-black uppercase border-b border-gray-200">
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5 text-center">Contratos</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Prendas</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5">Última Actualización</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGrupos.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-black text-blue-600">{item.codigoPedido}</td>
                    <td className="p-3.5 font-bold text-gray-900">{item.institucionNombre}</td>
                    <td className="p-3.5 text-center font-semibold text-gray-700">{item.contratosTotal}</td>
                    <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                    <td className="p-3.5 text-center font-black text-emerald-600 text-sm">{item.totalPrendas}</td>
                    <td className="p-3.5 text-center">
                      <Badge className={item.estado === 'Borrador' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>{item.estado}</Badge>
                    </td>
                    <td className="p-3.5 text-gray-500 whitespace-nowrap">{item.updatedAt}</td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.estado === 'Borrador' && (
                          <Button size="icon" variant="ghost" title="Enviar Todo a Producción" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleEnviarMasivo(item.id)}>
                            <Send size={15} />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Ver Contratos" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDetalle(item)}>
                          <Eye size={15} />
                        </Button>
                        {item.estado === 'Borrador' && (
                          <Button size="icon" variant="ghost" title="Completar Pedido" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleOpenEdit(item)}>
                            <Edit size={15} />
                          </Button>
                        )}
                        {item.estado === 'Borrador' && (
                          <Button size="icon" variant="ghost" title="Eliminar Toda la Escuela" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleEliminarGrupo(item.id)}>
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-3xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <span>Detalle del Pedido</span>
              <Badge className="bg-primary text-white text-xs">{grupoDetalle?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">CÓDIGO PEDIDO</span><span className="font-mono font-black text-blue-600">{grupoDetalle?.codigoPedido}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">FECHA DE CREACIÓN</span><span className="font-extrabold text-gray-700">{grupoDetalle?.fechaCreacionTexto}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">VENDEDOR</span><span className="font-extrabold text-gray-800">{grupoDetalle?.vendedorNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">CONTRATOS</span><span className="font-extrabold text-blue-700">{grupoDetalle?.contratosTotal}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
              <div className="col-span-2"><span className="text-gray-400 block font-bold uppercase">TOTAL PRENDAS</span><span className="font-black text-emerald-600 text-sm">{grupoDetalle?.totalPrendas} prendas</span></div>
            </div>
            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Contratos Registrados en esta Venta:</p>
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">
                          Contrato #{ped.numContrato}
                        </Badge>
                        <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                        <Eye size={14} />
                        {isExpanded ? 'Ocultar Prendas' : 'Ver Prendas'}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-550px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                              <th className="pb-2">SKU</th>
                              <th className="pb-2">Prenda</th>
                              <th className="pb-2">Color</th>
                              <th className="pb-2">Género</th>
                              <th className="pb-2">Talla</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2">Bordado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ped.detalles?.length === 0 ? (
                              <tr><td colSpan={7} className="py-3 text-center text-gray-400 italic">No hay prendas ingresadas en este contrato.</td></tr>
                            ) : (
                              ped.detalles?.map((p: any, i: number) => (
                                <tr key={i} className="hover:bg-white">
                                  <td className="py-2 font-mono font-bold text-blue-600">{p.skuCodigo}</td>
                                  <td className="py-2 font-bold text-gray-800">{p.tipoRopa}</td>
                                  <td className="py-2 text-gray-600">{p.color}</td>
                                  <td className="py-2 font-semibold text-purple-700">{p.genero}</td>
                                  <td className="py-2 font-bold text-primary">{p.talla}</td>
                                  <td className="py-2 text-center font-black">{p.cantidad}</td>
                                  <td className="py-2 text-gray-600 italic">{p.bordado || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalDetalleOpen(false)}>Cerrar Detalle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modalEditOpen} onOpenChange={setModalEditOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-2">Completar Pedidos - {grupoEdit?.institucionNombre}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col md:flex-row gap-6 mt-4">
            <div className="w-full md:w-1/3 border-r md:pr-4 space-y-3">
              <Label className="text-xs font-bold text-gray-500 uppercase">1. Elige un Contrato</Label>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {grupoEdit?.pedidosAsociados?.map((ped: any) => (
                  <button 
                    key={ped.id} 
                    onClick={() => seleccionarContratoParaEditar(ped)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${pedidoEditSelId === ped.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-gray-200 bg-white hover:border-primary/50'}`}
                  >
                    <p className="text-[10px] text-gray-500 mb-1 font-bold">Contrato #{ped.numContrato}</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{ped.nombreCliente}</p>
                    <div className="mt-2 flex justify-between items-center text-[11px] font-black">
                      <span className={ped.totalUnidadesContrato > 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {ped.totalUnidadesContrato > 0 ? `Total: ${ped.totalUnidadesContrato} prendas` : '0 prendas (Vacío)'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full md:w-2/3 space-y-4">
              <Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                <Shirt size={14}/> 2. Agregar Prendas al Contrato
              </Label>

              <div className="border border-primary/20 bg-primary/5 p-4 rounded-xl space-y-3">
                <div className="relative">
                  <Label className="text-[10px] font-bold text-gray-600"> Tipo de Prenda </Label>
                  <Input 
                    className="h-8 text-xs bg-white pr-8" 
                    placeholder="Escribe código SKU o Prenda (Ej: UN1843 o Calentador)..." 
                    value={skuQuery}
                    onChange={e => {
                      setSkuQuery(e.target.value);
                      setTipoRopa(e.target.value);
                    }}
                  />
                  {buscandoSku && <span className="absolute right-2.5 top-7 text-[10px] text-gray-400 font-bold">Buscando...</span>}
                  {mostrarDropdownSku && skuResultados.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1 divide-y divide-gray-100">
                      {skuResultados.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-2 text-xs hover:bg-primary/10 cursor-pointer flex justify-between items-center transition-colors"
                          onClick={() => seleccionarSkuBuscado(item)}
                        >
                          <div>
                            <span className="font-mono font-bold text-blue-600 mr-2">{item.codigo}</span>
                            <span className="font-bold text-gray-800">{item.tipoRopa}</span>
                            <span className="text-gray-500 text-[10px] ml-1">({item.color} - {item.genero})</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{item.talla}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><Label className="text-[10px]">Prenda *</Label><Input className="h-8 text-xs bg-white" value={tipoRopa} onChange={e=>setTipoRopa(e.target.value)} /></div>
                  <div><Label className="text-[10px]">Color</Label><Input className="h-8 text-xs bg-white" value={color} onChange={e=>setColor(e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px]">Sexo / Género</Label>
                    <select className="w-full h-8 border rounded-lg px-2 text-xs bg-white" value={genero} onChange={e=>setGenero(e.target.value)}>
                      <option value="UNISEX">UNISEX</option>
                      <option value="HOMBRE">HOMBRE</option>
                      <option value="MUJER">MUJER</option>
                    </select>
                  </div>
                  <div><Label className="text-[10px]">Talla</Label><Input className="h-8 text-xs bg-white" value={talla} onChange={e=>setTalla(e.target.value)} /></div>
                  <div><Label className="text-[10px]">Cant. *</Label><Input type="number" min="1" className="h-8 text-xs bg-white" value={cantidad} onChange={e=>setCantidad(e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-[10px]">Bordado</Label><Input className="h-8 text-xs bg-white" value={bordado} onChange={e=>setBordado(e.target.value)} /></div>
                </div>
                <Button onClick={handleAgregarPrenda} className="w-full h-8 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg">
                  <Plus size={14} className="mr-1"/> Añadir Prenda al Lista
                </Button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-[30vh]">
                <table className="w-full text-left text-xs min-w-450px">
                  <thead className="bg-gray-100 text-gray-600 font-bold border-b sticky top-0">
                    <tr className="bg-gray-100">
                      <th className="p-2">Prenda</th>
                      <th className="p-2">Sexo</th>
                      <th className="p-2">Talla</th>
                      <th className="p-2 text-center">Cant.</th>
                      <th className="p-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prendas.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">No has agregado prendas a este contrato.</td></tr>
                    ) : (
                      prendas.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-bold text-gray-800">{p.tipoRopa} <span className="text-gray-400 font-normal">({p.color || '-'})</span></td>
                          <td className="p-2 font-semibold text-purple-700">{p.genero}</td>
                          <td className="p-2 font-bold text-primary">{p.talla}</td>
                          <td className="p-2 text-center font-black text-sm">{p.cantidad}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => setPrendas(prendas.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 rounded-xl" disabled={saving} onClick={handleGuardarContrato}>
                {saving ? 'Guardando...' : '💾 Guardar este Contrato'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl... flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}