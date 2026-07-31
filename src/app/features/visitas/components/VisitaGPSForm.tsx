"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Navigation, Save, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // Notificación Flotante
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);

  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => setToastMsg(null), 4000); 
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

  // --- NUEVO: ESTADOS PARA MÚLTIPLES VENTAS Y ACORDEÓN ---
  const [huboVenta, setHuboVenta] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [ventasItem, setVentasItem] = useState<any[]>([]);

  // Inicializar un contrato vacío cuando se marca el checkbox por primera vez
  useEffect(() => {
    if (huboVenta && ventasItem.length === 0) {
      setVentasItem([{ numContrato: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '' }]);
      setExpandedIndex(0);
    }
  }, [huboVenta]);

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

  // Mánager de Cambios en Contratos y Cálculo Automático de Cuota
  const handleVentaChange = (index: number, field: string, value: string) => {
    const newVentas = [...ventasItem];
    newVentas[index][field] = value;

    // Si se modifica monto, abono o meses -> Recalcular cuota
    if (['valorContrato', 'abono', 'meses'].includes(field)) {
      const valNum = parseFloat(newVentas[index].valorContrato) || 0;
      const abonoNum = parseFloat(newVentas[index].abono) || 0;
      const mesNum = parseInt(newVentas[index].meses) || 1;
      
      const restante = Math.max(0, valNum - abonoNum); // Aseguramos no tener cuotas negativas
      newVentas[index].cuotaMensual = mesNum > 0 ? (restante / mesNum).toFixed(2) : '0';
    }

    setVentasItem(newVentas);
  };

  const addContrato = () => {
    setVentasItem([...ventasItem, { numContrato: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '' }]);
    setExpandedIndex(ventasItem.length); // Desplegar el nuevo contrato
  };

  const removeContrato = (index: number) => {
    const newVentas = ventasItem.filter((_, i) => i !== index);
    setVentasItem(newVentas);
    if (expandedIndex === index) setExpandedIndex(Math.max(0, index - 1));
  };

  const capturarGPS = () => {
    if (!navigator.geolocation) { showToast('error', "Tu navegador no soporta GPS."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoordenadas({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      (err) => { showToast('alerta', "Permite acceso a tu ubicación."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordenadas.lat || !coordenadas.lng) { 
      showToast('alerta', "¡OBLIGATORIO! Captura tu ubicación GPS."); return; 
    }

    // Validación manual de campos obligatorios en los contratos
    if (huboVenta) {
      for (const v of ventasItem) {
        if (!v.numContrato || !v.valorContrato || !v.tipoCobroId) {
          showToast('alerta', "Revisa los contratos. N° Contrato, Monto y Tipo Cobro son obligatorios.");
          return;
        }
      }
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
          huboVenta,
          ventas: huboVenta ? ventasItem : [] // Enviamos el Array Completo
        })
      });

      if (!res.ok) throw new Error('Error al registrar');

      setOpen(false);
      setCoordenadas({ lat: null, lng: null });
      setFormData({ institucionId: '', tipoGestion: 'Presencial', estadoGestion: 'Completada - Con interés', resumenAcuerdos: '', fechaProximoContacto: '' });
      setHuboVenta(false); 
      setVentasItem([]);
      
      if (onSuccess) onSuccess();
      showToast('exito', huboVenta ? "¡Visita y Contratos registrados!" : "¡Visita registrada con éxito!");

    } catch (error) { 
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
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

          {/* ========================================================== */}
          {/* MÚLTIPLES CONTRATOS (ACORDEÓN)                             */}
          {/* ========================================================== */}
          <div className="border-t border-gray-200 pt-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
              <input type="checkbox" checked={huboVenta} onChange={(e) => { setHuboVenta(e.target.checked); if (!e.target.checked) setVentasItem([]); }} className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
              <span className="text-xs font-bold text-emerald-800">💵 ¿Se concretó una venta en esta visita?</span>
            </label>

            {huboVenta && (
              <div className="space-y-3 mt-3">
                {ventasItem.map((venta, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div key={index} className={`rounded-xl border transition-all ${isExpanded ? 'bg-emerald-50/40 border-emerald-300 shadow-sm' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
                      
                      {/* CABECERA DE LA TARJETA (Minimizada) */}
                      <div className="p-3 flex justify-between items-center cursor-pointer" onClick={() => setExpandedIndex(isExpanded ? -1 : index)}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isExpanded ? 'text-emerald-800' : 'text-gray-700'}`}>
                            📄 Contrato {venta.numContrato ? `#${venta.numContrato}` : (index + 1)}
                          </span>
                          {venta.valorContrato && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                              ${parseFloat(venta.valorContrato).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {ventasItem.length > 1 && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeContrato(index); }} className="text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                          {isExpanded ? <ChevronUp size={16} className="text-emerald-600"/> : <ChevronDown size={16} className="text-gray-400"/>}
                        </div>
                      </div>

                      {/* CUERPO DEL FORMULARIO (Expandido) */}
                      {isExpanded && (
                        <div className="p-4 pt-1 space-y-3 border-t border-emerald-100 animate-in fade-in">
                          
                          {/* Fila 1: Montos y Abono */}
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">N° Contrato *</Label><Input type="text" value={venta.numContrato} onChange={(e) => handleVentaChange(index, 'numContrato', e.target.value.replace(/\D/g, ''))} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Monto Total *</Label><Input type="number" step="0.01" value={venta.valorContrato} onChange={(e) => handleVentaChange(index, 'valorContrato', e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold 'text-emerald-700' uppercase text-blue-600">Abono Inicial</Label><Input type="number" step="0.01" value={venta.abono} onChange={(e) => handleVentaChange(index, 'abono', e.target.value)} className="h-8 text-xs mt-1 bg-white border-blue-200 focus-visible:ring-blue-500" placeholder="0.00" /></div>
                          </div>

                          {/* Fila 2: Plazos y Cuotas */}
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Meses Plazo</Label><Input type="number" min="1" value={venta.meses} onChange={(e) => handleVentaChange(index, 'meses', e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold 'text-emerald-700' uppercase text-emerald-700">Cuota Mensual</Label><Input disabled type="text" value={`$ ${venta.cuotaMensual}`} className="h-8 text-xs mt-1 bg-emerald-50 border-emerald-200 font-bold text-emerald-800" /></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Mes Cobro</Label><select value={venta.mesCobro} onChange={(e) => handleVentaChange(index, 'mesCobro', e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[11px] bg-white mt-1 outline-none">{['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
                          </div>

                          {/* Fila 3: Catálogos / Estados */}
                          <div className="grid grid-cols-3 gap-2 border-t border-emerald-100 pt-2">
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Tipo Cobro *</Label><select value={venta.tipoCobroId} onChange={(e) => handleVentaChange(index, 'tipoCobroId', e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{tiposCobro.filter(t=>t.activo).map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Est. Cliente</Label><select value={venta.estadoClienteId} onChange={(e) => handleVentaChange(index, 'estadoClienteId', e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{estadosCliente.filter(t=>t.activo).map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Est. Contrato</Label><select value={venta.estadoContratoId} onChange={(e) => handleVentaChange(index, 'estadoContratoId', e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[10px] bg-white mt-1 outline-none"><option value="">Seleccione...</option>{estadosContrato.filter(t=>t.activo).map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}

                <Button type="button" variant="outline" onClick={addContrato} className="w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white text-xs h-9">
                  <Plus size={14} className="mr-1" /> Agregar otro contrato
                </Button>
              </div>
            )}
          </div>
          {/* ========================================================== */}

          <Button type="submit" disabled={loading || !coordenadas.lat} className="w-full h-11 bg-primary text-white text-base mt-2 shadow-md">
            <Save size={18} className="mr-2" /> {loading ? 'Guardando...' : 'Subir Reporte de Visita'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-emerald-600 text-white' : toastMsg.tipo === 'alerta' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle size={20} className="text-emerald-100" /> : <AlertCircle size={20} className="text-white/90" />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}