"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { usePermissions } from "@/components/shared/PermissionsProvider";
import DistribuidorVendedor from "@/app/features/marketing/components/DistribuidorVendedor";

export default function MarketingPage() {
  const { can } = usePermissions();

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="text-primary" /> Mi Marketing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tus clientes asignados, incluidos los procedentes de carteras anteriores.
          </p>
        </div>
      </div>

      {can("marketing:administrar") && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-bold text-blue-900">
            Tu rol también puede administrar Marketing.
          </p>
          <Link
            href="/marketing/administracion"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline"
          >
            Ir a administración <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <DistribuidorVendedor />
    </div>
  );
}
