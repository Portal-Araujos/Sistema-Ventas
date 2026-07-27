"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface FiltrosAvanzadosState {
  search: string;
  provinciaId: string;
  cantonId: string;
  parroquiaId: string;
  tamano: string;
  estado: string;
  sostenimientoId: string;
  jornadaId: string;
  vendedorId: string;
}

interface Props {
  filtros: FiltrosAvanzadosState;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosAvanzadosState>>;
  onReset: () => void;
}

export function InstitutionsFilters({ filtros, setFiltros, onReset }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cantonesDisponibles, setCantonesDisponibles] = useState<any[]>([]);
  const [parroquiasDisponibles, setParroquiasDisponibles] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/catalogos').then(r => r.json()).then(d => setCatalogos(d)).catch(e => console.error(e));
    fetch('/api/usuarios/vendedores').then(r => r.json()).then(d => setVendedores(d)).catch(e => console.error(e));
  }, []);

  // Manejo de Cascada Geográfica en Filtros
  const handleProvinciaChange = (provId: string) => {
    const prov = catalogos?.provincias?.find((p: any) => p.id === parseInt(provId));
    setCantonesDisponibles(prov ? prov.cantones : []);
    setParroquiasDisponibles([]);
    setFiltros(prev => ({ ...prev, provinciaId: provId, cantonId: '', parroquiaId: '' }));
  };

  const handleCantonChange = (cantonId: string) => {
    const cant = cantonesDisponibles.find((c: any) => c.id === parseInt(cantonId));
    setParroquiasDisponibles(cant ? cant.parroquias : []);
    setFiltros(prev => ({ ...prev, cantonId, parroquiaId: '' }));
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* BARRA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <div className="relative w-full sm:flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input 
            className="pl-9 h-10 w-full bg-white text-sm" 
            placeholder="Buscar por nombre de institución..." 
            value={filtros.search}
            onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
          />
        </div>

        <Button 
          variant={showAdvanced ? "default" : "outline"} 
          className={`h-10 flex items-center gap-2 ${showAdvanced ? 'bg-primary text-white' : 'bg-white text-gray-700'}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={16} />
          <span>Filtros Avanzados</span>
        </Button>

        {(filtros.search || filtros.provinciaId || filtros.tamano || filtros.estado || filtros.vendedorId) && (
          <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50" onClick={onReset} title="Limpiar Filtros">
            <RefreshCw size={16} />
          </Button>
        )}
      </div>

      {/* PANEL EXPANDIBLE DE FILTROS MULTICRITERIO */}
      {showAdvanced && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
          
          {/* Provincia */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Provincia</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={filtros.provinciaId} onChange={e => handleProvinciaChange(e.target.value)}>
              <option value="">Todas</option>
              {catalogos?.provincias?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {/* Cantón */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Cantón</Label>
            <select disabled={!filtros.provinciaId} className="w-full h-9 border rounded-md px-2 text-xs bg-white disabled:bg-gray-100" value={filtros.cantonId} onChange={e => handleCantonChange(e.target.value)}>
              <option value="">Todos</option>
              {cantonesDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Parroquia */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Parroquia</Label>
            <select disabled={!filtros.cantonId} className="w-full h-9 border rounded-md px-2 text-xs bg-white disabled:bg-gray-100" value={filtros.parroquiaId} onChange={e => setFiltros({ ...filtros, parroquiaId: e.target.value })}>
              <option value="">Todas</option>
              {parroquiasDisponibles.map((parr: any) => <option key={parr.id} value={parr.id}>{parr.nombre}</option>)}
            </select>
          </div>

          {/* Tamaño */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Tamaño de Institución</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={filtros.tamano} onChange={e => setFiltros({ ...filtros, tamano: e.target.value })}>
              <option value="">Todos los tamaños</option>
              <option value="Pequeña">Pequeña</option>
              <option value="Mediana">Mediana</option>
              <option value="Grande">Grande</option>
            </select>
          </div>

          {/* Estado Comercial */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Estado Comercial</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="No visitada">No visitada</option>
              <option value="Seguimiento">Seguimiento</option>
              <option value="Visitada">Visitada</option>
            </select>
          </div>

          {/* Sostenimiento */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Sostenimiento</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={filtros.sostenimientoId} onChange={e => setFiltros({ ...filtros, sostenimientoId: e.target.value })}>
              <option value="">Todos</option>
              {catalogos?.sostenimientos?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Vendedor Responsable */}
          <div>
            <Label className="text-[11px] font-bold text-gray-500">Vendedor Asignado</Label>
            <select className="w-full h-9 border rounded-md px-2 text-xs bg-white" value={filtros.vendedorId} onChange={e => setFiltros({ ...filtros, vendedorId: e.target.value })}>
              <option value="">Todos los vendedores</option>
              <option value="sin_asignar">-- Sin Asignar --</option>
              {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>

        </div>
      )}
    </div>
  );
}