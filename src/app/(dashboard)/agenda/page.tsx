"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Eye, Search, Navigation, ChevronLeft, ChevronRight, CalendarCheck} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { VisitaGPSForm } from '@/app/features/visitas/components/VisitaGPSForm';

export default function AgendaPage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [realizadas, setRealizadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [userRol, setUserRol] = useState('vendedor');
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'realizadas'>('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedCanton, setSelectedCanton] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  // PAGINACIÓN (9 Tarjetas por página)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [modalVisita, setModalVisita] = useState<{ open: boolean; inst: any; isLibre: boolean }>({ 
    open: false, inst: null, isLibre: false 
  });
  const cargarAgenda = async () => {
    setLoading(true);
    try {
      let url = '/api/agenda?';
      if (selectedVendedor) url += `vendedorId=${selectedVendedor}&`;
      if (fechaDesde) url += `fechaDesde=${fechaDesde}&`;
      if (fechaHasta) url += `fechaHasta=${fechaHasta}&`;
      const [resAgenda, resCat, resVend] = await Promise.all([ fetch(url), fetch('/api/catalogos'), fetch('/api/usuarios/vendedores') ]);
      const dataAgenda = await resAgenda.json();
      const dataCat = await resCat.json();
      const dataVend = await resVend.json();
      setPendientes(dataAgenda.pendientes || []);
      setRealizadas(dataAgenda.realizadas || []);
      setCatalogos(dataCat);
      setVendedores(Array.isArray(dataVend) ? dataVend : []);
      if (dataCat.userRol) setUserRol(dataCat.userRol);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargarAgenda(); }, [selectedVendedor, fechaDesde, fechaHasta]);
  useEffect(() => { setCurrentPage(1); }, [tabActiva, searchTerm, selectedProvincia, selectedCanton]);
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('no visitada')) return '#d9d9d9';
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
  const listaActual = tabActiva === 'pendientes' ? filterList(pendientes) : filterList(realizadas);
  const totalPages = Math.max(1, Math.ceil(listaActual.length / itemsPerPage));
  const itemsPaginados = listaActual.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const cantonesDisponibles = selectedProvincia ? catalogos?.provincias?.find((p: any) => p.id === parseInt(selectedProvincia))?.cantones || [] : [];
  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-background">
      {/* HEADER Y BOTÓN VISITA LIBRE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            <Calendar className="text-primary" /> Agenda y Pipeline
          </h1>
          <p className="text-secondary mt-1">Gestiona tu ruta diaria y registra tus visitas en campo.</p>
        </div>
        <Button 
          onClick={() => setModalVisita({ open: true, inst: null, isLibre: true })} 
          className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md"
        >
          <Navigation size={18} className="mr-2" /> Nueva Visita (Libre)
        </Button>
      </div>
      {/* TABS PRINCIPALES */}
      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setTabActiva('pendientes')} 
          className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${tabActiva === 'pendientes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          📍 Mi Ruta Pendiente
          <Badge className="ml-2 bg-primary/10 text-primary">{pendientes.length}</Badge>
        </button>
        <button 
          onClick={() => setTabActiva('realizadas')} 
          className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${tabActiva === 'realizadas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          ✅ Visitas Realizadas
          <Badge className="ml-2 bg-muted text-muted-foreground">{realizadas.length}</Badge>
        </button>
      </div>
      {/* BARRA DE FILTROS Y KPI */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <Input className="pl-9 h-10 text-sm bg-white min-w-200px" placeholder="Buscar escuela..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="h-10 border rounded-md px-3 text-xs bg-white text-foreground" value={selectedProvincia} onChange={e => { setSelectedProvincia(e.target.value); setSelectedCanton(''); }}>
            <option value="">Provincias</option>
            {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select disabled={!selectedProvincia} className="h-10 border rounded-md px-3 text-xs bg-white text-foreground disabled:bg-muted" value={selectedCanton} onChange={e => setSelectedCanton(e.target.value)}>
            <option value="">Cantones</option>
            {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {tabActiva === 'realizadas' && (
          <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desde</Label>
              <Input type="date" className="h-8 text-xs bg-white w-120px" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Hasta</Label>
              <Input type="date" className="h-8 text-xs bg-white w-120px" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
            <div className="border-l border-border pl-3 ml-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Rango</p>
              <p className="text-xl font-extrabold text-primary">{realizadas.length}</p>
            </div>
          </div>
        )}
      </div>
      {/* CUADRÍCULA DE TARJETAS */}
      {loading ? (
        <div className="p-12 text-center text-secondary font-medium">Cargando pipeline...</div>
      ) : itemsPaginados.length === 0 ? (
        <div className="bg-card p-12 rounded-xl border border-dashed border-border text-center text-secondary flex flex-col items-center">
          <CalendarCheck size={48} className="text-muted-foreground mb-3 opacity-50" />
          <p className="text-card-title">No hay escuelas en esta bandeja.</p>
          <p className="text-sm mt-1">¡Sigue prospectando o revisa tus filtros!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {itemsPaginados.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <Badge 
                    style={{ 
                      backgroundColor: getStatusColor(tabActiva === 'pendientes' ? item.estadoComercial : item.estadoComercialActual), 
                      color: getStatusColor(tabActiva === 'pendientes' ? item.estadoComercial : item.estadoComercialActual) === '#d9d9d9' ? '#111111' : '#FFFFFF' 
                    }}
                    className="font-bold tracking-wide"
                  >
                    {tabActiva === 'pendientes' ? item.estadoComercial : item.estadoComercialActual}
                  </Badge>
                  {tabActiva === 'pendientes' && item.categoria === 'Hoy' && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span></span>}
                </div>
                <h3 className="text-card-title leading-tight mb-1">{item.nombreInstitucion}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                  <MapPin size={12} className="text-primary shrink-0" /> {item.canton} / {item.parroquia}
                </p>
                {tabActiva === 'pendientes' ? (
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Último contacto / Acuerdo</p>
                    <p className="text-xs text-foreground italic line-clamp-2">{item.ultimoAcuerdo}</p>
                    {item.fechaProgramada && <p className="text-[10px] text-primary font-bold mt-2">Agendado: {item.fechaProgramada}</p>}
                  </div>
                ) : (
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Resumen de esta visita</p>
                    {/* 🔥 CORREGIDO: resumenAcuerdos */}
                    <p className="text-xs text-foreground line-clamp-2">{item.resumenAcuerdos || 'Sin resumen detallado'}</p> 
                    {/* 🔥 CORREGIDO: fechaVisitaReal */}
                    <p className="text-[10px] text-emerald-600 font-bold mt-2">
                      Realizada el: {new Date(item.fechaVisitaReal).toLocaleDateString('es-EC')}
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-4 mt-4 border-t border-border flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold text-foreground border-border hover:bg-muted" onClick={() => router.push(`/instituciones/${item.institucionId}`)}>
                  <Eye size={14} className="mr-1" /> Ficha Técnica
                </Button>
                
                {/* 🔥 BOTÓN QUE ABRE EL COMPONENTE CON LOS DATOS DE ESTA ESCUELA 🔥 */}
                {tabActiva === 'pendientes' && (
                  <Button 
                    size="sm" 
                    className="flex-1 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm" 
                    onClick={() => setModalVisita({ open: true, inst: item, isLibre: false })}
                  >
                    <Navigation size={14} className="mr-1" /> Reg. Visita
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="mt-4 p-4 border border-border bg-card rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, listaActual.length)} de {listaActual.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 text-xs font-bold">
              <ChevronLeft size={14} className="mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 text-xs font-bold">
              Siguiente <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 🔥 AQUÍ INYECTAMOS TU COMPONENTE MODULAR 🔥 */}
      <VisitaGPSForm 
        isOpen={modalVisita.open}
        onOpenChange={(val) => setModalVisita({ ...modalVisita, open: val })}
        isLibre={modalVisita.isLibre}
        institucionPreseleccionada={modalVisita.inst ? {
          id: modalVisita.inst.institucionId,
          nombre: modalVisita.inst.nombreInstitucion,
          canton: modalVisita.inst.canton
        } : null}
        onSuccess={cargarAgenda} 
      />

    </div>
  );
}