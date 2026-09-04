"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 🔥 IMPORTAMOS EL ENRUTADOR 🔥
import { 
  DollarSign, ShieldCheck, Clock, Target, TrendingUp, Activity, FilterX, 
  Building2, Users, MapPin, CalendarX, Filter, FileText, FileWarning, 
  Ticket, AlertTriangle, PackageOpen, Truck, PackageX, UserX
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DashboardComercial() {
  const router = useRouter(); // 🔥 INICIAMOS EL ENRUTADOR 🔥
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesPasado = new Date();
  mesPasado.setDate(1); 
  const mesPasadoStr = mesPasado.toISOString().split('T')[0];

  const [filtros, setFiltros] = useState({
    fechaDesde: mesPasadoStr, fechaHasta: hoyStr, provinciaId: '', cantonId: '', vendedorId: '', tipoVentaId: ''
  });

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [resCat, resVend] = await Promise.all([ fetch('/api/catalogos'), fetch('/api/usuarios/vendedores') ]);
        setCatalogos(await resCat.json());
        setVendedores(await resVend.json());
      } catch (e) { console.error("Error cargando catálogos", e); }
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(filtros as any).toString();
        const res = await fetch(`/api/dashboard/comercial?${query}`);
        const json = await res.json();
        setData(json);
      } catch (e) { console.error("Error cargando el dashboard", e); } finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [filtros]);

  const formatearDinero = (monto: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(monto || 0);
  const limpiarFiltros = () => setFiltros({ fechaDesde: mesPasadoStr, fechaHasta: hoyStr, provinciaId: '', cantonId: '', vendedorId: '', tipoVentaId: '' });
  const cantonesDisponibles = filtros.provinciaId && catalogos?.provincias ? catalogos.provincias.find((p: any) => p.id === parseInt(filtros.provinciaId))?.cantones || [] : [];

  const pNuevas = data?.origen?.porcNuevas || 0;
  const pRef = data?.origen?.porcReferidas || 0;
  const stringDona = `conic-gradient(#10B981 0% ${pNuevas}%, #3B82F6 ${pNuevas}% ${pNuevas + pRef}%, #F59E0B ${pNuevas + pRef}% 100%)`;

  return (
    <div className="flex flex-col gap-6">
      
      {/* 🟢 BARRA SUPERIOR DE FILTROS 🟢 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-3 items-end xl:items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 w-full">
          <div><label className="text-[10px] font-bold text-gray-500 uppercase">Desde</label><input type="date" className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium" value={filtros.fechaDesde} onChange={e => setFiltros({...filtros, fechaDesde: e.target.value})}/></div>
          <div><label className="text-[10px] font-bold text-gray-500 uppercase">Hasta</label><input type="date" className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium" value={filtros.fechaHasta} onChange={e => setFiltros({...filtros, fechaHasta: e.target.value})}/></div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Provincia</label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium" value={filtros.provinciaId} onChange={e => setFiltros({...filtros, provinciaId: e.target.value, cantonId: ''})}>
              <option value="">Todas</option>
              {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Cantón</label>
            <select disabled={!filtros.provinciaId} className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium disabled:bg-gray-100 disabled:opacity-50" value={filtros.cantonId} onChange={e => setFiltros({...filtros, cantonId: e.target.value})}>
              <option value="">Todos</option>
              {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Vendedor</label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium" value={filtros.vendedorId} onChange={e => setFiltros({...filtros, vendedorId: e.target.value})}>
              <option value="">Todos los Vendedores</option>
              {Array.isArray(vendedores) && vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Venta</label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white mt-1 outline-none font-medium" value={filtros.tipoVentaId} onChange={e => setFiltros({...filtros, tipoVentaId: e.target.value})}>
              <option value="">Todas</option>
              {catalogos?.tiposCliente?.filter((t:any) => t.activo).map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        </div>
        <button onClick={limpiarFiltros} className="flex items-center gap-2 h-9 px-4 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shrink-0 transition-colors"><FilterX size={14}/> Limpiar</button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Activity size={32} className="animate-spin text-primary"/>
          <p className="font-bold text-sm tracking-widest uppercase">Calculando indicadores en tiempo real...</p>
        </div>
      ) : !data ? (
        <div className="h-64 flex items-center justify-center text-red-500 font-bold">Error de conexión con el motor de base de datos.</div>
      ) : (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* 🟢 FILA 1: TARJETAS FINANCIERAS (AHORA SON NAVEGABLES) 🟢 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div onClick={() => router.push('/ventas')} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm border-t-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="bg-emerald-100 p-1.5 rounded-md"><DollarSign size={16} className="text-emerald-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Ventas Registradas</h3></div>
              <p className="text-xl md:text-2xl font-black text-gray-900">{formatearDinero(data.financiero?.ventasRegistradas)}</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">Total generado en el período</p>
            </div>

            <div onClick={() => router.push('/ventas?tarjeta=Aprobadas')} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm border-t-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="bg-blue-100 p-1.5 rounded-md"><ShieldCheck size={16} className="text-blue-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Ventas Validadas</h3></div>
              <p className="text-xl md:text-2xl font-black text-gray-900">{formatearDinero(data.financiero?.ventasValidadas)}</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">Aprobadas por Facturación</p>
            </div>

            <div onClick={() => router.push('/ventas?tarjeta=Pendientes')} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm border-t-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="bg-amber-100 p-1.5 rounded-md"><Clock size={16} className="text-amber-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Pte. de Validación</h3></div>
              <p className="text-xl md:text-2xl font-black text-amber-600">{formatearDinero(data.financiero?.pendienteValidacion)}</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">En revisión o con novedades</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm border-t-4">
              <div className="flex items-center gap-2 mb-2"><div className="bg-purple-100 p-1.5 rounded-md"><Target size={16} className="text-purple-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Meta Comercial</h3></div>
              <p className="text-xl md:text-2xl font-black text-purple-700">{formatearDinero(data.financiero?.metaComercial)}</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">Meta asignada al período</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm border-t-4">
              <div className="flex items-center gap-2 mb-2"><div className="bg-emerald-100 p-1.5 rounded-md"><TrendingUp size={16} className="text-emerald-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">% Cumpl. Validado</h3></div>
              <p className="text-xl md:text-2xl font-black text-emerald-600">{data.financiero?.cumplimientoValidado}%</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">Ventas validadas / Meta</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm border-t-4">
              <div className="flex items-center gap-2 mb-2"><div className="bg-blue-100 p-1.5 rounded-md"><Activity size={16} className="text-blue-600"/></div><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wide">% Cumpl. Potencial</h3></div>
              <p className="text-xl md:text-2xl font-black text-blue-600">{data.financiero?.cumplimientoPotencial}%</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium">Ventas registradas / Meta</p>
            </div>
          </div>

          {/* 🟢 FILA 2: GRÁFICOS Y EMBUDO 🟢 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-4">Composición por Origen</h3>
              <div className="flex gap-4 items-center justify-center flex-1">
                <div className="relative w-28 h-28 rounded-full shadow-inner flex items-center justify-center" style={{ background: stringDona }}>
                  <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Nuevas</div><div className="text-xs font-black text-gray-900 text-right">{data.origen?.porcNuevas}%</div></div>
                  <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Referidas</div><div className="text-xs font-black text-gray-900 text-right">{data.origen?.porcReferidas}%</div></div>
                  <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Recompras</div><div className="text-xs font-black text-gray-900 text-right">{data.origen?.porcRecompras}%</div></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-4">Gestión de Campo</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div className="flex items-start gap-2"><Building2 size={20} className="text-emerald-500"/><div><p className="text-[10px] text-gray-500 font-bold leading-tight">Inst. Asignadas</p><p className="text-lg font-black text-gray-900">{data.campo?.instAsignadas}</p></div></div>
                <div className="flex items-start gap-2 cursor-pointer hover:opacity-70" onClick={() => router.push('/agenda?tab=visitadas')}><Users size={20} className="text-blue-500"/><div><p className="text-[10px] text-gray-500 font-bold leading-tight">Inst. Visitadas</p><p className="text-lg font-black text-blue-600">{data.campo?.instVisitadas}</p></div></div>
                <div className="flex items-start gap-2"><MapPin size={20} className="text-primary"/><div><p className="text-[10px] text-gray-500 font-bold leading-tight">Visitas Libres</p><p className="text-lg font-black text-gray-900">{data.campo?.visitasLibres}</p></div></div>
                <div className="flex items-start gap-2 cursor-pointer hover:opacity-70" onClick={() => router.push('/agenda?tab=vencidas')}><CalendarX size={20} className="text-red-500"/><div><p className="text-[10px] text-gray-500 font-bold leading-tight">Visitas Vencidas</p><p className="text-lg font-black text-red-600 underline decoration-red-200">{data.campo?.visitasVencidas}</p></div></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-gray-500">Cobertura Territorial</span><span className="text-xs font-black text-gray-900">{data.campo?.coberturaTerritorial}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${data.campo?.coberturaTerritorial}%` }}></div></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-2 w-full text-left">Tasa de Conversión</h3>
              <div className="bg-blue-50 p-4 rounded-full mb-3"><Filter size={32} className="text-blue-500"/></div>
              <p className="text-4xl font-black text-blue-600 mb-1">{data.campo?.tasaConversion}%</p>
              <p className="text-[11px] text-gray-500 font-medium">{data.campo?.cierres} cierres de {data.campo?.visitasRealizadas} visitas realizadas</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-4 text-center">Embudo Comercial</h3>
              <div className="flex flex-col items-center gap-1.5 w-full cursor-pointer hover:opacity-90" onClick={() => router.push('/agenda')}>
                <div className="bg-emerald-500 text-white text-[11px] font-bold py-1.5 w-full text-center rounded-sm shadow-sm flex justify-between px-3"><span>{data.campo?.instAsignadas}</span> <span>Asignadas</span></div>
                <div className="bg-blue-500 text-white text-[11px] font-bold py-1.5 w-[90%] text-center rounded-sm shadow-sm flex justify-between px-3"><span>{data.campo?.instVisitadas}</span> <span>Visitadas</span></div>
                <div className="bg-purple-500 text-white text-[11px] font-bold py-1.5 w-[80%] text-center rounded-sm shadow-sm flex justify-between px-3"><span>{data.campo?.visitasRealizadas}</span> <span>Reuniones Ef.</span></div>
                <div className="bg-amber-500 text-white text-[11px] font-bold py-1.5 w-[70%] text-center rounded-sm shadow-sm flex justify-between px-3"><span>{data.campo?.cierres}</span> <span>Cierres</span></div>
                <div className="bg-red-500 text-white text-[11px] font-bold py-1.5 w-[60%] text-center rounded-sm shadow-sm flex justify-between px-3"><span>{data.financiero?.ventasValidadas > 0 ? 'Sí' : '0'}</span> <span>Validadas</span></div>
              </div>
            </div>

          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            <div className="lg:col-span-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-slate-50"><h3 className="text-xs font-black text-gray-800 uppercase">Rendimiento por Vendedor</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                    <tr><th className="p-3 font-bold">Vendedor</th><th className="p-3 font-bold text-right">Venta Val.</th><th className="p-3 font-bold text-center">% Cumpl.</th><th className="p-3 font-bold text-center">Visitas</th><th className="p-3 font-bold text-center">Nuevas (%)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.ranking?.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-gray-400">No hay datos en el período</td></tr>
                    ) : (
                      data.ranking?.map((v: any) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-gray-800 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px]">{v.nombre.charAt(0)}</div> {v.nombre}</td>
                          <td className="p-3 text-right font-black text-emerald-600">{formatearDinero(v.ventaValidada)}</td>
                          <td className="p-3 text-center"><Badge variant="outline" className={v.porcCumplimiento >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : v.porcCumplimiento >= 80 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}>{v.porcCumplimiento}%</Badge></td>
                          <td className="p-3 text-center font-bold text-gray-700">{v.visitas}</td>
                          <td className="p-3 text-center text-gray-500">{v.porcNuevas}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-4 border-b border-gray-100 pb-2">Formalización de Ventas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs"><span className="text-gray-600 font-medium">Contratos pendientes envío</span><span className="font-bold">{data.formalizacion?.contratosPendientesEnvio}</span></div>
                <div className="flex justify-between items-center text-xs cursor-pointer hover:text-amber-600" onClick={() => router.push('/ventas?tarjeta=Pendientes')}><span className="text-gray-600 font-medium">Pendientes de auditoría</span><span className="font-bold">{data.formalizacion?.pendientesAuditoria}</span></div>
                <div className="flex justify-between items-center text-xs cursor-pointer hover:opacity-80" onClick={() => router.push('/ventas?tarjeta=Novedades')}><span className="text-red-500 font-bold underline decoration-red-200">Contratos con novedades</span><span className="font-bold text-red-600">{data.formalizacion?.contratosConNovedades}</span></div>
                <div className="flex justify-between items-center text-xs cursor-pointer hover:text-orange-600" onClick={() => router.push('/ventas')}><span className="text-gray-600 font-medium">Tickets abiertos</span><span className="font-bold">{data.formalizacion?.ticketsAbiertos}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-red-500 font-bold">Tickets vencidos</span><span className="font-bold text-red-600">{data.formalizacion?.ticketsVencidos}</span></div>
                <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Índice de Formalización</p>
                  <p className="text-xl font-black text-emerald-600">{data.formalizacion?.indiceFormalizacion}%</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase mb-4 border-b border-gray-100 pb-2">Pedidos Logísticos</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs cursor-pointer hover:text-purple-600" onClick={() => router.push('/pedidos')}><span className="text-gray-600 font-medium underline decoration-gray-300">Pedidos en borrador</span><span className="font-bold">{data.pedidos?.pedidosBorrador}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-gray-600 font-medium">Enviados a Operaciones</span><span className="font-bold">{data.pedidos?.pedidosEnviados}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-blue-600 font-bold">Entregas próximas (7 días)</span><span className="font-bold text-blue-700">{data.pedidos?.entregasProximas}</span></div>
                <div className="flex justify-between items-center text-xs cursor-pointer hover:opacity-80" onClick={() => router.push('/pedidos')}><span className="text-red-500 font-bold underline decoration-red-200">Entregas vencidas</span><span className="font-bold text-red-600">{data.pedidos?.entregasVencidas}</span></div>
              </div>
            </div>

          </div>
          <div>
            <h3 className="text-xs font-black text-gray-800 uppercase mb-3">Atención Requerida (Alertas)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              
              <div onClick={() => router.push('/agenda?tab=vencidas')} className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-3 hover:bg-red-100 hover:-translate-y-1 shadow-sm transition-all cursor-pointer">
                <CalendarX size={24} className="text-red-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-red-800 uppercase leading-tight">Visitas Vencidas</p><p className="text-lg font-black text-red-600">{data.campo?.visitasVencidas}</p></div>
              </div>
              
              <div onClick={() => router.push('/ventas?tarjeta=Novedades')} className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-3 hover:bg-amber-100 hover:-translate-y-1 shadow-sm transition-all cursor-pointer">
                <FileWarning size={24} className="text-amber-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Contratos Observados</p><p className="text-lg font-black text-amber-600">{data.formalizacion?.contratosConNovedades}</p></div>
              </div>

              <div onClick={() => router.push('/pedidos')} className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-center gap-3 hover:bg-purple-100 hover:-translate-y-1 shadow-sm transition-all cursor-pointer">
                <PackageOpen size={24} className="text-purple-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-purple-800 uppercase leading-tight">Pedidos Borrador</p><p className="text-lg font-black text-purple-600">{data.pedidos?.pedidosBorrador}</p></div>
              </div>

              <div onClick={() => router.push('/pedidos')} className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-3 hover:bg-rose-100 hover:-translate-y-1 shadow-sm transition-all cursor-pointer">
                <Truck size={24} className="text-rose-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-rose-800 uppercase leading-tight">Entregas Vencidas</p><p className="text-lg font-black text-rose-600">{data.pedidos?.entregasVencidas}</p></div>
              </div>

              <div onClick={() => router.push('/ventas')} className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-3 hover:bg-orange-100 hover:-translate-y-1 shadow-sm transition-all cursor-pointer">
                <Ticket size={24} className="text-orange-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-orange-800 uppercase leading-tight">Tickets Vencidos</p><p className="text-lg font-black text-orange-600">{data.formalizacion?.ticketsVencidos}</p></div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3 hover:bg-slate-100 transition-colors">
                <UserX size={24} className="text-slate-500 shrink-0"/>
                <div><p className="text-[10px] font-bold text-slate-800 uppercase leading-tight">Vend. &lt; 50% Meta</p><p className="text-lg font-black text-slate-600">{data.ranking?.filter((v:any) => v.porcCumplimiento < 50).length}</p></div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}