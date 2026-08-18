"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  MapPin, Search, Download, DollarSign, Clock, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [instituciones, setInstituciones] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalMonto, setTotalMonto] = useState(0); 
  const itemsPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const fechaEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  const primerDiaMes = new Date(fechaEcuador.getFullYear(), fechaEcuador.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = fechaEcuador.toISOString().split('T')[0];

  const [filtros, setFiltros] = useState({ fechaInicio: primerDiaMes, fechaFin: hoyStr, cantonId: '', institucionId: '', vendedorId: '' });

  const cargarDatos = async (isSilent = false) => {
    const modoSilencioso = loading ? false : isSilent;
    if (!modoSilencioso) setLoading(true);
    else setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.cantonId) params.append('cantonId', filtros.cantonId);
      if (filtros.institucionId) params.append('institucionId', filtros.institucionId);
      if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);
      
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const fetchPromises = [fetch(`/api/visitas?${params.toString()}`)];
      if (!catalogos) fetchPromises.push(fetch('/api/catalogos'));
      if (instituciones.length === 0) fetchPromises.push(fetch('/api/instituciones?limit=500'));
      if (vendedores.length === 0) fetchPromises.push(fetch('/api/usuarios/vendedores'));

      const responses = await Promise.all(fetchPromises);
      const resVisitas = await responses[0].json();
      
      const filtrarVisitasReales = (lista: any[]) => lista.filter(v => {
        const tipo = String(v.tipoGestion || '').toLowerCase();
        const resumen = String(v.resumen || '').toLowerCase();
        return !tipo.includes('asignación') && !tipo.includes('asignacion') && !resumen.includes('asignación masiva');
      });

      if (Array.isArray(resVisitas)) {
        const visitasReales = filtrarVisitasReales(resVisitas);
        setTotalItems(visitasReales.length);
        const paginatedData = visitasReales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        setVisitas(paginatedData);
        setTotalMonto(visitasReales.reduce((sum: number, v: any) => sum + (v.totalVendido || 0), 0));
      } else {
        const visitasReales = filtrarVisitasReales(resVisitas.data || []);
        setVisitas(visitasReales);
        setTotalItems(visitasReales.length);
        setTotalMonto(resVisitas.meta?.totalGenerado || 0);
      }

      if (!catalogos) setCatalogos(await responses[1].json());
      if (instituciones.length === 0) {
        const instJson = await responses[2].json();
        setInstituciones(instJson.data ? instJson.data : instJson);
      }
      if (vendedores.length === 0) setVendedores(await responses[3].json());

    } catch (e) { console.error(e); } finally { setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { setCurrentPage(1); }, [filtros]);
  useEffect(() => { cargarDatos(true); }, [currentPage, filtros]);

  // 🔥 NUEVA FUNCIÓN PARA ABRIR/CERRAR EL CANDADO DE EDICIÓN 🔥
  const handleToggleCandado = async (visitaId: string, estadoActual: boolean) => {
    try {
      await fetch('/api/visitas/retroactiva', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitaId, habilitar: !estadoActual })
      });
      cargarDatos(true); // Refresca en silencio
    } catch (e) {
      alert("Error al cambiar permisos.");
    }
  };

  const handleExportExcel = async () => {
    if (totalItems === 0) { alert("No hay datos para exportar."); return; }
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.cantonId) params.append('cantonId', filtros.cantonId);
      if (filtros.institucionId) params.append('institucionId', filtros.institucionId);
      if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);
      params.append('limit', '99999'); 

      const res = await fetch(`/api/visitas?${params.toString()}`);
      const dataFull = await res.json();
      let visitasFull = Array.isArray(dataFull) ? dataFull : dataFull.data || [];

      visitasFull = visitasFull.filter((v: any) => {
        const tipo = String(v.tipoGestion || '').toLowerCase();
        const resumen = String(v.resumen || '').toLowerCase();
        return !tipo.includes('asignación') && !tipo.includes('asignacion') && !resumen.includes('asignación masiva');
      });

      const dataParaExcel = visitasFull.map((v: any) => ({
        'Fecha': v.fecha, 'Hora GPS': v.hora, 'Vendedor': v.vendedor, 'Provincia': v.provincia, 'Cantón': v.canton,
        'Institución': v.institucion, 'Tipo de Gestión': v.tipoGestion, 'Resultado/Acuerdos': v.resumen,
        'Contratos Cerrados': v.ventasRegistradas, 'Monto Vendido ($)': v.totalVendido, 'Números de Contrato': v.detallesContratos,
        'Ubicación GPS': v.latitud ? `https://maps.google.com/?q=${v.latitud},${v.longitud}` : 'Sin GPS'
      }));

      const ws = XLSX.utils.json_to_sheet(dataParaExcel); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Auditoría de Visitas"); XLSX.writeFile(wb, `Reporte_Consolidado_Visitas_${hoyStr}.xlsx`);
    } catch (e) { alert("Error al exportar."); }
  };

  const cantonesDisponibles = catalogos?.provincias?.flatMap((p: any) => p.cantones) || [];

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h1 flex items-center gap-2"><MapPin className="text-primary" /> Auditoría de Campo y Seguimientos</h1>
          <p className="text-secondary mt-0.5">Reporte consolidado que cruza las visitas en ruta con los contratos de ventas generados.</p>
        </div>
        <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"><Download size={18} className="mr-2" /> Descargar Todo a Excel</Button>
      </div>
      
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-end gap-3">
        <div><Label className="text-[11px] font-bold text-muted-foreground uppercase">Desde</Label><Input type="date" className="h-9 text-xs w-36 mt-1 bg-white" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} /></div>
        <div><Label className="text-[11px] font-bold text-muted-foreground uppercase">Hasta</Label><Input type="date" className="h-9 text-xs w-36 mt-1 bg-white" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} /></div>
        <div><Label className="text-[11px] font-bold text-muted-foreground uppercase">Cantón</Label><select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-32 outline-none" value={filtros.cantonId} onChange={e => setFiltros({...filtros, cantonId: e.target.value, institucionId: ''})}><option value="">Todos</option>{cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
        <div><Label className="text-[11px] font-bold text-muted-foreground uppercase">Institución</Label><select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-48 outline-none" value={filtros.institucionId} onChange={e => setFiltros({...filtros, institucionId: e.target.value})}><option value="">Todas</option>{instituciones.filter(i => !filtros.cantonId || i.cantonId === parseInt(filtros.cantonId)).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}</select></div>
        {catalogos?.userRol !== 'vendedor' && (
          <div><Label className="text-[11px] font-bold text-muted-foreground uppercase">Vendedor</Label><select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-40 outline-none" value={filtros.vendedorId} onChange={e => setFiltros({...filtros, vendedorId: e.target.value})}><option value="">Todos</option>{vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select></div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">TOTAL VISITAS RANGO</p><h3 className="text-2xl font-extrabold text-foreground">{totalItems}</h3></div>
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><Calendar size={20} /></div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">CIERRES EN RUTA</p><h3 className="text-2xl font-extrabold text-emerald-600">{visitas.filter(v => v.ventasRegistradas > 0).length}</h3></div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><CheckCircle2 size={20} /></div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between sm:col-span-2 transition-transform hover:-translate-y-1">
          <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">MONTO TOTAL CERRADO EN ESTAS VISITAS</p><h3 className="text-2xl font-black text-emerald-700">${totalMonto.toFixed(2)}</h3></div>
          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center"><DollarSign size={20} /></div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto relative">
        {isRefreshing && <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 z-10"><div className="h-full bg-primary animate-pulse w-1/3 rounded-full"></div></div>}
        <Table className={isRefreshing ? 'opacity-80' : ''}>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {/* 🔥 CABECERA EDICIÓN PARA ADMIN 🔥 */}
              {catalogos?.userRol !== 'vendedor' && <TableHead className="font-semibold text-center w-80px">Edición</TableHead>}
              <TableHead className="font-semibold w-150px">Fecha y Hora</TableHead>
              <TableHead className="font-semibold w-220px">Gestión en Campo</TableHead>
              <TableHead className="font-semibold min-w-250px">Resultado</TableHead>
              <TableHead className="font-semibold text-center bg-emerald-50/50 w-180px">Venta Cerrada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center py-10 font-semibold">Cruzando datos...</TableCell></TableRow> : 
             visitas.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-10">No hay registros.</TableCell></TableRow> : 
             visitas.map((v, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                
                {/* 🔥 BOTÓN CANDADO PARA ADMINISTRADORES 🔥 */}
                {catalogos?.userRol !== 'vendedor' && (
                  <TableCell className="text-center align-middle">
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => handleToggleCandado(v.id, v.edicionFechaHabilitada)}
                      title={v.edicionFechaHabilitada ? "Bloquear edición" : "Habilitar corrección de fecha al vendedor"}
                      className={`h-9 w-9 rounded-xl transition-all ${v.edicionFechaHabilitada ? "text-amber-600 bg-amber-100 hover:bg-amber-200 border border-amber-300" : "text-gray-400 hover:bg-gray-100"}`}
                    >
                      {v.edicionFechaHabilitada ? <Unlock size={18} /> : <Lock size={18} />}
                    </Button>
                  </TableCell>
                )}

                <TableCell className="align-top pt-4">
                  <div className="font-bold text-foreground text-xs">{v.fecha}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock size={10} /> {v.hora}</div>
                  {v.latitud && (
                    <a href={`http://maps.google.com/?q=${v.latitud},${v.longitud}`} target="_blank" className="text-[10px] text-primary font-bold hover:underline mt-1 block">📍 Ver Mapa GPS</a>
                  )}
                </TableCell>
                <TableCell className="align-top pt-4">
                  <div className="font-bold text-sm leading-tight">{v.institucion}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">{v.provincia} / {v.canton}</div>
                  <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">{v.tipoGestion}</Badge>
                  <div className="text-xs font-semibold mt-2">👤 {v.vendedor}</div>
                </TableCell>
                <TableCell className="max-w-xs align-top pt-4">
                  <div className="text-xs font-bold mb-1">{v.estadoGestion}</div>
                  <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border">{v.resumen}</div>
                </TableCell>
                <TableCell className={`text-center align-top pt-4 ${v.ventasRegistradas > 0 ? 'bg-emerald-50/30' : ''}`}>
                  {v.ventasRegistradas > 0 ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-extrabold text-emerald-600">${v.totalVendido?.toFixed(2)}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold my-1">{v.ventasRegistradas} Contrato(s)</span>
                      <span className="text-[9px] text-muted-foreground" title={v.detallesContratos}>Ref: {v.detallesContratos}</span>
                    </div>
                  ) : <span className="text-xs text-muted-foreground italic mt-3 block">No hubo venta</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center bg-muted/30">
            <span className="text-xs text-muted-foreground font-medium">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14}/> Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">Siguiente <ChevronRight size={14}/></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}