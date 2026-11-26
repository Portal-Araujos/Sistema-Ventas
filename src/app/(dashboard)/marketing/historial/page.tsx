"use client";

import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { Allowed } from "@/components/shared/PermissionsProvider";
import HistorialAuditoria from "@/app/features/marketing/components/HistorialAuditoria";

export default function HistorialMarketingPage() {
  return (
    <Allowed permission="marketing:administrar">
      <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="text-primary" /> Historial y auditoría
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cargas subidas y mantenimiento de Marketing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/marketing/administracion"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft size={16} /> Administración
            </Link>
          </div>
        </div>
        <HistorialAuditoria />
      </div>
    </Allowed>
  );
}
