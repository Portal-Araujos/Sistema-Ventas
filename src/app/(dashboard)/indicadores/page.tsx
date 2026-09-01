"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, Target, Calendar, CheckCircle2, Download, AlertTriangle} from 'lucide-react';
import { AlertCircle } from 'react-feather';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function IndicadoresPage() {
  const [reporte, setReporte] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRol, setUserRol] = useState('vendedor');
  const getLunesHoy = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };
  const [fechaLunes, setFechaLunes] = useState(getLunesHoy());
  const [modalMetas, setModalMetas] = useState(false);
  const [metasForm, setMetasForm] = useState<any[]>([]);
  const [savingMetas, setSavingMetas] = useState(false);
  const cargarIndicadores = async () => {
    setLoading(true);
    try {
      const [resInd, resCat] = await Promise.all([
        fetch(`/api/indicadores/semanal?fechaLunes=${fechaLunes}`),
        fetch('/api/catalogos')
      ]);
      if (!resInd.ok) throw new Error("No se pudo cargar la API de indicadores");
      const dataInd = await resInd.json();
      const dataCat = await resCat.json();
      setReporte(Array.isArray(dataInd.reporte) ? dataInd.reporte : []);
      if (dataCat.userRol) setUserRol(dataCat.userRol);
    } catch (e) {
      setReporte([]); 
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargarIndicadores(); }, [fechaLunes]);
  const handleOpenModalMetas = () => {
    setMetasForm(
      reporte.map(r => ({
        vendedorId: r.vendedorId,
        vendedorNombre: r.vendedorNombre,
        montoMeta: r.metaMonto
      }))
    );
    setModalMetas(true);
  };
  const handleGuardarMetas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMetas(true);
    try {
      const res = await fetch('/api/indicadores/semanal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaLunes, metas: metasForm })
      });
      if (!res.ok) throw new Error();
      setModalMetas(false);
      cargarIndicadores();
      showToast('exito', '¡Metas semanales guardadas con éxito!');
    } catch (e) {
      showToast('error', 'Hubo un problema al guardar las metas.');
    } finally {
      setSavingMetas(false);
    }
  };
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 4000);
  };
  const exportarExcel = () => {
    const dataAprobada = reporte.map(r => ({
      'Estado': 'Venta Real (Aprobada)',
      'Semana Lunes': fechaLunes,
      'Vendedor': r.vendedorNombre,
      'Lunes ($)': r.diasReales.lunes,
      'Martes ($)': r.diasReales.martes,
      'Miércoles ($)': r.diasReales.miercoles,
      'Jueves ($)': r.diasReales.jueves,
      'Viernes ($)': r.diasReales.viernes,
      'Sábado ($)': r.diasReales.sabado,
      'Domingo ($)': r.diasReales.domingo, 
      'Total Cierre ($)': r.cierreSemanal,
      'Meta Asignada ($)': r.metaMonto,
      '% Cumplido': r.porcentajeCumplido
    }));
    const dataTransito = reporte.map(r => ({
      'Estado': 'En Tránsito (Pendiente Facturación)',
      'Semana Lunes': fechaLunes,
      'Vendedor': r.vendedorNombre,
      'Lunes ($)': r.diasTransito.lunes,
      'Martes ($)': r.diasTransito.martes,
      'Miércoles ($)': r.diasTransito.miercoles,
      'Jueves ($)': r.diasTransito.jueves,
      'Viernes ($)': r.diasTransito.viernes,
      'Sábado ($)': r.diasTransito.sabado,
      'Domingo ($)': r.diasTransito.domingo, 
      'Total Cierre ($)': r.transitoTotal,
      'Meta Asignada ($)': 0,
      '% Cumplido': 0
    }));
    const dataFinal = [...dataAprobada, ...dataTransito];
    const ws = XLSX.utils.json_to_sheet(dataFinal);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Indicadores_${fechaLunes}`);
    XLSX.writeFile(wb, `Reporte_Indicadores_${fechaLunes}.xlsx`);
  };
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';
  const totalCierreSemanal = reporte.reduce((sum, r) => sum + r.cierreSemanal, 0);
  const totalMetaSemanal = reporte.reduce((sum, r) => sum + r.metaMonto, 0);
  const totalTransitoSemanal = reporte.reduce((sum, r) => sum + r.transitoTotal, 0);
  const porcentajeGlobal = totalMetaSemanal > 0 ? ((totalCierreSemanal / totalMetaSemanal) * 100).toFixed(1) : '0';
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-emerald-600" /> Indicadores y Cierre Semanal
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Mide el desempeño real de tus vendedores (Solo ventas con contratos completos y validados).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarExcel} className="text-blue-700 border-blue-200 hover:bg-blue-50">
            <Download size={16} className="mr-2" /> Descargar Excel
          </Button>
          {esAdmin && (
            <Button onClick={handleOpenModalMetas} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex gap-2">
              <Target size={18} /> Definir Metas
            </Button>
          )}
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-emerald-600" size={20} />
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Semana (Lunes de inicio):</Label>
            <Input 
              type="date" 
              className="h-9 text-xs w-44 mt-0.5 font-bold cursor-pointer hover:border-emerald-300" 
              value={fechaLunes} 
              onChange={e => setFechaLunes(e.target.value)} 
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center min-w-120px">
            <span className="text-[10px] font-bold text-amber-700 block uppercase">En Tránsito (Limbo)</span>
            <span className="text-lg font-extrabold text-amber-600">${totalTransitoSemanal.toFixed(2)}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border text-center min-w-120px">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Cierre Valido</span>
            <span className="text-lg font-extrabold text-emerald-700">${totalCierreSemanal.toFixed(2)}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border text-center min-w-120px">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Meta Semanal</span>
            <span className="text-lg font-extrabold text-gray-800">${totalMetaSemanal.toFixed(2)}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border text-center min-w-120px">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">% Cumplido</span>
            <span className={`text-lg font-extrabold ${Number(porcentajeGlobal) >= 100 ? 'text-emerald-600' : Number(porcentajeGlobal) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {porcentajeGlobal}%
            </span>
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> VENTAS VALIDADAS (Suman a Meta)</h2>
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-x-auto">
          <Table>
            <TableHeader className="bg-emerald-50/80">
              <TableRow>
                <TableHead className="font-bold text-gray-800">Vendedor</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Lunes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Martes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Miércoles</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Jueves</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Viernes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Sábado</TableHead>
                <TableHead className="font-semibold text-red-700 text-center">Domingo</TableHead>
                <TableHead className="font-bold text-emerald-800 text-center bg-emerald-100/50">Cierre Real</TableHead>
                <TableHead className="font-bold text-gray-800 text-center bg-gray-100/50">Meta Asignada</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">% Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">Calculando informe semanal...</TableCell></TableRow>
              ) : reporte.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">No hay vendedores o datos registrados.</TableCell></TableRow>
              ) : reporte.map(r => (
                <TableRow key={r.vendedorId} className="hover:bg-emerald-50/30">
                  <TableCell className="font-bold text-gray-900 text-sm">👤 {r.vendedorNombre}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.lunes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.martes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.miercoles.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.jueves.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.viernes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-600">${r.diasReales.sabado.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-red-600 bg-red-50/20">${r.diasReales.domingo.toFixed(2)}</TableCell> {/* 🔥 Añadido Domingo */}
                  <TableCell className="text-center font-extrabold text-sm text-emerald-700 bg-emerald-50/50">${r.cierreSemanal.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-bold text-sm text-gray-800 bg-gray-50/50">${r.metaMonto.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-xs font-bold ${r.porcentajeCumplido >= 100 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : r.porcentajeCumplido >= 50 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                      {r.porcentajeCumplido}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="mt-4 opacity-90">
        <h2 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> DINERO EN TRÁNSITO (Falta Facturación / Documentos)</h2>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-x-auto">
          <Table>
            <TableHeader className="bg-amber-50/80">
              <TableRow>
                <TableHead className="font-bold text-gray-800">Vendedor</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Lunes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Martes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Miércoles</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Jueves</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Viernes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Sábado</TableHead>
                <TableHead className="font-semibold text-red-700 text-center">Domingo</TableHead> 
                <TableHead className="font-bold text-amber-800 text-center bg-amber-100/50">Total Retenido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">Calculando...</TableCell></TableRow>
              ) : reporte.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No hay datos.</TableCell></TableRow>
              ) : reporte.map(r => (
                <TableRow key={r.vendedorId} className="hover:bg-amber-50/30">
                  <TableCell className="font-bold text-gray-600 text-sm">👤 {r.vendedorNombre}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.lunes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.martes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.miercoles.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.jueves.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.viernes.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-gray-900">${r.diasTransito.sabado.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium text-xs text-red-700 bg-red-50/20">${r.diasTransito.domingo.toFixed(2)}</TableCell> 
                  <TableCell className="text-center font-bold text-sm text-amber-700 bg-amber-50/50">${r.transitoTotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={modalMetas} onOpenChange={setModalMetas}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-emerald-600" /> Asignar Metas Semanales
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarMetas} className="space-y-4 mt-2">
            <p className="text-xs text-gray-500">
              Ingresa el objetivo en dólares ($) para cada vendedor en la semana elegida ({fechaLunes}):
            </p>
            <div className="space-y-3">
              {metasForm.map((m, idx) => (
                <div key={m.vendedorId} className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border">
                  <span className="text-xs font-bold text-gray-800">👤 {m.vendedorNombre}</span>
                  <div className="flex items-center gap-1 w-36">
                    <span className="text-xs font-bold text-gray-500">$</span>
                    <Input 
                      type="number" step="0.01" min="0" value={m.montoMeta} 
                      onChange={e => {
                        const val = e.target.value;
                        setMetasForm(prev => { const copy = [...prev]; copy[idx].montoMeta = val; return copy; });
                      }} 
                      className="h-8 text-xs font-bold bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setModalMetas(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingMetas} className="bg-emerald-600 text-white font-bold">
                {savingMetas ? 'Guardando...' : 'Guardar Metas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} className="text-emerald-100" /> : <AlertCircle size={20} className="text-red-100" />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </div>
  );
}