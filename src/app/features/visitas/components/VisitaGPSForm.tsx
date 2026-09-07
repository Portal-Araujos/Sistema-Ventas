"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Navigation, Save, AlertCircle, Plus, Clock, Trash2, ChevronDown, ChevronUp, Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ContratoVentaForm from '@/components/shared/ContratoVentaForm';

interface Props {
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLibre?: boolean;
  institucionPreseleccionada?: { id: string; nombre: string; canton: string } | null;
}

export default function VisitaGPSForm({ onSuccess, isOpen, onOpenChange, isLibre = true, institucionPreseleccionada = null }: Props) {
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
  const [tiposGestion, setTiposGestion] = useState<any[]>([]);
  const [estadosComerciales, setEstadosComerciales] = useState<any[]>([]);
  const [tiposCliente, setTiposCliente] = useState<any[]>([]); // 🔥 INYECTAMOS EL NUEVO CATÁLOGO
  
  const [catalogoSKU, setCatalogoSKU] = useState<any[]>([]);
  const [draftPrenda, setDraftPrenda] = useState({ tipoRopa: '', color: '', genero: '', talla: '', cantidad: 1, bordado: '', observacion: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [dropdownBusquedaOpen, setDropdownBusquedaOpen] = useState(false);
  const [formData, setFormData] = useState({
    institucionId: '',
    tipoGestion: 'Presencial',
    estadoGestion: 'Visitada',
    resumenAcuerdos: '',
    fechaProximoContacto: '',
    horaProximoContacto: ''
  });
  const [huboVenta, setHuboVenta] = useState(false);
  const [esBorradorVenta, setEsBorradorVenta] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [ventasItem, setVentasItem] = useState<any[]>([]);

  useEffect(() => {
    if (!isLibre && institucionPreseleccionada) {
      setFormData(prev => ({ ...prev, institucionId: institucionPreseleccionada.id }));
    }
  }, [isLibre, institucionPreseleccionada, open]);

  useEffect(() => {
    if (huboVenta && ventasItem.length === 0) {
      setVentasItem([{ numContrato: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '', prendas: [] }]);
      setExpandedIndex(0);
    }
  }, [huboVenta]);

  useEffect(() => {
    if (open) {
      fetch('/api/instituciones').then(res => res.json()).then(data => setInstituciones(data.data || data));
      fetch('/api/catalogos').then(res => res.json()).then(data => {
        if (data.tiposCobro) setTiposCobro(data.tiposCobro);
        if (data.estadosCliente) setEstadosCliente(data.estadosCliente);
        if (data.estadosContrato) setEstadosContrato(data.estadosContrato);
        if (data.tiposGestion) setTiposGestion(data.tiposGestion); 
        if (data.estadosComerciales) setEstadosComerciales(data.estadosComerciales);
        if (data.tiposCliente) setTiposCliente(data.tiposCliente); // 🔥 GUARDAMOS EL CATÁLOGO
      });
      fetch('/api/pedidos/sku').then(res => res.json()).then(data => {
        if(data.success && data.raw) setCatalogoSKU(data.raw);
      }).catch(e => console.log('Sin modulo SKU aún'));
    } else {
      setCoordenadas({ lat: null, lng: null });
      setBusqueda('');
      setResultadosBusqueda([]);
      setHuboVenta(false);
      setEsBorradorVenta(false); // 🔥 NUEVO
      setVentasItem([]);
      setDraftPrenda({ tipoRopa: '', color: '', genero: '', talla: '', cantidad: 1, bordado: '', observacion: '' });
      setFormData({ institucionId: '', tipoGestion: 'Presencial', estadoGestion: 'Visitada', resumenAcuerdos: '', fechaProximoContacto: '', horaProximoContacto: '' }); // 🔥 NUEVO
    }
  }, [open]);

  const handleBuscarEscuela = async (termino: string) => {
    setBusqueda(termino);
    if (termino.trim().length < 2) {
      setResultadosBusqueda([]);
      setDropdownBusquedaOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/instituciones?search=${encodeURIComponent(termino)}&limit=20`);
      const json = await res.json();
      const lista = Array.isArray(json) ? json : (json.data || []);
      const formateados = lista.map((inst: any) => ({
        id: inst.id,
        nombre: inst.nombre,
        parroquia: inst.parroquia?.nombre || '',
        canton: inst.parroquia?.canton?.nombre || inst.canton || '',
        provincia: inst.parroquia?.canton?.provincia?.nombre || inst.provincia || ''
      }));
      setResultadosBusqueda(formateados);
      setDropdownBusquedaOpen(true);
    } catch (error) { console.error("Error buscando escuela:", error); }
  };

  const seleccionarEscuelaBuscada = (inst: any) => {
    setFormData({ ...formData, institucionId: inst.id });
    setBusqueda(`${inst.nombre} (${inst.canton})`);
    setDropdownBusquedaOpen(false);
  };

  const handleVentaChange = (index: number, field: string, value: string) => {
    setVentasItem(prev => {
      const newVentas = [...prev];
      newVentas[index] = { ...newVentas[index], [field]: value };
      if (['valorContrato', 'abono', 'meses'].includes(field)) {
        const valNum = parseFloat(newVentas[index].valorContrato) || 0;
        const abonoNum = parseFloat(newVentas[index].abono) || 0;
        const mesNum = parseInt(newVentas[index].meses) || 1;
        const restante = Math.max(0, valNum - abonoNum);
        newVentas[index].cuotaMensual = mesNum > 0 ? (restante / mesNum).toFixed(2) : '0';
      }
      return newVentas;
    });
  };

  const addContrato = () => {
    setVentasItem(prev => [
      ...prev, 
      { numContrato: '', nombreCliente: '', valorContrato: '', abono: '', meses: '12', mesCobro: 'Enero', cuotaMensual: '', tipoCobroId: '', estadoClienteId: '', estadoContratoId: '', prendas: [] }
    ]);
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

  const tiposRopaDisp = [...Array.from(new Set(catalogoSKU.map(s => s.tipoRopa)))];
  const coloresDisp = [...Array.from(new Set(catalogoSKU.filter(s => s.tipoRopa === draftPrenda.tipoRopa).map(s => s.color)))];
  const generosDisp = [...Array.from(new Set(catalogoSKU.filter(s => s.tipoRopa === draftPrenda.tipoRopa && s.color === draftPrenda.color).map(s => s.genero)))];
  const tallasDisp = [...Array.from(new Set(catalogoSKU.filter(s => s.tipoRopa === draftPrenda.tipoRopa && s.color === draftPrenda.color && s.genero === draftPrenda.genero).map(s => s.talla)))];
  
  const handleDraftChange = (field: string, value: string) => {
    setDraftPrenda(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'tipoRopa') { next.color = ''; next.genero = ''; next.talla = ''; }
      if (field === 'color') { next.genero = ''; next.talla = ''; }
      if (field === 'genero') { next.talla = ''; }
      return next;
    });
  };

  const handleAddPrenda = (vIndex: number) => {
    if (!draftPrenda.tipoRopa || !draftPrenda.color || !draftPrenda.genero || !draftPrenda.talla || draftPrenda.cantidad < 1) {
      showToast('alerta', 'Por favor completa todos los campos de la prenda (Tipo, Color, Género y Talla).'); return;
    }
    const skuObj = catalogoSKU.find(s => s.tipoRopa === draftPrenda.tipoRopa && s.color === draftPrenda.color && s.genero === draftPrenda.genero && s.talla === draftPrenda.talla);
    const skuCodigo = skuObj ? skuObj.codigo : 'S/COD'; 
    const newVentas = [...ventasItem];
    if (!newVentas[vIndex].prendas) newVentas[vIndex].prendas = [];
    newVentas[vIndex].prendas.push({ ...draftPrenda, skuCodigo });
    setVentasItem(newVentas);
    setDraftPrenda({ ...draftPrenda, talla: '', cantidad: 1, bordado: '', observacion: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institucionId) { showToast('alerta', "Selecciona una institución válida."); return; }
    if (formData.tipoGestion === 'Presencial' && !coordenadas.lat) { showToast('alerta', "¡OBLIGATORIO! Captura tu ubicación GPS para visitas físicas."); return; }
    
    if (huboVenta && !esBorradorVenta) {
      for (const v of ventasItem) {
        if (!v.numContrato || !v.valorContrato || !v.tipoCobroId) {
          showToast('alerta', "Revisa los contratos. N° Contrato, Monto y Tipo Cobro son obligatorios."); return;
        }
        const estadoNombre = estadosCliente.find(e => e.id.toString() === v.estadoClienteId)?.nombre?.toLowerCase() || '';
        const isPedido = estadoNombre.includes('pedido');
        if (isPedido && (!v.prendas || v.prendas.length === 0)) {
          showToast('error', `El contrato #${v.numContrato} está marcado como "Pedido" pero no tiene prendas en el carrito.`); return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, latitud: coordenadas.lat, longitud: coordenadas.lng, huboVenta, esBorradorVenta, ventas: huboVenta ? ventasItem : []
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showToast('error', data.error || 'Error al registrar la gestión.');
        setLoading(false);
        return; 
      }
      
      setOpen(false);
      setLoading(false); // 🔥 CORREGIDO EL BUG DEL BOTÓN TRABADO 🔥
      if (onSuccess) onSuccess();
      showToast('exito', huboVenta ? "¡Venta y/o Pedido guardado exitosamente!" : "¡Gestión registrada, misión cumplida!");
    } catch (error) { 
      showToast('error', "Hubo un error de conexión al guardar la gestión."); 
      setLoading(false);
    } 
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {isOpen === undefined && (
          <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold flex gap-2"><MapPin size={18} /> Registrar Visita</Button></DialogTrigger>
        )}
        <DialogContent className="sm:max-w-2xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="text-primary" /> {isLibre ? 'Registrar Visita Libre' : 'Reporte de Gestión en Ruta'}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">{isLibre ? 'Busca cualquier escuela y registra tu avance.' : `Institución: ${institucionPreseleccionada?.nombre}`}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {isLibre && (
            <div className="space-y-1 relative">
              <Label className="text-xs font-bold text-gray-700">Buscar Institución en Base de Datos *</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <Input placeholder="Ej. Simón Bolívar..." className="pl-9 h-10 text-sm bg-gray-50 focus:bg-white" value={busqueda} onChange={(e) => handleBuscarEscuela(e.target.value)} autoComplete="off" />
              </div>
              {dropdownBusquedaOpen && resultadosBusqueda.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {resultadosBusqueda.map(inst => (
                    <li key={inst.id} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0" onClick={() => seleccionarEscuelaBuscada(inst)}>
                      <p className="text-sm font-bold text-gray-800">{inst.nombre}</p>
                      <p className="text-[10px] text-gray-500">{inst.provincia} / {inst.canton}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary">Tipo de Gestión (Acción) *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm bg-white" value={formData.tipoGestion} onChange={e => setFormData({ ...formData, tipoGestion: e.target.value })}>
                <option value="">Seleccione...</option>
                {tiposGestion.filter(t => t.activo).map(t => (<option key={t.id} value={t.nombre}>{t.nombre}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary">Resultado de la Visita *</Label>
              <select className="w-full h-10 border rounded-md px-3 text-sm font-semibold bg-white" value={formData.estadoGestion} onChange={e => setFormData({ ...formData, estadoGestion: e.target.value })}>
                <option value="">Seleccione resultado...</option>
                {estadosComerciales.filter(e => e.activo).map(e => (<option key={e.id} value={e.nombre}>{e.nombre}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">Resumen de Acuerdos / Novedades</Label>
            <textarea className="w-full min-h-80px border border-gray-300 rounded-md p-3 text-sm focus:ring-primary focus:border-primary outline-none" placeholder="Ej: Se presentó el catálogo..." value={formData.resumenAcuerdos} onChange={e => setFormData({ ...formData, resumenAcuerdos: e.target.value })} />
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
            <Label className="text-xs font-bold text-amber-800 flex items-center gap-1"><Clock size={14}/> Agendar Próximo Contacto (Opcional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input type="date" className="h-9 text-xs bg-white" value={formData.fechaProximoContacto} onChange={e => setFormData({ ...formData, fechaProximoContacto: e.target.value })} />
              <Input type="time" className="h-9 text-xs bg-white" value={formData.horaProximoContacto} onChange={e => setFormData({ ...formData, horaProximoContacto: e.target.value })} />
            </div>
            <p className="text-[10px] text-amber-700/70 mt-1 leading-tight">Si colocas una fecha y hora, la escuela seguirá en tu ruta pendiente ("Seguimiento").</p>
          </div>
          <div className="border-t border-gray-200 pt-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm">
              <input type="checkbox" checked={huboVenta} onChange={(e) => { setHuboVenta(e.target.checked); if (!e.target.checked) setVentasItem([]); }} className="w-5 h-5 text-emerald-600 rounded cursor-pointer accent-emerald-600" />
              <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wide">¿Se concretó una venta en esta visita?</span>
            </label>
            {huboVenta && (
              <div className="space-y-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-3 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                  <input type="checkbox" checked={esBorradorVenta} onChange={(e) => setEsBorradorVenta(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600" />
                  <span className="text-xs font-bold text-blue-800"> Marcar como Borrador(Llenar detalles luego)</span>
                </label>
                {!esBorradorVenta && (
                  <div className="space-y-4">
                    {ventasItem.map((venta, index) => {
                      const isExpanded = expandedIndex === index;
                      const estadoNombre = estadosCliente.find(e => e.id.toString() === venta.estadoClienteId)?.nombre?.toLowerCase() || '';
                      const isPedido = estadoNombre.includes('pedido');
                      return (
                        <div key={index} className={`rounded-xl border transition-all overflow-hidden ${isExpanded ? 'bg-emerald-50/40 border-emerald-400 shadow-md' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
                          <div className="p-3 flex justify-between items-center cursor-pointer bg-white" onClick={() => setExpandedIndex(isExpanded ? -1 : index)}>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${isExpanded ? 'text-emerald-800' : 'text-gray-700'}`}> Contrato {venta.numContrato ? `#${venta.numContrato}` : (index + 1)}</span>
                              {venta.valorContrato && <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">${parseFloat(venta.valorContrato).toFixed(2)}</span>}
                              {isPedido && <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1"><ShoppingCart size={10}/> Pedido: {(venta.prendas || []).length} pz</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              {ventasItem.length > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); removeContrato(index); }} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>}
                              {isExpanded ? <ChevronUp size={16} className="text-emerald-600"/> : <ChevronDown size={16} className="text-gray-400"/>}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="p-4 pt-4 border-t border-emerald-100 bg-emerald-50/10">
                              <ContratoVentaForm 
                                data={venta} 
                                catalogos={{ tiposCobro, estadosCliente, estadosContrato, tiposCliente }}
                                onChange={(newData) => {
                                  const nuevasVentas = [...ventasItem];
                                  nuevasVentas[index] = newData;
                                  setVentasItem(nuevasVentas);
                                }}
                              />
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
            )}
          </div>
          
          <Button type="submit" disabled={loading || (formData.tipoGestion === 'Presencial' && !coordenadas.lat)} className="w-full h-11 bg-primary hover:bg-primary/90 text-white text-base mt-2 shadow-md font-bold uppercase tracking-wider">
            <Save size={18} className="mr-2" /> {loading ? 'Enviando Reporte...' : 'Subir Reporte de Gestión'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-10000 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-[#34c759] text-white' : toastMsg.tipo === 'alerta' ? 'bg-[#ff9500] text-white' : 'bg-[#ff3b30] text-white'}`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-wide">{toastMsg.texto}</span>
        </div>
      )}
    </>
  );
}