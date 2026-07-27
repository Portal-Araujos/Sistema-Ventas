"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Navigation, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
  onSuccess?: () => void;
}

export function VisitaGPSForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Lista de escuelas para que el vendedor seleccione dónde está
  const [instituciones, setInstituciones] = useState<any[]>([]);
  
  // Estados del GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Formulario
  const [formData, setFormData] = useState({
    institucionId: '',
    tipoGestion: 'Presencial',
    estadoGestion: 'Completada - Con interés',
    resumenAcuerdos: '',
    fechaProximoContacto: ''
  });

  // Cargar las escuelas al abrir el modal
  useEffect(() => {
    if (open) {
      fetch('/api/instituciones')
        .then(res => res.json())
        .then(data => setInstituciones(data))
        .catch(err => console.error(err));
    }
  }, [open]);

  // FUNCIÓN ESTRELLA: Capturar Hardware GPS
  const capturarGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordenadas({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsLoading(false);
      },
      (error) => {
        console.error("Error GPS:", error);
        alert("Por favor permite el acceso a tu ubicación en el navegador para registrar la visita.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Máxima precisión (GPS de celular)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordenadas.lat || !coordenadas.lng) {
      alert("¡OBLIGATORIO! Debes capturar tu ubicación GPS antes de guardar la visita.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitud: coordenadas.lat,
          longitud: coordenadas.lng
        })
      });

      if (!res.ok) throw new Error('Error al registrar la visita');

      setOpen(false);
      setCoordenadas({ lat: null, lng: null });
      setFormData({ ...formData, resumenAcuerdos: '', institucionId: '', fechaProximoContacto: '' });
      if (onSuccess) onSuccess();
      
      alert("✅ ¡Visita registrada con éxito!");

    } catch (error) {
      alert("Hubo un error al guardar la visita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold flex gap-2">
          <MapPin size={18} /> Registrar Visita
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-white p-6 rounded-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="text-primary" /> Reporte de Gestión en Campo
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">Registra tu visita actual. Tu ubicación será guardada por seguridad.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          
          {/* SECCIÓN 1: SELECCIÓN DE ESCUELA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">¿En qué institución te encuentras? *</Label>
            <select 
              required
              className="w-full h-11 border border-gray-300 rounded-md px-3 text-sm bg-white"
              value={formData.institucionId}
              onChange={e => setFormData({ ...formData, institucionId: e.target.value })}
            >
              <option value="">Selecciona la escuela...</option>
              {instituciones.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.nombre} ({inst.canton})</option>
              ))}
            </select>
          </div>

          {/* SECCIÓN 2: BOTÓN DE GPS OBLIGATORIO */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex flex-col items-center justify-center gap-3">
            {!coordenadas.lat ? (
              <>
                <p className="text-xs text-center text-gray-600">Requerimos tus coordenadas exactas para validar esta visita.</p>
                <Button type="button" onClick={capturarGPS} disabled={gpsLoading} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  {gpsLoading ? 'Buscando satélites...' : '📍 Capturar mi Ubicación GPS'}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center text-status-success">
                <CheckCircle size={32} className="mb-1" />
                <p className="text-sm font-bold">¡Ubicación Confirmada!</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Lat: {coordenadas.lat?.toFixed(6)} | Lng: {coordenadas.lng?.toFixed(6)}</p>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: DATOS DE LA GESTIÓN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tipo de Gestión *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm" value={formData.tipoGestion} onChange={e => setFormData({ ...formData, tipoGestion: e.target.value })}>
                <option value="Presencial">Presencial (Visita física)</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Reunión Virtual">Reunión Virtual</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Resultado *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm" value={formData.estadoGestion} onChange={e => setFormData({ ...formData, estadoGestion: e.target.value })}>
                <option value="Completada - Con interés">Excelente (Con interés)</option>
                <option value="Completada - Seguimiento">Requiere Seguimiento</option>
                <option value="Completada - Sin interés">Cerrado (Sin interés)</option>
                <option value="Autoridad no se encontraba">Autoridad no estaba</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Resumen de Acuerdos / Novedades</Label>
            <textarea 
              className="w-full min-h-80px border border-gray-300 rounded-md p-3 text-sm"
              placeholder="Ej: Se presentó el catálogo 2027. La Rectora pidió que regresemos la próxima semana para firmar..."
              value={formData.resumenAcuerdos}
              onChange={e => setFormData({ ...formData, resumenAcuerdos: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Fecha Próximo Contacto (Opcional)</Label>
            <Input 
              type="date" 
              className="h-10 text-sm" 
              value={formData.fechaProximoContacto}
              onChange={e => setFormData({ ...formData, fechaProximoContacto: e.target.value })}
            />
            <p className="text-[10px] text-gray-400">Si dejas una fecha, esta escuela volverá a aparecer en tu agenda automáticamente.</p>
          </div>

          <Button type="submit" disabled={loading || !coordenadas.lat} className="w-full h-11 bg-primary text-white text-base mt-2">
            <Save size={18} className="mr-2" />
            {loading ? 'Guardando en la nube...' : 'Subir Reporte de Visita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}