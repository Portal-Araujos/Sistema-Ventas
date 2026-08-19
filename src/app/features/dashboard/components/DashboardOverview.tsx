"use client";

import React, { useEffect, useState } from 'react';
import { 
  DollarSign, FileText, MapPin, Target, Scissors, Package, Truck, AlertTriangle, Filter, TrendingUp, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';

export function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cantonesDisponibles, setCantonesDisponibles] = useState<any[]>([]);

  const fechaEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  const yyyy = fechaEcuador.getFullYear();
  const mm = String(fechaEcuador.getMonth() + 1).padStart(2, '0');
  const dd = String(fechaEcuador.getDate()).padStart(2, '0');
  const hoyStr = `${yyyy}-${mm}-01`; // Por defecto desde el día 1 del mes
  const hoyFinStr = `${yyyy}-${mm}-${dd}`;

  const [filtros, setFiltros] = useState({
    fechaInicio: hoyStr,
    fechaFin: hoyFinStr,
    provinciaId: '',
    cantonId: '',
    vendedorId: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.provinciaId) params.append('provinciaId', filtros.provinciaId);
      if (filtros.cantonId) params.append('cantonId', filtros.cantonId);
      if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);

      const [resStats, resCat, resVend] = await Promise.all([
        fetch(`/api/dashboard/stats?${params.toString()}`),
        fetch('/api/catalogos'),
        fetch('/api/usuarios/vendedores')
      ]);

      setStats(await resStats.json());
      const catData = await resCat.json();
      setCatalogos(catData);
      setVendedores(await resVend.json());

      if (filtros.provinciaId && catData.provincias) {
        const prov = catData.provincias.find((p: any) => p.id === parseInt(filtros.provinciaId));
        setCantonesDisponibles(prov ? prov.cantones : []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [filtros]);

  const handleProvinciaChange = (provId: string) => { setFiltros({ ...filtros, provinciaId: provId, cantonId: '' }); };

  const formatMoneda = (valor: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-xs">
          <p className="font-black text-gray-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-bold">
              {entry.name}: {entry.name.includes('Monto') ? formatMoneda(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 🛠️ BARRA DE FILTROS GLOBALES */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] font-bold text-gray-500 block mb-1">Desde Fecha</label>
          <Input type="date" className="h-9 text-xs w-32" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 block mb-1">Hasta Fecha</label>
          <Input type="date" className="h-9 text-xs w-32" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 block mb-1">Provincia</label>
          <select className="h-9 border rounded-md px-2 text-xs bg-white w-32" value={filtros.provinciaId} onChange={e => handleProvinciaChange(e.target.value)}>
            <option value="">Nacional</option>
            {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {stats?.userRol !== 'vendedor' && (
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">Vendedor</label>
            <select className="h-9 border rounded-md px-2 text-xs bg-white w-36" value={filtros.vendedorId} onChange={e => setFiltros({...filtros, vendedorId: e.target.value})}>
              <option value="">Toda la Fuerza de Ventas</option>
              {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
        )}
        <Button className="h-9 text-xs font-bold bg-slate-900 hover:bg-black text-white" onClick={cargarDatos}>
          <Filter size={14} className="mr-1" /> Procesar Datos
        </Button>
      </div>

      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500 font-bold">Consolidando Centro de Mando...</p>
        </div>
      ) : (
        <>
          {/* 💰 FILA 1: KPIs FINANCIEROS Y COMERCIALES */}
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mt-2">1. Resultados Comerciales</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="`bg-gradient-to-br` from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-md text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-80">Volumen de Ventas</p>
                  <h3 className="text-3xl font-black mt-1">{formatMoneda(stats?.kpis?.totalMontoVentas || 0)}</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-lg"><DollarSign size={24} /></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Contratos Cerrados</p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">{stats?.kpis?.totalContratos || 0}</h3>
              </div>
              <div className="bg-slate-100 text-slate-600 p-2 rounded-lg"><FileText size={24} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Visitas Efectivas</p>
                <h3 className="text-3xl font-black text-blue-600 mt-1">{stats?.kpis?.totalVisitas || 0}</h3>
              </div>
              <div className="bg-blue-50 text-blue-500 p-2 rounded-lg"><MapPin size={24} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Tasa de Conversión</p>
                <h3 className="text-3xl font-black text-indigo-600 mt-1">{stats?.kpis?.tasaCierre || 0}%</h3>
              </div>
              <div className="bg-indigo-50 text-indigo-500 p-2 rounded-lg"><Target size={24} /></div>
            </div>
          </div>

          {/* 🏭 FILA 2: KPIs OPERATIVOS Y LOGÍSTICOS */}
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mt-4">2. Rendimiento Logístico y Fábrica</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="bg-purple-100 text-purple-600 p-3 rounded-full"><Scissors size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">En Taller (Prendas)</p>
                <h3 className="text-2xl font-black text-gray-800">{stats?.kpis?.enTaller || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full"><Package size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">En Empaque</p>
                <h3 className="text-2xl font-black text-gray-800">{stats?.kpis?.enEmpaque || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full"><Truck size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Despachadas</p>
                <h3 className="text-2xl font-black text-gray-800">{stats?.kpis?.despachadas || 0}</h3>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${stats?.kpis?.prendasAtrasadas > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <div className={`${stats?.kpis?.prendasAtrasadas > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'} p-3 rounded-full`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase ${stats?.kpis?.prendasAtrasadas > 0 ? 'text-red-500' : 'text-gray-400'}`}>Prendas Atrasadas</p>
                <h3 className={`text-2xl font-black ${stats?.kpis?.prendasAtrasadas > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                  {stats?.kpis?.prendasAtrasadas || 0}
                </h3>
              </div>
            </div>
          </div>

          {/* 📊 FILA 3: GRÁFICOS DE INTELIGENCIA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            
            {/* Gráfico 1: Rendimiento Vendedores (Monto vs Visitas) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
                <TrendingUp size={16} className="text-indigo-600" /> Rendimiento por Vendedor (Top 5)
              </h2>
              <div className="h-64 w-full">
                {stats?.graficos?.rendimientoVendedores?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.graficos.rendimientoVendedores} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar yAxisId="left" dataKey="monto" name="Monto Vendido ($)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                      <Line yAxisId="right" type="monotone" dataKey="visitas" name="Visitas Realizadas" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Sin datos para graficar</div>
                )}
              </div>
            </div>

            {/* Gráfico 2: Embudo de Producción */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Package size={16} className="text-blue-600" /> Distribución de Producción (Embudo)
              </h2>
              <div className="h-64 w-full">
                {stats?.graficos?.embudoProduccion?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.graficos.embudoProduccion} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {stats.graficos.embudoProduccion.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Fábrica vacía o sin datos</div>
                )}
              </div>
            </div>
          </div>

          {/* 📋 FILA 4: TABLAS DE ACCIÓN (Últimas Ventas y Urgencias) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            
            {/* Tabla: Últimos Contratos Cerrados */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" /> Últimos Contratos Cerrados
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px] uppercase">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Institución</TableHead>
                    {stats?.userRol !== 'vendedor' && <TableHead>Vendedor</TableHead>}
                    <TableHead className="text-right">Monto ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.tablas?.ultimasVentas?.length > 0 ? stats.tablas.ultimasVentas.map((v: any) => (
                    <TableRow key={v.id} className="text-xs font-semibold">
                      <TableCell className="text-gray-500">{v.fecha}</TableCell>
                      <TableCell className="text-gray-900 truncate max-w-150px">{v.escuela}</TableCell>
                      {stats?.userRol !== 'vendedor' && <TableCell className="text-blue-600">{v.vendedor}</TableCell>}
                      <TableCell className="text-right text-emerald-600 font-black">{formatMoneda(v.monto)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400 text-xs">Sin ventas recientes</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Tabla: Entregas Urgentes / Próximas a Vencer */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-red-50/50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={16} className="text-red-600" /> Entregas Urgentes (Fábrica)
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px] uppercase">
                    <TableHead>F. Máxima</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Institución</TableHead>
                    <TableHead className="text-right">Estado Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.tablas?.entregasUrgentes?.length > 0 ? stats.tablas.entregasUrgentes.map((u: any) => (
                    <TableRow key={u.id} className="text-xs font-semibold">
                      <TableCell className="text-red-600 font-black">{u.fecha}</TableCell>
                      <TableCell className="text-gray-500 font-mono">{u.codigo}</TableCell>
                      <TableCell className="text-gray-900 truncate max-w-150px">{u.escuela}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[9px] bg-amber-50">{u.estado}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400 text-xs">No hay entregas pendientes</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

          </div>

        </>
      )}
    </div>
  );
}