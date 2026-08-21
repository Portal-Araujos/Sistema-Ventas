"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Scissors, Search, Calendar, Eye, Settings2, CheckCircle2, 
  AlertCircle, Printer, Boxes, ChevronLeft, ChevronRight, 
  Download, Package, UserCheck, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProduccionPage() {
  const [data, setData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [catalogos, setCatalogos] = useState<any>({ estados: [], operarios: [] });
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // FILTROS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('TODOS');
  const [kpiFilter, setKpiFilter] = useState<string>('TODOS');
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
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState<string[]>([]);
  
  // 🔥 CORREGIDO PARA GUARDAR EL ID 🔥
  const [formEstado, setFormEstado] = useState({ estado: '', operarioAsignadoId: '' });
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => { 
    setToast({ tipo, texto }); 
    setTimeout(() => setToast(null), 4000); 
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let url = `/api/produccion?estado=${selectedEstadoFilter}`;
      if (fechaDesde) url += `&fechaInicio=${fechaDesde}`;
      if (fechaHasta) url += `&fechaFin=${fechaHasta}`;

      const [resProd, resInst] = await Promise.all([
        fetch(url),
        fetch('/api/instituciones')
      ]);
      const jsonProd = await resProd.json();
      const jsonInst = await resInst.json();

      if (jsonProd.tabla) {
        setData(jsonProd.tabla);
        setKpis(jsonProd.kpis || {});
        setCatalogos(jsonProd.catalogos || { estados: [], operarios: [] });
        setCurrentUser(jsonProd.currentUser || null);
      }
      setInstitucionesList(Array.isArray(jsonInst) ? jsonInst : (jsonInst.data || []));
    } catch (e) { 
      showToast('error', 'Error al cargar el taller de producción.');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, [fechaDesde, fechaHasta, selectedEstadoFilter]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, selectedEstadoFilter, kpiFilter]);

  useEffect(() => {
    if (grupoDetalle && data.length > 0) {
      const grupoActualizado = data.find(g => g.id === grupoDetalle.id);
      if (grupoActualizado) setGrupoDetalle(grupoActualizado);
    }
  }, [data]);

  const handleOpenDetalle = (grupo: any) => { 
    setGrupoDetalle(grupo); 
    setContratoExpandido(null); 
    setPrendasSeleccionadas([]); 
    setModalDetalleOpen(true); 
  };

  const toggleSeleccionPrenda = (id: string) => {
    if (prendasSeleccionadas.includes(id)) {
      setPrendasSeleccionadas(prendasSeleccionadas.filter(pId => pId !== id));
    } else {
      setPrendasSeleccionadas([...prendasSeleccionadas, id]);
    }
  };

  const abrirModalEstado = (pIds: string[]) => {
    if (pIds.length === 0) {
      showToast('error', 'Seleccione al menos una prenda marcando la casilla izquierda.'); 
      return;
    }
    setPrendasSeleccionadas(pIds);
    setFormEstado({ estado: '', operarioAsignadoId: '' }); // Vacío por defecto
    setModalEstado(true);
  };

  const handleGuardarEstado = async () => {
    if (!formEstado.estado) return showToast('error', 'Seleccione un estado de taller.'); 
    setSaving(true);
    try {
      const res = await fetch('/api/produccion', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prendaIds: prendasSeleccionadas, ...formEstado })
      });
      if (!res.ok) throw new Error();
      showToast('exito', 'Producción actualizada con éxito.');
      setModalEstado(false); 
      setPrendasSeleccionadas([]);
      await cargarDatos(); 
    } catch (e) { 
      showToast('error', 'Error al guardar los cambios.'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleMandarEscuelaEmpaque = async (institucionId: string) => {
    if (!confirm('¿Seguro que TODAS las prendas de la escuela están listas? Se enviarán a Bodega/Despacho.')) return;
    try {
      await fetch('/api/produccion', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'masivo_empaque', institucionId })
      });
      showToast('exito', '¡Escuela enviada a Bodega!');
      cargarDatos();
    } catch (e) { showToast('error', 'Error al enviar la escuela.'); }
  };

  const handleMandarEmpaqueIndividual = async (id: string) => {
    if (!confirm('¿Seguro que la prenda está terminada? Se enviará a Bodega.')) return;
    try {
      await fetch('/api/produccion', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'individual_empaque', id })
      });
      showToast('exito', '¡Prenda enviada a Bodega!');
      cargarDatos();
    } catch (e) { showToast('error', 'Error al enviar prenda.'); }
  };

  // 🔥 GENERADOR EXCEL CORREGIDO 🔥
  const generarExcelConResumen = (prendasAExportar: any[], tituloArchivo: string, tituloHoja: string) => {
    if (prendasAExportar.length === 0) return showToast('error', 'No hay datos para exportar.');
    
    const wsData: any[][] = [];
    wsData.push([tituloHoja]);
    wsData.push([]);
    wsData.push(["Código OP", "Institución", "N° Contrato", "Cliente", "SKU", "Prenda", "Color", "Sexo", "Talla", "Cantidad", "Bordado", "Obervacion", "Operario", "Estado", "Ingreso Taller", "Fecha Compromiso"]);

    const mapaTotales: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};

    prendasAExportar.forEach(p => {
      wsData.push([
        p.codigoOP || '', p.institucionNombre || '', p.numContrato || 'S/N', p.nombreCliente || '',
        p.skuCodigo || 'S/N', p.tipoRopa || '', p.color || '-', p.genero || 'UNISEX', p.talla || '-',
        p.cantidad || 1, p.bordado || 'Sin bordado', p.observacion || p.observacionOperaciones || 'Sin observaciones',
        p.operarioAsignado?.nombre || 'Sin Asignar', // 🔥 AQUÍ LEE EL OBJETO
        p.estadoProduccion || p.estadoOperacion || 'Planificacion', p.ingresoTaller || '', p.fechaCompromiso || ''
      ]);

      const sku = p.skuCodigo || 'S/N';
      const color = p.color ? p.color.trim() : '-';
      const talla = p.talla ? p.talla.trim() : '-';
      const prendaNombre = p.tipoRopa ? p.tipoRopa.trim() : 'Prenda';
      const prendaColorTalla = `${prendaNombre} (${color}, ${talla})`;

      const key = `${sku}_${prendaColorTalla}`;
      if (!mapaTotales[key]) mapaTotales[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
      mapaTotales[key].cantidadTotal += (p.cantidad || 1);
    });

    wsData.push([]); wsData.push(["========================================="]);
    wsData.push(["TOTALES Y RESUMEN DE CORTE DE PRENDAS"]);
    wsData.push(["SKU", "Prenda(color y talla)", "Cantidad Total"]);
    Object.values(mapaTotales).forEach(item => { wsData.push([item.sku, item.prendaColorTalla, item.cantidadTotal]); });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produccion");
    XLSX.writeFile(wb, `${tituloArchivo}_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })}.xlsx`);
  };

  const exportarExcelConsolidado = () => {
    const todasLasPrendas: any[] = [];
    filteredData.forEach(grupo => {
      grupo.pedidosAsociados.forEach((ped: any) => {
        ped.detalles?.forEach((item: any) => {
          todasLasPrendas.push({
            ...item, codigoOP: grupo.codigoOP, institucionNombre: grupo.institucionNombre,
            numContrato: ped.numContrato, nombreCliente: ped.nombreCliente, ingresoTaller: grupo.fechaInicioTexto,
            fechaCompromiso: item.fechaEstimadaConfeccion ? new Date(item.fechaEstimadaConfeccion).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : grupo.fechaCompromisoTexto
          });
        });
      });
    });
    generarExcelConResumen(todasLasPrendas, "Consolidado_Produccion", "REPORTE CONSOLIDADO GENERAL DE PRODUCCIÓN");
  };

  // 🔥 PDF CORREGIDO 🔥
  const imprimirHojaTallerPDF = (grupo: any, contratoEspecifico?: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showToast('error', 'El navegador bloqueó la ventana emergente.');

    let prendasAImprimir: any[] = [];
    let tituloDocumento = contratoEspecifico ? `ORDEN DE PRODUCCIÓN (TALLER) - CONTRATO #${contratoEspecifico.numContrato}` : `ORDEN DE PRODUCCIÓN GENERAL (TALLER) - ${grupo.institucionNombre}`;

    if (contratoEspecifico) {
      prendasAImprimir = contratoEspecifico.detalles.map((d: any) => ({ ...d, numContrato: contratoEspecifico.numContrato, nombreCliente: contratoEspecifico.nombreCliente }));
    } else {
      grupo.pedidosAsociados.forEach((ped: any) => {
        ped.detalles.forEach((d: any) => prendasAImprimir.push({ ...d, numContrato: ped.numContrato, nombreCliente: ped.nombreCliente }));
      });
    }

    const mapaTotalesPDF: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};
    let htmlFilasDetalle = '';

    prendasAImprimir.forEach(p => {
      const sku = p.skuCodigo || 'S/N'; const prendaNombre = p.tipoRopa || 'Prenda'; const color = p.color || '-'; const talla = p.talla || '-';
      const bordadoText = p.bordado || 'Sin bordado'; const obsText = p.observacion || p.observacionOperaciones || 'Sin observaciones';
      const fCompromiso = p.fechaEstimadaConfeccion ? new Date(p.fechaEstimadaConfeccion).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : grupo.fechaCompromisoTexto;
      const prendaColorTalla = `${prendaNombre} (${color}, ${talla})`;
      
      const key = `${sku}_${prendaColorTalla}`;
      if (!mapaTotalesPDF[key]) mapaTotalesPDF[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
      mapaTotalesPDF[key].cantidadTotal += (p.cantidad || 1);

      htmlFilasDetalle += `
        <tr>
          <td>${grupo.codigoOP}</td><td>${grupo.institucionNombre}</td><td>${p.numContrato}</td><td>${p.nombreCliente}</td>
          <td>${sku}</td><td>${prendaNombre}</td><td>${color}</td><td>${p.genero || 'UNISEX'}</td><td>${talla}</td>
          <td style="text-align:center; font-weight:bold;">${p.cantidad}</td><td>${bordadoText}</td><td>${obsText}</td>
          <td>${p.operarioAsignado?.nombre || 'Sin Asignar'}</td> <!-- 🔥 AQUI LEE EL OBJETO -->
          <td>${p.estadoProduccion || 'Planificacion'}</td><td>${grupo.fechaInicioTexto || '-'}</td><td>${fCompromiso}</td>
        </tr>
      `;
    });

    let htmlFilasTotales = '';
    Object.values(mapaTotalesPDF).forEach(item => {
      htmlFilasTotales += `<tr><td style="font-weight:bold;">${item.sku}</td><td>${item.prendaColorTalla}</td><td style="text-align:center; font-weight:bold; font-size:14px;">${item.cantidadTotal}</td></tr>`;
    });

    printWindow.document.write(`
      <html>
        <head><title>${tituloDocumento}</title><style>@page { size: landscape; margin: 10mm; } body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #222; } h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 2px; } p { text-align: center; margin-top: 0; color: #555; font-size: 11px; } table { width: 100%; border-collapse: collapse; margin-bottom: 25px; } th, td { border: 1px solid #999; padding: 5px 3px; text-align: left; } th { background-color: #e5e5e5; font-weight: bold; text-transform: uppercase; font-size: 9px; } .tabla-totales { width: 55%; margin: 0 auto; } .tabla-totales th { background-color: #222; color: #fff; }</style></head>
        <body>
          <h1>${tituloDocumento}</h1><p>Fecha Impresión: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
          <table><thead><tr><th>Código OP</th><th>Institución</th><th>N° Contrato</th><th>Cliente</th><th>SKU</th><th>Prenda</th><th>Color</th><th>Sexo</th><th>Talla</th><th>Cant.</th><th>Bordado</th><th>Observación</th><th>Operario</th><th>Estado</th><th>Ingreso Taller</th><th>F. Compromiso</th></tr></thead><tbody>${htmlFilasDetalle}</tbody></table>
          <div style="page-break-inside: avoid;"><h2 style="text-align:center; font-size:14px; margin-bottom:8px;">TOTALES Y RESUMEN DE CORTE</h2><table class="tabla-totales"><thead><tr><th>SKU</th><th>Prenda (Color y Talla)</th><th style="text-align:center;">Cantidad Total</th></tr></thead><tbody>${htmlFilasTotales}</tbody></table></div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getEstadoColor = (estado: string) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('planificación') || e.includes('planificacion')) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (e.includes('corte')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (e.includes('confección') || e.includes('confeccion')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (e.includes('preparación') || e.includes('preparacion')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (e.includes('terminad') || e.includes('empaque')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoOP?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.id === selectedInstFilter : true;
    const matchEstado = selectedEstadoFilter !== 'TODOS' ? g.estadosArray.includes(selectedEstadoFilter) : true;
    
    let matchKpi = true;
    if (kpiFilter === 'PROCESO') matchKpi = g.estadosArray.some((e: string) => !e.toLowerCase().includes('terminad') && !e.toLowerCase().includes('empaque'));
    else if (kpiFilter === 'TERMINADAS') matchKpi = g.estadosArray.some((e: string) => e.toLowerCase().includes('terminad') || e.toLowerCase().includes('empaque'));
    else if (kpiFilter === 'VENCIDOS') matchKpi = g.esAtrasado === true;

    return matchSearch && matchInst && matchEstado && matchKpi;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  // 🔥 CORRECCIÓN ADMIN ROL 🔥
  const esModoAdmin = currentUser?.rol?.toLowerCase().includes('admin');

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      {/* CABECERA CON BOTÓN EXCEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Scissors className="text-amber-600" /> Taller de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de confección, operarios y cortes de tela.</p>
        </div>
        <Button variant="outline" onClick={exportarExcelConsolidado} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold text-xs h-10 rounded-xl shadow-xs">
          <Download size={16} className="mr-2" /> Exportar Consolidado y Totales (Excel)
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => setKpiFilter(kpiFilter === 'PROCESO' ? 'TODOS' : 'PROCESO')} className={`p-4 rounded-xl border cursor-pointer transition-all ${kpiFilter === 'PROCESO' ? 'bg-amber-600 text-white shadow-md scale-102' : 'bg-white hover:border-amber-400'}`}>
          <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${kpiFilter === 'PROCESO' ? 'text-amber-100' : 'text-amber-700'}`}><Settings2 size={14}/> Escuelas en Proceso</p>
          <p className="text-3xl font-black mt-1">{kpis.ordenesProceso || 0}</p>
        </div>
        <div onClick={() => { setKpiFilter('TODOS'); setSelectedEstadoFilter('TODOS'); }} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:border-blue-300 transition-all">
          <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Boxes size={14}/> Total Prendas Taller</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{kpis.prendasProduccion || 0}</p>
        </div>
        <div onClick={() => setKpiFilter(kpiFilter === 'TERMINADAS' ? 'TODOS' : 'TERMINADAS')} className={`p-4 rounded-xl border cursor-pointer transition-all ${kpiFilter === 'TERMINADAS' ? 'bg-teal-600 text-white shadow-md scale-102' : 'bg-white hover:border-teal-400'}`}>
          <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${kpiFilter === 'TERMINADAS' ? 'text-teal-100' : 'text-teal-700'}`}><CheckCircle2 size={14}/> Prendas Listas (Hoy)</p>
          <p className="text-3xl font-black mt-1">{kpis.prendasDia || 0}</p>
        </div>
        <div onClick={() => setKpiFilter(kpiFilter === 'VENCIDOS' ? 'TODOS' : 'VENCIDOS')} className={`p-4 rounded-xl border cursor-pointer transition-all ${kpiFilter === 'VENCIDOS' ? 'bg-red-600 text-white shadow-md scale-102' : 'bg-red-50/50 border-red-200 hover:border-red-400'}`}>
          <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${kpiFilter === 'VENCIDOS' ? 'text-white' : 'text-red-700'}`}><AlertTriangle size={14}/> Vencidos / Atrasados</p>
          <p className="text-3xl font-black text-red-700 mt-1">{kpis.vencidos || 0}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50" placeholder="Buscar por OP- o Institución..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50 outline-none" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
          <option value="">🏫 Todas las Instituciones</option>
          {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
        </select>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50 outline-none" value={selectedEstadoFilter} onChange={e => setSelectedEstadoFilter(e.target.value)}>
          <option value="TODOS">⚙️ Todos los Estados (Tabla EstadoProduccion)</option>
          {catalogos.estados.map((e: any) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100">
          <Calendar size={16} className="text-blue-500 ml-1 shrink-0" />
          <div className="flex items-center gap-1 w-full">
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            <span className="text-xs font-bold text-gray-400">-</span>
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            {(fechaDesde || fechaHasta) && (
              <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }} title="Limpiar fechas" className="text-red-500 hover:text-red-700 p-1"><RefreshCw size={14}/></button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando taller de producción...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <Scissors size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">El taller está limpio. No hay órdenes en proceso.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-black uppercase border-b border-gray-200">
                  <th className="p-3.5">Orden OP</th><th className="p-3.5">Institución</th><th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Prendas</th><th className="p-3.5 text-center">Estado Taller</th>
                  <th className="p-3.5">Fechas (Inicio / Comp.)</th><th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => {
                  const todosCompletos = item.estadosArray.every((e: string) => e.toLowerCase().includes('terminad') || e.toLowerCase().includes('empaque'));
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-amber-600">{item.codigoOP}</td>
                      <td className="p-3.5 font-bold text-gray-900 truncate max-w-150px">{item.institucionNombre}</td>
                      <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                      <td className="p-3.5 text-center font-black text-blue-600 text-sm">{item.totalPrendas}</td>
                      <td className="p-3.5 text-center"><Badge className={getEstadoColor(item.estadoActual)}>{item.estadoActual}</Badge></td>
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">
                        <div className="text-[10px]">IN: <span className="font-bold">{item.fechaInicioTexto}</span></div>
                        <div className={`text-[10px] ${item.esAtrasado ? 'text-red-600 font-bold' : 'text-gray-600'}`}>MAX: <span>{item.fechaCompromisoTexto}</span></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button size="icon" variant="ghost" title="Imprimir PDF Horizontal" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onClick={() => imprimirHojaTallerPDF(item)}>
                            <Printer size={16} />
                          </Button>
                          {!todosCompletos && (
                            <Button size="icon" variant="ghost" title="Enviar toda la escuela a Empaque" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={() => handleMandarEscuelaEmpaque(item.id)}>
                              <Package size={16} />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Desglose y Asignaciones" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDetalle(item)}>
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

      {/* 👁️ MODAL: DESGLOSE DE PRENDAS */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-6xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[88vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex justify-between items-center">
              <span>Desglose de Producción</span>
              <Badge className="bg-amber-500 text-white">{grupoDetalle?.codigoOP}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
              <div className="col-span-2"><span className="text-gray-400 block font-bold uppercase">TOTAL PRENDAS</span><span className="font-black text-blue-600 text-sm">{grupoDetalle?.totalPrendas} prendas</span></div>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Prendas por Contrato:</p>
            
            <div className="space-y-3">
              {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                const isExpanded = contratoExpandido === ped.id;

                return (
                  <div key={ped.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">C. #{ped.numContrato}</Badge>
                        <span className="text-xs font-bold text-gray-800">{ped.nombreCliente}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold text-gray-700" onClick={() => imprimirHojaTallerPDF(grupoDetalle, ped)}>
                          <Printer size={12} className="mr-1"/> PDF Contrato
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs font-bold text-primary flex items-center gap-1" onClick={() => setContratoExpandido(isExpanded ? null : ped.id)}>
                          <Eye size={14} /> {isExpanded ? 'Ocultar' : 'Ver Prendas'}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/30 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-900px">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200 font-bold uppercase text-[10px]">
                              <th className="p-2 text-center w-8">Sel.</th>
                              <th className="p-2">SKU</th><th className="p-2">Prenda</th><th className="p-2">Talla/Color</th>
                              <th className="p-2 text-center">Cant.</th><th className="p-2">Bordado</th><th className="p-2">Observación</th>
                              <th className="p-2 text-center">Operario</th>
                              <th className="p-2 text-center">Estado Taller</th><th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ped.detalles?.map((p: any) => (
                              <tr key={p.id} className="hover:bg-white">
                                <td className="p-2 text-center">
                                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer" checked={prendasSeleccionadas.includes(p.id)} onChange={() => toggleSeleccionPrenda(p.id)} />
                                </td>
                                <td className="p-2 font-mono font-bold text-blue-600">{p.skuCodigo || 'S/N'}</td>
                                <td className="p-2 font-bold text-gray-800">{p.tipoRopa}</td>
                                <td className="p-2 text-gray-600">{p.talla} ({p.color || '-'})</td>
                                <td className="p-2 text-center font-black">{p.cantidad}</td>
                                <td className="p-2 text-[11px]">{p.bordado ? <span className="font-bold text-purple-700">{p.bordado}</span> : <span className="text-gray-400 italic">Sin bordado</span>}</td>
                                <td className="p-2 text-[11px]">{(p.observacion || p.observacionOperaciones) ? <span className="text-gray-800 font-medium">{p.observacion || p.observacionOperaciones}</span> : <span className="text-gray-400 italic">Sin observaciones</span>}</td>
                                
                                {/* 🔥 AQUI ESTÁ LA CORRECCIÓN VISUAL: LEE DEL OBJETO operarioAsignado 🔥 */}
                                <td className="p-2 text-center font-bold text-blue-700">{p.operarioAsignado?.nombre || 'Sin Asignar'}</td>
                                
                                <td className="p-2 text-center"><Badge variant="outline" className={getEstadoColor(p.estadoProduccion)}>{p.estadoProduccion}</Badge></td>
                                <td className="p-2 text-center">
                                  <Button size="sm" className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-bold" onClick={() => handleMandarEmpaqueIndividual(p.id)}>
                                    A Empaque
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        <div className="flex justify-end pt-3">
                          <Button size="sm" onClick={() => abrirModalEstado(prendasSeleccionadas.filter(id => ped.detalles.some((p: any) => p.id === id)))} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8">
                            ⚙️ Cambiar Estado Taller (Seleccionadas)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" size="sm" onClick={() => setModalDetalleOpen(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⚙️ MODAL HÍBRIDO: CAMBIAR ESTADO Y ASIGNAR */}
      <Dialog open={modalEstado} onOpenChange={setModalEstado}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black text-gray-900 border-b pb-2 flex items-center gap-2"><Settings2 className="text-amber-600"/> Gestión de Taller</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-100 font-medium">
              Asignando estado a <strong>{prendasSeleccionadas.length}</strong> prenda(s).
            </p>
            
            {/* 🔥 EL ADMIN VE LA LISTA Y GUARDA EL ID 🔥 */}
            {esModoAdmin ? (
              <div>
                <Label className="text-xs font-bold text-gray-500">Operario Asignado (Administración)</Label>
                <select className="w-full h-10 border rounded-xl px-3 text-sm font-bold bg-white mt-1 outline-none" value={formEstado.operarioAsignadoId} onChange={e => setFormEstado({...formEstado, operarioAsignadoId: e.target.value})}>
                  <option value="">-- Dejar igual / Sin Asignar --</option>
                  {catalogos.operarios.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} ({c.rol})</option>)}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2">
                <UserCheck className="text-blue-600" size={16}/>
                <div>
                  <p className="text-[10px] text-blue-500 font-bold uppercase">Operario Responsable</p>
                  <p className="text-xs font-black text-blue-900">{currentUser?.nombre}</p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-gray-500">Estado de Taller / Confección (Tabla EstadoProduccion) *</Label>
              <select className="w-full h-10 border border-amber-300 rounded-xl px-3 text-sm font-black text-amber-800 bg-amber-50 mt-1 outline-none" value={formEstado.estado} onChange={e => setFormEstado({...formEstado, estado: e.target.value})}>
                <option value="">-- Seleccione estado --</option>
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

      {toast && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}