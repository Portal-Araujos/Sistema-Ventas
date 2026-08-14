"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Scissors, Search, Calendar, Eye, Settings2, CheckCircle2, 
  AlertCircle, Printer, Users, Boxes, CheckSquare, 
  ChevronLeft, ChevronRight, Factory, Download, Lock, Package 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProduccionPage() {
  const [data, setData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [catalogos, setCatalogos] = useState<any>({ estados: [], lineas: [], operarios: [] });
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTROS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('');
  const [selectedLineaFilter, setSelectedLineaFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // MODALES
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null);

  const [modalEstado, setModalEstado] = useState(false);
  const [contratoSel, setContratoSel] = useState<any>(null);
  const [formEstado, setFormEstado] = useState({ estado: '', operarioAsignado: '', lineaProduccion: '' });
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => { 
    setToast({ tipo, texto }); 
    setTimeout(() => setToast(null), 4000); 
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resProd, resInst] = await Promise.all([
        fetch(`/api/produccion?fechaInicio=${fechaDesde}&fechaFin=${fechaHasta}`),
        fetch('/api/instituciones')
      ]);
      const jsonProd = await resProd.json();
      const jsonInst = await resInst.json();

      if (jsonProd.tabla) {
        setData(jsonProd.tabla);
        setKpis(jsonProd.kpis);
        setCatalogos(jsonProd.catalogos);
      }
      setInstitucionesList(Array.isArray(jsonInst) ? jsonInst : (jsonInst.data || []));
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, [fechaDesde, fechaHasta]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, selectedEstadoFilter, selectedLineaFilter, kpiFilter]);

  const handleOpenDetalle = (grupo: any) => { setGrupoDetalle(grupo); setContratoExpandido(null); setModalDetalleOpen(true); };
  const handleOpenEstado = (contrato: any) => {
    setContratoSel(contrato);
    setFormEstado({ estado: contrato.estado || '', operarioAsignado: contrato.operarioAsignado || '', lineaProduccion: contrato.lineaProduccion || '' });
    setModalEstado(true);
  };

  const handleGuardarEstado = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/produccion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contratoSel.id, ...formEstado })
      });
      if (!res.ok) throw new Error();
      showToast('exito', 'Producción actualizada.');
      setModalEstado(false); setModalDetalleOpen(false); cargarDatos();
    } catch (e) { showToast('error', 'Error al guardar.'); } finally { setSaving(false); }
  };

  // 🔥 ENVIAR A EMPAQUE MASIVO (Toda la Escuela) 🔥
  const handleMandarEscuelaEmpaque = async (institucionId: string) => {
    if (!confirm('¿Seguro que deseas enviar TODA esta escuela a Bodega/Empaque? Ya no podrás editarla en el Taller.')) return;
    try {
      await fetch('/api/produccion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'masivo_empaque', institucionId })
      });
      showToast('exito', '¡Escuela enviada a Bodega!');
      cargarDatos();
    } catch (e) { showToast('error', 'Error al enviar.'); }
  };

  // 🔥 ENVIAR A EMPAQUE INDIVIDUAL (Por contrato) 🔥
  const handleMandarEmpaqueIndividual = async (id: string) => {
    if (!confirm('¿Seguro que el paquete está terminado? Se enviará a Bodega/Empaque y se bloqueará en Taller.')) return;
    try {
      await fetch('/api/produccion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'individual_empaque', id })
      });
      showToast('exito', '¡Paquete enviado a Bodega!');
      setModalDetalleOpen(false);
      cargarDatos();
    } catch (e) { showToast('error', 'Error al enviar.'); }
  };

  const exportarExcelConsolidado = () => {
    if (!filteredData || filteredData.length === 0) {
      showToast('error', 'No hay datos de producción para exportar.'); return;
    }
    const filasReporte: any[] = [];
    filteredData.forEach((grupo: any) => {
      grupo.pedidosAsociados.forEach((ped: any) => {
        if (ped.detalles && ped.detalles.length > 0) {
          ped.detalles.forEach((item: any) => {
            filasReporte.push({
              'Código OP': grupo.codigoOP, 'Institución': grupo.institucionNombre, 'N° Contrato': ped.numContrato || 'S/N',
              'Cliente': ped.nombreCliente || 'General', 'SKU': item.skuCodigo || 'S/COD', 'Prenda': item.tipoRopa || '',
              'Color': item.color || '', 'Sexo': item.genero || 'UNISEX', 'Talla': item.talla || '', 'Cantidad': item.cantidad || 1,
              'Bordado': item.bordado || '-', 'Línea': ped.lineaProduccion || grupo.lineaActual || 'Sin Asignar',
              'Operario': ped.operarioAsignado || 'Sin Asignar', 'Estado': ped.estado || grupo.estadoActual,
              'Ingreso Taller': grupo.fechaInicioTexto, 'Fecha Compromiso': grupo.fechaCompromisoTexto
            });
          });
        }
      });
    });
    const ws = XLSX.utils.json_to_sheet(filasReporte);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consolidado_Produccion");
    XLSX.writeFile(wb, `Consolidado_Produccion_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const imprimirHojaTaller = (grupo: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    let prendasHtml = '';
    grupo.pedidosAsociados.forEach((ped: any) => {
      prendasHtml += `<tr><td colspan="6" style="background:#f4f4f4; font-weight:bold;">Contrato #${ped.numContrato} - ${ped.nombreCliente} (Estado: ${ped.estado})</td></tr>`;
      ped.detalles.forEach((p: any) => {
        prendasHtml += `<tr><td>${p.skuCodigo}</td><td>${p.tipoRopa}</td><td>${p.color}</td><td>${p.talla}</td><td style="text-align:center; font-weight:bold;">${p.cantidad}</td><td>${p.bordado || ''}</td></tr>`;
      });
    });
    printWindow.document.write(`
      <html>
        <head><title>Orden de Producción - ${grupo.codigoOP}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 5px; text-transform: uppercase; }
            h2 { text-align: center; font-size: 18px; margin-top: 0; color: #666; }
            .info-box { border: 2px solid #000; padding: 15px; margin-bottom: 20px; border-radius: 8px; display: flex; justify-content: space-between;}
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #000; color: #fff; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h1>ORDEN DE PRODUCCIÓN (TALLER)</h1><h2>ID: ${grupo.codigoOP}</h2>
          <div class="info-box">
            <div><strong>Institución:</strong> ${grupo.institucionNombre} <br/> <strong>Total Paquetes:</strong> ${grupo.paquetesCantidad}</div>
            <div><strong>Fecha Ingreso:</strong> ${grupo.fechaInicioTexto} <br/> <strong>Fecha Compromiso:</strong> ${grupo.fechaCompromisoTexto}</div>
          </div>
          <table><thead><tr><th>SKU</th><th>Prenda</th><th>Color</th><th>Talla</th><th>Cant.</th><th>Bordado / Observación</th></tr></thead><tbody>${prendasHtml}</tbody></table>
          <p style="text-align:center; margin-top: 30px; font-size: 12px; color: #777;">Generado automáticamente por el Sistema ERP</p>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getEstadoColor = (estado: string) => {
    if (estado?.includes('Planificación')) return 'bg-gray-100 text-gray-800';
    if (estado?.includes('Corte')) return 'bg-amber-100 text-amber-800';
    if (estado?.includes('Confección')) return 'bg-blue-100 text-blue-800';
    if (estado?.includes('Preparación')) return 'bg-purple-100 text-purple-800';
    if (estado?.includes('Empaque') || estado?.includes('Listo') || estado?.includes('Despachado')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-800';
  };

  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoOP?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.id === selectedInstFilter : true;
    const matchEstado = selectedEstadoFilter ? g.estadosArray.includes(selectedEstadoFilter) : true;
    const matchLinea = selectedLineaFilter ? g.lineasArray.includes(selectedLineaFilter) : true;
    
    let matchKpi = true;
    if (kpiFilter === 'proceso') matchKpi = g.estadosArray.some((e:string) => ['En producción', 'Planificación', 'Corte', 'Confección', 'Preparación'].includes(e));
    if (kpiFilter === 'completadas') matchKpi = g.estadosArray.some((e:string) => ['En empaque', 'Listos para el despacho', 'Despachado'].includes(e));

    return matchSearch && matchInst && matchEstado && matchLinea && matchKpi;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Scissors className="text-amber-600" /> Taller de Producción</h1>
          <p className="text-sm text-gray-500 mt-1">Control de líneas, cortes, confección y operarios.</p>
        </div>
        <Button variant="outline" onClick={exportarExcelConsolidado} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold text-xs h-10 rounded-xl">
          <Download size={16} className="mr-2" /> Exportar Consolidado
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => setKpiFilter(kpiFilter === 'proceso' ? '' : 'proceso')} className={`p-4 rounded-xl border cursor-pointer transition-all ${kpiFilter === 'proceso' ? 'bg-amber-600 text-white shadow-md' : 'bg-white hover:border-amber-400'}`}>
          <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${kpiFilter === 'proceso' ? 'text-amber-100' : 'text-gray-500'}`}><Settings2 size={14}/> Órdenes en Proceso</p>
          <p className="text-3xl font-black mt-1">{kpis.ordenesProceso || 0}</p>
        </div>
        <div onClick={() => setKpiFilter(kpiFilter === 'completadas' ? '' : 'completadas')} className={`p-4 rounded-xl border cursor-pointer transition-all ${kpiFilter === 'completadas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white hover:border-emerald-400'}`}>
          <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${kpiFilter === 'completadas' ? 'text-emerald-100' : 'text-gray-500'}`}><CheckSquare size={14}/> Enviadas a Bodega</p>
          <p className="text-3xl font-black mt-1">{kpis.ordenesCompletadas || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Boxes size={14}/> Prendas en Producción</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{kpis.prendasProduccion || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><CheckCircle2 size={14}/> Prendas Listas (Hoy)</p>
          <p className="text-3xl font-black text-teal-600 mt-1">{kpis.prendasDia || 0}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
        <div className="relative col-span-1 lg:col-span-2">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50" placeholder="Buscar por OP- o Institución..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
          <option value="">🏫 Escuelas Activas</option>
          {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
        </select>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50" value={selectedEstadoFilter} onChange={e => setSelectedEstadoFilter(e.target.value)}>
          <option value="">⚙️ Todos los Estados</option>
          {catalogos.estados.map((e: any) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
        </select>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50" value={selectedLineaFilter} onChange={e => setSelectedLineaFilter(e.target.value)}>
          <option value="">🧵 Todas las Líneas</option>
          {catalogos.lineas.map((e: any) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando taller...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <Scissors size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay órdenes en producción.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-black uppercase border-b border-gray-200">
                  <th className="p-3.5">Orden OP</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Prendas</th>
                  <th className="p-3.5">Línea Prod.</th>
                  <th className="p-3.5 text-center">Estado Taller</th>
                  <th className="p-3.5">Fechas (Inicio / Comp.)</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => {
                  const todosCompletos = item.estadosArray.every((e:string) => ['En empaque', 'Listos para el despacho', 'Despachado'].includes(e));
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-amber-600">{item.codigoOP}</td>
                      <td className="p-3.5 font-bold text-gray-900 truncate max-w-150px">{item.institucionNombre}</td>
                      <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                      <td className="p-3.5 text-center font-black text-blue-600 text-sm">{item.totalPrendas}</td>
                      <td className="p-3.5 font-semibold text-gray-600">{item.lineaActual}</td>
                      <td className="p-3.5 text-center"><Badge className={getEstadoColor(item.estadoActual)}>{item.estadoActual}</Badge></td>
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">
                        <div className="text-[10px]">IN: <span className="font-bold">{item.fechaInicioTexto}</span></div>
                        <div className="text-[10px] text-red-600">OUT: <span className="font-bold">{item.fechaCompromisoTexto}</span></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 🔥 BOTÓN MASIVO DE ENVÍO A EMPAQUE 🔥 */}
                          {!todosCompletos && (
                            <Button size="icon" variant="ghost" title="Enviar toda la escuela a Empaque" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={() => handleMandarEscuelaEmpaque(item.id)}>
                              <Package size={16} />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Imprimir Hoja de Taller" className="h-8 w-8 text-gray-600 hover:bg-gray-100" onClick={() => imprimirHojaTaller(item)}>
                            <Printer size={16} />
                          </Button>
                          <Button size="icon" variant="ghost" title="Ver Detalle y Operarios" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDetalle(item)}>
                            <Eye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14}/></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8"><ChevronRight size={14}/></Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 👁️ MODAL: VER DETALLES Y ASIGNAR */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex justify-between items-center">
              <span>Desglose de Producción</span>
              <Badge className="bg-amber-500 text-white">{grupoDetalle?.codigoOP}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">LÍNEA GRAL</span><span className="font-extrabold text-gray-700">{grupoDetalle?.lineaActual}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">TOTAL PRENDAS</span><span className="font-black text-blue-600 text-sm">{grupoDetalle?.totalPrendas}</span></div>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Asignación por Contratos:</p>
            
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;
                
                // 🔥 LÓGICA DE BLOQUEO POR TRANSICIÓN 🔥
                const yaSalioDeTaller = ['En empaque', 'Listos para el despacho', 'Despachado'].includes(ped.estado);

                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/80">
                      
                      <div className="flex flex-col gap-1 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">C. #{ped.numContrato}</Badge>
                          <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] mt-1">
                          <Badge className={getEstadoColor(ped.estado)}>{ped.estado}</Badge>
                          {ped.lineaProduccion && <span className="font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1"><Factory size={10}/> {ped.lineaProduccion}</span>}
                          {ped.operarioAsignado && <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1"><Users size={10}/> {ped.operarioAsignado}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        
                        {yaSalioDeTaller ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 font-bold px-3 py-1.5 flex items-center gap-1 h-8">
                            <Lock size={12}/> {ped.estado}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="secondary" className="text-xs font-bold h-8 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-700" onClick={() => handleOpenEstado(ped)}>
                              ⚙️ Estado
                            </Button>
                            {/* 🔥 BOTÓN INDIVIDUAL DE ENVÍO A EMPAQUE 🔥 */}
                            <Button size="sm" className="text-xs font-bold h-8 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleMandarEmpaqueIndividual(ped.id)}>
                              📦 Enviar a Empaque
                            </Button>
                          </div>
                        )}

                        <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1 h-8" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                          <Eye size={14} /> {isExpanded ? 'Ocultar' : 'Ver Prendas'}
                        </Button>
                      </div>
                    </div>

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

      {/* ⚙️ MODAL: CAMBIAR ESTADO Y ASIGNAR */}
      <Dialog open={modalEstado} onOpenChange={setModalEstado}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black text-gray-900 border-b pb-2 flex items-center gap-2"><Settings2 className="text-amber-600"/> Gestión de Taller</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div>
              <Label className="text-xs font-bold text-gray-500">1. Línea de Producción</Label>
              <select className="w-full h-10 border rounded-xl px-3 text-sm font-bold bg-white mt-1" value={formEstado.lineaProduccion} onChange={e => setFormEstado({...formEstado, lineaProduccion: e.target.value})}>
                <option value="">-- Sin Asignar --</option>
                {catalogos.lineas.map((c: any) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500">2. Operario Asignado</Label>
              <select className="w-full h-10 border rounded-xl px-3 text-sm font-bold bg-white mt-1" value={formEstado.operarioAsignado} onChange={e => setFormEstado({...formEstado, operarioAsignado: e.target.value})}>
                <option value="">-- Seleccione Operario --</option>
                {catalogos.operarios.map((c: any) => <option key={c.id} value={c.nombreApellido}>{c.nombreApellido}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500">3. Estado de Costura / Taller *</Label>
              <select className="w-full h-10 border border-amber-300 rounded-xl px-3 text-sm font-black text-amber-800 bg-amber-50 mt-1" value={formEstado.estado} onChange={e => setFormEstado({...formEstado, estado: e.target.value})}>
                {catalogos.estados.map((c: any) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalEstado(false)}>Cancelar</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={saving} onClick={handleGuardarEstado}>
              {saving ? 'Guardando...' : 'Aplicar Cambios'}
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