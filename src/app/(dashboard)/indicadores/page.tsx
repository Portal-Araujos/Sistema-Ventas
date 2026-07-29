"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Target, Calendar, ArrowUpRight, Award, Edit3, RefreshCw, CheckCircle2
} from 'lucide-react';
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

  // Selector de Semana (se usa la fecha del lunes)
  const getLunesHoy = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const [fechaLunes, setFechaLunes] = useState(getLunesHoy());

  // Modal para definir metas (Solo Admins)
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

      // ESTA ES LA PROTECCIÓN: Revisamos si la respuesta fue exitosa antes de convertir a JSON
      if (!resInd.ok) throw new Error("No se pudo cargar la API de indicadores");

      const dataInd = await resInd.json();
      const dataCat = await resCat.json();

      setReporte(Array.isArray(dataInd.reporte) ? dataInd.reporte : []);
      if (dataCat.userRol) setUserRol(dataCat.userRol);
    } catch (e) {
      console.error("Error cargando tabla:", e);
      setReporte([]); // Dejamos la tabla vacía en vez de que explote la pantalla
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    cargarIndicadores();
  }, [fechaLunes]);

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
        body: JSON.stringify({
          fechaLunes,
          metas: metasForm
        })
      });

      if (!res.ok) throw new Error();
      setModalMetas(false);
      cargarIndicadores();
      alert("✅ ¡Metas semanales guardadas con éxito!");
    } catch (e) {
      alert("Error al guardar metas.");
    } finally {
      setSavingMetas(false);
    }
  };

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  // Totales de la Sábana
  const totalCierreSemanal = reporte.reduce((sum, r) => sum + r.cierreSemanal, 0);
  const totalMetaSemanal = reporte.reduce((sum, r) => sum + r.metaMonto, 0);
  const porcentajeGlobal = totalMetaSemanal > 0 ? ((totalCierreSemanal / totalMetaSemanal) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-primary" /> Indicadores y Cierre Semanal
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Sábana de rendimiento de ventas por día y cumplimiento de metas
          </p>
        </div>

        {esAdmin && (
          <Button onClick={handleOpenModalMetas} className="bg-primary text-white font-bold flex gap-2">
            <Target size={18} /> Definir Metas Semanales
          </Button>
        )}
      </div>

      {/* SELECTOR DE SEMANA Y MÉTRICAS GLOBALES */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        <div className="flex items-center gap-3">
          <Calendar className="text-primary" size={20} />
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Semana (Lunes de inicio):</Label>
            <Input 
              type="date" 
              className="h-9 text-xs w-44 mt-0.5 font-bold" 
              value={fechaLunes} 
              onChange={e => setFechaLunes(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-gray-50 p-3 rounded-lg border text-center min-w-120px">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Cierre Semanal</span>
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

      {/* TABLA SÁBANA IDÉNTICA A LA FOTO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-bold text-gray-800">Vendedor</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Lunes</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Martes</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Miércoles</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Jueves</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Viernes</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Sábado</TableHead>
              <TableHead className="font-bold text-emerald-800 text-center bg-emerald-50/50">Cierre Semanal</TableHead>
              <TableHead className="font-bold text-gray-800 text-center bg-gray-100/50">Meta Semanal</TableHead>
              <TableHead className="font-bold text-gray-800 text-center">% Meta</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">Calculando sábana semanal...</TableCell></TableRow>
            ) : reporte.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">No hay vendedores o datos registrados.</TableCell></TableRow>
            ) : reporte.map(r => (
              <TableRow key={r.vendedorId} className="hover:bg-gray-50/50">
                
                <TableCell className="font-bold text-gray-900 text-sm">
                  👤 {r.vendedorNombre}
                </TableCell>

                <TableCell className="text-center font-medium text-xs">${r.lunes.toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium text-xs">${r.martes.toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium text-xs">${r.miercoles.toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium text-xs">${r.jueves.toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium text-xs">${r.viernes.toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium text-xs">${r.sabado.toFixed(2)}</TableCell>

                {/* CIERRE SEMANALE */}
                <TableCell className="text-center font-extrabold text-sm text-emerald-700 bg-emerald-50/30">
                  ${r.cierreSemanal.toFixed(2)}
                </TableCell>

                {/* META */}
                <TableCell className="text-center font-bold text-sm text-gray-800 bg-gray-50/50">
                  ${r.metaMonto.toFixed(2)}
                </TableCell>

                {/* % META CON BADGE DE COLOR AUTOMÁTICO */}
                <TableCell className="text-center">
                  <Badge className={`text-xs font-bold ${
                    r.porcentajeCumplido >= 100 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : r.porcentajeCumplido >= 50 
                      ? 'bg-amber-100 text-amber-800 border-amber-300' 
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {r.porcentajeCumplido}%
                  </Badge>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DEFINIR METAS SEMANALES */}
      <Dialog open={modalMetas} onOpenChange={setModalMetas}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-primary" /> Asignar Metas Semanales
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
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={m.montoMeta} 
                      onChange={e => {
                        const val = e.target.value;
                        setMetasForm(prev => {
                          const copy = [...prev];
                          copy[idx].montoMeta = val;
                          return copy;
                        });
                      }} 
                      className="h-8 text-xs font-bold bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setModalMetas(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingMetas} className="bg-primary text-white font-bold">
                {savingMetas ? 'Guardando...' : 'Guardar Metas'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}