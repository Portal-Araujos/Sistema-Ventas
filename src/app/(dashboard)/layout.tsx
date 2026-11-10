import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PermissionsProvider } from "@/components/shared/PermissionsProvider";
import { getApiSession } from "@/lib/api-auth";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getApiSession();
  return (
    <PermissionsProvider session={session ? { rol: session.rol, permisos: session.permisos } : null}>
    <div className="flex min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Menú Lateral */}
      <Sidebar />
      {/* Contenedor Principal */}
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
    </PermissionsProvider>
  );
}
