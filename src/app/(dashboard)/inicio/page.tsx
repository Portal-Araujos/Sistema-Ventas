"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 🔥 AHORA LLAMAMOS AL NUEVO DASHBOARD COMERCIAL 🔥
import { DashboardComercial } from '@/app/features/dashboard/components/DashboardComercial';

export default function InicioPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingRol, setCheckingRol] = useState(true);

  useEffect(() => {
    fetch('/api/catalogos')
      .then(res => res.json())
      .then(data => {
        setCheckingRol(false);
      })
      .catch(() => setCheckingRol(false));
  }, [router]);

  if (checkingRol) {
    return <div className="p-12 text-center text-gray-500 font-medium animate-pulse">Cargando módulos...</div>;
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/50"> 
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard de Dirección Comercial</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Consolidado gerencial de ventas, embudo, campo y cumplimiento de metas.
          </p>
        </div>
      </div>
      
      {/* 🔥 RENDERIZAMOS EL NUEVO COMPONENTE 🔥 */}
      <DashboardComercial key={refreshKey} />
    </div>
  );
}