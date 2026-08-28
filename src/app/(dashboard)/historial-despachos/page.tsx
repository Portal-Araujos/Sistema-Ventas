"use client";

import React, { useState, useEffect } from 'react';
import { Truck, Search, Eye, Printer, ChevronLeft, ChevronRight, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function HistorialDespachosPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [guiaDetalle, setGuiaDetalle] = useState<any>(null);

  const cargarDatos = async () => {
    try {
      const res = await fetch('/api/guias');
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleOpenDetalle = (guia: any) => {
    setGuiaDetalle(guia);
    setModalDetalleOpen(true);
  };

  // 🔥 IMPRIMIR GUÍA HORIZONTAL (SOLO ESTE VIAJE Y SUS SALDOS) 🔥
  const imprimirGuiaPDF = (guia: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlFilasDetalle = '';
    const mapaTotales: Record<string, { sku: string; prendaColorTalla: string; cantidadTotal: number }> = {};
    let htmlSaldosContratos = '';

    guia.contratosInvolucrados.forEach((contrato: any) => {
      // Saldos
      htmlSaldosContratos += `
        <tr>
          <td>${contrato.numContrato}</td>
          <td>${contrato.nombreCliente}</td>
          <td style="text-align:center;">${contrato.totalPrendasContrato}</td>
          <td style="text-align:center; color:green;">${contrato.totalDespachadoHistorico}</td>
          <td style="text-align:center; color:red; font-weight:bold;">${contrato.saldoPendiente}</td>
        </tr>
      `;

      // Prendas de la guía
      contrato.prendasEnEstaGuia.forEach((p: any) => {
        const sku = p.skuCodigo || 'S/N';
        const prendaNombre = p.tipoRopa || 'Prenda';
        const color = p.color || '-';
        const talla = p.talla || '-';

        const prendaColorTalla = `${prendaNombre} (${color}, ${talla})`;
        const key = `${sku}_${prendaColorTalla}`;
        if (!mapaTotales[key]) mapaTotales[key] = { sku, prendaColorTalla, cantidadTotal: 0 };
        mapaTotales[key].cantidadTotal += (p.cantidad || 1);

        htmlFilasDetalle += `
          <tr>
            <td>${contrato.numContrato}</td>
            <td>${contrato.nombreCliente}</td>
            <td>${sku}</td>
            <td>${prendaNombre}</td>
            <td>${color}</td>
            <td>${p.genero || 'UNISEX'}</td>
            <td>${talla}</td>
            <td style="text-align:center; font-weight:bold; font-size:12px;">${p.cantidad}</td>
            <td>${p.bordado || '-'}</td>
            <td>${p.observacion || '-'}</td>
          </tr>
        `;
      });
    });

    let htmlFilasTotales = '';
    Object.values(mapaTotales).forEach(item => {
      htmlFilasTotales += `<tr><td style="font-weight:bold;">${item.sku}</td><td>${item.prendaColorTalla}</td><td style="text-align:center; font-weight:bold; font-size:14px;">${item.cantidadTotal}</td></tr>`;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Guía de Despacho - ${guia.codigoGuia}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #222; }
            h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 2px; }
            p { text-align: center; margin-top: 0; color: #555; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #999; padding: 6px 4px; text-align: left; }
            th { background-color: #e5e5e5; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .totales th { background-color: #222; color: #fff; }
          </style>
        </head>
        <body>
          <h1>GUÍA DE DESPACHO / REMISIÓN: ${guia.codigoGuia}</h1>
          <p>Institución: <strong>${guia.institucionNombre}</strong> | Responsable Bodega: ${guia.responsable} | Fecha de Salida: ${guia.fechaDespacho}</p>
          
          <h2 style="font-size:14px; margin-bottom:5px;">1. DETALLE DE PRENDAS EN ESTE VIAJE</h2>
          <table>
            <thead>
              <tr>
                <th>N° Contrato</th><th>Cliente</th><th>SKU</th><th>Prenda</th><th>Color</th>
                <th>Sexo</th><th>Talla</th><th>Cant.</th><th>Bordado</th><th>Observación</th>
              </tr>
            </thead>
            <tbody>${htmlFilasDetalle}</tbody>
          </table>

          <div style="display:flex; justify-content: space-between; gap:20px; page-break-inside: avoid;">
            <div style="width: 48%;">
              <h2 style="font-size:12px; margin-bottom:5px; text-align:center;">2. RESUMEN DE BULTO (TOTALES)</h2>
              <table class="totales">
                <thead><tr><th>SKU</th><th>Prenda (Color y Talla)</th><th style="text-align:center;">Cantidad</th></tr></thead>
                <tbody>${htmlFilasTotales}</tbody>
              </table>
            </div>
            <div style="width: 48%;">
              <h2 style="font-size:12px; margin-bottom:5px; text-align:center;">3. AUDITORÍA Y SALDOS PENDIENTES</h2>
              <table class="totales">
                <thead><tr><th>Contrato</th><th>Cliente</th><th style="text-align:center;">Total</th><th style="text-align:center;">Ya Despachado</th><th style="text-align:center;">SALDO DEBE</th></tr></thead>
                <tbody>${htmlSaldosContratos}</tbody>
              </table>
            </div>
          </div>
          
          <div style="margin-top: 50px; display:flex; justify-content: space-around;">
            <div style="text-align:center; border-top: 1px solid #000; width: 30%; padding-top:5px;">Firma Despachador<br/>${guia.responsable}</div>
            <div style="text-align:center; border-top: 1px solid #000; width: 30%; padding-top:5px;">Firma Transportista / Recibe</div>
          </div>
          
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredData = data.filter(g => {
    return g.codigoGuia.toLowerCase().includes(searchTerm.toLowerCase()) || g.institucionNombre.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Truck className="text-blue-600" /> Historial de Despachos</h1>
          <p className="text-sm text-gray-500 mt-1">Auditoría de guías, viajes y reimpresión de comprobantes.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full md:w-1/2">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 text-xs h-10 bg-gray-50" placeholder="Buscar por Número de Guía o Institución..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando historial de guías...</div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
          <PackageCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-lg text-gray-700">No hay guías de despacho registradas aún.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-auto max-h-[65vh] w-full">
            <table className="w-full text-left border-collapse text-xs min-w-800px">
              <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                <tr className="text-gray-600 font-black uppercase border-b border-gray-300">
                  <th className="p-3.5">N° de Guía</th>
                  <th className="p-3.5">Institución</th>
                  <th className="p-3.5">Fecha y Hora de Salida</th>
                  <th className="p-3.5">Responsable Bodega</th>
                  <th className="p-3.5 text-center">Prendas en el Bulto</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-black text-blue-700">{item.codigoGuia}</td>
                    <td className="p-3.5 font-bold text-gray-900">{item.institucionNombre}</td>
                    <td className="p-3.5 text-gray-600 font-semibold">{item.fechaDespacho}</td>
                    <td className="p-3.5 text-gray-500">{item.responsable}</td>
                    <td className="p-3.5 text-center font-black text-emerald-600 text-sm">{item.totalPrendasEnGuia}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="icon" variant="ghost" title="Imprimir Guía de Remisión" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onClick={() => imprimirGuiaPDF(item)}>
                          <Printer size={16} />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-blue-600 border-blue-200" onClick={() => handleOpenDetalle(item)}>
                          <Eye size={14} className="mr-1" /> Ver Detalle y Saldos
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft size={14}/></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8"><ChevronRight size={14}/></Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 👁️ MODAL: DESGLOSE DE LA GUÍA Y SALDOS PENDIENTES */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-blue-900 border-b pb-3 flex justify-between items-center">
              <span>Auditoría de Despacho: {guiaDetalle?.institucionNombre}</span>
              <Badge className="bg-blue-600 text-white text-sm">{guiaDetalle?.codigoGuia}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs">
              <div className="flex flex-col"><span className="text-blue-500 font-bold uppercase">Fecha Salida</span><span className="font-black text-gray-800">{guiaDetalle?.fechaDespacho}</span></div>
              <div className="flex flex-col"><span className="text-blue-500 font-bold uppercase">Responsable Bodega</span><span className="font-black text-gray-800">{guiaDetalle?.responsable}</span></div>
              <div className="flex flex-col"><span className="text-blue-500 font-bold uppercase">Total Bulto</span><span className="font-black text-emerald-600 text-lg">{guiaDetalle?.totalPrendasEnGuia} prendas</span></div>
            </div>

            <p className="text-xs font-black uppercase text-gray-500 border-b pb-1">Auditoría de Contratos involucrados en este viaje:</p>
            
            <div className="space-y-3">
              {guiaDetalle?.contratosInvolucrados?.map((contrato: any) => {
                const completado = contrato.saldoPendiente === 0;
                return (
                  <div key={contrato.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="p-3.5 flex justify-between items-center bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-black text-blue-700 bg-blue-50 border-blue-200">C. #{contrato.numContrato}</Badge>
                        <span className="text-xs font-bold text-gray-800">{contrato.nombreCliente}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Badge className="bg-gray-800">Total: {contrato.totalPrendasContrato}</Badge>
                        <Badge className="bg-emerald-600 text-white">Despachadas: {contrato.totalDespachadoHistorico}</Badge>
                        <Badge variant="outline" className={`font-bold ${completado ? 'bg-emerald-50 text-emerald-600 border-emerald-300' : 'bg-red-50 text-red-600 border-red-300'}`}>
                          {completado ? 'CONTRATO ENTREGADO' : `FALTAN ENTREGAR: ${contrato.saldoPendiente}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4 flex justify-between">
            <Button variant="secondary" size="sm" onClick={() => imprimirGuiaPDF(guiaDetalle)}><Printer size={14} className="mr-1"/> Imprimir PDF de esta Guía</Button>
            <Button variant="outline" size="sm" onClick={() => setModalDetalleOpen(false)}>Cerrar Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}