"use client";

import React, { useState, useEffect } from "react";
import { InstitutionsList } from "@/app/features/institutions/components/InstitutionsList";
import {
  InstitutionsFilters,
  FiltrosAvanzadosState,
} from "@/app/features/institutions/components/InstitutionsFilters";
import { InstitutionForm } from "@/app/features/institutions/components/InstitutionForm";

const estadoInicialFiltros: FiltrosAvanzadosState = {
  search: "",
  provinciaId: "",
  cantonId: "",
  parroquiaId: "",
  tamano: "",
  estado: "",
  sostenimientoId: "",
  jornadaId: "",
  vendedorId: "",
};

export default function InstitucionesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRol, setUserRol] = useState("vendedor");
  const [filtros, setFiltros] =
    useState<FiltrosAvanzadosState>(estadoInicialFiltros);

  useEffect(() => {
    fetch("/api/catalogos")
      .then((res) => res.json())
      .then((data) => {
        if (data.userRol) setUserRol(data.userRol);
      });
  }, []);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);
  const handleResetFiltros = () => setFiltros(estadoInicialFiltros);

  const puedeCrear = userRol === "super_admin" || userRol === "administrador";

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Gestión de Instituciones
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Base de datos comercial y asignación de cartera de vendedores
          </p>
        </div>

        {puedeCrear && <InstitutionForm onSuccess={handleRefresh} />}
      </div>

      {/* BARRA Y PANEL DE FILTROS AVANZADOS */}
      <InstitutionsFilters
        filtros={filtros}
        setFiltros={setFiltros}
        onReset={handleResetFiltros}
      />

      {/* TABLA CON FILTRADO Y ASIGNACIÓN */}
      <InstitutionsList
        key={refreshKey}
        filtros={filtros}
        userRol={userRol}
        onRefreshNeeded={handleRefresh}
      />
    </div>
  );
}
