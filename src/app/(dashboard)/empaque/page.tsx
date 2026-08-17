"use client";

import React, { useState, useEffect } from 'react';
import { Package, Search, Calendar, Eye, CheckCircle2, AlertCircle, PackageCheck, Truck, Clock, Printer, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function EmpaquePage() {
  const [data, setData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTROS Y PAGINACIÓN
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState(''); 
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // MODALES (Nivel 2 y Nivel 3)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [grupoDetalle, setGrupoDetalle] = useState<any>(null);

  const [modalEmpacarOpen, setModalEmpacarOpen] = useState(false);
  const [contratoSel, setContratoSel] = useState<any>(null);
  const [responsable, setResponsable] = useState('');
  const [prendasChecklist, setPrendasChecklist] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedInstFilter, kpiFilter]);

  // ABRIR NIVEL 2 (Contratos de la Escuela)
  const handleOpenDetalle = (grupo: any) => { setGrupoDetalle(grupo); setModalDetalleOpen(true); };

  // ABRIR NIVEL 3 (Checklist de Prendas del Contrato)
  const handleOpenEmpacar = (contrato: any) => {
    setContratoSel(contrato);
    setResponsable(contrato.responsableEmpaque !== 'Sin Asignar' ? contrato.responsableEmpaque : '');
    setPrendasChecklist(JSON.parse(JSON.stringify(contrato.detalles)));
    setModalEmpacarOpen(true);
  };

  const handleCambiarEstadoPrenda = (id: string, nuevoEstado: string) => {
    setPrendasChecklist(prev => prev.map(p => p.id === id ? { ...p, estadoEmpaque: nuevoEstado } : p));
  };

  const handleGuardarChecklist = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/empaque', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId: contratoSel.id,
          responsableEmpaque: responsable,
          detallesUpdates: prendasChecklist.map(p => ({ id: p.id, estadoEmpaque: p.estadoEmpaque }))
        })
      });
      if (!res.ok) throw new Error();
      showToast('exito', 'Avance de empaque guardado.');
      setModalEmpacarOpen(false);
      setModalDetalleOpen(false);
      cargarDatos();
    } catch (e) { showToast('error', 'Error al guardar.'); } finally { setSaving(false); }
  };

  // 🔥 NUEVO GENERADOR DE PDF (HORIZONTAL Y TOTALIZADO) 🔥
  const imprimirReporteEmpaque = (grupo: any, contratoEspecifico?: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'El navegador bloqueó la ventana emergente.');
      return;
    }

    // 1. Determinar qué prendas vamos a imprimir (Toda la escuela o solo un contrato)
    let prendasAImprimir: any[] = [];
    let tituloReporte = '';

    if (contratoEspecifico) {
      tituloReporte = `GUÍA DE EMPAQUE Y DESPACHO - CONTRATO #${contratoEspecifico.numContrato}`;
      prendasAImprimir = contratoEspecifico.detalles.map((d: any) => ({
        ...d, numContrato: contratoEspecifico.numContrato, nombreCliente: contratoEspecifico.nombreCliente
      }));
    } else {
      tituloReporte = `CONSOLIDADO DE EMPAQUE - ${grupo.institucionNombre}`;
      grupo.pedidosAsociados.forEach((ped: any) => {
        ped.detalles.forEach((d: any) => {
          prendasAImprimir.push({...d, numContrato: ped.numContrato, nombreCliente: ped.nombreCliente});
        });
      });
    }

    // 2. Generar el diccionario de Totales
    const mapaTotales: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};
    
    let htmlFilasDetalle = '';

    prendasAImprimir.forEach(p => {
      const sku = p.skuCodigo || 'S/N';
      const prendaNombre = p.tipoRopa || 'Prenda';
      const color = p.color || '-';
      const talla = p.talla || '-';
      const fCompromiso = p.fechaEstimadaConfeccion ? new Date(p.fechaEstimadaConfeccion).toLocaleDateString('es-EC', {timeZone: 'UTC'}) : 'Sin Fecha';
      const fIngreso = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-EC') : '-';

      // Acumulador de totales
      const prendaColorTalla = `${prendaNombre} (${color}, ${talla})`;
      const key = `${sku}_${prendaColorTalla}`;
      if (!mapaTotales[key]) mapaTotales[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
      mapaTotales[key].cantidadTotal += (p.cantidad || 1);

      // Fila de la tabla principal
      htmlFilasDetalle += `
        <tr>
          <td>${grupo.codigoOP}</td>
          <td>${grupo.institucionNombre}</td>
          <td>${p.numContrato}</td>
          <td>${p.nombreCliente}</td>
          <td>${sku}</td>
          <td>${prendaNombre}</td>
          <td>${color}</td>
          <td>${p.genero || 'UNISEX'}</td>
          <td>${talla}</td>
          <td style="text-align:center; font-weight:bold;">${p.cantidad}</td>
          <td>${p.bordado || '-'}</td>
          <td>${p.observacion || '-'}</td>
          <td>${p.operarioAsignado || 'Sin Asignar'}</td>
          <td>${p.estadoEmpaque || p.estadoOperacion}</td>
          <td>${fIngreso}</td>
          <td>${fCompromiso}</td>
        </tr>
      `;
    });

    let htmlFilasTotales = '';
    Object.values(mapaTotales).forEach(item => {
      htmlFilasTotales += `
        <tr>
          <td style="font-weight:bold;">${item.sku}</td>
          <td>${item.prendaColorTalla}</td>
          <td style="text-align:center; font-weight:bold; font-size:16px;">${item.cantidadTotal}</td>
        </tr>
      `;
    });

    const fechaImpresion = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });

    // 3. Escribir el HTML forzando Landscape
    printWindow.document.write(`
      <html>
        <head>
          <title>${tituloReporte}</title>
          <style>
            @page { size: landscape; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; }
            h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 5px; }
            p { text-align: center; margin-top: 0; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #aaa; padding: 6px 4px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .tabla-totales { width: 60%; margin: 0 auto; }
            .tabla-totales th { background-color: #333; color: #fff; }
          </style>
        </head>
        <body>
          <h1>${tituloReporte}</h1>
          <p>Operador / Generado: ${fechaImpresion}</p>
          
          <table>
            <thead>
              <tr>
                <th>Código OP</th><th>Institución</th><th>N° Contrato</th><th>Cliente</th>
                <th>SKU</th><th>Prenda</th><th>Color</th><th>Sexo</th><th>Talla</th>
                <th>Cant.</th><th>Bordado</th><th>Observación</th><th>Operario</th>
                <th>Estado</th><th>Ingreso Taller</th><th>F. Compromiso</th>
              </tr>
            </thead>
            <tbody>
              ${htmlFilasDetalle}
            </tbody>
          </table>

          <div style="page-break-inside: avoid;">
            <h2 style="text-align:center; font-size:16px; margin-bottom:10px;">RESUMEN DE EMPAQUE (TOTALES)</h2>
            <table class="tabla-totales">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Prenda (Color y Talla)</th>
                  <th style="text-align:center;">Cantidad Total</th>
                </tr>
              </thead>
              <tbody>
                ${htmlFilasTotales}
              </tbody>
            </table>
          </div>
          
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getBarColor = (avance: number) => {
    if (avance === 100) return 'bg-emerald-500';
    if (avance > 0) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  const filteredData = data.filter(g => {
    const matchSearch = g.institucionNombre?.toLowerCase().includes(searchTerm.toLowerCase()) || g.codigoOP?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst = selectedInstFilter ? g.id === selectedInstFilter : true;
    let matchKpi = true;
    if (kpiFilter === 'Pendiente') matchKpi = g.estadoGlobal === 'Pendiente';
    if (kpiFilter === 'En Preparación') matchKpi = g.estadoGlobal === 'En Preparación';
    if (kpiFilter === 'Completado') matchKpi = g.estadoGlobal === 'Completado';
    return matchSearch && matchInst && matchKpi;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Package className="text-purple-600" /> Bodega y Empaque</h1>
          <p className="text-sm text-gray-500 mt-1">Control logístico y armado de bultos para despacho.</p>
        </div>
      </div>

      {/* TARJETAS KPI (CLICKEABLES) */}
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

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-1/3">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50" placeholder="Buscar OP- o Institución..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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

      {/* TABLA PRINCIPAL (NIVEL 1) */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando bodega...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay paquetes en esta sección.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[800px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-black uppercase border-b border-gray-200">
                  <th className="p-3.5">Orden OP</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5">Avance de Empaque</th>
                  <th className="p-3.5 text-center">Estado General</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-black text-purple-700">{item.codigoOP}</td>
                    <td className="p-3.5 font-bold text-gray-900 truncate max-w-[200px]">{item.institucionNombre}</td>
                    <td className="p-3.5 text-center font-bold text-gray-800">{item.paquetesCantidad}</td>
                    
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 rounded-full ${getBarColor(item.avanceGlobal)}`} style={{ width: `${item.avanceGlobal}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black w-8 text-right">{item.avanceGlobal}%</span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">{item.prendasPreparadas} de {item.totalPrendas} prendas listas</div>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge className={item.estadoGlobal === 'Completado' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : item.estadoGlobal === 'En Preparación' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                        {item.estadoGlobal}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* 🔥 BOTÓN PARA IMPRIMIR CONSOLIDADO DE TODA LA ESCUELA 🔥 */}
                        <Button size="icon" variant="ghost" title="Imprimir Consolidado Completo" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onClick={() => imprimirReporteEmpaque(item)}>
                          <Printer size={16} />
                        </Button>

                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-primary border-primary/30" onClick={() => handleOpenDetalle(item)}>
                          <Eye size={14} className="mr-1" /> Ver OP / Armar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* 👁️ MODAL NIVEL 2: DESGLOSE DE LA OP (CONTRATOS) */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-5xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex justify-between items-center">
              <span>Bodega: Armado de Orden</span>
              <Badge className="bg-purple-600 text-white">{grupoDetalle?.codigoOP}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border text-xs">
              <div className="col-span-2"><span className="text-gray-400 block font-bold uppercase">INSTITUCIÓN</span><span className="font-extrabold text-gray-800">{grupoDetalle?.institucionNombre}</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">AVANCE GLOBAL</span><span className="font-black text-purple-600 text-sm">{grupoDetalle?.avanceGlobal}%</span></div>
              <div><span className="text-gray-400 block font-bold uppercase">ESTADO</span><span className="font-extrabold text-gray-700">{grupoDetalle?.estadoGlobal}</span></div>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Lista de Paquetes / Contratos para armar:</p>
            
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 font-bold uppercase border-b">
                    <th className="p-3">N. Paquete</th><th className="p-3">Cliente</th><th className="p-3 text-center">Avance</th><th className="p-3">Responsable</th><th className="p-3">Tiempos</th><th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grupoDetalle?.pedidosAsociados?.map((ped: any, idx: number) => {
                    const finalizado = ped.avance === 100;
                    return (
                      <tr key={ped.id} className={finalizado ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}>
                        <td className="p-3">
                          <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">C. #{ped.numContrato}</Badge>
                        </td>
                        <td className="p-3 font-bold text-gray-800">{ped.nombreCliente}</td>
                        <td className="p-3 text-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden"><div className={`h-2 rounded-full ${getBarColor(ped.avance)}`} style={{ width: `${ped.avance}%` }}></div></div>
                          <span className="text-[10px] font-black">{ped.avance}% ({ped.prendasPreparadas}/${ped.totalPrendas})</span>
                        </td>
                        <td className="p-3 text-gray-600 font-semibold">{ped.responsableEmpaque}</td>
                        <td className="p-3 text-[10px] text-gray-500">
                          <div>IN: {ped.fechaInicioEmpaque ? new Date(ped.fechaInicioEmpaque).toLocaleTimeString('es-EC') : '-'}</div>
                          {ped.fechaFinEmpaque && <div className="text-emerald-600 font-bold">FIN: {new Date(ped.fechaFinEmpaque).toLocaleTimeString('es-EC')}</div>}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant={finalizado ? "outline" : "secondary"} className={`text-xs font-bold h-8 ${finalizado ? 'border-emerald-300 text-emerald-700' : 'bg-primary text-white hover:bg-primary/90'}`} onClick={() => handleOpenEmpacar(ped)}>
                              {finalizado ? 'Ver Checklist' : '📦 Empacar'}
                            </Button>
                            
                            {/* 🔥 BOTÓN PARA IMPRIMIR LA GUÍA DE ESTE CONTRATO ESPECÍFICO 🔥 */}
                            <Button size="icon" variant="ghost" title="Imprimir Reporte PDF" className="h-8 w-8 text-slate-700 hover:bg-slate-100" onClick={() => imprimirReporteEmpaque(grupoDetalle, ped)}>
                              <Printer size={16} />
                            </Button>

                          </div>
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

      {/* 📦 MODAL NIVEL 3: EL CHECKLIST PRENDA POR PRENDA */}
      <Dialog open={modalEmpacarOpen} onOpenChange={setModalEmpacarOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
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

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 font-bold uppercase border-b">
                    <th className="p-3">SKU</th><th className="p-3">Prenda</th><th className="p-3">Talla/Color/Sexo</th><th className="p-3 text-center">Cant.</th><th className="p-3">Estado de Empaque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prendasChecklist.map((p: any) => (
                    <tr key={p.id} className={p.estadoEmpaque === 'Preparado' ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}>
                      <td className="p-3 font-mono font-bold text-blue-600">{p.skuCodigo}</td>
                      <td className="p-3 font-bold text-gray-800">{p.tipoRopa}</td>
                      <td className="p-3 text-gray-600">{p.talla} / {p.color} / {p.genero}</td>
                      <td className="p-3 text-center font-black text-sm">{p.cantidad}</td>
                      <td className="p-3">
                        <select 
                          className={`w-full h-8 border rounded-lg px-2 text-xs font-bold ${p.estadoEmpaque === 'Preparado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : p.estadoEmpaque === 'En preparación' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-700'}`}
                          value={p.estadoEmpaque} 
                          onChange={(e) => handleCambiarEstadoPrenda(p.id, e.target.value)}
                        >
                          <option value="Pendiente">⏳ Pendiente</option>
                          <option value="En preparación">📦 En preparación</option>
                          <option value="Preparado">✅ Preparado (Funda Lista)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-500 italic">* Cuando todas las prendas digan "Preparado", el sistema marcará este contrato como "Listo para el Despacho" automáticamente.</p>
          </div>

          <DialogFooter className="mt-5 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalEmpacarOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold" disabled={saving} onClick={handleGuardarChecklist}>
              <Save size={14} className="mr-1"/> {saving ? 'Guardando...' : 'Guardar Checklist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOAST GLOBAL */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}