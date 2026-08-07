"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, CalendarDays, MapPin, BarChart2, User, Settings, ChevronLeft, ChevronRight, LogOut, DollarSign, Shield, Menu, X, Factory, Barcode } from 'lucide-react';

const allMenuItems = [
  { icon: Home, label: 'Inicio', href: '/inicio', permiso: 'inicio:ver' },
  { icon: Building2, label: 'Instituciones', href: '/instituciones', permiso: 'instituciones:ver' },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda', permiso: 'agenda:ver' },
  { icon: DollarSign, label: 'Ventas', href: '/ventas', permiso: 'ventas:ver' },
  { icon: MapPin, label: 'Seguimientos', href: '/visitas', permiso: 'visitas:ver' },
  { icon: Factory, label: 'Producción', href: '/pedidos', permiso: 'admin_only' },
  { icon: Barcode, label: 'Catálogo SKU', href: '/configuracion/skus', permiso: 'admin_only' },
  { icon: BarChart2, label: 'Indicadores', href: '/indicadores', permiso: 'indicadores:ver' },
  { icon: Settings, label: 'Configuración', href: '/configuracion', permiso: 'configuracion:ver' },
  { icon: User, label: 'Usuarios', href: '/usuarios', permiso: 'usuarios:gestionar' },
  { icon: Shield, label: 'Roles y Permisos', href: '/roles', permiso: 'super_admin_only' } 
];
export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRol, setUserRol] = useState<string>('vendedor');
  const [userPermisos, setUserPermisos] = useState<string[]>([]);
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const menuItems = allMenuItems.filter(item => {
    if (userRol === 'super_admin') return true; // El Super Admin ve todo
    if (item.permiso === 'super_admin_only') return false; 
    // 🔥 Nueva regla: Solo administradores ven Producción y SKUs
    if (item.permiso === 'admin_only') return userRol === 'administrador'; 
    return userPermisos.includes(item.permiso);
  });
  return (
    <>
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-border transition-all duration-300 sticky top-0 h-screen z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-white text-primary rounded-full p-1 shadow-md border border-border z-50 hover:bg-muted transition-colors">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <div className="flex h-20 items-center justify-center border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm text-foreground tracking-wide truncate">ARAUJOS</span>
                <span className="text-[10px] text-muted-foreground truncate">GESTIÓN COMERCIAL</span>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${isActive ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`} title={isCollapsed ? item.label : undefined}>
                <item.icon size={20} className={isActive ? 'text-primary-foreground shrink-0' : 'text-muted-foreground shrink-0'} />
                {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border shrink-0 bg-white">
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-red-600 hover:bg-red-50 transition-colors" title={isCollapsed ? "Cerrar Sesión" : undefined}>
            <LogOut size={20} className="shrink-0 text-red-500" />
            {!isCollapsed && <span className="text-sm font-bold truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around items-center h-16 px-1 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] pb-safe">
        {menuItems.slice(0, 3).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1">
              <item.icon size={22} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full gap-1">
          <Menu size={22} className={isMobileMenuOpen ? 'text-primary' : 'text-muted-foreground'} />
          <span className={`text-[10px] ${isMobileMenuOpen ? 'text-primary font-bold' : 'text-muted-foreground'}`}>Más</span>
        </button>
      </nav>
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-full rounded-t-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                <span className="font-bold text-foreground text-sm">Menú Principal</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="bg-muted text-muted-foreground hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 mb-4 pr-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.label} 
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-foreground hover:bg-muted'}`}
                  >
                    <item.icon size={20} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100 transition-colors mt-2">
              <LogOut size={20} /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}