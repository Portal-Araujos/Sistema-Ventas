"use client";

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Barcode, Upload, CheckCircle2, AlertCircle, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function CatalogoSKUPage() {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estados de Importación
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [mapping, setMapping] = useState<Record<string, string>>({
    codigo: '', tipoRopa: '', color: '', genero: '', talla: ''
  });

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

  // --- LÓGICA DE EXCEL ---
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
        
        // Autodetectar columnas
        const autoMap: Record<string, string> = { ...mapping };
        cols.forEach(col => {
          const cLower = col.toLowerCase();
          if (cLower.includes('cod') || cLower.includes('sku')) autoMap.codigo = col;
          if (cLower.includes('tipo') || cLower.includes('prenda')) autoMap.tipoRopa = col;
          if (cLower.includes('color')) autoMap.color = col;
          if (cLower.includes('genero') || cLower.includes('género')) autoMap.genero = col;
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
    
    // Transformar datos del Excel al formato de la Base de Datos
    const skusProcesados = excelData.map(row => ({
      codigo: String(row[mapping.codigo]).trim(),
      tipoRopa: String(row[mapping.tipoRopa]).trim().toUpperCase(),
      color: String(row[mapping.color]).trim().toUpperCase(),
      genero: String(row[mapping.genero]).trim().toUpperCase(),
      talla: String(row[mapping.talla]).trim().toUpperCase(),
      activo: true
    })).filter(s => s.codigo && s.tipoRopa && s.color && s.talla);

    try {
      const res = await fetch('/api/pedidos/sku', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ skus: skusProcesados }) 
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      showToast('exito', `¡Catálogo actualizado! Se guardaron ${data.creados} códigos nuevos.`);
      setImportModal(false);
      cargarSKUs();
    } catch (error) { 
      showToast('error', `Hubo un error al subir los códigos al servidor.`); 
    } finally {
      setIsImporting(false);
    }
  };

  const skusFiltrados = skus.filter(s => 
    s.codigo.toLowerCase().includes(busqueda.toLowerCase()) || 
    s.tipoRopa.toLowerCase().includes(busqueda.toLowerCase())
  ).slice(0, 100); // Mostramos solo 100 para no saturar

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/50">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Barcode className="text-primary" /> Catálogo de Códigos (SKU)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Base de datos central de uniformes para pedidos y producción.</p>
        </div>
        
        <div>
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold">
            <Upload size={16} className="mr-2" /> Subir Excel de Códigos
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <Input placeholder="Buscar por código o tipo..." className="pl-9 h-9 text-sm bg-white" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md">
            Total en BD: {skus.length} prendas
          </div>
        </div>

        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold text-gray-600">Código SKU</TableHead>
              <TableHead className="font-bold text-gray-600">Tipo de Prenda</TableHead>
              <TableHead className="font-bold text-gray-600">Color</TableHead>
              <TableHead className="font-bold text-gray-600 text-center">Género</TableHead>
              <TableHead className="font-bold text-gray-600 text-center">Talla</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Cargando base de datos...</TableCell></TableRow>
            ) : skusFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">No hay códigos. ¡Sube tu Excel para empezar!</TableCell></TableRow>
            ) : skusFiltrados.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="font-black text-blue-700">{item.codigo}</TableCell>
                <TableCell className="font-bold text-gray-900">{item.tipoRopa}</TableCell>
                <TableCell className="text-gray-600 font-medium">{item.color}</TableCell>
                <TableCell className="text-center text-xs font-bold text-gray-500">{item.genero}</TableCell>
                <TableCell className="text-center font-black text-gray-900">{item.talla}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DE MAPEO DE EXCEL */}
      <Dialog open={importModal} onOpenChange={(val) => !isImporting && setImportModal(val)}>
        <DialogContent className="sm:max-w-xl bg-white p-6 rounded-xl border-t-4 border-t-emerald-500">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Enlazar Columnas del Catálogo</DialogTitle>
          </DialogHeader>
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
            <Button variant="outline" onClick={() => setImportModal(false)} disabled={isImporting}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={ejecutarImportacion} disabled={isImporting}>
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