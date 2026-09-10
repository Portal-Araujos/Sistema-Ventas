"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Edit, AlertCircle, CheckCircle2, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ContratoVentaFormProps {
  data: any; 
  onChange: (newData: any) => void; 
  catalogos?: any;
  mostrarPrendas?: boolean; 
  isNuevo?: boolean;
  mostrarAdmin?: boolean;
  onToggleAdmin?: () => void;
  bloquearEstadoEntrega?: boolean;
}
export default function ContratoVentaForm({ 
  data, onChange, catalogos, mostrarPrendas = true, isNuevo, mostrarAdmin, onToggleAdmin , bloquearEstadoEntrega = false
}: ContratoVentaFormProps) {
  
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDataChange = (campo: string, valor: any) => {
    const newData = { ...data, [campo]: valor };
    
    if (['valorContrato', 'abono', 'meses'].includes(campo)) {
      const v = parseFloat(newData.valorContrato) || 0;
      const a = parseFloat(newData.abono) || 0;
      const m = parseInt(newData.meses) || 12;
      newData.cuotaMensual = m > 0 ? ((v - a) / m).toFixed(2) : "0.00";
    }

    if (campo === 'estadoClienteId') {
      const estadoSel = catalogos?.estadosCliente?.find((e: any) => e.id.toString() === valor?.toString());
      const nombreEst = estadoSel?.nombre?.toLowerCase() || '';
      
      if (nombreEst.includes('entregado') && newData.prendas) {
        newData.prendas = newData.prendas.map((p: any) => ({ ...p, entregadoHoy: true }));
      }
    }

    onChange(newData);
  };
  const estadoSeleccionado = catalogos?.estadosCliente?.find((e: any) => e.id.toString() === data.estadoClienteId?.toString());
  const estadoNombre = estadoSeleccionado?.nombre?.toLowerCase() || '';
  const hasEstadoSeleccionado = estadoNombre.trim() !== '';
  const isPedidoElectro = hasEstadoSeleccionado && estadoNombre.includes('electro');
  const isPedidoTextil  = hasEstadoSeleccionado && estadoNombre.includes('textil'); 
  const isEntregado     = hasEstadoSeleccionado && estadoNombre.includes('entregado');
  const requierePedido  = isPedidoElectro || isPedidoTextil || isEntregado;
  const [allSkus, setAllSkus] = useState<any[]>([]);
  const [draftPrenda, setDraftPrenda] = useState({ 
    skuCodigo: '', tipoRopa: '', color: '', genero: '', talla: '', cantidad: 1, bordado: '', observacion: '', entregadoHoy: isEntregado 
  });
  
  const [draftElectro, setDraftElectro] = useState({
    codigo: '', familia: '', marcaModelo: '', descripcion: '', garantia: '', cantidad: 1, entregadoHoy: isEntregado
  });
  
  const [busquedaPrenda, setBusquedaPrenda] = useState('');
  const [mostrarDropdownPrenda, setMostrarDropdownPrenda] = useState(false);

  useEffect(() => {
    const fetchSkus = async () => {
      try {
        const res = await fetch('/api/pedidos/sku');
        const json = await res.json();
        const lista = json.raw || json.data || json || [];
        setAllSkus(Array.isArray(lista) ? lista : []);
      } catch (e) {
        console.error("Error cargando SKUs", e);
      }
    };
    fetchSkus();
  }, []);

  useEffect(() => {
    setDraftPrenda(prev => ({ ...prev, entregadoHoy: isEntregado }));
    setDraftElectro(prev => ({ ...prev, entregadoHoy: isEntregado }));
  }, [isEntregado]);

  const tiposRopaDisp = Array.from(new Set(allSkus.map(s => s.tipoRopa))).filter(Boolean).sort();
  const coloresDisp = Array.from(new Set(allSkus.filter(s => s.tipoRopa === draftPrenda.tipoRopa).map(s => s.color))).filter(Boolean).sort();
  const generosDisp = Array.from(new Set(allSkus.filter(s => s.tipoRopa === draftPrenda.tipoRopa && s.color === draftPrenda.color).map(s => s.genero))).filter(Boolean).sort();
  const tallasDisp = Array.from(new Set(allSkus.filter(s => s.tipoRopa === draftPrenda.tipoRopa && s.color === draftPrenda.color && s.genero === draftPrenda.genero).map(s => s.talla))).filter(Boolean).sort();
  const tiposRopaFiltrados = tiposRopaDisp.filter((t: any) => t.toLowerCase().includes(busquedaPrenda.toLowerCase()));

  const seleccionarTipoRopa = (tipo: string) => {
    setBusquedaPrenda(tipo); 
    setMostrarDropdownPrenda(false); 
    setDraftPrenda({ ...draftPrenda, tipoRopa: tipo, color: '', genero: '', talla: '', skuCodigo: '' });
  };

  const handleDraftChange = (field: string, value: string) => {
    let newDraft = { ...draftPrenda, [field]: value };
    
    if (field === 'color') {
      newDraft = { ...newDraft, genero: '', talla: '', skuCodigo: '' };
    } else if (field === 'genero') {
      newDraft = { ...newDraft, talla: '', skuCodigo: '' };
    } else if (field === 'talla') {
      const matchedSku = allSkus.find(s => 
        s.tipoRopa === newDraft.tipoRopa && s.color === newDraft.color && s.genero === newDraft.genero && s.talla === value
      );
      newDraft.skuCodigo = matchedSku?.codigo || '';
    }
    setDraftPrenda(newDraft);
  };

  const handleAgregarPrenda = () => {
    if (!draftPrenda.tipoRopa || !draftPrenda.color || !draftPrenda.genero || !draftPrenda.talla) { 
      showToast('error', 'Debes seleccionar Prenda, Color, Género y Talla.'); return; 
    }
    if (draftPrenda.cantidad <= 0) { showToast('error', 'La cantidad debe ser mayor a 0.'); return; }
    
    const prendasActuales = data.prendas || data.detalles || [];
    const yaExiste = prendasActuales.some((p: any) => 
      p.tipoRopa === draftPrenda.tipoRopa && 
      p.talla === draftPrenda.talla && 
      p.color === draftPrenda.color && 
      p.genero === draftPrenda.genero &&
      (p.bordado || '') === (draftPrenda.bordado || '') &&
      (p.observacion || '') === (draftPrenda.observacion || '') &&
      !!p.entregadoHoy === !!draftPrenda.entregadoHoy
    );

    if (yaExiste) { showToast('error', '¡Atención! Esta prenda ya está en la lista.'); return; }

    const nuevaLista = [...prendasActuales, { ...draftPrenda, skuCodigo: draftPrenda.skuCodigo || 'S/N' }];
    onChange({ ...data, prendas: nuevaLista, detalles: nuevaLista });
    
    setDraftPrenda({ skuCodigo: '', tipoRopa: '', color: '', genero: '', talla: '', cantidad: 1, bordado: '', observacion: '', entregadoHoy: isEntregado });
    setBusquedaPrenda(''); 
    showToast('exito', 'Prenda agregada al carrito.');
  };

  const handleAgregarElectro = () => {
    if (!draftElectro.codigo || !draftElectro.familia || !draftElectro.marcaModelo || !draftElectro.descripcion) {
      showToast('error', 'Completa Código, Familia, Marca/Modelo y Descripción.'); return;
    }
    if (draftElectro.cantidad <= 0) { showToast('error', 'Cantidad inválida.'); return; }
    
    const nuevoItem = {
      skuCodigo: draftElectro.codigo,
      tipoRopa: draftElectro.familia, 
      color: draftElectro.marcaModelo, 
      genero: draftElectro.garantia || 'S/G', 
      talla: 'N/A', 
      cantidad: draftElectro.cantidad,
      bordado: 'ELECTRO', 
      observacion: draftElectro.descripcion,
      entregadoHoy: draftElectro.entregadoHoy
    };

    const prendasActuales = data.prendas || data.detalles || [];
    onChange({ ...data, prendas: [...prendasActuales, nuevoItem], detalles: [...prendasActuales, nuevoItem] });
    
    setDraftElectro({ codigo: '', familia: '', marcaModelo: '', descripcion: '', garantia: '', cantidad: 1, entregadoHoy: isEntregado });
    showToast('exito', 'Equipo agregado al pedido.');
  };

  const eliminarPrenda = (index: number) => {
    const nuevaLista = [...(data.prendas || data.detalles || [])];
    nuevaLista.splice(index, 1);
    onChange({ ...data, prendas: nuevaLista, detalles: nuevaLista });
  };

  const prendasArray = data.prendas || data.detalles || [];

  return (
    <div className="space-y-4 relative">
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
        
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <Label className="text-xs font-black text-gray-700 uppercase flex items-center gap-1">
            <Edit size={14} className="text-primary"/> 
            {isNuevo ? 'Creando Nuevo Contrato' : `Contrato #${data.numContrato || 'S/N'}`}
          </Label>
          {onToggleAdmin && !isNuevo && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-gray-300 hover:bg-gray-100" onClick={onToggleAdmin}>
              {mostrarAdmin ? 'Ocultar Datos Administrativos' : 'Editar Datos Administrativos'}
            </Button>
          )}
        </div>
        {(mostrarAdmin ?? true) && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1 border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="tieneCedula"
                  checked={!!data.tieneCedula} 
                  onChange={e => {
                    const isChecked = e.target.checked;
                    onChange({
                      ...data,
                      tieneCedula: isChecked,
                      numeroCedula: isChecked ? data.numeroCedula : ''
                    });
                  }} 
                  className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer" 
                />
                <Label htmlFor="tieneCedula" className="text-[11px] font-bold text-gray-700 uppercase cursor-pointer">
                  ¿Contrato incluye Cédula?
                </Label>
              </div>
              
              {!!data.tieneCedula && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase">N° Cédula / RUC *</Label>
                  <Input 
                    type="text" 
                    required 
                    value={data.numeroCedula || ''} 
                    onChange={e => handleDataChange('numeroCedula', e.target.value.replace(/\D/g, ''))} 
                    className="h-8 w-36 text-xs font-bold border-blue-300 focus-visible:ring-blue-500" 
                    placeholder="Ej: 1712345678" 
                    maxLength={13}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] font-bold text-gray-700 uppercase">N° Contrato *</Label>
                <Input type="text" value={data.numContrato || ''} onChange={e => handleDataChange('numContrato', e.target.value.replace(/\D/g, ''))} className="h-8 text-xs font-bold bg-white" placeholder="Ej: 12345" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-gray-700 uppercase">Nombre Cliente</Label>
                <Input type="text" value={data.nombreCliente || ''} onChange={e => handleDataChange('nombreCliente', e.target.value)} className="h-8 text-xs font-medium bg-white" placeholder="Ej: Pepito Pérez" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-gray-700 uppercase">Tipo de Cliente</Label>
                <select 
                  value={data.tipoClienteId || ''} 
                  onChange={e => handleDataChange('tipoClienteId', e.target.value)} 
                  className="w-full h-8 border border-gray-300 rounded-md px-1 text-[10px] bg-white outline-none font-medium mt-0.5"
                >
                  <option value="">Seleccione...</option>
                  {(catalogos?.tiposCliente || catalogos?.tipoCliente || [])
                    .filter((t: any) => t.activo !== false && t.estado !== 'Inactivo')
                    .map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-100">
              <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Valor Total *</Label><Input type="number" step="0.01" value={data.valorContrato || ''} onChange={e => handleDataChange('valorContrato', e.target.value)} className="h-8 text-xs font-bold bg-white" placeholder="0.00"/></div>
              <div><Label className="text-[10px] font-bold text-blue-700 uppercase">Abono Inicial</Label><Input type="number" step="0.01" value={data.abono || ''} onChange={e => handleDataChange('abono', e.target.value)} className="h-8 text-xs font-bold bg-white border-blue-200" placeholder="0.00"/></div>
              <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Meses Plazo</Label><Input type="number" min="1" value={data.meses || '12'} onChange={e => handleDataChange('meses', e.target.value)} className="h-8 text-xs font-bold bg-white" /></div>
              <div><Label className="text-[10px] font-bold text-emerald-700 uppercase">Cuota Mensual</Label><Input disabled type="text" value={`$ ${data.cuotaMensual || '0.00'}`} className="h-8 text-xs font-black bg-emerald-50 text-emerald-800 border-emerald-200" /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-200 pt-3">
              <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Mes Inicio Cobro</Label><select value={data.mesCobro || 'Enero'} onChange={e => handleDataChange('mesCobro', e.target.value)} className="w-full h-8 border border-gray-300 rounded-md px-1 text-[11px] bg-white outline-none font-medium"><option value="Enero">Enero</option><option value="Febrero">Febrero</option><option value="Marzo">Marzo</option><option value="Abril">Abril</option><option value="Mayo">Mayo</option><option value="Junio">Junio</option><option value="Julio">Julio</option><option value="Agosto">Agosto</option><option value="Septiembre">Septiembre</option><option value="Octubre">Octubre</option><option value="Noviembre">Noviembre</option><option value="Diciembre">Diciembre</option></select></div>
              <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Tipo Cobro *</Label><select value={data.tipoCobroId || ''} onChange={e => handleDataChange('tipoCobroId', e.target.value)} className="w-full h-8 border border-gray-300 rounded-md px-1 text-[10px] bg-white outline-none font-medium"><option value="">Seleccione...</option>{catalogos?.tiposCobro?.filter((t:any) => t.activo !== false && t.estado !== 'Inactivo').map((t:any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              
              <div>
                <Label className={`text-[10px] font-black uppercase ${bloquearEstadoEntrega ? 'text-gray-400' : 'text-emerald-800'}`}>Est. Entrega Venta</Label>
                <select 
                  disabled={bloquearEstadoEntrega}
                  value={data.estadoClienteId || ''} 
                  onChange={e => handleDataChange('estadoClienteId', e.target.value)} 
                  className={`w-full h-8 border rounded-md px-1 text-[10px] font-bold outline-none ${bloquearEstadoEntrega ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-emerald-400 bg-emerald-50 text-emerald-900'}`}
                >
                  <option value="">Seleccione...</option>
                  {catalogos?.estadosCliente?.filter((t:any) => t.activo !== false && t.estado !== 'Inactivo').map((t:any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>

              <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Est. Contrato</Label><select value={data.estadoContratoId || ''} onChange={e => handleDataChange('estadoContratoId', e.target.value)} className="w-full h-8 border border-gray-300 rounded-md px-1 text-[10px] bg-white outline-none font-medium"><option value="">Seleccione...</option>{catalogos?.estadosContrato?.filter((t:any) => t.activo !== false && t.estado !== 'Inactivo').map((t:any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
            </div>
            
            <div><Label className="text-[10px] font-bold text-gray-700 uppercase">Observación del Contrato</Label><Input type="text" value={data.observacion || ''} onChange={e => handleDataChange('observacion', e.target.value)} className="h-8 text-xs bg-white" placeholder="Opcional..." /></div>
          </div>
        )}
      </div>
      {mostrarPrendas && isPedidoTextil && (
        <div className="border border-blue-200 pt-3 bg-blue-50/40 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 mt-3">
          <h4 className="text-sm font-black text-blue-900 flex items-center gap-2 mb-3"><ShoppingCart size={16}/> Armar Pedido Textil</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-blue-100 mb-3 shadow-sm">
            <div className="col-span-2 relative">
              <Label className="text-[10px] font-bold uppercase text-gray-600">1. Tipo Prenda (Buscar) *</Label>
              <Input 
                className="w-full h-8 border border-gray-300 rounded px-2 text-[11px] bg-white mt-1 outline-none font-bold" 
                placeholder="Ej: Calentador, Polo, Chompa..."
                value={busquedaPrenda}
                onChange={(e) => {
                  setBusquedaPrenda(e.target.value); setMostrarDropdownPrenda(true);
                  if (e.target.value === '') setDraftPrenda({ ...draftPrenda, tipoRopa: '', color: '', genero: '', talla: '', skuCodigo: '' });
                }}
                onFocus={() => setMostrarDropdownPrenda(true)}
                onBlur={() => setTimeout(() => setMostrarDropdownPrenda(false), 200)}
              />
              {mostrarDropdownPrenda && tiposRopaFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-blue-300 rounded-lg shadow-2xl max-h-48 overflow-y-auto mt-1 divide-y divide-gray-100">
                  {tiposRopaFiltrados.map((tipo: string) => (
                    <div key={tipo} className="p-2.5 text-[11px] uppercase hover:bg-blue-50 cursor-pointer font-bold text-gray-700 transition-colors" onMouseDown={(e) => { e.preventDefault(); seleccionarTipoRopa(tipo); }}>{tipo}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">2. Color *</Label>
              <select disabled={!draftPrenda.tipoRopa} className="w-full h-8 border border-gray-300 rounded px-1 text-[10px] bg-white mt-1 disabled:bg-gray-100 disabled:opacity-50 outline-none uppercase font-bold" value={draftPrenda.color} onChange={e => handleDraftChange('color', e.target.value)}>
                <option value="">Color...</option>{coloresDisp.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">3. Género *</Label>
              <select disabled={!draftPrenda.color} className="w-full h-8 border border-gray-300 rounded px-1 text-[10px] bg-white mt-1 disabled:bg-gray-100 disabled:opacity-50 outline-none uppercase font-bold" value={draftPrenda.genero} onChange={e => handleDraftChange('genero', e.target.value)}>
                <option value="">Género...</option>{generosDisp.map((g: any) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">4. Talla *</Label>
              <select disabled={!draftPrenda.genero} className="w-full h-8 border border-blue-400 rounded px-1 text-[11px] bg-blue-50 text-blue-900 mt-1 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 outline-none uppercase font-black" value={draftPrenda.talla} onChange={e => handleDraftChange('talla', e.target.value)}>
                <option value="">Talla...</option>{tallasDisp.map((t: any) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">5. Cantidad *</Label>
              <div className="flex gap-1 items-center mt-1">
                <Input type="number" min="1" value={draftPrenda.cantidad} onChange={e => setDraftPrenda({...draftPrenda, cantidad: parseInt(e.target.value) || 1})} className="h-8 text-xs font-bold text-center border-blue-300 w-full" />
                <Button type="button" onClick={handleAgregarPrenda} title="Agregar al carrito" className="h-8 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold p-0 shadow-sm rounded flex items-center justify-center"><Plus size={16}/></Button>
              </div>
            </div>

            <div className="col-span-2"><Input type="text" placeholder="Bordado adicional (Opcional)..." value={draftPrenda.bordado} onChange={e => setDraftPrenda({...draftPrenda, bordado: e.target.value})} className="h-8 text-[10px] mt-2 bg-gray-50 border-gray-200" /></div>
            <div className="col-span-2"><Input type="text" placeholder="Observaciones de esta prenda (Opcional)..." value={draftPrenda.observacion} onChange={e => setDraftPrenda({...draftPrenda, observacion: e.target.value})} className="h-8 text-[10px] mt-2 bg-gray-50 border-gray-200" /></div>
          </div>
        </div>
      )}
      {mostrarPrendas && isPedidoElectro && (
        <div className="border border-purple-200 pt-3 bg-purple-50/40 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 mt-3">
          <h4 className="text-sm font-black text-purple-900 flex items-center gap-2 mb-3"><Monitor size={16}/> Armar Pedido (Tecnología / Equipos)</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-purple-100 mb-3 shadow-sm">
            <div>
              <Label className="text-[10px] font-bold uppercase text-gray-600">Código / SKU *</Label>
              <Input className="h-8 text-[11px] mt-1 uppercase" placeholder="Ej: EPS-118" value={draftElectro.codigo} onChange={e => setDraftElectro({...draftElectro, codigo: e.target.value})} />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-gray-600">Familia / Categoría *</Label>
              <select className="w-full h-8 border border-gray-300 rounded px-1 text-[10px] bg-white mt-1 uppercase font-bold" value={draftElectro.familia} onChange={e => setDraftElectro({...draftElectro, familia: e.target.value})}>
                <option value="">Seleccione...</option>
                <option value="Audiovisual">Audiovisual</option>
                <option value="Cómputo">Cómputo</option>
                <option value="Laboratorio">Laboratorio</option>
                <option value="Mobiliario">Mobiliario</option>
                <option value="Pizarras">Pizarras</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-gray-600">Marca / Modelo *</Label>
              <Input className="h-8 text-[11px] mt-1 uppercase" placeholder="Ej: Epson PowerLite" value={draftElectro.marcaModelo} onChange={e => setDraftElectro({...draftElectro, marcaModelo: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">Garantía</Label>
              <Input className="h-8 text-[11px] mt-1" placeholder="Ej: 12 Meses" value={draftElectro.garantia} onChange={e => setDraftElectro({...draftElectro, garantia: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-gray-600">Cantidad *</Label>
              <div className="flex gap-1 items-center mt-1">
                <Input type="number" min="1" value={draftElectro.cantidad} onChange={e => setDraftElectro({...draftElectro, cantidad: parseInt(e.target.value) || 1})} className="h-8 text-xs font-bold text-center border-purple-300 w-full" />
                <Button type="button" onClick={handleAgregarElectro} className="h-8 w-10 shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold p-0 shadow-sm rounded flex items-center justify-center"><Plus size={16}/></Button>
              </div>
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label className="text-[10px] font-bold uppercase text-gray-600">Descripción Larga del Equipo *</Label>
              <Input type="text" placeholder="Ej: Proyector interactivo de 3000 lúmenes..." value={draftElectro.descripcion} onChange={e => setDraftElectro({...draftElectro, descripcion: e.target.value})} className="h-8 text-[11px] mt-1 bg-gray-50 border-gray-200" />
            </div>
          </div>
        </div>
      )}
      {mostrarPrendas && isEntregado && (
        <div className="p-4 bg-emerald-50 border border-dashed border-emerald-300 rounded-lg text-center flex flex-col items-center justify-center mt-3 animate-in zoom-in-95">
          <CheckCircle2 size={32} className="text-emerald-500 mb-2"/>
          <p className="text-sm font-black text-emerald-800 uppercase">Mercadería Entregada Directamente</p>
          <p className="text-xs text-emerald-600 mt-1">Ingresa a continuación las prendas que sacaste del inventario móvil.</p>
        </div>
      )}
      {mostrarPrendas && requierePedido && (
        <>
          {prendasArray.length > 0 ? (
            <div className="bg-white rounded border border-gray-200 overflow-x-auto shadow-sm mt-3">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b text-[10px] text-gray-500 uppercase">
                  <tr>
                    <th className="p-2 font-bold">Ítem / Artículo</th>
                    <th className="p-2 font-bold text-center">Cant.</th>
                    <th className="p-2 font-bold text-center w-24">Entregado Hoy</th> 
                    <th className="p-2 font-bold">Detalles Adicionales</th>
                    <th className="p-2 font-bold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prendasArray.map((p: any, pIndex: number) => {
                    const isElectro = p.bordado === 'ELECTRO'; 
                    return (
                      <tr key={pIndex} className={p.entregadoHoy ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-gray-50'}>
                        <td className="p-2 text-[10px]">
                          <div className={`font-bold leading-tight uppercase ${isElectro ? 'text-purple-900' : 'text-blue-900'}`}>{p.tipoRopa} - {p.color}</div>
                          <div className="text-gray-500 uppercase">{isElectro ? `Garantía: ${p.genero}` : `${p.genero} • Talla: ${p.talla}`}</div>
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">{isElectro ? 'CÓD' : 'SKU'}: {p.skuCodigo || 'S/N'}</div>
                        </td>
                        <td className="p-2 text-center align-middle">
                          <Input type="number" min="1" className="h-6 w-12 text-center text-xs font-bold mx-auto border-gray-300 bg-white" value={p.cantidad} onChange={(e) => {
                            const newLista = [...prendasArray];
                            newLista[pIndex].cantidad = parseInt(e.target.value) || 1;
                            onChange({ ...data, prendas: newLista, detalles: newLista });
                          }} />
                        </td>
                        
                        <td className="p-2 text-center align-middle">
                          <div className="flex justify-center items-center">
                            <input 
                              type="checkbox"
                              checked={p.entregadoHoy || false}
                              onChange={(e) => {
                                const newLista = [...prendasArray];
                                newLista[pIndex].entregadoHoy = e.target.checked;
                                onChange({ ...data, prendas: newLista, detalles: newLista });
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 cursor-pointer"
                            />
                          </div>
                        </td>

                        <td className="p-2 text-[9px] text-gray-600">
                          {p.observacion && <div><span className="font-bold">{isElectro ? 'Desc:' : 'Obs:'}</span> {p.observacion}</div>}
                          {!isElectro && p.bordado && <div><span className="font-bold">Bordado:</span> {p.bordado}</div>}
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => eliminarPrenda(pIndex)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 border-t-2 border-gray-200">
                    <td className="p-2 text-[10px] font-black text-right uppercase text-gray-800">Total Unidades:</td>
                    <td className="p-2 text-center font-black text-gray-900 text-sm">{prendasArray.reduce((sum: number, p: any) => sum + p.cantidad, 0)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 bg-white rounded border border-dashed border-gray-300 text-gray-400 text-xs font-bold mt-3">
              Carrito vacío. Agrega los artículos arriba.
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-99999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-5 ${toast.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.tipo === 'exito' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}