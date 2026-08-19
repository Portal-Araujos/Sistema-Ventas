"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Edit, Send, PlusCircle, Trash2, CheckCircle2, AlertCircle, Search, Eye, PackageCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// 🔥 LLAMAMOS A NUESTRO SÚPER COMPONENTE UNIVERSAL 🔥
import ContratoVentaForm from '@/components/shared/ContratoVentaForm';

export default function PedidosPage() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [catalogos, setCatalogos] = useState<any>(null); // Guardamos catálogos para el formulario
  const [tabActiva, setTabActiva] = useState<'Borrador' | 'Operaciones'>('Borrador');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);
  
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);
  
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [grupoEdit, setGrupoEdit] = useState<any>(null);
  const [pedidoEditSelId, setPedidoEditSelId] = useState<string>('NUEVO');
  const [mostrarFormContrato, setMostrarFormContrato] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 🔥 ESTADOS LIMPIOS 🔥
  const [globalFechaRequerida, setGlobalFechaRequerida] = useState(''); // Fecha GLOBAL de la escuela
  const [contratoData, setContratoData] = useState<any>({}); // Todo el contrato en 1 sola variable

  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  const cargarInstituciones = async () => {
    try {
      const [resInst, resCat] = await Promise.all([
        fetch('/api/instituciones'),
        fetch('/api/catalogos')
      ]);
      const data = await resInst.json();
      setInstitucionesList(Array.isArray(data) ? data : (data.data || []));
      setCatalogos(await resCat.json());
    } catch (e) { console.error(e); }
  };

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      let url = `/api/pedidos?estado=${tabActiva}&`;
      if (fechaDesde) url += `fechaInicio=${fechaDesde}&`;
      if (fechaHasta) url += `fechaFin=${fechaHasta}&`;
      if (selectedInstFilter) url += `institucionId=${selectedInstFilter}&`;
      
      const resPed = await fetch(url);
      const dataPed = await resPed.json();
      setGrupos(Array.isArray(dataPed) ? dataPed : []);
      
      // Si estamos editando y guardamos, refrescamos el modal en vivo
      if (modalEditOpen && grupoEdit) {
        const grupoActualizado = dataPed.find((g: any) => g.id === grupoEdit.id);
        if (grupoActualizado) setGrupoEdit(grupoActualizado);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarInstituciones(); }, []);
  useEffect(() => { cargarDatos(); }, [tabActiva, fechaDesde, fechaHasta, selectedInstFilter]);

  const handleOpenDetalle = (grupo: any) => {
    setGrupoDetalle(grupo); setContratoExpandido(null); setModalDetalleOpen(true);
  };

  const handleOpenEdit = (grupo: any) => {
    setGrupoEdit(grupo);
    // Cargamos la fecha global de la escuela (si existe)
    setGlobalFechaRequerida(grupo.fechaRequerida ? grupo.fechaRequerida.split('T')[0] : '');
    
    if (grupo.pedidosAsociados && grupo.pedidosAsociados.length > 0) {
      seleccionarContratoParaEditar(grupo.pedidosAsociados[0]);
    } else {
      prepararNuevoContrato();
    }
    setModalEditOpen(true);
  };

  const seleccionarContratoParaEditar = (pedido: any) => {
    setPedidoEditSelId(pedido.id);
    
    // Mandamos la info completa y sin fallos al Componente Universal
    setContratoData({
      numContrato: pedido.numContrato !== 'S/N' ? pedido.numContrato : '',
      nombreCliente: pedido.nombreCliente || '',
      valorContrato: pedido.valorContrato || '',
      abono: pedido.abono || '',
      cuotaMensual: pedido.cuotaMensual || '', // 🔥 AHORA SÍ PASAMOS LA CUOTA 🔥
      meses: pedido.meses?.toString() || '12',
      mesCobro: pedido.mesCobro || 'Enero',
      prendas: pedido.detalles || [], // 🔥 Las prendas intactas para que el form aplique alertas 🔥
      tipoPedido: pedido.tipoPedido || 'Pedido',
      observacion: pedido.observacion || '',
      tipoCobroId: pedido.tipoCobroId || '',
      estadoClienteId: pedido.estadoClienteId || '',
      estadoContratoId: pedido.estadoContratoId || ''
    });
    
    setMostrarFormContrato(false); 
  };

  const prepararNuevoContrato = () => {
    setPedidoEditSelId('NUEVO');
    setContratoData({
      numContrato: '', nombreCliente: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero',
      prendas: [], tipoPedido: 'Pedido', observacion: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: ''
    });
    
    // 🔥 SI ES NUEVO: ABRIMOS LOS DATOS ADMINISTRATIVOS 🔥
    setMostrarFormContrato(true); 
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

    const grupoAEnviar = grupos.find(g => g.id === institucionId);

    if (!grupoAEnviar) {
      showToast('error', 'No se encontró la institución.');
      return;
    }

    // Validamos que exista una fecha real
    if (!grupoAEnviar.fechaRequerida) {
      showToast(
        'error',
        'Debes asignar la Fecha Global de Entrega antes de enviar a Operaciones.'
      );
      return;
    }

    // Ejemplo:
    // 2026-08-18T12:00:00.000Z
    // se convierte en:
    // 2026-08-18
    const fechaLimpia = grupoAEnviar.fechaRequerida.split('T')[0];

    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'masivo',
          institucionId,
          fechaRequerida: fechaLimpia
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      showToast('exito', '¡Escuela enviada a Producción!');
      cargarDatos();

    } catch (e: any) {
      showToast('error', e.message || 'Error al enviar a Operaciones.');
    }
  };

  const handleGuardarContrato = async () => {
    if (!globalFechaRequerida) { showToast('error', 'Falta la Fecha de Entrega Global de la escuela (Arriba).'); return; }
    if (!contratoData.numContrato) { showToast('error', 'Ingresa el Número de Contrato.'); return; }
    if (!contratoData.prendas || contratoData.prendas.length === 0) { showToast('error', 'No puedes guardar un contrato vacío. Agrega prendas.'); return; }

    setSaving(true);
    try {
      const payload: any = {
        modo: 'individual',
        id: pedidoEditSelId !== 'NUEVO' ? pedidoEditSelId : undefined,
        institucionId: grupoEdit.id,
        fechaRequerida: globalFechaRequerida, // Mandamos la global
        ...contratoData,
        detalles: contratoData.prendas 
      };

      const res = await fetch('/api/pedidos', {
        method: pedidoEditSelId === 'NUEVO' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('exito', 'Contrato guardado exitosamente.');
      if (pedidoEditSelId === 'NUEVO' && data.id) setPedidoEditSelId(data.id);
      cargarDatos(true);
      
    } catch (e: any) { showToast('error', e.message); } finally { setSaving(false); }
  };

  const filteredGrupos = grupos.filter(g => g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoPedido?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      {/* CABECERA */}
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
      
      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50 border-gray-200" placeholder="Buscar por Institución o Código PED-..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full lg:w-auto">
          <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold bg-gray-50 text-gray-700 w-full outline-none" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
            <option value="">🏫 Todas las Instituciones</option>
            {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
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
      
      {/* TABLA PRINCIPAL */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando pedidos...</div>
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
                  <th className="p-3.5 text-center">Entrega Pautada</th>
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
                    <td className="p-3.5 text-center font-bold text-blue-600">{item.fechaRequeridaTexto}</td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.estado === 'Borrador' && (
                          <Button size="icon" variant="ghost" title="Enviar Todo a Operaciones" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleEnviarMasivo(item.id)}>
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
                          <Button size="icon" variant="ghost" title="Eliminar Registro" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleEliminarGrupo(item.id)}>
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

      {/* MODAL DE SOLO LECTURA */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-3xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <span>Detalle del Grupo de Pedidos</span>
              <Badge className="bg-primary text-white text-xs">{grupoDetalle?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">ENTREGA PROMETIDA</span><span className="font-extrabold text-blue-700">{grupoDetalle?.fechaRequeridaTexto}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">CONTRATOS</span><span className="font-extrabold text-gray-700">{grupoDetalle?.contratosTotal}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">TOTAL PRENDAS</span><span className="font-black text-emerald-600 text-sm">{grupoDetalle?.totalPrendas} prendas</span></div>
            </div>
            
            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Contratos Vinculados:</p>
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">Contrato #{ped.numContrato}</Badge>
                        <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                        <Eye size={14} /> {isExpanded ? 'Ocultar Prendas' : 'Ver Prendas'}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-550px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                              <th className="pb-2">SKU</th><th className="pb-2">Prenda</th><th className="pb-2">Color</th>
                              <th className="pb-2">Género</th><th className="pb-2">Talla</th><th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2">Bordado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ped.detalles?.length === 0 ? (
                              <tr><td colSpan={7} className="py-3 text-center text-gray-400 italic">No hay prendas.</td></tr>
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

      {/* 🔥 SÚPER MODAL DE EDICIÓN (CON COMPONENTE UNIVERSAL) 🔥 */}
      <Dialog open={modalEditOpen} onOpenChange={setModalEditOpen}>
        <DialogContent className="sm:max-w-6xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-2 flex justify-between items-center">
              <span>Gestionar Contratos - {grupoEdit?.institucionNombre}</span>
              <Badge className="bg-amber-100 text-amber-800">{grupoEdit?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* 🔥 FECHA GLOBAL DE ENTREGA (FUERA DEL CONTRATO) 🔥 */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between mt-4">
            <div>
              <Label className="text-xs font-black text-blue-900 uppercase">Fecha de Entrega Prometida (Aplica a toda la escuela) *</Label>
              <p className="text-[10px] text-blue-700">Esta fecha se enviará a Operaciones para todos los contratos.</p>
            </div>
            <Input type="date" className={`h-9 text-xs font-bold bg-white w-40 ${!globalFechaRequerida ? 'border-red-400 border-2' : 'border-blue-300'}`} value={globalFechaRequerida} onChange={e => setGlobalFechaRequerida(e.target.value)} />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            
            {/* PANEL IZQUIERDO: LISTA DE CONTRATOS */}
            <div className="w-full lg:w-1/3 border-r lg:pr-4 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-500 uppercase">1. Selecciona un Contrato</Label>
                <Button size="sm" onClick={prepararNuevoContrato} className="h-7 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold px-2 rounded-lg">
                  <PlusCircle size={12} className="mr-1"/> Nuevo
                </Button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {grupoEdit?.pedidosAsociados?.map((ped: any) => (
                  <button 
                    key={ped.id} 
                    onClick={() => seleccionarContratoParaEditar(ped)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${pedidoEditSelId === ped.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-primary/50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] text-primary font-black uppercase">Contrato #{ped.numContrato || 'S/N'}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{ped.nombreCliente}</p>
                    <div className="mt-2 flex justify-between items-center text-[11px] font-black">
                      <span className={ped.totalUnidadesContrato > 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {ped.totalUnidadesContrato > 0 ? `${ped.totalUnidadesContrato} prendas` : 'Vacío'}
                      </span>
                    </div>
                  </button>
                ))}
                {grupoEdit?.pedidosAsociados?.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-4">No hay contratos registrados aún.</p>
                )}
              </div>
            </div>

            {/* PANEL DERECHO: FORMULARIO UNIVERSAL */}
            <div className="w-full lg:w-2/3 space-y-5">
              
              {/* 🔥 AQUÍ LLAMAMOS A NUESTRO COMPONENTE UNIVERSAL 🔥 */}
              <ContratoVentaForm 
                data={contratoData}
                catalogos={catalogos}
                onChange={setContratoData}
                isNuevo={pedidoEditSelId === 'NUEVO'}
                mostrarAdmin={mostrarFormContrato}
                onToggleAdmin={() => setMostrarFormContrato(!mostrarFormContrato)}
              />

              <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-11 rounded-xl shadow-md text-sm mt-4" disabled={saving} onClick={handleGuardarContrato}>
                {saving ? 'Guardando base de datos...' : '💾 Guardar este Contrato'}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
      
      {toast && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}