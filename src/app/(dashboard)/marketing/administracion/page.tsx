"use client";

import Link from "next/link";
import { History, Settings } from "lucide-react";
import { Allowed } from "@/components/shared/PermissionsProvider";
import SemaforoAdmin from "@/app/features/marketing/components/SemaforoAdmin";

export default function AdministracionMarketingPage() {
  return (
    <Allowed permission="marketing:administrar">
      <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-primary" /> Administración de Marketing
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Semaforización de cartera y oportunidades de reventa.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/marketing/historial"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              <History size={16} /> Historial y auditoría
            </Link>
          </div>
        </div>
        <SemaforoAdmin />
      </div>
    </Allowed>
  );
}
