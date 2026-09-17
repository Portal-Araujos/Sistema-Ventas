"use client";

import React, { useState, useEffect } from 'react';
import { Package, Search, Calendar, Eye, CheckCircle2, AlertCircle, PackageCheck, Truck, Clock,ArrowUpDown,FileSpreadsheet, ArrowUp, ArrowDown,  Printer, ChevronLeft, ChevronRight, Save, Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'next/navigation';

export default function EmpaquePage() {
  const [data, setData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState(''); 
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const searchParams = useSearchParams();
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig.key !== columnName) return <ArrowUpDown size={14} className="text-gray-400 shrink-0" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary shrink-0" /> : <ArrowDown size={14} className="text-primary shrink-0" />;
  };

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);
  const [modalEmpacarOpen, setModalEmpacarOpen] = useState(false);
  const [contratoSel, setContratoSel] = useState<any>(null);
  const [responsable, setResponsable] = useState('');
  const [prendasChecklist, setPrendasChecklist] = useState<any[]>([]);
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalGuiaOpen, setModalGuiaOpen] = useState(false);
  const [codigoGuia, setCodigoGuia] = useState('');
  const [prendasParaGuia, setPrendasParaGuia] = useState<any[]>([]);
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => { setToast({ tipo, texto }); setTimeout(() => setToast(null), 4000); };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resEmp, resInst] = await Promise.all([
        fetch(`/api/empaque?fechaInicio=${fechaDesde}&fechaFin=${fechaHasta}`),
        fetch('/api/instituciones')
      ]);
      const jsonEmp = await resEmp.json();
      const jsonInst = await resInst.json();

      if (jsonEmp.tabla) {
        setData(jsonEmp.tabla);
        setKpis(jsonEmp.kpis);
      }
      setInstitucionesList(Array.isArray(jsonInst) ? jsonInst : (jsonInst.data || []));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [fechaDesde, fechaHasta]);
  useEffect(() => {
    const pId = searchParams.get('pedidoId');
    if (pId && data.length > 0) {
      setSearchTerm(pId);
      const grupoEncontrado = data.find(g => g.codigoOP === pId);
      if (grupoEncontrado) {
        handleOpenDetalle(grupoEncontrado);
      }
    }
  }, [searchParams, data]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, kpiFilter]);

  useEffect(() => {
    if (grupoDetalle && data.length > 0) {
      const grupoActualizado = data.find(g => g.id === grupoDetalle.id);
      if (grupoActualizado) setGrupoDetalle(grupoActualizado);
    }
  }, [data]);

  const handleOpenDetalle = (grupo: any) => { setGrupoDetalle(grupo); setModalDetalleOpen(true); };

  const handleOpenEmpacar = (contrato: any) => {
    setContratoSel(contrato);
    setResponsable(contrato.responsableEmpaque !== 'Sin Asignar' ? contrato.responsableEmpaque : '');
    const prendasSeguras = contrato.detallesCompletos || contrato.detalles || [];
    const checklistConContador = prendasSeguras.map((p: any) => ({
      ...p,
      escaneadas: p.estadoEmpaque === 'Preparado' ? p.cantidad : 0
    }));

    setPrendasChecklist(JSON.parse(JSON.stringify(checklistConContador)));
    setModalEmpacarOpen(true);
  };

  const handleCambiarEstadoPrenda = (id: string, nuevoEstado: string) => {
    setPrendasChecklist(prev => prev.map(p => {
      if (p.id === id) {
        const nuevasEscaneadas = nuevoEstado === 'Preparado' ? p.cantidad : 0;
        return { ...p, estadoEmpaque: nuevoEstado, escaneadas: nuevasEscaneadas };
      }
      return p;
    }));
  };
  const procesarEscaneo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sku = codigoEscaneado.trim().toUpperCase();
      if (!sku) return;

      let prendaEncontrada = false;
      let checklistActualizada = [...prendasChecklist];

      for (let i = 0; i < checklistActualizada.length; i++) {
        const p = checklistActualizada[i];
        const estOp = (p.estadoOperacion || '').toLowerCase();
        const llegoAEmpaque = estOp.includes('empaque') || estOp.includes('listos') || estOp.includes('despacho');
        if (p.skuCodigo?.toUpperCase() === sku && llegoAEmpaque && p.guiaDespachoId === null) {
          if (p.escaneadas < p.cantidad) {
            prendaEncontrada = true;
            p.escaneadas += 1;
            if (p.escaneadas === p.cantidad) {
              p.estadoEmpaque = 'Preparado';
            }
            break; 
          }
        }
      }

      if (!prendaEncontrada) {
        showToast('error', `SKU ${sku} no encontrado o ya está completo.`);
      }

      setPrendasChecklist(checklistActualizada);
      setCodigoEscaneado(''); 
    }
  };

  const handleGuardarChecklist = async () => {
    setSaving(true);
    try {
      const actualizacionesPermitidas = prendasChecklist.filter(p => {
         const estOp = (p.estadoOperacion || '').toLowerCase();
         const llegoAEmpaque = estOp.includes('empaque') || estOp.includes('listos') || estOp.includes('despacho');
         return llegoAEmpaque && p.guiaDespachoId === null;
      }).map(p => ({ id: p.id, estadoEmpaque: p.estadoEmpaque }));

      const res = await fetch('/api/empaque', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId: contratoSel.id,
          responsableEmpaque: responsable,
          detallesUpdates: actualizacionesPermitidas
        })
      });
      if (!res.ok) throw new Error();
      showToast('exito', 'Checklist actualizado.');
      setModalEmpacarOpen(false);
      cargarDatos();
    } catch (e) { showToast('error', 'Error al guardar.'); } finally { setSaving(false); }
  };

  const iniciarGeneracionGuiaGlobal = () => {
    let preparadas: any[] = [];
    grupoDetalle.pedidosAsociados.forEach((ped: any) => {
      ped.detalles.forEach((d: any) => {
        if (d.estadoEmpaque === 'Preparado' && d.guiaDespachoId === null) {
           preparadas.push({...d, numContrato: ped.numContrato});
        }
      });
    });

    if (preparadas.length === 0) {
      showToast('error', 'No hay prendas en estado "Preparado" en este pedido.');
      return;
    }
    setPrendasParaGuia(preparadas);
    setCodigoGuia('');
    setModalGuiaOpen(true);
  };

  const confirmarDespachoGlobal = async () => {
    if (!codigoGuia.trim()) {
      showToast('error', 'Por favor, ingresa la Guía o el Transportista.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/empaque', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'generar_guia',
          institucionId: grupoDetalle.institucionId, // 🔥 ENVIAMOS EL ID DE LA ESCUELA A LA GUÍA
          codigoGuia: codigoGuia,
          prendasIds: prendasParaGuia.map(p => p.id)
        })
      });
      if (!res.ok) throw new Error();
      showToast('exito', '¡Guía generada y prendas despachadas!');
      setModalGuiaOpen(false);
      cargarDatos();
    } catch (e) { showToast('error', 'Error al despachar.'); } finally { setSaving(false); }
  };

  const imprimirMasterChecklist = (grupo: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let prendasAImprimir: any[] = [];
    grupo.pedidosAsociados.forEach((ped: any) => {
      const listaPrendas = ped.detallesCompletos || ped.detalles || [];
      listaPrendas.forEach((d: any) => {
        prendasAImprimir.push({...d, numContrato: ped.numContrato, nombreCliente: ped.nombreCliente});
      });
    });

    const mapaTotales: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};
    let htmlFilasDetalle = '';

    prendasAImprimir.forEach(p => {
      const sku = p.skuCodigo || 'S/N';
      const prendaNombre = p.tipoRopa || 'Prenda';
      const color = p.color || '-';
      const talla = p.talla || '-';
      const prendaColorTalla = `${prendaNombre} (${color}, ${talla})`;
      const key = `${sku}_${prendaColorTalla}`;
      if (!mapaTotales[key]) mapaTotales[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
      mapaTotales[key].cantidadTotal += (p.cantidad || 1);

      htmlFilasDetalle += `
        <tr>
          <td>${grupo.codigoOP}</td>
          <td>${p.numContrato}</td>
          <td>${p.nombreCliente}</td>
          <td>${sku}</td>
          <td>${prendaNombre}</td>
          <td>${color}</td>
          <td>${p.genero || 'UNISEX'}</td>
          <td>${talla}</td>
          <td style="text-align:center; font-weight:bold; font-size:14px;">${p.cantidad}</td>
          <td>${p.bordado || '-'}</td>
          <td>${p.observacion || '-'}</td>
          <td style="font-weight:bold; color:#d97706;">${p.guiaDespachoId ? 'DESPACHADO' : p.estadoOperacion}</td>
          <td>${p.guiaDespachoId ? 'Guía Registrada' : '-'}</td>
        </tr>
      `;
    });

    let htmlFilasTotales = '';
    Object.values(mapaTotales).forEach(item => {
      htmlFilasTotales += `<tr><td style="font-weight:bold;">${item.sku}</td><td>${item.prendaColorTalla}</td><td style="text-align:center; font-weight:bold; font-size:16px;">${item.cantidadTotal}</td></tr>`;
    });

    const fechaImpresion = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });

    printWindow.document.write(`
      <html>
        <head>
          <title>Master Checklist - ${grupo.institucionNombre}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #222; }
            h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 2px; }
            p { text-align: center; margin-top: 0; color: #555; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #999; padding: 5px 3px; text-align: left; }
            th { background-color: #e5e5e5; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            .tabla-totales { width: 55%; margin: 0 auto; }
            .tabla-totales th { background-color: #222; color: #fff; }
          </style>
        </head>
        <body>
          <h1>MASTER CHECKLIST GLOBAL - ${grupo.institucionNombre}</h1>
          <p>Auditoría de Producción y Empaque | Generado: ${fechaImpresion} | Vendedor: ${grupo.vendedorNombre} </p>
          <table>
            <thead>
              <tr>
                <th>Código Pedido</th><th>N° Contrato</th><th>Cliente</th>
                <th>SKU</th><th>Prenda</th><th>Color</th><th>Sexo</th><th>Talla</th>
                <th>Cant.</th><th>Bordado</th><th>Observación</th>
                <th>Estado Actual</th><th>Guía</th>
              </tr>
            </thead>
            <tbody>${htmlFilasDetalle}</tbody>
          </table>
          <div style="page-break-inside: avoid;">
            <h2 style="text-align:center; font-size:14px; margin-bottom:8px;">TOTALES Y RESUMEN DE CORTE (MASTER)</h2>
            <table class="tabla-totales"><thead><tr><th>SKU</th><th>Prenda (Color y Talla)</th><th style="text-align:center;">Cantidad Total</th></tr></thead><tbody>${htmlFilasTotales}</tbody></table>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  const exportarMasterChecklistExcel = (grupo: any) => {
    if (!grupo || !grupo.pedidosAsociados) return;

    let prendasAImprimir: any[] = [];
    grupo.pedidosAsociados.forEach((ped: any) => {
      const listaPrendas = ped.detallesCompletos || ped.detalles || [];
      listaPrendas.forEach((d: any) => {
        prendasAImprimir.push({...d, numContrato: ped.numContrato, nombreCliente: ped.nombreCliente});
      });
    });

    if (prendasAImprimir.length === 0) return showToast('error', 'No hay prendas para exportar.');

    const wsData: any[][] = [];
    wsData.push([`MASTER CHECKLIST GLOBAL - ${grupo.institucionNombre}`]);
    wsData.push([`Vendedor: ${grupo.vendedorNombre}`, `Generado: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`]);
    wsData.push([]);
    wsData.push(["Código Pedido", "N° Contrato", "Cliente", "SKU", "Prenda", "Color", "Sexo", "Talla", "Cant.", "Bordado", "Observación", "Estado Actual", "Guía"]);

    const mapaTotales: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};

    prendasAImprimir.forEach(p => {
      const sku = p.skuCodigo || 'S/N';
      const prendaNombre = p.tipoRopa || 'Prenda';
      const color = p.color || '-';
      const talla = p.talla || '-';
      const genero = p.genero || 'UNISEX';

      wsData.push([
        grupo.codigoOP, p.numContrato, p.nombreCliente, sku, prendaNombre, color, genero, talla,
        p.cantidad, p.bordado || '-', p.observacion || '-', 
        p.guiaDespachoId ? 'DESPACHADO' : p.estadoOperacion,
        p.guiaDespachoId ? 'Guía Registrada' : '-'
      ]);

      const prendaColorTalla = `${prendaNombre} (${color}, ${talla}, ${genero})`;
      const key = `${sku}_${prendaColorTalla}`;
      if (!mapaTotales[key]) mapaTotales[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
      mapaTotales[key].cantidadTotal += (p.cantidad || 1);
    });

    wsData.push([]); wsData.push(["========================================="]);
    wsData.push(["TOTALES Y RESUMEN DE CORTE (MASTER)"]);
    wsData.push(["SKU", "Prenda (Color, Talla, Género)", "Cantidad Total"]);
    Object.values(mapaTotales).forEach(item => { 
      wsData.push([item.sku, item.prendaColorTalla, item.cantidadTotal]); 
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist Empaque");
    XLSX.writeFile(wb, `Checklist_Empaque_${grupo.codigoOP}.xlsx`);
  };
  const getBarColor = (avance: number) => {
    if (avance === 100) return 'bg-emerald-500';
    if (avance > 0) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  const getEstadoColor = (estado: string) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('varios')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (e.includes('preparado') || e.includes('listos')) return 'bg-teal-100 text-teal-800 border-teal-200';
    if (e.includes('despacho') || e.includes('completado')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoOP?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.institucionId === selectedInstFilter : true;
    let matchKpi = true;
    if (kpiFilter === 'Pendiente') matchKpi = g.estadoGlobal !== 'Completado' && g.estadoGlobal !== 'En Preparación';
    if (kpiFilter === 'En Preparación') matchKpi = g.estadoGlobal === 'En Preparación';
    if (kpiFilter === 'Completado') matchKpi = g.estadoGlobal === 'Completado';
    return matchSearch && matchInst && matchKpi;
  });

  const sortedData = React.useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key !== '') {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'fechaRequeridaTexto') {
          const parseDate = (dStr: string) => {
            if (!dStr || dStr.includes('1969') || dStr.includes('1970')) return sortConfig.direction === 'asc' ? Infinity : -Infinity;
            if (dStr.includes('-')) return new Date(dStr).getTime();
            const p = dStr.split('/');
            return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : new Date(dStr).getTime();
          };
          aValue = parseDate(aValue);
          bValue = parseDate(bValue);
        }

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Package className="text-purple-600" /> Bodega y Empaque</h1>
          <p className="text-sm text-gray-500 mt-1">Control logístico y generación de Guías de Despacho Globales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setKpiFilter(kpiFilter === 'Pendiente' ? '' : 'Pendiente')} className={`p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${kpiFilter === 'Pendiente' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white hover:border-gray-400'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${kpiFilter === 'Pendiente' ? 'text-gray-300' : 'text-gray-500'}`}>Pendientes de Empaque</p>
            <p className="text-4xl font-black mt-1">{kpis.pendientes || 0}</p>
          </div>
          <Clock size={40} className={kpiFilter === 'Pendiente' ? 'text-gray-600' : 'text-gray-200'}/>
        </div>

        <div onClick={() => setKpiFilter(kpiFilter === 'En Preparación' ? '' : 'En Preparación')} className={`p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${kpiFilter === 'En Preparación' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white hover:border-amber-400'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${kpiFilter === 'En Preparación' ? 'text-amber-100' : 'text-amber-600'}`}>En Preparación (Armando)</p>
            <p className="text-4xl font-black mt-1">{kpis.enPreparacion || 0}</p>
          </div>
          <Package size={40} className={kpiFilter === 'En Preparación' ? 'text-amber-400' : 'text-amber-100'}/>
        </div>

        <div onClick={() => setKpiFilter(kpiFilter === 'Completado' ? '' : 'Completado')} className={`p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${kpiFilter === 'Completado' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white hover:border-emerald-400'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${kpiFilter === 'Completado' ? 'text-emerald-200' : 'text-emerald-600'}`}>Completados / Listos</p>
            <p className="text-4xl font-black mt-1">{kpis.completados || 0}</p>
          </div>
          <Truck size={40} className={kpiFilter === 'Completado' ? 'text-emerald-500' : 'text-emerald-100'}/>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-1/3">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50" placeholder="Buscar PED- o Institución..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="h-10 border rounded-xl px-3 text-xs font-bold bg-gray-50 w-full md:w-1/3" value={selectedInstFilter} onChange={e => setSelectedInstFilter(e.target.value)}>
          <option value="">🏫 Todas las Instituciones</option>
          {institucionesList.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100 w-full md:w-1/3">
          <Calendar size={16} className="text-blue-500 ml-1 shrink-0" />
          <div className="flex items-center gap-2 w-full">
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            <span className="text-xs font-bold text-gray-400">-</span>
            <Input type="date" className="h-8 text-[11px] bg-white border-blue-200 w-full" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando bodega...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay paquetes en esta sección.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-auto max-h-[65vh] w-full">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)] select-none">
                <tr className="text-gray-600 font-black uppercase border-b border-gray-300">
                  <th className="p-3.5 cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('codigoOP')}>
                    <div className="flex items-center gap-1">Código Pedido {getSortIcon('codigoOP')}</div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('institucionNombre')}>
                    <div className="flex items-center gap-1">Institución {getSortIcon('institucionNombre')}</div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('vendedorNombre')}>
                    <div className="flex items-center gap-1">Vendedor {getSortIcon('vendedorNombre')}</div>
                  </th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('paquetesCantidad')}>
                    <div className="flex items-center justify-center gap-1">Contratos {getSortIcon('paquetesCantidad')}</div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('avanceGlobal')}>
                    <div className="flex items-center gap-1">Avance de Bodega {getSortIcon('avanceGlobal')}</div>
                  </th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('estadoGlobal')}>
                    <div className="flex items-center justify-center gap-1">Estado General {getSortIcon('estadoGlobal')}</div>
                  </th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('fechaRequeridaTexto')}>
                    <div className="flex items-center justify-center gap-1">Fecha Requerida {getSortIcon('fechaRequeridaTexto')}</div>
                  </th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => {
                  const isFantasma = !item.fechaRequeridaTexto || item.fechaRequeridaTexto.includes('1969') || item.fechaRequeridaTexto.includes('1970');
                  const fechaReqCorregida = isFantasma ? 'No asignada' : item.fechaRequeridaTexto;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-purple-700">{item.codigoOP}</td>
                      <td className="p-3.5 font-bold text-gray-900 truncate max-w-100">{item.institucionNombre}</td>
                      <td className="p-3.5 text-gray-600 font-semibold">{item.vendedorNombre}</td>
                      <td className="p-3.5 text-center">
                        <div className="font-bold text-gray-800 text-sm">{item.paquetesCantidad}</div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1">
                          Tot: {item.totalPrendasEscuela} | Desp: {item.despachadasHistoricasEscuela} | <span className="text-red-500">Saldo: {item.saldoPendienteEscuela}</span> | <span className="text-blue-600">Listo: {item.preparadasSinDespacharEscuela}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-2.5 rounded-full ${getBarColor(item.avanceGlobal)}`} style={{ width: `${item.avanceGlobal}%` }}></div>
                          </div>
                          <span className="text-[10px] font-black w-8 text-right">{item.avanceGlobal}%</span>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-1">{item.preparadasSinDespacharEscuela + item.despachadasHistoricasEscuela} de {item.totalPrendasEscuela} prendas listas/despachadas</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge className={item.estadoGlobal === 'Completado' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : item.estadoGlobal === 'En Preparación' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                          {item.estadoGlobal}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`font-bold px-2 py-1 rounded border ${item.esAtrasado ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {fechaReqCorregida}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="icon" variant="ghost" title="Imprimir Global (PDF)" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onClick={() => imprimirMasterChecklist(item)}>
                            <Printer size={16} />
                          </Button>
                          <Button size="icon" variant="ghost" title="Descargar (Excel)" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => exportarMasterChecklistExcel(item)}>
                            <FileSpreadsheet size={16} />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-primary border-primary/30" onClick={() => handleOpenDetalle(item)}>
                            <Eye size={14} className="mr-1" /> Panel Pedido
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
            <div className="sticky bottom-0 z-20 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/95 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <span className="text-xs text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14}/></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8"><ChevronRight size={14}/></Button>
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-5xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex justify-between items-center">
              <span>Auditoría de Despachos: {grupoDetalle?.institucionNombre}</span>
              <Badge className="bg-purple-600 text-white">{grupoDetalle?.codigoOP}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-300 shadow-inner text-xs">
              <div><span className="text-gray-400 block font-bold uppercase">CÓDIGO PEDIDO</span><span className="font-mono font-black text-blue-600">{grupoDetalle?.codigoOP}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">VENDEDOR</span><span className="font-extrabold text-gray-800">{grupoDetalle?.vendedorNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">PAQUETES</span><span className="font-extrabold text-gray-800">{grupoDetalle?.paquetesCantidad}</span></div>
              <div className="flex flex-col"><span className="text-gray-400 font-bold uppercase">Total Pedido</span><span className="font-black text-gray-800 text-xl">{grupoDetalle?.totalPrendasEscuela} <span className="text-[10px] font-normal text-gray-500">prendas</span></span></div>
              <div className="flex flex-col"><span className="text-emerald-500 font-bold uppercase">Ya Despachado</span><span className="font-black text-emerald-600 text-xl">{grupoDetalle?.despachadasHistoricasEscuela} <span className="text-[10px] font-normal text-gray-500">prendas</span></span></div>
              <div className="flex flex-col"><span className="text-red-500 font-bold uppercase">Saldo Pendiente</span><span className="font-black text-red-600 text-xl">{grupoDetalle?.saldoPendienteEscuela} <span className="text-[10px] font-normal text-gray-500">prendas</span></span></div>
              <div className="flex flex-col"><span className="text-blue-500 font-bold uppercase">Listas / Despachar</span><span className="font-black text-blue-600 text-xl">{grupoDetalle?.preparadasSinDespacharEscuela} <span className="text-[10px] font-normal text-gray-500">prendas</span></span></div>
            </div>

            {grupoDetalle?.preparadasSinDespacharEscuela > 0 && (
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-black text-sm h-12" onClick={iniciarGeneracionGuiaGlobal}>
                <Send size={18} className="mr-2"/> GENERAR GUÍA DE DESPACHO GLOBAL ({grupoDetalle?.preparadasSinDespacharEscuela} prendas listas)
              </Button>
            )}

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1 mt-4">Lista de Contratos para Empacar (Checklist):</p>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-800px">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 font-bold uppercase border-b">
                    <th className="p-3">N. Paquete</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-center">Saldos Contrato</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grupoDetalle?.pedidosAsociados?.map((ped: any) => {
                    const finalizado = ped.saldoPendienteContrato === 0;
                    return (
                      <tr key={ped.id} className={finalizado ? 'bg-emerald-50/30 opacity-70' : 'hover:bg-gray-50'}>
                        <td className="p-3">
                          <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">C. #{ped.numContrato}</Badge>
                        </td>
                        <td className="p-3 font-bold text-gray-800">{ped.nombreCliente}</td>
                        <td className="p-3 text-center">
                          <div className="text-[10px] font-bold text-gray-500">Tot: {ped.totalPrendasContrato} | Desp: {ped.despachadasHistoricasContrato} | <span className="text-red-500">Saldo: {ped.saldoPendienteContrato}</span> | <span className="text-blue-600">Listo: {ped.preparadasSinDespacharContrato}</span></div>
                        </td>
                        <td className="p-3 text-gray-600 font-semibold">{ped.responsableEmpaque}</td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant={finalizado ? "outline" : "secondary"} className={`text-xs font-bold h-8 ${finalizado ? 'border-emerald-300 text-emerald-700' : 'bg-primary text-white hover:bg-primary/90'}`} onClick={() => handleOpenEmpacar(ped)}>
                            {finalizado ? 'Ver Cerrado' : '📦 Empacar (Checklist)'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" size="sm" onClick={() => setModalDetalleOpen(false)}>Cerrar Panel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEmpacarOpen} onOpenChange={setModalEmpacarOpen}>
        <DialogContent className="sm:max-w-6xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2"><Package className="text-amber-600"/> Checklist de Empaque</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Cliente</p>
                <p className="text-sm font-black text-gray-900">{contratoSel?.nombreCliente}</p>
                <Badge className="mt-1 bg-blue-100 text-blue-800">Contrato #{contratoSel?.numContrato}</Badge>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500">Bodeguero Responsable</Label>
                <Input className="h-9 text-xs mt-1 border-gray-300 bg-white" placeholder="Ej: Juan Perez" value={responsable} onChange={e => setResponsable(e.target.value)} />
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-2 flex flex-col sm:flex-row items-center gap-4 shadow-inner">
              <div className="bg-emerald-100 p-2.5 rounded-lg shrink-0"><PackageCheck className="text-emerald-600" size={24}/></div>
              <div className="flex-1 w-full">
                <Label className="text-xs font-black text-emerald-800 uppercase tracking-wide">🔫 Pistoleo Rápido (Lector USB)</Label>
                <Input 
                  className="h-11 border-emerald-300 focus:ring-emerald-500 font-mono font-black uppercase mt-1 bg-white text-emerald-900 shadow-sm" 
                  placeholder="Haz clic aquí y pistolea el código SKU..." 
                  value={codigoEscaneado}
                  onChange={(e) => setCodigoEscaneado(e.target.value)}
                  onKeyDown={procesarEscaneo}
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-1/3 text-[10px] text-emerald-700 leading-tight font-medium bg-emerald-100/50 p-2 rounded">
                * Cada "BEEP" sumará <b>1 unidad</b>. Cuando el contador alcance la cantidad solicitada, la fila se marcará como <b>Preparada</b> automáticamente.
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-850px">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 font-bold uppercase border-b">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Prenda</th>
                    <th className="p-3">Talla/Color/Genero</th>
                    <th className="p-3 text-center">Cant.</th>
                    <th className="p-3">Bordado/Obs</th>
                    <th className="p-3 text-center">Ubicación</th>
                    <th className="p-3">Acción de Empaque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prendasChecklist.map((p: any) => {
                    const yaDespachado = p.guiaDespachoId !== null;
                    const estOp = (p.estadoOperacion || '').toLowerCase();
                    const llegoAEmpaque = estOp.includes('empaque') || estOp.includes('listos') || estOp.includes('despacho');
                    const aunEnTaller = !llegoAEmpaque;

                    return (
                      <tr key={p.id} className={yaDespachado ? 'bg-blue-50/50 opacity-60' : aunEnTaller ? 'bg-gray-100 opacity-60' : p.estadoEmpaque === 'Preparado' ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}>
                        <td className="p-3 font-mono font-bold text-blue-600">{p.skuCodigo || 'S/N'}</td>
                        <td className="p-3 font-bold text-gray-800">{p.tipoRopa}</td>
                        <td className="p-3 text-gray-600">{p.talla} / {p.color || '-'} / {p.genero}</td>
                        <td className="p-3 text-center">
                          <span className="font-black text-sm block">{p.cantidad}</span>
                          {!aunEnTaller && !yaDespachado && (
                            <Badge variant="outline" className={`mt-1 text-[10px] font-bold ${p.escaneadas === p.cantidad ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                              Escaneadas: {p.escaneadas || 0}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-[10px]">
                          <div className="font-bold text-purple-700">{p.bordado || 'Sin bordado'}</div>
                          <div className="text-gray-500 italic mt-0.5">{p.observacion || p.observacionOperaciones || 'Sin obs.'}</div>
                        </td>
                        
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[9px] uppercase">{p.estadoOperacion}</Badge>
                        </td>

                        <td className="p-3">
                          {yaDespachado ? (
                            <Badge className="bg-blue-600 text-white w-full flex justify-center"><Truck size={12} className="mr-1"/> Despachado</Badge>
                          ) : aunEnTaller ? (
                            <Badge variant="outline" className="bg-gray-200 text-gray-600 w-full flex justify-center"><Lock size={12} className="mr-1"/> En Taller / Prod.</Badge>
                          ) : (
                            <select 
                              className={`w-full h-8 border rounded-lg px-2 text-xs font-bold ${p.estadoEmpaque === 'Preparado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : p.estadoEmpaque === 'En preparación' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-700'}`}
                              value={p.estadoEmpaque} 
                              onChange={(e) => handleCambiarEstadoPrenda(p.id, e.target.value)}
                            >
                              <option value="Pendiente">⏳ Pendiente</option>
                              <option value="En preparación">📦 En preparación</option>
                              <option value="Preparado">✅ Preparado (Funda Lista)</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-500 italic">* Solo las prendas que han llegado físicamente a Bodega (Empaque) pueden ser preparadas.</p>
          </div>
          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalEmpacarOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold" disabled={saving} onClick={handleGuardarChecklist}>
              <Save size={14} className="mr-1"/> {saving ? 'Guardando...' : 'Guardar Checklist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modalGuiaOpen} onOpenChange={setModalGuiaOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-blue-900 border-b pb-3 flex items-center gap-2">
              <Truck className="text-blue-600"/> Generar Despacho a Transporte
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 font-medium">Vas a despachar <strong className="text-lg font-black">{prendasParaGuia.length}</strong> prendas que ya están Listas del pedido <strong>{grupoDetalle?.codigoOP}</strong>.</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">Número de Guía o Nombre del Transportista *</Label>
              <Input 
                className="h-12 text-sm font-black mt-1 bg-white border-2 border-blue-200 focus:border-blue-500" 
                placeholder="Ej: SERVIENTREGA-9921 o Entrega Personal" 
                value={codigoGuia} 
                onChange={e => setCodigoGuia(e.target.value)} 
                autoFocus
              />
              <p className="text-[10px] text-gray-500 mt-1">Este número quedará grabado en el Historial para auditoría.</p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalGuiaOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" disabled={saving} onClick={confirmarDespachoGlobal}>
              <Send size={14} className="mr-1"/> {saving ? 'Despachando...' : 'Confirmar Salida'}
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