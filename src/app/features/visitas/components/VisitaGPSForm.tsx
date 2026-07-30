"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Navigation, Save, AlertCircle } from 'lucide-react';
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
  
  // --- NUEVO: ESTADO PARA LA NOTIFICACIÓN FLOTANTE ---
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);

  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 4000); // Se oculta a los 4 segundos
  };
  
  // Catálogos
  const [instituciones, setInstituciones] = useState<any[]>([]);
  const [tiposCobro, setTiposCobro] = useState<any[]>([]);
  const [estadosCliente, setEstadosCliente] = useState<any[]>([]);
  const [estadosContrato, setEstadosContrato] = useState<any[]>([]);
  
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Formulario Base (Visita)
  const [formData, setFormData] = useState({
    institucionId: '',
    tipoGestion: 'Presencial',
    estadoGestion: 'Completada - Con interés',
    resumenAcuerdos: '',
    fechaProximoContacto: ''
  });

  // Formulario Extra (Venta)
  const [huboVenta, setHuboVenta] = useState(false);
  const [numContrato, setNumContrato] = useState('');
  const [valorContrato, setValorContrato] = useState('');
  const [meses, setMeses] = useState('12');
  const [mesCobro, setMesCobro] = useState('Enero');
  const [cuotaMensual, setCuotaMensual] = useState('');
  const [tipoCobroId, setTipoCobroId] = useState('');
  const [estadoClienteId, setEstadoClienteId] = useState('');
  const [estadoContratoId, setEstadoContratoId] = useState('');

  // Carga de catálogos
  useEffect(() => {
    if (open) {
      fetch('/api/instituciones').then(res => res.json()).then(data => setInstituciones(data));
      fetch('/api/catalogos').then(res => res.json()).then(data => {
        if (data.tiposCobro) setTiposCobro(data.tiposCobro);
        if (data.estadosCliente) setEstadosCliente(data.estadosCliente);
        if (data.estadosContrato) setEstadosContrato(data.estadosContrato);
      });
    }
  }, [open]);

  // Cálculo Matemático de Cuota
  const handleValorOMesesChange = (valor: string, m: string) => {
    const valNum = parseFloat(valor) || 0;
    const mesNum = parseInt(m) || 1;
    setValorContrato(valor);
    setMeses(m);
    setCuotaMensual(mesNum > 0 ? (valNum / mesNum).toFixed(2) : '0');
  };

  const capturarGPS = () => {
    if (!navigator.geolocation) { 
      showToast('error', "Tu navegador o dispositivo no soporta geolocalización."); 
      return; 
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { 
        setCoordenadas({ lat: position.coords.latitude, lng: position.coords.longitude }); 
        setGpsLoading(false); 
      },
      (error) => { 
        showToast('alerta', "Permite el acceso a tu ubicación en el navegador."); 
        setGpsLoading(false); 
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordenadas.lat || !coordenadas.lng) { 
      showToast('alerta', "¡OBLIGATORIO! Captura tu ubicación GPS."); 
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
          longitud: coordenadas.lng,
          // Datos Completos de Venta
          huboVenta, numContrato, valorContrato, meses, mesCobro, cuotaMensual, 
          tipoCobroId, estadoClienteId, estadoContratoId
        })
      });

      if (!res.ok) throw new Error('Error al registrar');

      setOpen(false);
      setCoordenadas({ lat: null, lng: null });
      setFormData({ institucionId: '', tipoGestion: 'Presencial', estadoGestion: 'Completada - Con interés', resumenAcuerdos: '', fechaProximoContacto: '' });
      setHuboVenta(false); setNumContrato(''); setValorContrato(''); setMeses('12'); setMesCobro('Enero'); setCuotaMensual(''); setTipoCobroId(''); setEstadoClienteId(''); setEstadoContratoId('');
      
      if (onSuccess) onSuccess();
      
      // ✅ NOTIFICACIÓN DE ÉXITO
      showToast('exito', huboVenta ? "¡Visita y Venta registradas con éxito!" : "¡Visita registrada con éxito!");

    } catch (error) { 
      // ❌ NOTIFICACIÓN DE ERROR
      showToast('error', "Hubo un error al guardar la gestión."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold flex gap-2"><MapPin size={18} /> Registrar Visita</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-xl bg-white p-6 rounded-xl overflow-y-auto max-h-[90vh]">
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
                <CheckCircle size={32} className="mb-1 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-600">¡Ubicación Confirmada!</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Lat: {coordenadas.lat?.toFixed(6)} | Lng: {coordenadas.lng?.toFixed(6)}</p>
              </div>
            )}
          </div>
          {/* SECCIÓN 3: DATOS DE LA GESTIÓN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tipo de Gestión *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={formData.tipoGestion} onChange={e => setFormData({ ...formData, tipoGestion: e.target.value })}>
                <option value="Presencial">Presencial (Visita física)</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Reunión Virtual">Reunión Virtual</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Resultado *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={formData.estadoGestion} onChange={e => setFormData({ ...formData, estadoGestion: e.target.value })}>
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
          {/* NUEVO: INTERRUPTOR Y CAMPOS DE VENTA                 */}
          <div className="border-t border-gray-200 pt-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2 bg-gray-50 p-2 rounded-lg border border-gray-200 hover:bg-emerald-50 transition-colors">
              <input 
                type="checkbox" 
                checked={huboVenta} 
                onChange={(e) => setHuboVenta(e.target.checked)} 
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-800">
                 ¿Se concretó una venta en esta visita?
              </span>
            </label>
            {huboVenta && (
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                {/* FILA 1: Montos */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">N° Contrato *</Label><Input required={huboVenta} type="text" pattern="[0-9]+" value={numContrato} onChange={(e) => setNumContrato(e.target.value.replace(/\D/g, ''))} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Monto Contrato ($) *</Label><Input required={huboVenta} type="number" step="0.01" value={valorContrato} onChange={(e) => handleValorOMesesChange(e.target.value, meses)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                </div>
                {/* FILA 2: Plazos y Cuotas */}
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Meses Plazo</Label><Input type="number" min="1" value={meses} onChange={(e) => handleValorOMesesChange(valorContrato, e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Cuota Mensual ($)</Label><Input type="number" step="0.01" value={cuotaMensual} onChange={(e) => setCuotaMensual(e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 font-bold text-emerald-700" /></div>
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Mes Cobro</Label><select value={mesCobro} onChange={(e) => setMesCobro(e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-2 text-[11px] bg-white mt-1 outline-none">{['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
                </div>
                {/* FILA 3: Catálogos / Estados */}
                <div className="grid grid-cols-3 gap-2 border-t border-emerald-200/50 pt-3">
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Tipo Cobro *</Label><select required={huboVenta} value={tipoCobroId} onChange={(e) => setTipoCobroId(e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{tiposCobro.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Est. Cliente</Label><select value={estadoClienteId} onChange={(e) => setEstadoClienteId(e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{estadosCliente.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                  <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Est. Contrato</Label><select value={estadoContratoId} onChange={(e) => setEstadoContratoId(e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{estadosContrato.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                </div>

              </div>
            )}
          </div>
            <Button type="submit" disabled={loading || !coordenadas.lat} className="w-full h-11 bg-primary text-white text-base mt-2">
              <Save size={18} className="mr-2" /> {loading ? 'Guardando en la nube...' : 'Subir Reporte de Visita'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {toastMsg && (
        <div 
          className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${
            toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : 
            toastMsg.tipo === 'alerta' ? 'bg-amber-500 text-white' : 
            'bg-red-600 text-white'
          }`}
        >
          {toastMsg.tipo === 'exito' ? (
            <CheckCircle size={20} className="text-emerald-100" />
          ) : (
            <AlertCircle size={20} className="text-white/90" />
          )}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}