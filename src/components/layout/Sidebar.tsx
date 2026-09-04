"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, CalendarDays, MapPin, BarChart2, User, Settings, 
  ChevronLeft, ChevronRight, LogOut, DollarSign, Shield, Menu, X, Ticket, BookCheck,
  Factory, Barcode, Briefcase, Package, Scissors, Truck, ChevronDown, ChevronUp, FileUser, HandCoins, Landmark
} from 'lucide-react';
const menuStructure = [
  { 
    label: 'Inicio', 
    href: '/inicio', 
    icon: Home, 
    permiso: 'inicio:ver', 
    isGroup: false 
  },
  {
    label: 'VISITAS Y VENTAS',
    icon: Briefcase,
    isGroup: true,
    items: [
      { icon: Building2, label: 'Instituciones', href: '/instituciones', permiso: 'instituciones:ver' },
      { icon: CalendarDays, label: 'Agenda', href: '/agenda', permiso: 'agenda:ver' },
      { icon: DollarSign, label: 'Ventas', href: '/ventas', permiso: 'ventas:ver' },
      { icon: MapPin, label: 'Seguimientos', href: '/visitas', permiso: 'visitas:ver' },
      { icon: BarChart2, label: 'Indicadores', href: '/indicadores', permiso: 'indicadores:ver' }
    ]
  },
  {
    label: 'GESTIÓN DE COBRANZAS',
    icon: Landmark,
    isGroup: true,
    items: [
      { icon: HandCoins, label: 'Cobranzas', href: '/cobranzas', permiso: 'cobranzas:ver' },
    ]
  },
  {
    label: 'PRODUCCIÓN',
    icon: Factory,
    isGroup: true,
    items: [
      { icon: Barcode, label: 'Catálogo SKU', href: '/configuracion/skus', permiso: 'skus:ver' },
      { icon: Package, label: 'Pedidos', href: '/pedidos', permiso: 'pedidos:ver' },
      { icon: Settings, label: 'Operaciones', href: '/operaciones', permiso: 'operaciones:ver' },
      { icon: Scissors, label: 'Producción', href: '/produccion', permiso: 'produccion:ver' },
      { icon: Truck, label: 'Despacho', href: '/empaque', permiso: 'empaque:ver' },
      { icon: FileUser, label: 'Historial Guias', href: '/historial-despachos', permiso: 'historial-despachos:ver' }
    ]
  },
  {
    label: 'TICKETS',
    icon: Ticket,
    isGroup: true,
    items: [
      { icon: BookCheck, label: 'Mesa Ayuda', href: '/tickets', permiso: 'tickets:ver' },
    ]
  },
  {
    label: 'CONFIGURACIONES',
    icon: Settings,
    isGroup: true,
    items: [
      { icon: Settings, label: 'Catálogos Gral.', href: '/configuracion', permiso: 'configuracion:ver' },
      { icon: User, label: 'Usuarios', href: '/usuarios', permiso: 'usuarios:gestionar' },
      { icon: Shield, label: 'Roles y Permisos', href: '/roles', permiso: 'super_admin_only' }
    ]
  }
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRol, setUserRol] = useState<string>('vendedor');
  const [userPermisos, setUserPermisos] = useState<string[]>([]);
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estado para controlar qué acordeones están abiertos (Por defecto Ventas y Producción abiertos)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'VISITAS Y VENTAS': true,
    'PRODUCCIÓN': false,
    'GESTIÓN DE COBRANZAS': false,
    'CONFIGURACIONES': false,
    'TICKETS': false
  });

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
  const checkPerm = (perm: string) => {
    if (userRol === 'super_admin') return true;
    if (perm === 'super_admin_only') return false;
    return userPermisos.includes(perm);
  };

  const permittedMenu = menuStructure.map(group => {
    if (!group.isGroup) {
      return checkPerm(group.permiso!) ? group : null;
    }
    const filteredItems = group.items?.filter(item => checkPerm(item.permiso));
    if (filteredItems && filteredItems.length > 0) {
      return { ...group, items: filteredItems };
    }
    return null;
  }).filter(Boolean);

  // Lista plana para el menú de celular (Toma los 3 primeros links que tengas permitidos)
  const flatPermittedItems = permittedMenu.reduce((acc: any[], curr: any) => {
    return curr.isGroup ? [...acc, ...curr.items] : [...acc, curr];
  }, []);

  const toggleGroup = (label: string) => {
    if (isCollapsed) setIsCollapsed(false); // Expande el sidebar si tocas un acordeón cerrado
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-border transition-all duration-300 sticky top-0 h-screen z-40 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-white text-primary rounded-full p-1 shadow-md border border-border z-50 hover:bg-muted transition-colors">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="flex h-20 items-center justify-center border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-base text-foreground tracking-wide truncate">ARAUJOS</span>
                <span className="text-[10px] text-muted-foreground truncate font-semibold">SISTEMA VENTAS</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden space-y-1">
          {permittedMenu.map((group: any, idx) => {
            
            // 1. LINK SIMPLE (Como "Inicio")
            if (!group.isGroup) {
              const isActive = pathname === group.href;
              return (
                <Link key={group.label} href={group.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`} title={isCollapsed ? group.label : undefined}>
                  <group.icon size={20} className={isActive ? 'text-primary-foreground shrink-0' : 'text-muted-foreground shrink-0'} />
                  {!isCollapsed && <span className="text-sm truncate">{group.label}</span>}
                </Link>
              );
            }

            // 2. GRUPO ACORDEÓN (Visitas, Producción, Config)
            const isOpen = openGroups[group.label];
            const hasActiveChild = group.items.some((i: any) => pathname === i.href);

            return (
              <div key={group.label} className="mt-4 first:mt-0">
                
                {/* CABECERA DEL ACORDEÓN */}
                <button 
                  onClick={() => toggleGroup(group.label)} 
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''} ${hasActiveChild && !isOpen ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                  title={isCollapsed ? group.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <group.icon size={20} className={`shrink-0 ${hasActiveChild ? 'text-primary' : 'text-gray-400'}`}/>
                    {!isCollapsed && <span className={`text-xs font-black tracking-wider ${hasActiveChild ? 'text-primary' : 'text-gray-500'}`}>{group.label}</span>}
                  </div>
                  {!isCollapsed && (isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </button>

                {/* ÍTEMS DEL ACORDEÓN */}
                {(!isCollapsed && isOpen) && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 flex flex-col gap-1">
                    {group.items.map((item: any) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link 
                          key={item.label} 
                          href={item.href} 
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-gray-600 hover:bg-muted hover:text-primary font-medium'}`}
                        >
                          <item.icon size={16} className={isActive ? 'text-primary-foreground shrink-0' : 'text-gray-400 shrink-0'} />
                          <span className="text-sm truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border shrink-0 bg-white">
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-3 py-3 w-full text-red-600 hover:bg-red-50 transition-colors" title={isCollapsed ? "Cerrar Sesión" : undefined}>
            <LogOut size={20} className="shrink-0 text-red-500" />
            {!isCollapsed && <span className="text-sm font-bold truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* VERSIÓN MÓVIL (MENÚ INFERIOR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around items-center h-16 px-1 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] pb-safe">
        {flatPermittedItems.slice(0, 3).map((item) => {
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

      {/* VERSIÓN MÓVIL (MENÚ DESPLEGABLE "MÁS") */}
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
            
            <div className="overflow-y-auto flex-1 space-y-4 mb-4 pr-1">
              {permittedMenu.map((group: any, idx) => {
                if (!group.isGroup) {
                  return (
                    <Link key={group.label} href={group.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${pathname === group.href ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-foreground hover:bg-muted'}`}>
                      <group.icon size={20} className={pathname === group.href ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="text-sm">{group.label}</span>
                    </Link>
                  );
                }

                return (
                  <div key={group.label} className="pt-2">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2 px-3">{group.label}</h3>
                    <div className="space-y-1">
                      {group.items.map((item: any) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-gray-700 hover:bg-muted'}`}>
                            <item.icon size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
                            <span className="text-sm font-semibold">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
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