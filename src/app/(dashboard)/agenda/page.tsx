"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Clock, AlertCircle, CheckCircle2, 
  MapPin, Phone, Eye, Search, Filter, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VisitaGPSForm } from '@/app/features/visitas/components/VisitaGPSForm';

export default function AgendaPage() {
  const router = useRouter();
  const [agenda, setAgenda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [userRol, setUserRol] = useState('vendedor');

  // Filtros
  const [tabActiva, setTabActiva] = useState<'todas' | 'Hoy' | 'Próxima' | 'Vencida'>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedCanton, setSelectedCanton] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');

  const cargarAgenda = async () => {
    setLoading(true);
    try {
      const url = selectedVendedor ? `/api/agenda?vendedorId=${selectedVendedor}` : '/api/agenda';
      const [resAgenda, resCat, resVend] = await Promise.all([
        fetch(url),
        fetch('/api/catalogos'),
        fetch('/api/usuarios/vendedores')
      ]);

      const dataAgenda = await resAgenda.json();
      const dataCat = await resCat.json();
      const dataVend = await resVend.json();

      setAgenda(Array.isArray(dataAgenda) ? dataAgenda : []);
      setCatalogos(dataCat);
      setVendedores(Array.isArray(dataVend) ? dataVend : []);
      if (dataCat.userRol) setUserRol(dataCat.userRol);
    } catch (e) {
      console.error("Error al cargar agenda:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAgenda();
  }, [selectedVendedor]);

  // Contadores para las Tarjetas Superiores
  const totalAgenda = agenda.length;
  const citasHoy = agenda.filter(a => a.categoria === 'Hoy').length;
  const proximasCitas = agenda.filter(a => a.categoria === 'Próxima').length;
  const vencidas = agenda.filter(a => a.categoria === 'Vencida').length;

  // Filtrado de Tarjetas
  const agendaFiltrada = agenda.filter(item => {
    if (tabActiva !== 'todas' && item.categoria !== tabActiva) return false;
    if (searchTerm && !item.nombreInstitucion.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedProvincia && item.provinciaId !== parseInt(selectedProvincia)) return false;
    if (selectedCanton && item.cantonId !== parseInt(selectedCanton)) return false;
    return true;
  });

  const cantonesDisponibles = selectedProvincia 
    ? catalogos?.provincias?.find((p: any) => p.id === parseInt(selectedProvincia))?.cantones || []
    : [];

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-primary" /> Agenda y Seguimientos
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Cronograma de compromisos, llamadas y visitas a instituciones
          </p>
        </div>

        <VisitaGPSForm onSuccess={cargarAgenda} />
      </div>

      {/* TARJETAS DE RESUMEN SUPERIOR (Como en tu imagen) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        
        {/* Card 1: Total */}
        <div 
          onClick={() => setTabActiva('todas')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            tabActiva === 'todas' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-gray-200 hover:border-primary/50'
          }`}
        >
          <p className={`text-xs font-semibold ${tabActiva === 'todas' ? 'text-white/80' : 'text-gray-500'}`}>Total Agenda</p>
          <h3 className="text-2xl font-extrabold mt-1">{totalAgenda}</h3>
        </div>

        {/* Card 2: Hoy */}
        <div 
          onClick={() => setTabActiva('Hoy')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            tabActiva === 'Hoy' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold ${tabActiva === 'Hoy' ? 'text-white/80' : 'text-purple-600'}`}>Citas de Hoy</p>
            <Clock size={16} className={tabActiva === 'Hoy' ? 'text-white' : 'text-purple-600'} />
          </div>
          <h3 className="text-2xl font-extrabold mt-1">{citasHoy}</h3>
        </div>

        {/* Card 3: Próximas */}
        <div 
          onClick={() => setTabActiva('Próxima')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            tabActiva === 'Próxima' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold ${tabActiva === 'Próxima' ? 'text-white/80' : 'text-emerald-600'}`}>Próximas Visitas</p>
            <CheckCircle2 size={16} className={tabActiva === 'Próxima' ? 'text-white' : 'text-emerald-600'} />
          </div>
          <h3 className="text-2xl font-extrabold mt-1">{proximasCitas}</h3>
        </div>

        {/* Card 4: Vencidos */}
        <div 
          onClick={() => setTabActiva('Vencida')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            tabActiva === 'Vencida' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold ${tabActiva === 'Vencida' ? 'text-white/80' : 'text-red-600'}`}>Seguimientos Vencidos</p>
            <AlertCircle size={16} className={tabActiva === 'Vencida' ? 'text-white' : 'text-red-600'} />
          </div>
          <h3 className="text-2xl font-extrabold mt-1">{vencidas}</h3>
        </div>

      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input 
            className="pl-9 h-10 text-sm" 
            placeholder="Buscar por institución..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <select 
          className="h-10 border rounded-md px-3 text-xs bg-white text-gray-700" 
          value={selectedProvincia} 
          onChange={e => { setSelectedProvincia(e.target.value); setSelectedCanton(''); }}
        >
          <option value="">Todas las Provincias</option>
          {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <select 
          disabled={!selectedProvincia} 
          className="h-10 border rounded-md px-3 text-xs bg-white text-gray-700 disabled:bg-gray-100" 
          value={selectedCanton} 
          onChange={e => setSelectedCanton(e.target.value)}
        >
          <option value="">Todos los Cantones</option>
          {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        {esAdmin && (
          <select 
            className="h-10 border rounded-md px-3 text-xs bg-white text-gray-700" 
            value={selectedVendedor} 
            onChange={e => setSelectedVendedor(e.target.value)}
          >
            <option value="">Todos los Vendedores</option>
            {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        )}
      </div>

      {/* RED DE TARJETAS DE COMPROMISO */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-medium">Cargando compromisos de la agenda...</div>
      ) : agendaFiltrada.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border text-center text-gray-500">
          No hay citas o seguimientos programados en este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agendaFiltrada.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                item.categoria === 'Hoy' ? 'border-purple-300 ring-1 ring-purple-100' :
                item.categoria === 'Vencida' ? 'border-red-300 bg-red-50/10' : 'border-gray-200'
              }`}
            >
              <div>
                {/* Badge de Estado del Agendamiento */}
                <div className="flex justify-between items-center mb-2">
                  <Badge 
                    className={
                      item.categoria === 'Hoy' ? 'bg-purple-600 text-white' :
                      item.categoria === 'Vencida' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }
                  >
                    {item.categoria === 'Hoy' ? '📅 Cita de Hoy' : item.categoria === 'Vencida' ? '⚠️ Seguimiento Vencido' : '📅 Próxima Cita'}
                  </Badge>
                  <span className="text-xs font-bold text-gray-500">{item.fechaProgramada}</span>
                </div>

                <h3 className="font-bold text-gray-900 text-base">{item.nombreInstitucion}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-primary shrink-0" />
                  {item.provincia} / {item.canton} ({item.parroquia})
                </p>

                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Último Acuerdo Registrado</p>
                  <p className="text-xs text-gray-700 italic mt-0.5 line-clamp-2">{item.ultimoAcuerdo}</p>
                </div>
              </div>

              {/* Botones de Acción Rápida para el Vendedor */}
              <div className="pt-3 border-t flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 bg-primary text-white text-xs font-bold"
                  onClick={() => router.push(`/instituciones/${item.institucionId}`)}
                >
                  <Eye size={14} className="mr-1" /> Ficha Técnica
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}