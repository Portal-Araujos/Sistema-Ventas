"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Building2, CalendarDays, MapPin, 
  ShieldCheck, BarChart2, User, Settings,
  ChevronLeft, ChevronRight, LogOut, DollarSign, Shield
} from 'lucide-react';

const allMenuItems = [
  { icon: Home, label: 'Inicio', href: '/inicio', permiso: 'inicio:ver' },
  { icon: Building2, label: 'Instituciones', href: '/instituciones', permiso: 'instituciones:ver' },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda', permiso: 'agenda:ver' },
  { icon: DollarSign, label: 'Ventas', href: '/ventas', permiso: 'ventas:ver' },
  { icon: MapPin, label: 'Seguimientos', href: '/visitas', permiso: 'visitas:ver' },
  //{ icon: ShieldCheck, label: 'Seguimientos', href: '/seguimientos', permiso: 'seguimientos:ver' },
  { icon: BarChart2, label: 'Indicadores', href: '/indicadores', permiso: 'indicadores:ver' },
  { icon: Settings, label: 'Configuración', href: '/configuracion', permiso: 'configuracion:ver' },
  { icon: User, label: 'Usuarios', href: '/usuarios', permiso: 'usuarios:gestionar' },
  { icon: Shield, label: 'Roles y Permisos', href: '/roles', permiso: 'super_admin_only' } // Solo el jefe crea roles
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRol, setUserRol] = useState<string>('vendedor');
  const [userPermisos, setUserPermisos] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/catalogos')
      .then(res => res.json())
      .then(data => {
        if (data.userRol) setUserRol(data.userRol);
        if (data.userPermisos) setUserPermisos(data.userPermisos);
      })
      .catch(err => console.error(err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {}
  };

  // 🔥 MAGIA DE PERMISOS DINÁMICOS 🔥
  // El Super Admin ve todo automáticamente. Los demás ven solo lo que tenga Check en la matriz.
  const menuItems = allMenuItems.filter(item => {
    if (userRol === 'super_admin') return true;
    if (item.permiso === 'super_admin_only') return false; 
    return userPermisos.includes(item.permiso);
  });

  return (
    <>
      <aside className={`hidden md:flex flex-col shrink-0 bg-primary text-white transition-all duration-300 sticky top-0 h-screen z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-white text-primary rounded-full p-1 shadow-md border border-gray-200 z-50">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="flex h-20 items-center justify-center border-b border-white/10 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 font-bold text-xl">SG</div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-wide truncate">ARAUJOS</span>
                <span className="text-[10px] text-gray-300 truncate">GESTIÓN COMERCIAL</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${isActive ? 'bg-white text-primary font-semibold shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={isCollapsed ? item.label : undefined}>
                <item.icon size={20} className={isActive ? 'text-primary shrink-0' : 'text-gray-300 shrink-0'} />
                {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0 bg-primary">
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-red-200 hover:bg-red-500/20 hover:text-white transition-colors" title={isCollapsed ? "Cerrar Sesión" : undefined}>
            <LogOut size={20} className="shrink-0 text-red-300" />
            {!isCollapsed && <span className="text-sm font-semibold truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-50 shadow-lg">
        {menuItems.slice(0, 3).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1">
              <item.icon size={20} className={isActive ? 'text-primary' : 'text-gray-400'} />
              <span className={`text-[10px] ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full gap-1 text-red-500">
          <LogOut size={20} /><span className="text-[10px]">Salir</span>
        </button>
      </nav>
    </>
  );
}