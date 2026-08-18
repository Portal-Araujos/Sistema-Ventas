"use client";

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Barcode, Upload, CheckCircle2, AlertCircle, Search, Plus, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function CatalogoSKUPage() {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ESTADOS PARA IMPORTACIÓN MASIVA
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [mapping, setMapping] = useState<Record<string, string>>({
    codigo: '', tipoRopa: '', color: '', genero: '', talla: ''
  });

  // ESTADOS PARA CREACIÓN INDIVIDUAL
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [nuevoSku, setNuevoSku] = useState({ codigo: '', tipoRopa: '', color: '', genero: '', talla: '' });
  const [isSaving, setIsSaving] = useState(false);

  // TOAST GLOBAL
  const [toastMsg, setToastMsg] = useState<{ tipo: 'exito' | 'error' | 'alerta'; texto: string } | null>(null);
  const showToast = (tipo: 'exito' | 'error' | 'alerta', texto: string) => { setToastMsg({ tipo, texto }); setTimeout(() => setToastMsg(null), 5000); };

  const cargarSKUs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pedidos/sku');
      const data = await res.json();
      setSkus(data.raw || []);
    } catch (e) {
      showToast('error', 'Error al cargar el catálogo de códigos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarSKUs(); }, []);
  useEffect(() => { setCurrentPage(1); }, [busqueda]);

  // --- LÓGICA DE EXCEL (MASIVO) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result; 
      const wb = XLSX.read(bstr, { type: 'binary' }); 
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      if (data.length > 0) {
        const cols = Object.keys(data[0] as object); 
        setExcelColumns(cols); 
        setExcelData(data);
        
        const autoMap: Record<string, string> = { ...mapping };
        cols.forEach(col => {
          const cLower = col.toLowerCase();
          if (cLower.includes('cod') || cLower.includes('sku')) autoMap.codigo = col;
          if (cLower.includes('tipo') || cLower.includes('prenda')) autoMap.tipoRopa = col;
          if (cLower.includes('color')) autoMap.color = col;
          if (cLower.includes('genero') || cLower.includes('género') || cLower.includes('sexo')) autoMap.genero = col;
          if (cLower.includes('talla')) autoMap.talla = col;
        });
        
        setMapping(autoMap); 
        setImportModal(true);
      } else { 
        showToast('alerta', "El archivo Excel está vacío."); 
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarImportacion = async () => {
    if (!mapping.codigo || !mapping.tipoRopa || !mapping.color || !mapping.genero || !mapping.talla) { 
      showToast('error', "Debes mapear TODAS las 5 columnas para que el sistema funcione."); 
      return; 
    }
    
    setIsImporting(true);

    // 🔥 FILTRO BLINDADO ANTI "UNDEFINED" 🔥
    const skusProcesados = excelData.map(row => ({
      codigo: row[mapping.codigo] ? String(row[mapping.codigo]).trim().toUpperCase() : '',
      tipoRopa: row[mapping.tipoRopa] ? String(row[mapping.tipoRopa]).trim().toUpperCase() : '',
      color: row[mapping.color] ? String(row[mapping.color]).trim().toUpperCase() : '',
      genero: row[mapping.genero] ? String(row[mapping.genero]).trim().toUpperCase() : '',
      talla: row[mapping.talla] ? String(row[mapping.talla]).trim().toUpperCase() : '',
      activo: true
    })).filter(s => s.codigo !== '' && s.tipoRopa !== '');

    try {
      const res = await fetch('/api/pedidos/sku', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ skus: skusProcesados }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('exito', `¡Catálogo procesado! Los nuevos se crearon y los existentes se actualizaron.`);
      setImportModal(false);
      cargarSKUs();
    } catch (error) { 
      showToast('error', `Hubo un error al subir los códigos al servidor.`); 
    } finally {
      setIsImporting(false);
    }
  };

  // --- LÓGICA DE CREACIÓN INDIVIDUAL ---
  const handleGuardarIndividual = async () => {
    if (!nuevoSku.codigo || !nuevoSku.tipoRopa || !nuevoSku.color || !nuevoSku.genero || !nuevoSku.talla) {
      showToast('error', 'Por favor llena todos los campos.'); return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/pedidos/sku', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ skus: [{
          ...nuevoSku,
          codigo: nuevoSku.codigo.trim().toUpperCase(),
          tipoRopa: nuevoSku.tipoRopa.trim().toUpperCase(),
          color: nuevoSku.color.trim().toUpperCase(),
          genero: nuevoSku.genero.trim().toUpperCase(),
          talla: nuevoSku.talla.trim().toUpperCase(),
          activo: true
        }] }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('exito', 'Código procesado exitosamente (Creado/Actualizado).');
      setModalNuevoOpen(false);
      setNuevoSku({ codigo: '', tipoRopa: '', color: '', genero: '', talla: '' });
      cargarSKUs();
    } catch (error) {
      showToast('error', 'Ocurrió un error al procesar el código.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA PARA ACTIVAR / DESACTIVAR ---
  const handleToggleActivo = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/pedidos/sku', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: !currentStatus })
      });
      if (!res.ok) throw new Error();

      setSkus(prev => prev.map(s => s.id === id ? { ...s, activo: !currentStatus } : s));
      showToast('exito', `SKU ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (e) {
      showToast('error', 'Error al actualizar el estado del SKU.');
    }
  };

  // FILTRADO Y PAGINACIÓN
  const skusFiltrados = skus.filter(s => 
    s.codigo.toLowerCase().includes(busqueda.toLowerCase()) || 
    s.tipoRopa.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.color.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const totalPages = Math.max(1, Math.ceil(skusFiltrados.length / itemsPerPage));
  const paginatedSkus = skusFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/50">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Barcode className="text-primary" /> Catálogo de Códigos (SKU)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Base de datos central de uniformes para pedidos y producción.</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setModalNuevoOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold">
            <Plus size={16} className="mr-1" /> Nuevo Manual
          </Button>

          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold">
            <Upload size={16} className="mr-2" /> Carga Masiva
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <Input placeholder="Buscar por código, prenda o color..." className="pl-9 h-9 text-sm bg-white" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md whitespace-nowrap">
            Total en BD: {skus.length} prendas
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-bold text-gray-600">Código SKU</TableHead>
                <TableHead className="font-bold text-gray-600">Tipo de Prenda</TableHead>
                <TableHead className="font-bold text-gray-600">Color</TableHead>
                <TableHead className="font-bold text-gray-600 text-center">Género</TableHead>
                <TableHead className="font-bold text-gray-600 text-center">Talla</TableHead>
                <TableHead className="font-bold text-gray-600 text-center">Estado</TableHead>
                <TableHead className="font-bold text-gray-600 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Cargando base de datos...</TableCell></TableRow>
              ) : paginatedSkus.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500">No hay códigos registrados o que coincidan con la búsqueda.</TableCell></TableRow>
              ) : paginatedSkus.map((item) => (
                <TableRow key={item.id} className={`hover:bg-gray-50 ${!item.activo ? 'opacity-60 bg-gray-50/50' : ''}`}>
                  <TableCell className="font-black text-blue-700">{item.codigo}</TableCell>
                  <TableCell className="font-bold text-gray-900">{item.tipoRopa}</TableCell>
                  <TableCell className="text-gray-600 font-medium">{item.color}</TableCell>
                  <TableCell className="text-center text-xs font-bold text-gray-500">{item.genero}</TableCell>
                  <TableCell className="text-center font-black text-gray-900">{item.talla}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={item.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      title={item.activo ? "Desactivar SKU" : "Activar SKU"}
                      className={`h-8 w-8 ${item.activo ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      onClick={() => handleToggleActivo(item.id, item.activo)}
                    >
                      <Power size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">
              Página {currentPage} de {totalPages} (Mostrando {paginatedSkus.length} de {skusFiltrados.length})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14} className="mr-1"/> Ant.</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">Sig. <ChevronRight size={14} className="ml-1"/></Button>
            </div>
          </div>
        )}
      </div>

      {/* ➕ MODAL: NUEVO SKU INDIVIDUAL ➕ */}
      <Dialog open={modalNuevoOpen} onOpenChange={setModalNuevoOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl border-t-4 border-t-blue-600">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Plus className="text-blue-600"/> Crear/Actualizar SKU Manual
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label className="text-xs font-bold text-gray-600">Código SKU (Único) *</Label>
              <Input className="h-9 font-mono font-bold uppercase mt-1" placeholder="Ej: UN1523" value={nuevoSku.codigo} onChange={e => setNuevoSku({...nuevoSku, codigo: e.target.value.toUpperCase()})} />
              <p className="text-[10px] text-gray-500 mt-1">Si ingresas un código que ya existe, sus datos se actualizarán.</p>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600">Tipo de Prenda *</Label>
              <Input className="h-9 mt-1 uppercase" placeholder="Ej: POLO NOVA" value={nuevoSku.tipoRopa} onChange={e => setNuevoSku({...nuevoSku, tipoRopa: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-600">Color *</Label>
                <Input className="h-9 mt-1 uppercase" placeholder="Ej: BLANCO" value={nuevoSku.color} onChange={e => setNuevoSku({...nuevoSku, color: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-600">Talla *</Label>
                <Input className="h-9 font-black mt-1 uppercase" placeholder="Ej: XS, S, M, L" value={nuevoSku.talla} onChange={e => setNuevoSku({...nuevoSku, talla: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600">Género *</Label>
              <select className="w-full h-9 border border-gray-300 rounded-md px-3 text-sm mt-1 bg-white" value={nuevoSku.genero} onChange={e => setNuevoSku({...nuevoSku, genero: e.target.value})}>
                <option value="">Seleccione...</option>
                <option value="UNISEX">UNISEX</option>
                <option value="HOMBRE">HOMBRE</option>
                <option value="MUJER">MUJER</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalNuevoOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleGuardarIndividual} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar SKU'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE MAPEO DE EXCEL */}
      <Dialog open={importModal} onOpenChange={(val) => !isImporting && setImportModal(val)}>
        <DialogContent className="sm:max-w-xl bg-white p-6 rounded-xl border-t-4 border-t-emerald-500">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Enlazar Columnas del Catálogo</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            {[{ key: 'codigo', label: 'Columna: Código SKU' }, { key: 'tipoRopa', label: 'Columna: Tipo Prenda' }, { key: 'color', label: 'Columna: Color' }, { key: 'genero', label: 'Columna: Género' }, { key: 'talla', label: 'Columna: Talla' }].map(field => (
              <div key={field.key} className="flex items-center justify-between">
                <Label className="text-xs font-bold w-1/2 text-gray-700">{field.label}</Label>
                <select className="w-1/2 h-9 border border-gray-300 rounded-md px-2 text-xs bg-white font-medium" value={mapping[field.key]} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })} disabled={isImporting}>
                  <option value="">Seleccione columna...</option>
                  {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportModal(false)} disabled={isImporting}>Cancelar</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={ejecutarImportacion} disabled={isImporting}>
              {isImporting ? 'Guardando en BD...' : 'Subir Códigos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-9999 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toastMsg.tipo === 'exito' ? 'bg-[#34c759]' : 'bg-[#ff3b30]'} text-white`}>
          {toastMsg.tipo === 'exito' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{toastMsg.texto}</span>
        </div>
      )}
    </div>
  );
}