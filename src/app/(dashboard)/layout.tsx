import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Menú Lateral */}
      <Sidebar />
      
      {/* Contenedor Principal */}
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}