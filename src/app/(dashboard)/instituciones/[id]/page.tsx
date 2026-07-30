"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Users, Calendar, User, Navigation, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function FichaTecnicaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRol, setUserRol] = useState('vendedor');

  const cargarFicha = async () => {
    setLoading(true);
    try {
      const [resInst, resCat] = await Promise.all([
        fetch(`/api/instituciones/${resolvedParams.id}`),
        fetch('/api/catalogos')
      ]);
      const dataInst = await resInst.json();
      const dataCat = await resCat.json();
      
      if (dataCat.userRol) setUserRol(dataCat.userRol);
      setInst(dataInst);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFicha();
  }, [resolvedParams.id]);

  const handleEliminar = async () => {
    if (!confirm(`¿Estás seguro de eliminar "${inst.nombre}"? Se perderá todo su historial.`)) return;

    try {
      const res = await fetch(`/api/instituciones/${resolvedParams.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      router.push('/instituciones');
    } catch (e) {
      alert("Error al eliminar institución.");
    }
  };

  const esAdmin = userRol === 'super_admin' || userRol === 'administrador';

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Cargando Ficha Técnica...</div>;
  if (!inst) return <div className="p-12 text-center text-red-500 font-medium">La institución no existe.</div>;

  return (
    <div className="p-4 md:p-8  min-h-screen flex flex-col gap-6">
      
      {/* Botón Volver y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/instituciones')} className="text-gray-600 hover:bg-gray-100 flex items-center gap-2">
          <ArrowLeft size={18} /> Volver a Lista
        </Button>

        {esAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleEliminar} className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5">
              <Trash2 size={16} /> Eliminar Institución
            </Button>
          </div>
        )}
      </div>

      {/* CABECERA PRINCIPAL */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{inst.nombre}</h1>
            <Badge className="bg-primary text-white text-xs px-3 py-1 font-semibold">{inst.tamano}</Badge>
            <Badge className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 font-semibold">{inst.estadoComercial}</Badge>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            {inst.parroquia?.canton?.provincia?.nombre} / {inst.parroquia?.canton?.nombre} / Parroquia: {inst.parroquia?.nombre}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-w-240px">
          <span className="text-xs text-gray-400 font-semibold block uppercase">Vendedor Responsable</span>
          {inst.vendedor ? (
            <div className="mt-1">
              <p className="text-sm font-bold text-gray-900">👤 {inst.vendedor.nombre}</p>
              <p className="text-xs text-gray-500">{inst.vendedor.email}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-amber-600 mt-1">⚠️ Sin Vendedor Asignado</p>
          )}
        </div>
      </div>

      {/* REJILLA DE INFORMACIÓN TÉCNICA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BLOQUE 1: DATOS GENERALES Y CLASIFICACIÓN */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <Building2 size={18} /> Clasificación Educativa
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Sostenimiento:</span><span className="font-semibold">{inst.sostenimiento?.nombre}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Jornada:</span><span className="font-semibold">{inst.jornada?.nombre}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Nivel Educativo:</span><span className="font-semibold">{inst.nivelEducativo?.nombre || 'N/A'}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Área:</span><span className="font-semibold">{inst.area?.nombre || 'N/A'}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Régimen Escolar:</span><span className="font-semibold">{inst.regimen?.nombre || 'N/A'}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Jurisdicción:</span><span className="font-semibold">{inst.jurisdiccion?.nombre || 'N/A'}</span></div>
            <div className="flex justify-between border-b pb-1.5"><span className="text-gray-500">Modalidad:</span><span className="font-semibold">{inst.modalidad?.nombre || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Acceso Edificio:</span><span className="font-semibold">{inst.accesoEdificio?.nombre || 'N/A'}</span></div>
          </div>
        </div>

        {/* BLOQUE 2: DESGLOSE DE PERSONAL DOCENTE */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <Users size={18} /> Personal Docente
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-xl">
              <span className="text-xs text-blue-600 font-semibold block">Hombres</span>
              <span className="text-2xl font-bold text-blue-900">{inst.docentesHombres}</span>
            </div>
            <div className="bg-pink-50 p-4 rounded-xl">
              <span className="text-xs text-pink-600 font-semibold block">Mujeres</span>
              <span className="text-2xl font-bold text-pink-900">{inst.docentesMujeres}</span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center border">
            <span className="text-xs text-gray-500 font-bold uppercase block">Total Docentes Registrados</span>
            <span className="text-3xl font-extrabold text-primary">{inst.totalDocentes}</span>
          </div>
          
        </div>

        {/* BLOQUE 3: AUDITORÍA */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <Calendar size={18} /> Auditoría del Registro
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-gray-500">Registrada por:</span>
              <span className="font-semibold">{inst.usuarioCreador?.nombre || 'Sistema'}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-gray-500">Fecha de creacion:</span>
              <span className="font-semibold">{new Date(inst.createdAt).toLocaleDateString('es-EC')}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-gray-500">Tamaño:</span>
              <span className="font-semibold">{inst.tamano}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Visitas Realizadas:</span>
              <span className="font-bold text-emerald-600">{inst.visitas?.length || 0} visitas</span>
            </div>
          </div>
        </div>
      </div>
      {/* SECCIÓN HISTORIAL DE VISITAS Y GESTIONES CON GPS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Navigation className="text-primary" /> Historial de Visitas y Gestiones en Campo
        </h2>
        {inst.visitas?.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No hay visitas ni gestiones registradas para esta escuela todavía.</p>
        ) : (
          <div className="space-y-3">
            {inst.visitas.map((visita: any) => (
              <div key={visita.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-white text-[10px]">{visita.tipoGestion}</Badge>
                    <span className="text-xs font-bold text-gray-700">{visita.estadoGestion}</span>
                    <span className="text-xs text-gray-400">• {new Date(visita.createdAt).toLocaleString('es-EC')}</span>
                  </div>
                  <div className="mt-2 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Observaciones y Acuerdos Alcanzados
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap overflow-wrap:anywhere leading-relaxed">
                      {visita.resumenAcuerdos || 'Sin observaciones detalladas.'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">Gestión realizada por: <strong>{visita.usuario?.nombre}</strong></p>
                </div>
                {visita.latitud && visita.longitud && (
                  <div className="shrink-0 flex items-center">
                    <a 
                      href={`https://maps.google.com/?q=${visita.latitud},${visita.longitud}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-100"
                    >
                      📍 Ver GPS en Google Maps
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}