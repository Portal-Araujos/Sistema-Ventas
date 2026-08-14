"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Eye, Search, Navigation, ChevronLeft, ChevronRight, CalendarCheck, Clock, AlertTriangle, PieChart, CheckCircle2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import VisitaGPSForm from '@/app/features/visitas/components/VisitaGPSForm';

type TabType = 'ruta' | 'visitadas' | 'proximas' | 'vencidas' | 'sinAsignar' | 'cobertura';

export default function AgendaPage() {
  const router = useRouter();
  const [dataAgenda, setDataAgenda] = useState<{
    ruta: any[], visitadas: any[], proximas: any[], vencidas: any[], sinAsignar: any[], cobertura: { asignadas: number, visitadas: number, porcentaje: number }
  }>({ ruta: [], visitadas: [], proximas: [], vencidas: [], sinAsignar: [], cobertura: { asignadas: 0, visitadas: 0, porcentaje: 0 } });
  
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [userRol, setUserRol] = useState('vendedor');
  
  const [tabActiva, setTabActiva] = useState<TabType>('ruta');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedCanton, setSelectedCanton] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  
  // 📅 Filtros de Rango de Calendario Universales
  const hoyStr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" })).toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  const [modalVisita, setModalVisita] = useState<{ open: boolean; inst: any; isLibre: boolean }>({ open: false, inst: null, isLibre: false });

  const cargarAgenda = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let url = '/api/agenda?';
      if (selectedVendedor) url += `vendedorId=${selectedVendedor}&`;
      if (fechaDesde) url += `fechaDesde=${fechaDesde}&`;
      if (fechaHasta) url += `fechaHasta=${fechaHasta}&`;
      
      const [resAgenda, resCat, resVend] = await Promise.all([
        fetch(url),
        fetch('/api/catalogos'),
        fetch('/api/usuarios/vendedores')
      ]);

      const dataAgendaJson = await resAgenda.json();
      const catDataJson = await resCat.json();
      const vendDataJson = await resVend.json();

      if (!dataAgendaJson.error) setDataAgenda(dataAgendaJson);
      setCatalogos(catDataJson);
      setVendedores(Array.isArray(vendDataJson) ? vendDataJson : []);
      if (catDataJson.userRol) setUserRol(catDataJson.userRol);

    } catch (e) { 
      console.error("Error al cargar agenda:", e); 
    } finally { 
      if (!isSilent) setLoading(false); 
    }
  };

  useEffect(() => { cargarAgenda(false); }, [selectedVendedor, fechaDesde, fechaHasta]);
  useEffect(() => { setCurrentPage(1); }, [tabActiva, searchTerm, selectedProvincia, selectedCanton]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('no visitada') || s.includes('sin asignar')) return '#d9d9d9';
    if (s.includes('no interesado')) return '#ff3b30';
    if (s.includes('seguimiento')) return '#ff9500';
    if (s.includes('visitada')) return '#34c759';
    if (s.includes('pendiente')) return '#007aff';
    return '#d9d9d9';
  };

  const filterList = (lista: any[]) => lista.filter(item => {
    if (searchTerm && !item.nombreInstitucion.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedProvincia && item.provinciaId !== parseInt(selectedProvincia)) return false;
    if (selectedCanton && item.cantonId !== parseInt(selectedCanton)) return false;
    return true;
  });

  const listaActual = tabActiva !== 'cobertura' ? filterList(dataAgenda[tabActiva] || []) : [];
  const totalPages = Math.max(1, Math.ceil(listaActual.length / itemsPerPage));
  const itemsPaginados = listaActual.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const cantonesDisponibles = selectedProvincia ? catalogos?.provincias?.find((p: any) => p.id === parseInt(selectedProvincia))?.cantones || [] : [];
  
  // 🔥 VARIABLE DE SEGURIDAD 🔥
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <Calendar className="text-primary" /> Mi Agenda de Gestión
          </h1>
          <p className="text-sm text-gray-500 mt-1">Controla tus rutas, seguimientos y rendimiento territorial.</p>
        </div>
        <div className="flex gap-2">
          {esAdmin && (
            <select className="h-10 border border-gray-300 rounded-xl px-3 text-sm bg-white text-gray-700 shadow-sm" value={selectedVendedor} onChange={e => setSelectedVendedor(e.target.value)}>
              <option value="">👤 Todos los Vendedores</option>
              {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          )}
          <Button onClick={() => setModalVisita({ open: true, inst: null, isLibre: true })} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md rounded-xl">
            <Navigation size={18} className="mr-2" /> Visita Libre
          </Button>
        </div>
      </div>

      {/* 🚀 BARRA DE PESTAÑAS */}
      <div className="flex overflow-x-auto gap-3 border-b border-gray-200 hide-scrollbar pb-1">
        <button onClick={() => setTabActiva('ruta')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'ruta' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
          <MapPin size={18}/> Mi Ruta (Hoy) <Badge className="bg-primary/10 text-primary border border-primary/20">{dataAgenda.ruta.length}</Badge>
        </button>
        <button onClick={() => setTabActiva('visitadas')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'visitadas' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
          <CheckCircle2 size={18}/> Visitadas <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">{dataAgenda.visitadas.length}</Badge>
        </button>
        <button onClick={() => setTabActiva('proximas')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'proximas' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
          <Clock size={18}/> Próximas <Badge className="bg-blue-100 text-blue-700 border border-blue-200">{dataAgenda.proximas.length}</Badge>
        </button>
        <button onClick={() => setTabActiva('vencidas')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'vencidas' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
          <AlertTriangle size={18}/> Vencidas <Badge className="bg-red-100 text-red-700 border border-red-200">{dataAgenda.vencidas.length}</Badge>
        </button>
        
        {/* 🔥 PESTAÑA OCULTA PARA VENDEDORES 🔥 */}
        {esAdmin && (
          <button onClick={() => setTabActiva('sinAsignar')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'sinAsignar' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
            <UserX size={18}/> Sin Asignar <Badge className="bg-amber-100 text-amber-800 border border-amber-200">{dataAgenda.sinAsignar.length}</Badge>
          </button>
        )}

        {esAdmin && (
          <button onClick={() => setTabActiva('cobertura')} className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === 'cobertura' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'}`}>
            <PieChart size={18}/> Cobertura Territorio
          </button>
        )}
      </div>

      {tabActiva !== 'cobertura' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input className="pl-9 h-10 text-sm bg-gray-50 border-gray-200 w-full sm:w-220px" placeholder="Buscar escuela..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-700 bg-gray-50" value={selectedProvincia} onChange={e => { setSelectedProvincia(e.target.value); setSelectedCanton(''); }}>
              <option value="">Todas las Provincias</option>
              {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select disabled={!selectedProvincia} className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-700 bg-gray-50 disabled:opacity-50" value={selectedCanton} onChange={e => setSelectedCanton(e.target.value)}>
              <option value="">Todos los Cantones</option>
              {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-3 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100 w-full xl:w-auto">
            <CalendarCheck className="text-blue-500" size={20}/>
            <div className="flex flex-wrap items-center gap-2 w-full justify-between sm:justify-start">
              <div>
                <Label className="text-[10px] font-black text-gray-500 uppercase">Desde</Label>
                <Input type="date" className="h-8 text-xs bg-white border-blue-200 w-125px" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-black text-gray-500 uppercase">Hasta</Label>
                <Input type="date" className="h-8 text-xs bg-white border-blue-200 w-125px" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 VISTA DE COBERTURA */}
      {tabActiva === 'cobertura' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
            <h3 className="text-gray-500 font-black uppercase tracking-wider text-sm mb-3">Escuelas Asignadas</h3>
            <p className="text-6xl font-black text-blue-900">{dataAgenda.cobertura.asignadas}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
            <h3 className="text-gray-500 font-black uppercase tracking-wider text-sm mb-3">Escuelas Visitadas</h3>
            <p className="text-6xl font-black text-emerald-600">{dataAgenda.cobertura.visitadas}</p>
          </div>
          <div className=" `bg-gradient-to-br`from-primary/10 to-primary/5 p-8 rounded-3xl shadow-sm border border-primary/20 text-center flex flex-col justify-center">
            <h3 className="text-primary font-black uppercase tracking-wider text-sm mb-2">Cobertura del Territorio</h3>
            <p className="text-7xl font-black text-primary drop-shadow-sm">{dataAgenda.cobertura.porcentaje}%</p>
            <div className="w-full bg-white rounded-full h-4 mt-6 overflow-hidden border border-primary/10 shadow-inner">
              <div className="bg-primary h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${dataAgenda.cobertura.porcentaje}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 📋 VISTA DE TARJETAS DE CADENA */}
      {tabActiva !== 'cobertura' && (
        <>
          {loading ? (
            <div className="p-16 text-center text-gray-500 font-bold animate-pulse">Sincronizando Agenda...</div>
          ) : itemsPaginados.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border border-dashed border-gray-300 text-center text-gray-500 flex flex-col items-center">
              <CalendarCheck size={56} className="text-gray-300 mb-4" />
              <p className="text-xl font-black text-gray-700">No hay registros en esta pestaña.</p>
              <p className="text-sm mt-1">Modifica tus filtros de búsqueda o fecha.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {itemsPaginados.map((item) => (
                <div key={item.id} className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${tabActiva === 'vencidas' ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <Badge style={{ backgroundColor: getStatusColor(item.estadoComercial), color: getStatusColor(item.estadoComercial) === '#d9d9d9' ? '#111111' : '#FFFFFF' }} className="font-bold tracking-wide">
                        {item.estadoComercial}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{item.nombreInstitucion}</h3>
                    <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mb-4 uppercase">
                      <MapPin size={12} className="text-primary shrink-0" /> {item.canton} / {item.parroquia}
                    </p>
                    
                    <div className={`p-3.5 rounded-xl border ${tabActiva === 'vencidas' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      {tabActiva === 'ruta' && (
                        <>
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Visita Programada</p>
                          <p className="text-xs font-bold text-primary flex items-center gap-1"><Clock size={12}/> Hoy: {item.fechaProgramada}</p>
                        </>
                      )}
                      {tabActiva === 'visitadas' && (
                        <>
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Resumen de Visita</p>
                          <p className="text-xs text-gray-800 line-clamp-2">{item.resumenAcuerdos}</p> 
                          <p className="text-[10px] text-emerald-600 font-bold mt-2 border-t border-emerald-100 pt-1">Realizada el: {new Date(item.fechaVisitaReal).toLocaleDateString('es-EC')}</p>
                        </>
                      )}
                      {tabActiva === 'proximas' && (
                        <>
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Último Acuerdo</p>
                          <p className="text-xs text-gray-800 line-clamp-2 mb-2">{item.ultimoAcuerdo || item.resumenAcuerdos}</p>
                          <p className="text-[11px] text-blue-700 font-black flex items-center gap-1 border-t border-blue-100 pt-1"><Calendar size={12}/> Próx. Contacto: {item.fechaProximoContacto}</p>
                        </>
                      )}
                      {tabActiva === 'vencidas' && (
                        <>
                          <p className="text-[10px] font-black text-red-600 uppercase mb-1">⚠️ Atención Urgente</p>
                          <p className="text-xs text-gray-800 line-clamp-2 mb-2">Debiste contactar a esta escuela y no lo hiciste.</p>
                          <p className="text-[11px] text-red-700 font-black flex items-center gap-1 border-t border-red-200 pt-1"><AlertTriangle size={12}/> Vencida desde: {item.fechaProximoContacto}</p>
                        </>
                      )}
                      {tabActiva === 'sinAsignar' && (
                        <>
                          <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Escuela Libre</p>
                          <p className="text-xs text-gray-700 font-medium">Disponible para asignación de ruta o prospección.</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-bold text-gray-700 hover:bg-gray-100" onClick={() => router.push(`/instituciones/${item.institucionId}`)}>
                      <Eye size={14} className="mr-1" /> Ficha Técnica
                    </Button>
                    {(tabActiva === 'ruta' || tabActiva === 'vencidas' || tabActiva === 'proximas' || tabActiva === 'sinAsignar') && (
                      <Button size="sm" className={`flex-1 text-xs font-bold text-white shadow-sm ${tabActiva === 'vencidas' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`} onClick={() => setModalVisita({ open: true, inst: item, isLibre: false })}>
                        <Navigation size={14} className="mr-1" /> Reg. Visita
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 p-4 border border-gray-200 bg-white rounded-2xl flex justify-between items-center shadow-sm">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wide">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, listaActual.length)} de {listaActual.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 text-xs font-bold rounded-lg">
                  <ChevronLeft size={14} className="mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 text-xs font-bold rounded-lg">
                  Siguiente <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <VisitaGPSForm 
        isOpen={modalVisita.open}
        onOpenChange={(val) => setModalVisita({ ...modalVisita, open: val })}
        isLibre={modalVisita.isLibre}
        institucionPreseleccionada={modalVisita.inst ? {
          id: modalVisita.inst.institucionId,
          nombre: modalVisita.inst.nombreInstitucion,
          canton: modalVisita.inst.canton
        } : null}
        onSuccess={() => cargarAgenda(true)} 
      />
    </div>
  );
}