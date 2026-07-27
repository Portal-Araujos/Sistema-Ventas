"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Building2, CalendarDays, MapPin, 
  ShieldCheck, BarChart2, User, Settings,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';

const allMenuItems = [
  { icon: Home, label: 'Inicio', href: '/inicio', roles: ['super_admin', 'administrador'] },
  { icon: Building2, label: 'Instituciones', href: '/instituciones', roles: ['super_admin', 'administrador', 'vendedor'] },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda', roles: ['super_admin', 'administrador', 'vendedor'] },
  { icon: MapPin, label: 'Visitas', href: '/visitas', roles: ['super_admin', 'administrador', 'vendedor'] },
  { icon: ShieldCheck, label: 'Seguimientos', href: '/seguimientos', roles: ['super_admin', 'administrador', 'vendedor'] },
  { icon: BarChart2, label: 'Indicadores', href: '/indicadores', roles: ['super_admin', 'administrador'] },
  { icon: Settings, label: 'Configuración', href: '/configuracion', roles: ['super_admin', 'administrador'] },
  { icon: User, label: 'Personal/Usuarios', href: '/usuarios', roles: ['super_admin', 'administrador'] }
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRol, setUserRol] = useState<string>('vendedor');
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/catalogos')
      .then(res => res.json())
      .then(data => {
        if (data.userRol) setUserRol(data.userRol);
      })
      .catch(err => console.error(err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      alert("Error al cerrar sesión");
    }
  };

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRol));

  return (
    <>
      {/* --- VISTA ESCRITORIO (Sidebar Fijo con Sticky h-screen) --- */}
      <aside 
        className={`hidden md:flex flex-col shrink-0 bg-primary text-white transition-all duration-300 sticky top-0 h-screen z-40 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Botón para colapsar/expandir */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-white text-primary rounded-full p-1 shadow-md border border-gray-200 hover:bg-gray-50 z-50"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* 1. CABECERA / LOGO (Fijo Arriba) */}
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 font-bold text-xl">
              SG
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-wide truncate">ARAUJOS</span>
                <span className="text-[10px] text-gray-300 truncate">GESTIÓN COMERCIAL</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. MENÚ DE NAVEGACIÓN (Scroll Interno si hay muchos módulos) */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive ? 'bg-white text-primary font-semibold shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={20} className={isActive ? 'text-primary shrink-0' : 'text-gray-300 shrink-0'} />
                {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 3. BOTÓN CERRAR SESIÓN (Fijo Abajo de la Pantalla) */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-primary">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-red-200 hover:bg-red-500/20 hover:text-white transition-colors"
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut size={20} className="shrink-0 text-red-300" />
            {!isCollapsed && <span className="text-sm font-semibold truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* --- VISTA CELULAR (Barra Inferior Fija) --- */}
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
          <LogOut size={20} />
          <span className="text-[10px]">Salir</span>
        </button>
      </nav>
    </>
  );
}