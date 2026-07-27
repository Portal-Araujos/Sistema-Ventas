"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, MapPin, Navigation, Trophy, Calendar, 
  CheckCircle2, Eye, Activity, Filter, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORES_PIE = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

export function DashboardOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cantonesDisponibles, setCantonesDisponibles] = useState<any[]>([]);

  // Fecha Actual por Defecto
  // Obtener la fecha estricta de Ecuador (Para evitar saltos a la fecha del día siguiente en la tarde)
  const fechaEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  const yyyy = fechaEcuador.getFullYear();
  const mm = String(fechaEcuador.getMonth() + 1).padStart(2, '0');
  const dd = String(fechaEcuador.getDate()).padStart(2, '0');
  const hoyStr = `${yyyy}-${mm}-${dd}`;

  const [filtros, setFiltros] = useState({
    fechaInicio: hoyStr,
    fechaFin: hoyStr,
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

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const handleProvinciaChange = (provId: string) => {
    setFiltros({ ...filtros, provinciaId: provId, cantonId: '' });
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-bold text-gray-500 block mb-1">Desde Fecha</label>
          <Input type="date" className="h-9 text-xs w-36" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 block mb-1">Hasta Fecha</label>
          <Input type="date" className="h-9 text-xs w-36" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 block mb-1">Provincia</label>
          <select className="h-9 border rounded-md px-2 text-xs bg-white w-32" value={filtros.provinciaId} onChange={e => handleProvinciaChange(e.target.value)}>
            <option value="">Todas</option>
            {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 block mb-1">Cantón</label>
          <select disabled={!filtros.provinciaId} className="h-9 border rounded-md px-2 text-xs bg-white w-32 disabled:bg-gray-100" value={filtros.cantonId} onChange={e => setFiltros({...filtros, cantonId: e.target.value})}>
            <option value="">Todos</option>
            {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 block mb-1">Vendedor</label>
          <select className="h-9 border rounded-md px-2 text-xs bg-white w-36" value={filtros.vendedorId} onChange={e => setFiltros({...filtros, vendedorId: e.target.value})}>
            <option value="">Todos</option>
            {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <Button variant="outline" className="h-9 text-xs" onClick={cargarDatos}>
          <Filter size={14} className="mr-1" /> Refrescar
        </Button>
      </div>

      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Calculando métricas del día...</p>
        </div>
      ) : (
        <>
          {/* TARJETAS MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Escuelas Filtradas</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats?.totalInstituciones || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center"><Building2 size={24} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visitas Realizadas hoy/rango</p>
                <h3 className="text-2xl font-extrabold text-purple-700 mt-1">{stats?.totalVisitasRango || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Calendar size={24} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cobertura Geográfica</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats?.porcentajeCobertura || 0}%</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Activity size={24} /></div>
            </div>
          </div>

          {/* SECCIÓN DE GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico Top 5 Vendedores por Visita Efectiva */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-amber-500" /> Top 5 Vendedores (Visitas Realizadas)
              </h2>
              <div className="h-64 w-full">
                {stats?.topVendedores?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topVendedores} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="visitas" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Sin visitas realizadas en esta fecha</div>
                )}
              </div>
            </div>

            {/* Gráfico Embudo Comerciales */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-emerald-500" /> Distribución de Estados Comerciales
              </h2>
              <div className="h-64 w-full flex items-center justify-center">
                {stats?.desgloseEstados?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.desgloseEstados} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {stats.desgloseEstados.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-gray-400">Sin datos registrados</div>
                )}
              </div>
            </div>
          </div>

          {/* TABLA DE VISITAS CON COLUMNA DE FECHA, HORA EXACTA Y GPS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Navigation size={18} className="text-primary" /> Historial de Visitas Ejecutadas
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Visitas realizadas entre el {filtros.fechaInicio} y el {filtros.fechaFin}</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Institución / Ubicación</TableHead>
                    <TableHead className="font-semibold text-gray-700">Vendedor</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Tipo Gestión</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-250px">Resumen de Acuerdos / Novedades</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Fecha, Hora y GPS</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Ficha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.ultimasVisitas?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No hay visitas registradas para esta fecha.</TableCell></TableRow>
                  ) : (
                    stats?.ultimasVisitas?.map((visita: any) => (
                      <TableRow key={visita.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-bold text-gray-900 text-sm">{visita.institucionNombre}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={10} className="text-primary"/> {visita.provincia} / {visita.canton}</div>
                        </TableCell>
                        <TableCell><div className="text-xs font-bold text-gray-800">👤 {visita.vendedorNombre}</div></TableCell>
                        <TableCell className="text-center"><Badge className="bg-blue-50 text-blue-700 text-[10px]">{visita.tipoGestion}</Badge></TableCell>
                        <TableCell className="min-w-250px max-w-sm py-3 align-top">
                          <p className="text-xs text-gray-800 whitespace-pre-wrap overflow-wrap:anywhere leading-relaxed bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                            {visita.resumenAcuerdos || 'Sin novedades registradas'}
                          </p>
                        </TableCell>
                        
                        {/* COLUMNA AUDITORA: FECHA + HORA EXACTA + GPS */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-gray-900">{visita.fechaFormatted}</span>
                            <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-0.5">
                              <Clock size={10} /> {visita.horaFormatted}
                            </span>
                            {visita.latitud && visita.longitud ? (
                              <a 
                                href={`https://maps.google.com/?q=${visita.latitud},${visita.longitud}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] text-emerald-600 font-bold hover:underline mt-0.5"
                              >
                                📍 Ver Mapa GPS
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400">Sin GPS</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/instituciones/${visita.institucionId}`)}><Eye size={14} className="text-primary" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
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