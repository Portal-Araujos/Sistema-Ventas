"use client";

import React, { useState, useEffect,Suspense } from 'react';
import { ShoppingBag, Edit, Send, PlusCircle, Trash2, CheckCircle2, AlertCircle, Search, Eye, PackageCheck, Calendar, ClipboardCheck, LockOpen, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ContratoVentaForm from '@/components/shared/ContratoVentaForm';

function PedidosPageContent() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [tabActiva, setTabActiva] = useState<'Borrador' | 'Operaciones'>('Borrador');
  const [loading, setLoading] = useState(true);
  
  // FILTROS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);
  
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [grupoEdit, setGrupoEdit] = useState<any>(null);
  const [pedidoEditSelId, setPedidoEditSelId] = useState<string>('NUEVO');
  const [mostrarFormContrato, setMostrarFormContrato] = useState(false);
  
  // ESTADOS PARA RECEPCIÓN
  const [modalRecepcionOpen, setModalRecepcionOpen] = useState(false);
  const [grupoRecepcion, setGrupoRecepcion] = useState<any>(null);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [globalFechaRequerida, setGlobalFechaRequerida] = useState(''); 
  const [contratoData, setContratoData] = useState<any>({}); 

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
      
      const dataTabla = dataPed.tabla || dataPed || [];
      setGrupos(Array.isArray(dataTabla) ? dataTabla : []);
      if (dataPed.currentUser) setCurrentUser(dataPed.currentUser);
      
      if (modalEditOpen && grupoEdit) {
        const grupoActualizado = dataTabla.find((g: any) => g.id === grupoEdit.id);
        if (grupoActualizado) setGrupoEdit(grupoActualizado);
      }
      if (modalRecepcionOpen && grupoRecepcion) {
        const recepActualizada = dataTabla.find((g: any) => g.id === grupoRecepcion.id);
        if (recepActualizada) setGrupoRecepcion(recepActualizada);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarInstituciones(); }, []);
  useEffect(() => { cargarDatos(); }, [tabActiva, fechaDesde, fechaHasta, selectedInstFilter]);

  // RESETEAR PÁGINA AL FILTRAR
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, tabActiva]);

  const handleOpenDetalle = (grupo: any) => {
    setGrupoDetalle(grupo); setContratoExpandido(null); setModalDetalleOpen(true);
  };

  const handleOpenEdit = (grupo: any) => {
    setGrupoEdit(grupo);
    setGlobalFechaRequerida(grupo.fechaRequerida ? grupo.fechaRequerida.split('T')[0] : '');
    if (grupo.pedidosAsociados && grupo.pedidosAsociados.length > 0) seleccionarContratoParaEditar(grupo.pedidosAsociados[0]);
    else prepararNuevoContrato();
    setModalEditOpen(true);
  };

  const handleOpenRecepcion = (grupo: any) => {
    setGrupoRecepcion(grupo);
    setPrendasSeleccionadas([]);
    setContratoExpandido(null);
    setModalRecepcionOpen(true);
  };

  const seleccionarContratoParaEditar = (pedido: any) => {
    setPedidoEditSelId(pedido.id);
    setContratoData({
      numContrato: pedido.numContrato !== 'S/N' ? pedido.numContrato : '',
      nombreCliente: pedido.nombreCliente || '',
      valorContrato: pedido.valorContrato || '',
      abono: pedido.abono || '',
      cuotaMensual: pedido.cuotaMensual || '', 
      meses: pedido.meses?.toString() || '12',
      mesCobro: pedido.mesCobro || 'Enero',
      prendas: pedido.detalles || [], 
      tipoPedido: pedido.tipoPedido || 'Pedido',
      observacion: pedido.observacion || '',
      tipoCobroId: pedido.tipoCobroId || '',
      estadoClienteId: pedido.estadoClienteId || '',
      estadoContratoId: pedido.estadoContratoId || '',
      tieneCedula: pedido.tieneCedula || false,
      numeroCedula: pedido.numeroCedula || ''
    });
    setMostrarFormContrato(false); 
  };

  const prepararNuevoContrato = () => {
    setPedidoEditSelId('NUEVO');
    setContratoData({
      numContrato: '', nombreCliente: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero',
      prendas: [], tipoPedido: 'Pedido', observacion: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '' , tieneCedula: false, numeroCedula: ''
    });
    setMostrarFormContrato(true); 
  };

  const handleEliminarPedido = async (grupo: any) => {
    if (!confirm('¿Eliminar definitivamente este pedido borrador?')) return;
    try {
      const res = await fetch(`/api/pedidos?institucionId=${grupo.institucionId}&vendedorId=${grupo.vendedorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('exito', 'Borrador eliminado correctamente.');
      cargarDatos();
    } catch (e: any) { showToast('error', e.message || 'Error al eliminar.'); }
  };

  const handleEnviarOperaciones = async (pedido: any) => {
    if (!confirm(`¿Seguro que quieres enviar esta escuela a Operaciones?`)) return;
    if (!pedido.fechaRequerida) {
      showToast('error', 'Debes asignar la Fecha de Entrega antes de enviarlo a Operaciones.');
      return;
    }
    const fechaLimpia = pedido.fechaRequerida.split('T')[0];
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 🔥 Ahora pasamos el vendedorId
        body: JSON.stringify({ modo: 'masivo', institucionId: pedido.institucionId, vendedorId: pedido.vendedorId, fechaRequerida: fechaLimpia })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('exito', '¡Pedido enviado a Producción / Bodega!');
      cargarDatos();
    } catch (e: any) { showToast('error', e.message || 'Error al enviar a Operaciones.'); }
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
        institucionId: grupoEdit.institucionId || grupoEdit.id,
        fechaRequerida: globalFechaRequerida,
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

  const toggleRecepcionPrenda = (id: string) => {
    if (prendasSeleccionadas.includes(id)) setPrendasSeleccionadas(prendasSeleccionadas.filter(pId => pId !== id));
    else setPrendasSeleccionadas([...prendasSeleccionadas, id]);
  };

  const handleConfirmarRecepcion = async () => {
    if (prendasSeleccionadas.length === 0) return showToast('error', 'Seleccione al menos una prenda.');
    setSaving(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'recepcion_vendedor', prendasIds: prendasSeleccionadas })
      });
      if (!res.ok) throw new Error();
      showToast('exito', '¡Recepción confirmada con éxito!');
      setPrendasSeleccionadas([]);
      cargarDatos(true);
    } catch (e) { showToast('error', 'Error al confirmar recepción.'); } finally { setSaving(false); }
  };

  const handleDesbloquearRecepcion = async (prendaId: string) => {
    if (!confirm('¿Seguro que deseas quitarle el "Check" de recibido a esta prenda?')) return;
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'desbloquear_recepcion', prendaId })
      });
      if (!res.ok) throw new Error();
      showToast('exito', 'Prenda desbloqueada.');
      cargarDatos(true);
    } catch (e) { showToast('error', 'Error al desbloquear.'); }
  };

  const imprimirActaRecepcionPDF = (grupo: any) => {
    let prendasRecibidas: any[] = [];
    
    grupo.pedidosAsociados.forEach((ped: any) => {
      ped.detalles.forEach((d: any) => {
        if (d.recibidoPorVendedor) {
          prendasRecibidas.push({...d, numContrato: ped.numContrato, nombreCliente: ped.nombreCliente});
        }
      });
    });

    if (prendasRecibidas.length === 0) {
      return showToast('error', 'No hay prendas con estado "Recibido" para generar el acta.');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return showToast('error', 'El navegador bloqueó la ventana.');

    let htmlFilas = '';
    prendasRecibidas.forEach(p => {
      const fechaRec = new Date(p.fechaRecepcion).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
      htmlFilas += `
        <tr>
          <td>${p.numContrato}</td>
          <td>${p.skuCodigo}</td>
          <td>${p.tipoRopa}</td>
          <td>${p.talla} (${p.color})</td>
          <td style="text-align:center;">${p.cantidad}</td>
          <td>${fechaRec}</td>
          <td>${p.usuarioReceptor?.nombre || 'Vendedor'}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head><title>Acta de Recepción - ${grupo.institucionNombre}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; }
            h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
            p { text-align: center; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #aaa; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; }
            .firma { margin-top: 50px; text-align: center; }
            .linea { border-top: 1px solid #000; width: 250px; margin: 0 auto; padding-top: 5px; }
          </style>
        </head>
        <body>
          <h1>ACTA DE RECEPCIÓN FÍSICA DE MERCADERÍA</h1>
          <p><strong>Institución:</strong> ${grupo.institucionNombre} | <strong>Pedido OP:</strong> ${grupo.codigoPedido}</p>
          <p>La siguiente mercadería ha sido confirmada como recibida físicamente por el departamento comercial/vendedor.</p>
          <table>
            <thead><tr><th>Contrato</th><th>SKU</th><th>Prenda</th><th>Talla / Color</th><th>Cant.</th><th>Fecha y Hora Exacta</th><th>Usuario que Recibió</th></tr></thead>
            <tbody>${htmlFilas}</tbody>
          </table>
          <div class="firma">
            <br/><br/><br/><div class="linea">Firma de Conformidad</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const calcularEstadisticas = (item: any) => {
    let tot = 0, desp = 0, listo = 0, rec = 0;
    const estadosUnicos = new Set<string>();

    item.pedidosAsociados?.forEach((ped: any) => {
      ped.detalles?.forEach((d: any) => {
        tot += d.cantidad || 1;
        if (d.guiaDespachoId) desp += d.cantidad || 1;
        else if (d.estadoEmpaque === 'Preparado') listo += d.cantidad || 1;
        if (d.recibidoPorVendedor) rec += d.cantidad || 1; 
        estadosUnicos.add(d.estadoOperacion || 'Pendiente en revision');
      });
    });

    const saldo = tot - desp;
    const estadoMostrar = item.estado === 'Borrador' ? 'Borrador' : (estadosUnicos.size > 1 ? 'Varios Estados' : (Array.from(estadosUnicos)[0] || item.estado));

    return { tot, desp, saldo, listo, rec, estadoMostrar };
  };

  const getEstadoColor = (estado: string) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('varios')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (e.includes('borrador')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (e.includes('despacho') || e.includes('entregado')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (e.includes('producci')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (e.includes('empaque')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const esModoAdmin = currentUser?.rol?.toLowerCase().includes('admin');
  const filteredGrupos = grupos.filter(g => g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoPedido?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredGrupos.length / itemsPerPage));
  const paginatedGrupos = filteredGrupos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-primary" /> Módulo de Pedidos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Órdenes independientes por cliente y escuela.</p>
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
      
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando pedidos...</div>
      ) : filteredGrupos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay escuelas en esta sección.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[65vh] w-full">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                <tr className="text-gray-600 font-black uppercase border-b border-gray-300">
                  <th className="p-3.5 bg-gray-100">Código Único</th>
                  <th className="p-3.5 bg-gray-100">Escuela</th>
                  <th className="p-3.5 text-center bg-gray-100">Contratos</th>
                  <th className="p-3.5 text-center bg-gray-100">Paquetes</th>
                  <th className="p-3.5 text-center bg-gray-100">Prendas</th>
                  <th className="p-3.5 text-center bg-gray-100">Estado y Resumen</th>
                  <th className="p-3.5 bg-gray-100">Última Actualización</th>
                  <th className="p-3.5 text-center bg-gray-100">Entrega Pautada</th>
                  <th className="p-3.5 text-center bg-gray-100">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* USAMOS EL ARREGLO PAGINADO */}
                {paginatedGrupos.map((item) => {
                  const stats = calcularEstadisticas(item);
                  const tieneDespachadasSinRecibir = stats.desp > stats.rec;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-blue-600">{item.codigoPedido}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 text-sm">{item.institucionNombre}</div>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-gray-700">{item.contratosTotal}</td>
                      <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                      <td className="p-3.5 text-center font-black text-emerald-600 text-sm">{item.totalPrendas}</td>
                      
                      <td className="p-3.5 text-center">
                        <Badge className={getEstadoColor(stats.estadoMostrar)}>{stats.estadoMostrar}</Badge>
                        {tabActiva === 'Operaciones' && (
                          <div className="text-[10px] font-bold text-gray-500 mt-1.5 bg-gray-50 rounded-md p-1 ">
                            Tot: {stats.tot} | Desp: {stats.desp} | <span className="text-emerald-600">Rec: {stats.rec}</span> | <span className="text-red-500">Saldo: {stats.saldo}</span> | <span className="text-blue-600">Listo: {stats.listo}</span>
                          </div>
                        )}
                        {tabActiva === 'Borrador' && (
                          <div className="text-[10px] font-bold text-gray-500 mt-1">
                            Total a confeccionar: {stats.tot} prendas
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-gray-500 whitespace-nowrap">{item.updatedAt}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center justify-center relative group">
                          <span className="font-bold text-blue-600">{item.fechaRequeridaTexto}</span>
                          
                          {/* 🔥 ALERTA DE OBSERVACIÓN (CAMBIO DE FECHA) 🔥 */}
                          {item.pedidosAsociados?.some((p: any) => p.observacion?.trim()) && (
                            <div className="mt-1 flex items-center justify-center cursor-help">
                              <AlertCircle size={14} className="text-red-500 animate-pulse" />
                              <span className="ml-1 text-[9px] font-black text-red-500 uppercase tracking-wide">Aviso</span>
                              
                              {/* Tooltip Emergente (Hover en PC / Tap en Celular) */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 sm:w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
                                <p className="font-bold text-red-400 mb-2 border-b border-gray-700 pb-1 flex items-center gap-1">
                                  <AlertCircle size={14}/> Motivo de Reprogramación:
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto text-left">
                                  {item.pedidosAsociados.filter((p: any) => p.observacion?.trim()).map((p: any, idx: number) => (
                                    <p key={idx} className="leading-tight">
                                      <span className="text-gray-400 font-bold">Contrato #{p.numContrato}:</span> {p.observacion}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {tabActiva === 'Operaciones' && stats.desp > 0 && (
                            <Button size="icon" variant="ghost" title={stats.desp > stats.rec ? 'Confirmar Llegada' : 'Ver Recepciones'} className={`h-8 w-8 ${stats.desp > stats.rec ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => handleOpenRecepcion(item)}>
                              <ClipboardCheck size={15} />
                            </Button>
                          )}

                          {item.estado === 'Borrador' && (
                            <Button size="icon" variant="ghost" title="Enviar Todo a Operaciones" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleEnviarOperaciones(item)}>
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
                            <Button size="icon" variant="ghost" title="Eliminar Registro" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleEliminarPedido(item.id)}>
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* CONTROLES DE PAGINACIÓN AL FINAL DE LA TABLA */}
          {totalPages > 1 && (
            <div className="sticky bottom-0 z-20 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/95 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <span className="text-xs text-gray-500 font-medium">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredGrupos.length)} de {filteredGrupos.length} pedidos
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">
                  <ChevronLeft size={14} className="mr-1"/> Ant.
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">
                  Sig. <ChevronRight size={14} className="ml-1"/>
                </Button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL DE SOLO LECTURA */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
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
                        <table className="w-full text-left text-xs border-collapse min-w-650px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                              <th className="pb-2">SKU</th>
                              <th className="pb-2">Prenda</th>
                              <th className="pb-2">Color</th>
                              <th className="pb-2">Talla/Género</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2">Obser/Bordado</th>
                              <th className="pb-2 text-center">Estado Actual</th>
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
                                  <td className="py-2 font-semibold text-purple-700">{p.talla} ({p.genero})</td>
                                  <td className="py-2 text-center font-black">{p.cantidad}</td>
                                  <td className="py-2 text-[10px]">
                                    <div className="font-bold text-purple-700">{p.observacion || '-'}</div>
                                    <div className="text-gray-500 italic mt-0.5">{p.bordado || 'Sin bordado'}</div>
                                  </td>
                                  <td className="py-2 text-center">
                                    <Badge variant="outline" className={`text-[9px] uppercase ${getEstadoColor(p.estadoOperacion)}`}>
                                      {p.estadoOperacion || 'Pendiente en revision'}
                                    </Badge>
                                  </td>
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

      {/* 🔥 MODAL DE AUDITORÍA DE RECEPCIÓN FÍSICA 🔥 */}
      <Dialog open={modalRecepcionOpen} onOpenChange={setModalRecepcionOpen}>
        <DialogContent className="sm:max-w-5xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><ClipboardCheck className="text-amber-500"/> Confirmación de Entregas (Vendedor)</div>
              <Badge className="bg-primary text-white text-xs">{grupoRecepcion?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex justify-between items-center bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <p className="text-xs text-amber-800">
                A continuación se muestran las prendas que <strong>Bodega ya despachó</strong>. Revisa físicamente tu paquete y dale "Check" a lo que te haya llegado.
              </p>
              <Button size="sm" variant="outline" className="text-xs font-bold text-gray-700 bg-white" onClick={() => imprimirActaRecepcionPDF(grupoRecepcion)}>
                <Printer size={14} className="mr-1"/> Imprimir Acta PDF
              </Button>
            </div>
            
            <div className="space-y-3">
              {grupoRecepcion?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                
                const prendasDespachadas = ped.detalles?.filter((d: any) => d.guiaDespachoId !== null) || [];
                if (prendasDespachadas.length === 0) return null;

                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">Contrato #{ped.numContrato}</Badge>
                        <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                        <Eye size={14} /> {isExpanded ? 'Ocultar' : 'Revisar Paquete'}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-650px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase">
                              <th className="pb-2 text-center w-8">Tengo</th>
                              <th className="pb-2">SKU / Prenda</th>
                              <th className="pb-2">Color/Talla</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2">Estado de Recepción</th>
                              {esModoAdmin && <th className="pb-2 text-center text-red-600">Admin</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {prendasDespachadas.map((p: any) => {
                              const recibido = p.recibidoPorVendedor;
                              return (
                                <tr key={p.id} className={recibido ? 'bg-emerald-50/40 opacity-80' : 'bg-white hover:bg-gray-50'}>
                                  <td className="py-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 cursor-pointer disabled:opacity-50" 
                                      disabled={recibido}
                                      checked={recibido || prendasSeleccionadas.includes(p.id)} 
                                      onChange={() => toggleRecepcionPrenda(p.id)} 
                                    />
                                  </td>
                                  <td className="py-3">
                                    <div className="font-mono font-bold text-blue-600">{p.skuCodigo}</div>
                                    <div className="font-bold text-gray-800">{p.tipoRopa}</div>
                                  </td>
                                  <td className="py-3 text-gray-600">{p.color} ({p.talla})</td>
                                  <td className="py-3 text-center font-black text-sm">{p.cantidad}</td>
                                  <td className="py-3">
                                    {recibido ? (
                                      <div>
                                        <Badge className="bg-emerald-600 text-white"><CheckCircle2 size={12} className="mr-1"/> Recibido</Badge>
                                        <p className="text-[9px] text-gray-500 mt-1">{new Date(p.fechaRecepcion).toLocaleString('es-EC')} por {p.usuarioReceptor?.nombre || 'Usuario'}</p>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Confirmación de Recepcion</Badge>
                                    )}
                                  </td>
                                  {esModoAdmin && (
                                    <td className="py-3 text-center">
                                      {recibido && (
                                        <Button size="icon" variant="ghost" title="Desbloquear Recepción" className="h-7 w-7 text-red-500 hover:bg-red-50 border border-red-200" onClick={() => handleDesbloquearRecepcion(p.id)}>
                                          <LockOpen size={12} />
                                        </Button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4 flex justify-between items-center border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setModalRecepcionOpen(false)}>Cerrar</Button>
            {prendasSeleccionadas.length > 0 && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 shadow-md" disabled={saving} onClick={handleConfirmarRecepcion}>
                <CheckCircle2 size={16} className="mr-2"/> {saving ? 'Firmando...' : `Confirmar Recepción de ${prendasSeleccionadas.length} prenda(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 SÚPER MODAL DE EDICIÓN (CON TU LAYOUT ORIGINAL RESTAURADO) 🔥 */}
      <Dialog open={modalEditOpen} onOpenChange={setModalEditOpen}>
        <DialogContent className="sm:max-w-6xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-2 flex justify-between items-center">
              <span>Gestionar Contratos - {grupoEdit?.institucionNombre}</span>
              <Badge className="bg-amber-100 text-amber-800">{grupoEdit?.codigoPedido}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between mt-4">
            <div>
              <Label className="text-xs font-black text-blue-900 uppercase">Fecha de Entrega Prometida (Aplica a toda la escuela) *</Label>
              <p className="text-[10px] text-blue-700">Esta fecha se enviará a Operaciones para todos los contratos.</p>
            </div>
            <Input type="date" className={`h-9 text-xs font-bold bg-white w-40 ${!globalFechaRequerida ? 'border-red-400 border-2' : 'border-blue-300'}`} value={globalFechaRequerida} onChange={e => setGlobalFechaRequerida(e.target.value)} />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            
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

            <div className="w-full lg:w-2/3 space-y-5">
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
export default function PedidosPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-gray-500 font-bold animate-pulse">Cargando módulo de producción...</div>}>
      <PedidosPageContent />
    </Suspense>
  );
}