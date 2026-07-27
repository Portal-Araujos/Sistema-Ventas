"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardOverview } from '@/app/features/dashboard/components/DashboardOverview';
import { VisitaGPSForm } from '@/app/features/visitas/components/VisitaGPSForm';

export default function InicioPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingRol, setCheckingRol] = useState(true);

  useEffect(() => {
    fetch('/api/catalogos')
      .then(res => res.json())
      .then(data => {
        // SEGURIDAD: Si es vendedor, NO tiene acceso a /inicio -> Redirigir a /agenda
        if (data.userRol === 'vendedor') {
          router.replace('/agenda');
        } else {
          setCheckingRol(false);
        }
      })
      .catch(() => setCheckingRol(false));
  }, [router]);

  if (checkingRol) {
    return <div className="p-12 text-center text-gray-500 font-medium">Verificando permisos...</div>;
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Control General</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Métricas ejecutivas de instituciones, cobertura comercial y visitas en vivo.
          </p>
        </div>
        
        <VisitaGPSForm onSuccess={() => setRefreshKey(prev => prev + 1)} /> 
      </div>

      <DashboardOverview key={refreshKey} />
    </div>
  );
}