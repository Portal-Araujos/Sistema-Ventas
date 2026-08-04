"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Navigation, Save, AlertCircle, Plus, Clock,Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLibre?: boolean;
  institucionPreseleccionada?: { id: string; nombre: string; canton: string } | null;
}
export function VisitaGPSForm({ onSuccess, isOpen, onOpenChange, isLibre = true, institucionPreseleccionada = null }: Props) {
  // Manejo de estado del modal (Interno o Externo)
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => { setToastMsg({ tipo, texto }); setTimeout(() => setToastMsg(null), 4000); };
  const [instituciones, setInstituciones] = useState<any[]>([]);
  const [tiposCobro, setTiposCobro] = useState<any[]>([]);
  const [estadosCliente, setEstadosCliente] = useState<any[]>([]);
  const [estadosContrato, setEstadosContrato] = useState<any[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [dropdownBusquedaOpen, setDropdownBusquedaOpen] = useState(false);
  const [formData, setFormData] = useState({
    institucionId: '',
    tipoGestion: 'Presencial',
    estadoGestion: 'Visitada', // Opciones: Visitada, Seguimiento, No interesado
    resumenAcuerdos: '',
    fechaProximoContacto: ''
  });
  const [huboVenta, setHuboVenta] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [ventasItem, setVentasItem] = useState<any[]>([]);
  // Sincronizar escuela preseleccionada si no es visita libre
  useEffect(() => {
    if (!isLibre && institucionPreseleccionada) {
      setFormData(prev => ({ ...prev, institucionId: institucionPreseleccionada.id }));
    }
  }, [isLibre, institucionPreseleccionada, open]);
  useEffect(() => {
    if (huboVenta && ventasItem.length === 0) {
      setVentasItem([{ numContrato: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '' }]);
      setExpandedIndex(0);
      setFormData(prev => ({ ...prev, estadoGestion: 'Visitada' })); // Si hay venta, se marca como visitada
    }
  }, [huboVenta]);
  useEffect(() => {
    if (open) {
      // Cargamos todas las instituciones en memoria para el buscador ultrarrápido
      fetch('/api/instituciones').then(res => res.json()).then(data => setInstituciones(data));
      fetch('/api/catalogos').then(res => res.json()).then(data => {
        if (data.tiposCobro) setTiposCobro(data.tiposCobro);
        if (data.estadosCliente) setEstadosCliente(data.estadosCliente);
        if (data.estadosContrato) setEstadosContrato(data.estadosContrato);
      });
    } else {
      setCoordenadas({ lat: null, lng: null });
      setBusqueda('');
      setResultadosBusqueda([]);
      setHuboVenta(false);
      setVentasItem([]);
      setFormData({ institucionId: '', tipoGestion: 'Presencial', estadoGestion: 'Visitada', resumenAcuerdos: '', fechaProximoContacto: '' });
    }
  }, [open]);
  const handleBuscarEscuela = (texto: string) => {
    setBusqueda(texto);
    if (texto.length > 2) {
      const filtrados = instituciones
        .filter(i => i.nombre.toLowerCase().includes(texto.toLowerCase()) || i.canton?.toLowerCase().includes(texto.toLowerCase()))
        .slice(0, 10); // Solo mostramos los primeros 10 para no saturar la pantalla
      setResultadosBusqueda(filtrados);
      setDropdownBusquedaOpen(true);
    } else {
      setDropdownBusquedaOpen(false);
    }
  };
  const seleccionarEscuelaBuscada = (inst: any) => {
    setFormData({ ...formData, institucionId: inst.id });
    setBusqueda(`${inst.nombre} (${inst.canton})`);
    setDropdownBusquedaOpen(false);
  };
  const handleVentaChange = (index: number, field: string, value: string) => {
    const newVentas = [...ventasItem];
    newVentas[index][field] = value;
    if (['valorContrato', 'abono', 'meses'].includes(field)) {
      const valNum = parseFloat(newVentas[index].valorContrato) || 0;
      const abonoNum = parseFloat(newVentas[index].abono) || 0;
      const mesNum = parseInt(newVentas[index].meses) || 1;
      const restante = Math.max(0, valNum - abonoNum);
      newVentas[index].cuotaMensual = mesNum > 0 ? (restante / mesNum).toFixed(2) : '0';
    }
    setVentasItem(newVentas);
  };
  const addContrato = () => {
    setVentasItem([...ventasItem, { numContrato: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '' }]);
    setExpandedIndex(ventasItem.length);
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
      (err) => { showToast('alerta', "Activa tu GPS para mayor precisión."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institucionId) { showToast('alerta', "Selecciona una institución válida."); return; }
    // El GPS es requerido si es visita presencial (seguridad)
    if (formData.tipoGestion === 'Presencial' && !coordenadas.lat) { 
      showToast('alerta', "¡OBLIGATORIO! Captura tu ubicación GPS para visitas físicas."); return; 
    }
    if (huboVenta) {
      for (const v of ventasItem) {
        if (!v.numContrato || !v.valorContrato || !v.tipoCobroId) {
          showToast('alerta', "Revisa los contratos. N° Contrato, Monto y Tipo Cobro son obligatorios."); return;
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
          ventas: huboVenta ? ventasItem : []
        })
      });
      if (!res.ok) throw new Error('Error al registrar');
      setOpen(false);
      if (onSuccess) onSuccess();
      showToast('exito', huboVenta ? "¡Venta Cerrada y Guardada!" : "¡Gestión registrada, misión cumplida!");
    } catch (error) { 
      showToast('error', "Hubo un error al guardar la gestión."); 
    } finally { 
      setLoading(false); 
    }
  };
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Solo mostramos el Trigger si no lo estamos controlando desde afuera */}
        {isOpen === undefined && (
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold flex gap-2"><MapPin size={18} /> Registrar Visita</Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="text-primary" /> {isLibre ? 'Registrar Visita Libre' : 'Reporte de Gestión en Ruta'}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            {isLibre ? 'Busca cualquier escuela y registra tu avance.' : `Institución: ${institucionPreseleccionada?.nombre}`}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* SECCIÓN 1: BUSCADOR DE ESCUELA (SOLO SI ES LIBRE) */}
          {isLibre && (
            <div className="space-y-1 relative">
              <Label className="text-xs font-bold text-gray-700">Buscar Institución en Base de Datos *</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <Input 
                  placeholder="Ej. Simón Bolívar..." 
                  className="pl-9 h-10 text-sm bg-gray-50 focus:bg-white"
                  value={busqueda}
                  onChange={(e) => handleBuscarEscuela(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {/* Dropdown Predictivo */}
              {dropdownBusquedaOpen && resultadosBusqueda.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {resultadosBusqueda.map(inst => (
                    <li 
                      key={inst.id} 
                      className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0"
                      onClick={() => seleccionarEscuelaBuscada(inst)}
                    >
                      <p className="text-sm font-bold text-gray-800">{inst.nombre}</p>
                      <p className="text-[10px] text-gray-500">{inst.provincia} / {inst.canton}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {/* SECCIÓN 2: BOTÓN DE GPS */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex flex-col items-center justify-center gap-3">
            {!coordenadas.lat ? (
              <>
                <p className="text-xs text-center text-gray-600 font-medium">Requerimos tus coordenadas exactas para validar esta visita en el mapa.</p>
                <Button type="button" onClick={capturarGPS} disabled={gpsLoading} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-sm">
                  {gpsLoading ? 'Sincronizando satélites...' : '📍 Capturar mi Ubicación GPS'}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <CheckCircle size={32} className="mb-1 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-600">¡Ubicación Confirmada!</p>
                <p className="text-[10px] text-emerald-600/70 font-mono mt-1">Lat: {coordenadas.lat?.toFixed(6)} | Lng: {coordenadas.lng?.toFixed(6)}</p>
              </div>
            )}
          </div>
          {/* SECCIÓN 3: DATOS DE LA GESTIÓN (ESTADOS ALINEADOS AL EMBUDO) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Tipo de Gestión *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={formData.tipoGestion} onChange={e => setFormData({ ...formData, tipoGestion: e.target.value })}>
                <option value="Presencial">Presencial (Física)</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Reunión Virtual">Reunión Virtual</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Estado del Cliente *</Label>
              <select 
                className="w-full h-10 border rounded-md px-3 text-sm font-semibold bg-white" 
                value={formData.estadoGestion} 
                onChange={e => setFormData({ ...formData, estadoGestion: e.target.value })}
                disabled={huboVenta} // Si hay venta, el estado se bloquea en Visitada
              >
                <option value="Visitada" className="text-[#34c759]">✅ Visitada (Gestión Completada)</option>
                <option value="Seguimiento" className="text-[#ff9500]">⏳ Requiere Seguimiento</option>
                <option value="No interesado" className="text-[#ff3b30]">❌ No interesado (Cerrado)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">Resumen de Acuerdos / Novedades</Label>
            <textarea 
              className="w-full min-h-80px border border-gray-300 rounded-md p-3 text-sm focus:ring-primary focus:border-primary outline-none"
              placeholder="Ej: Se presentó el catálogo. La Rectora pidió que regresemos la próxima semana para firmar..."
              value={formData.resumenAcuerdos}
              onChange={e => setFormData({ ...formData, resumenAcuerdos: e.target.value })}
            />
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
            <Label className="text-xs font-bold text-amber-800 flex items-center gap-1"><Clock size={14}/> Agendar Próximo Contacto (Opcional)</Label>
            <Input type="date" className="h-9 text-xs mt-2 bg-white" value={formData.fechaProximoContacto} onChange={e => setFormData({ ...formData, fechaProximoContacto: e.target.value })} />
            <p className="text-[10px] text-amber-700/70 mt-1 leading-tight">Si colocas una fecha, la escuela seguirá en tu ruta pendiente ("Seguimiento").</p>
          </div>
          <div className="border-t border-gray-200 pt-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm">
              <input type="checkbox" checked={huboVenta} onChange={(e) => { setHuboVenta(e.target.checked); if (!e.target.checked) setVentasItem([]); }} className="w-5 h-5 text-emerald-600 rounded cursor-pointer accent-emerald-600" />
              <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wide">¿Se concretó una venta en esta visita?</span>
            </label>
            {huboVenta && (
              <div className="space-y-3 mt-3">
                {ventasItem.map((venta, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div key={index} className={`rounded-xl border transition-all ${isExpanded ? 'bg-emerald-50/40 border-emerald-400 shadow-md' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
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
                      {isExpanded && (
                        <div className="p-4 pt-1 space-y-3 border-t border-emerald-100 animate-in fade-in">
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">N° Contrato *</Label><Input type="text" value={venta.numContrato} onChange={(e) => handleVentaChange(index, 'numContrato', e.target.value.replace(/\D/g, ''))} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Monto Total *</Label><Input type="number" step="0.01" value={venta.valorContrato} onChange={(e) => handleVentaChange(index, 'valorContrato', e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold uppercase text-blue-700">Abono Inicial</Label><Input type="number" step="0.01" value={venta.abono} onChange={(e) => handleVentaChange(index, 'abono', e.target.value)} className="h-8 text-xs mt-1 bg-white border-blue-200 focus-visible:ring-blue-500" placeholder="0.00" /></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Meses Plazo</Label><Input type="number" min="1" value={venta.meses} onChange={(e) => handleVentaChange(index, 'meses', e.target.value)} className="h-8 text-xs mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500" /></div>
                            <div><Label className="text-[10px] font-bold uppercase text-emerald-700">Cuota Mensual</Label><Input disabled type="text" value={`$ ${venta.cuotaMensual}`} className="h-8 text-xs mt-1 bg-emerald-50 border-emerald-200 font-bold text-emerald-800" /></div>
                            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Mes Cobro</Label><select value={venta.mesCobro} onChange={(e) => handleVentaChange(index, 'mesCobro', e.target.value)} className="w-full h-8 border border-emerald-200 rounded-md px-1 text-[11px] bg-white mt-1 outline-none">{['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
                          </div>
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
                <Button type="button" variant="outline" onClick={addContrato} className="w-full border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50 bg-white text-xs h-9 font-bold">
                  <Plus size={14} className="mr-1" /> Agregar otro contrato
                </Button>
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading || (formData.tipoGestion === 'Presencial' && !coordenadas.lat)} className="w-full h-11 bg-primary hover:bg-primary/90 text-white text-base mt-2 shadow-md font-bold uppercase tracking-wider">
            <Save size={18} className="mr-2" /> {loading ? 'Enviando Reporte...' : 'Subir Reporte de Gestión'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
      {/* NOTIFICACIONES */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-10000 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-[#34c759] text-white' : toastMsg.tipo === 'alerta' ? 'bg-[#ff9500] text-white' : 'bg-[#ff3b30] text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}