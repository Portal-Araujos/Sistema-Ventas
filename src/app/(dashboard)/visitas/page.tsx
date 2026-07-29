"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  MapPin, Search, Filter, Download, DollarSign, Clock, Calendar, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [instituciones, setInstituciones] = useState<any[]>([]);

  // Filtros (Por defecto carga el mes actual)
  const fechaEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  const primerDiaMes = new Date(fechaEcuador.getFullYear(), fechaEcuador.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = fechaEcuador.toISOString().split('T')[0];

  const [filtros, setFiltros] = useState({
    fechaInicio: primerDiaMes,
    fechaFin: hoyStr,
    cantonId: '',
    institucionId: '',
    vendedorId: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.cantonId) params.append('cantonId', filtros.cantonId);
      if (filtros.institucionId) params.append('institucionId', filtros.institucionId);
      if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);

      const [resVisitas, resCat, resInst, resVend] = await Promise.all([
        fetch(`/api/visitas?${params.toString()}`),
        fetch('/api/catalogos'),
        fetch('/api/instituciones'),
        fetch('/api/usuarios/vendedores')
      ]);

      setVisitas(await resVisitas.json());
      setCatalogos(await resCat.json());
      setInstituciones(await resInst.json());
      setVendedores(await resVend.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [filtros]);

  // --- LÓGICA DE EXPORTACIÓN A EXCEL ---
  const handleExportExcel = () => {
    if (visitas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    // Formatear columnas para que el Excel quede hermoso y profesional
    const dataParaExcel = visitas.map(v => ({
      'Fecha': v.fecha,
      'Hora GPS': v.hora,
      'Vendedor': v.vendedor,
      'Provincia': v.provincia,
      'Cantón': v.canton,
      'Institución': v.institucion,
      'Tipo de Gestión': v.tipoGestion,
      'Resultado/Acuerdos': v.resumen,
      'Contratos Cerrados': v.ventasRegistradas,
      'Monto Vendido ($)': v.totalVendido,
      'Números de Contrato': v.detallesContratos,
      'Ubicación GPS': v.latitud ? `https://maps.google.com/?q=${v.latitud},${v.longitud}` : 'Sin GPS'
    }));

    const ws = XLSX.utils.json_to_sheet(dataParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoría de Visitas");
    XLSX.writeFile(wb, `Reporte_Consolidado_Visitas_Ventas_${hoyStr}.xlsx`);
  };

  const cantonesDisponibles = catalogos?.provincias?.flatMap((p: any) => p.cantones) || [];
  const totalGenerado = visitas.reduce((sum, v) => sum + v.totalVendido, 0);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MapPin className="text-primary" /> Auditoría de Campo y Ventas
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Reporte consolidado que cruza las visitas GPS con los contratos de ventas generados.
          </p>
        </div>

        <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
          <Download size={18} className="mr-2" /> Descargar Excel
        </Button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-[11px] font-bold text-gray-500">Desde Fecha</Label>
          <Input type="date" className="h-9 text-xs w-36 mt-1" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} />
        </div>
        <div>
          <Label className="text-[11px] font-bold text-gray-500">Hasta Fecha</Label>
          <Input type="date" className="h-9 text-xs w-36 mt-1" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} />
        </div>
        <div>
          <Label className="text-[11px] font-bold text-gray-500">Cantón</Label>
          <select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-32" value={filtros.cantonId} onChange={e => setFiltros({...filtros, cantonId: e.target.value, institucionId: ''})}>
            <option value="">Todos</option>
            {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[11px] font-bold text-gray-500">Institución</Label>
          <select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-40" value={filtros.institucionId} onChange={e => setFiltros({...filtros, institucionId: e.target.value})}>
            <option value="">Todas</option>
            {instituciones.filter(i => !filtros.cantonId || i.cantonId === parseInt(filtros.cantonId)).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
        {catalogos?.userRol !== 'vendedor' && (
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Vendedor</Label>
            <select className="h-9 border rounded-md px-2 text-xs bg-white mt-1 w-36" value={filtros.vendedorId} onChange={e => setFiltros({...filtros, vendedorId: e.target.value})}>
              <option value="">Todos</option>
              {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* MÉTRICAS RÁPIDAS DEL REPORTE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-400">VISITAS EN RANGO</p><h3 className="text-xl font-bold">{visitas.length}</h3></div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Calendar size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-400">CIERRES (VENTAS)</p><h3 className="text-xl font-bold text-emerald-600">{visitas.filter(v => v.ventasRegistradas > 0).length}</h3></div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><CheckCircle2 size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between sm:col-span-2">
          <div><p className="text-xs font-bold text-gray-400">MONTO TOTAL CERRADO EN ESTAS VISITAS</p><h3 className="text-xl font-extrabold text-emerald-700">${totalGenerado.toFixed(2)}</h3></div>
          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center"><DollarSign size={20} /></div>
        </div>
      </div>

      {/* TABLA CONSOLIDADA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Fecha y Hora</TableHead>
              <TableHead className="font-semibold text-gray-700">Gestión en Campo</TableHead>
              <TableHead className="font-semibold text-gray-700">Resultado de la Visita</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center bg-emerald-50/50">Venta Cerrada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Buscando y cruzando datos...</TableCell></TableRow> : 
             visitas.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">No hay visitas registradas en este periodo.</TableCell></TableRow> : 
             visitas.map((v, i) => (
              <TableRow key={i} className="hover:bg-gray-50">
                
                {/* FECHA Y HORA */}
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{v.fecha}</div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={10} /> {v.hora}</div>
                  {v.latitud && (
                    <a href={`http://maps.google.com/?q=${v.latitud},${v.longitud}`} target="_blank" className="text-[10px] text-primary font-bold hover:underline mt-1 block">📍 Ver Mapa GPS</a>
                  )}
                </TableCell>

                {/* GESTIÓN EN CAMPO */}
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{v.institucion}</div>
                  <div className="text-[10px] text-gray-500 mb-1">{v.provincia} / {v.canton}</div>
                  <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">{v.tipoGestion}</Badge>
                  <div className="text-xs font-semibold text-gray-700 mt-1">👤 {v.vendedor}</div>
                </TableCell>

                {/* RESULTADO (MOTIVO) */}
                <TableCell className="max-w-xs">
                  <div className="text-xs text-gray-800 whitespace-pre-wrap overflow-wrap:anywhere leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">
                    {v.resumen}
                  </div>
                </TableCell>

                {/* VENTA CERRADA (LA MAGIA) */}
                <TableCell className="text-center bg-emerald-50/20">
                  {v.ventasRegistradas > 0 ? (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-extrabold text-emerald-600">${v.totalVendido.toFixed(2)}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold mt-1">
                        {v.ventasRegistradas} Contrato(s)
                      </span>
                      <span className="text-[9px] text-gray-500 mt-1 font-mono">Ref: {v.detallesContratos}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 italic">No hubo venta</span>
                  )}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}