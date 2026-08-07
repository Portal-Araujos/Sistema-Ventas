"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Package, Download, Factory, ChevronDown, ChevronUp, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PedidosConsolidadoPage() {
  const [loading, setLoading] = useState(true);
  const [pedidosBrutos, setPedidosBrutos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [escuelasExpandidas, setEscuelasExpandidas] = useState<string[]>([]);

  // 📅 LÓGICA PARA OBTENER LUNES Y DOMINGO DE LA SEMANA ACTUAL
  const getSemanaActual = () => {
    const curr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    const first = curr.getDate() - curr.getDay() + 1; // Lunes
    const last = first + 6; // Domingo
    const fechaLunes = new Date(curr.setDate(first)).toISOString().split('T')[0];
    const fechaDomingo = new Date(curr.setDate(last)).toISOString().split('T')[0];
    return { fechaLunes, fechaDomingo };
  };

  const [filtros, setFiltros] = useState({
    fechaInicio: getSemanaActual().fechaLunes,
    fechaFin: getSemanaActual().fechaDomingo
  });

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);

      const res = await fetch(`/api/pedidos?${params.toString()}`);
      const json = await res.json();
      setPedidosBrutos(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarPedidos(); }, [filtros]);

  const toggleEscuela = (nombre: string) => {
    setEscuelasExpandidas(prev => prev.includes(nombre) ? prev.filter(e => e !== nombre) : [...prev, nombre]);
  };

  // 🔥 1. MOTOR DE AGRUPACIÓN POR ESCUELA 🔥
  // Juntamos todos los pedidos individuales en un gran bloque por colegio
  const agruparPorEscuela = () => {
    const grupos: Record<string, { vendedor: string; totalPrendas: number; detallesHombres: any[]; detallesMujeres: any[]; detallesUnisex: any[] }> = {};

    pedidosBrutos.forEach(pedido => {
      const escuela = pedido.institucion?.nombre || 'Escuela Desconocida';
      if (!grupos[escuela]) {
        grupos[escuela] = { vendedor: pedido.usuario?.nombre || 'Sin asignar', totalPrendas: 0, detallesHombres: [], detallesMujeres: [], detallesUnisex: [] };
      }

      pedido.detalles.forEach((prenda: any) => {
        grupos[escuela].totalPrendas += prenda.cantidad;
        
        // Le inyectamos los datos del cliente a la prenda para no perder el rastro
        const prendaConCliente = { ...prenda, cliente: pedido.nombreCliente, fecha: new Date(pedido.fechaPedido).toLocaleDateString('es-EC') };

        if (prenda.genero === 'HOMBRE') grupos[escuela].detallesHombres.push(prendaConCliente);
        else if (prenda.genero === 'MUJER') grupos[escuela].detallesMujeres.push(prendaConCliente);
        else grupos[escuela].detallesUnisex.push(prendaConCliente);
      });
    });

    return grupos;
  };

  const escuelasAgrupadas = agruparPorEscuela();

  // 🔥 2. EXPORTADOR SÚPER EXCEL (2 PESTAÑAS) 🔥
  const exportarAExcel = () => {
    if (pedidosBrutos.length === 0) { alert("No hay pedidos para exportar en esta semana."); return; }

    // Pestaña 1: Sábana Aplanada (Para saber de quién es cada prenda)
    const datosAplanados: any[] = [];
    // Pestaña 2: Resumen de Producción (Agrupado por SKU para el sastre)
    const resumenProduccion: Record<string, { sku: string; descripcion: string; cantidad: number }> = {};

    pedidosBrutos.forEach(pedido => {
      pedido.detalles.forEach((prenda: any) => {
        // Llenando Pestaña 1
        datosAplanados.push({
          'Fecha': new Date(pedido.fechaPedido).toLocaleDateString('es-EC'),
          'Institución': pedido.institucion?.nombre,
          'Cliente': pedido.nombreCliente,
          'Código SKU': prenda.skuCodigo,
          'Descripción Prenda': `${prenda.tipoRopa} ${prenda.color} ${prenda.genero} ${prenda.talla}`,
          'Cant.': prenda.cantidad,
          'Bordado': prenda.bordado || '',
          'Obs.': prenda.observacion || '',
          'Vendedor': pedido.usuario?.nombre
        });

        // Llenando Pestaña 2 (Matemática Agrupada)
        const claveUnica = prenda.skuCodigo;
        if (!resumenProduccion[claveUnica]) {
          resumenProduccion[claveUnica] = {
            sku: prenda.skuCodigo,
            descripcion: `${prenda.tipoRopa} ${prenda.color} ${prenda.genero} ${prenda.talla}`,
            cantidad: 0
          };
        }
        resumenProduccion[claveUnica].cantidad += prenda.cantidad;
      });
    });

    const datosResumen = Object.values(resumenProduccion).sort((a, b) => b.cantidad - a.cantidad); // Ordena por los más pedidos

    // Crear el Libro de Excel
    const wb = XLSX.utils.book_new();
    const wsDetalle = XLSX.utils.json_to_sheet(datosAplanados);
    const wsResumen = XLSX.utils.json_to_sheet(datosResumen.map(r => ({ 'Código SKU': r.sku, 'Prenda a Fabricar': r.descripcion, 'Total Unidades': r.cantidad })));

    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle por Cliente");
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen para Fábrica");

    XLSX.writeFile(wb, `Ordenes_Produccion_${filtros.fechaInicio}_al_${filtros.fechaFin}.xlsx`);
  };

  // Componente interno para dibujar las tablitas por género
  const TablaPrendas = ({ titulo, datos, colorBg, colorTexto }: { titulo: string, datos: any[], colorBg: string, colorTexto: string }) => {
    if (datos.length === 0) return null;
    const total = datos.reduce((sum, item) => sum + item.cantidad, 0);

    return (
      <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className={`${colorBg} ${colorTexto} px-4 py-2 font-black uppercase text-xs flex justify-between`}>
          <span>{titulo}</span>
          <span>{datos.length} Pedidos</span>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 font-bold">Cliente</th>
                <th className="p-3 font-bold">Código SKU</th>
                <th className="p-3 font-bold">Prenda (Color y Talla)</th>
                <th className="p-3 font-bold text-center">Cant.</th>
                <th className="p-3 font-bold">Bordado</th>
                <th className="p-3 font-bold">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {datos.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                  <td className="p-3 font-bold text-gray-900">{d.cliente}</td>
                  <td className="p-3 font-mono font-bold text-blue-600 whitespace-nowrap">{d.skuCodigo}</td>
                  <td className="p-3 font-medium text-gray-700">{d.tipoRopa} {d.color} - <span className="font-black text-black">Talla: {d.talla}</span></td>
                  <td className="p-3 text-center font-black text-base">{d.cantidad}</td>
                  <td className="p-3 text-gray-600 italic">{d.bordado || '-'}</td>
                  <td className="p-3 text-gray-600">{d.observacion || '-'}</td>
                </tr>
              ))}
              {/* FILA DE SUBTOTAL */}
              <tr className="bg-gray-100/50">
                <td colSpan={4} className="p-3 font-black text-right uppercase text-gray-600">Subtotal {titulo}:</td>
                <td className="p-3 text-center font-black text-lg text-gray-900">{total}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/50">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Factory className="text-primary" /> Consolidado de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de pedidos de uniformes enviados por los vendedores.</p>
        </div>
        <Button onClick={exportarAExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md w-full md:w-auto h-11">
          <Download size={18} className="mr-2" /> Exportar Plan de Fábrica (Excel)
        </Button>
      </div>

      {/* FILTROS DE SEMANA */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
          <Calendar className="text-blue-500 ml-2" size={20} />
          <div className="flex items-center gap-2 px-2">
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Semana Desde</Label>
              <Input type="date" className="h-9 text-xs bg-white w-130px" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Semana Hasta</Label>
              <Input type="date" className="h-9 text-xs bg-white w-130px" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} />
            </div>
          </div>
        </div>
        
        <div className="relative flex-1 min-w-200px">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input placeholder="Buscar por escuela..." className="pl-9 h-10 text-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* ACORDEÓN DE ESCUELAS */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Armando el consolidado de producción...</div>
      ) : Object.keys(escuelasAgrupadas).length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center flex flex-col items-center">
          <Package size={48} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-bold">No hay pedidos registrados en esta semana.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(escuelasAgrupadas)
            .filter(([escuela]) => escuela.toLowerCase().includes(busqueda.toLowerCase()))
            .map(([escuela, datos]) => {
            const isExpanded = escuelasExpandidas.includes(escuela);

            return (
              <div key={escuela} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:border-primary/50">
                {/* CABECERA DEL ACORDEÓN (GRAN TOTAL) */}
                <div 
                  className={`p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                  onClick={() => toggleEscuela(escuela)}
                >
                  <div className="flex-1">
                    <h2 className="text-lg font-black text-gray-900 leading-tight">🏫 {escuela}</h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">👤 Vendedor Responsable: <span className="font-bold text-gray-700">{datos.vendedor}</span></p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 sm:mt-0">
                    <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200 flex flex-col items-center min-w-120px">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Gran Total</span>
                      <span className="text-xl font-black">{datos.totalPrendas} Prendas</span>
                    </div>
                    {isExpanded ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </div>

                {/* DETALLE EXPANDIDO (TABLAS POR GÉNERO) */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-100 bg-gray-50/30">
                    <TablaPrendas titulo="Sección Hombres" datos={datos.detallesHombres} colorBg="bg-blue-100" colorTexto="text-blue-800" />
                    <TablaPrendas titulo="Sección Mujeres" datos={datos.detallesMujeres} colorBg="bg-pink-100" colorTexto="text-pink-800" />
                    <TablaPrendas titulo="Sección Unisex / Accesorios" datos={datos.detallesUnisex} colorBg="bg-purple-100" colorTexto="text-purple-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}