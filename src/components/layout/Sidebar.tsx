"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, CalendarDays, MapPin, BarChart2, User, Settings, 
  ChevronLeft, ChevronRight, LogOut, DollarSign, Shield, Menu, X, Ticket, BookCheck,
  Factory, Barcode, Briefcase, Package, Scissors, Truck, ChevronDown, ChevronUp,Badge, FileUser, HandCoins, Bell
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
    label: 'DIRECCIÓN COMERCIAL',
    icon: Briefcase,
    isGroup: true,
    items: [
      { icon: Building2, label: 'Instituciones', href: '/instituciones', permiso: 'instituciones:ver' },
      { icon: CalendarDays, label: 'Agenda', href: '/agenda', permiso: 'agenda:ver' },
      { icon: DollarSign, label: 'Ventas', href: '/ventas', permiso: 'ventas:ver' },
      { icon: MapPin, label: 'Seguimientos', href: '/visitas', permiso: 'visitas:ver' },
      { icon: BarChart2, label: 'Indicadores', href: '/indicadores', permiso: 'indicadores:ver' },
      { icon: HandCoins, label: 'Cobranzas', href: '/cobranzas', permiso: 'cobranzas:ver' },
    ]
  },
  {
    label: 'OPERACIONES',
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
    label: 'MESA DE AYUDA',
    icon: Ticket,
    isGroup: true,
    items: [
      { icon: BookCheck, label: 'TICKETS', href: '/tickets', permiso: 'tickets:ver' },
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'DIRECCIÓN COMERCIAL': true,
    'OPERACIONES': false,
    'CONFIGURACIONES': false,
    'TICKETS': false
  });
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (
        notificationsRef.current && 
        !notificationsRef.current.contains(target) &&
        !target.closest('#mobile-notif-panel') 
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotificacionesTickets = async () => {
      try {
        const res = await fetch('/api/tickets?alertas=true');
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentTickets(data);
          const vistos = JSON.parse(localStorage.getItem('ticketsVistos') || '{}');
          let noLeidos = 0;
          
          data.forEach((t: any) => {
            const fechaVisto = vistos[t.id];
            const fechaActualizacion = new Date(t.updatedAt).getTime();
            if (!fechaVisto || fechaActualizacion > fechaVisto) {
              noLeidos++;
            }
          });
          
          setUnreadTicketsCount(noLeidos);
        }
      } catch (e) {
        console.error("Error buscando notificaciones", e);
      }
    };

    fetchNotificacionesTickets();
    const intervalId = setInterval(fetchNotificacionesTickets, 30000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetch('/api/catalogos')
      .then(res => res.json())
      .then(data => {
        if (data.userRol) setUserRol(data.userRol);
        if (data.userPermisos) setUserPermisos(data.userPermisos);
      })
      .catch(err => console.error(err));
  }, []);
  const handleToggleNotificaciones = () => {
    const nuevoEstado = !isNotificationsOpen;
    setIsNotificationsOpen(nuevoEstado);
    
    if (nuevoEstado) {
      const vistos = JSON.parse(localStorage.getItem('ticketsVistos') || '{}');
      recentTickets.forEach(t => {
        vistos[t.id] = new Date(t.updatedAt).getTime();
      });
      localStorage.setItem('ticketsVistos', JSON.stringify(vistos));
      setUnreadTicketsCount(0); 
    }
  };

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

        <div className="flex h-20 items-center justify-between border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-base text-foreground tracking-wide truncate">ARAUJOS</span>
                <span className="text-[10px] text-muted-foreground truncate font-semibold">SISTEMA VENTAS</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={handleToggleNotificaciones} 
                className="relative p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                title="Tickets Asignados"
              >
                <Bell size={20} />
                {unreadTicketsCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                    {unreadTicketsCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute top-12 left-0 sm:-left-32 w-72 bg-white border border-gray-200 shadow-2xl rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex justify-between items-center">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Tus Tickets Activos</span>
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]">{unreadTicketsCount}</Badge>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {recentTickets.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-gray-400 italic">No tienes tickets pendientes. ¡Buen trabajo!</div>
                    ) : (
                      recentTickets.map(ticket => (
                        <Link 
                          key={ticket.id} 
                          href={`/tickets?ticketId=${ticket.id}`} 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="flex flex-col p-3 border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-blue-600">{ticket.codigo}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${ticket.estado === 'Re-Abierto' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {ticket.estado}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-800 truncate">{ticket.asunto}</span>
                          <span className="text-[10px] text-gray-500 mt-1 truncate">De: {ticket.creadorNombre}</span>
                        </Link>
                      ))
                    )}
                  </div>
                  
                  <Link 
                    href="/tickets" 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="block text-center bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-600 p-3 transition-colors"
                  >
                    Ver Todos
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden space-y-1">
          {permittedMenu.map((group: any, idx) => {
            if (!group.isGroup) {
              const isActive = pathname === group.href;
              return (
                <Link key={group.label} href={group.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`} title={isCollapsed ? group.label : undefined}>
                  <group.icon size={20} className={isActive ? 'text-primary-foreground shrink-0' : 'text-muted-foreground shrink-0'} />
                  {!isCollapsed && <span className="text-sm truncate">{group.label}</span>}
                </Link>
              );
            }
            const isOpen = openGroups[group.label];
            const hasActiveChild = group.items.some((i: any) => pathname === i.href);

            return (
              <div key={group.label} className="mt-4 first:mt-0">
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
        <button 
          onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsMobileMenuOpen(false); }} 
          className="flex flex-col items-center justify-center w-full h-full gap-1 relative"
        >
          <div className="relative">
            <Bell size={22} className={isNotificationsOpen ? 'text-amber-500' : 'text-muted-foreground'} />
            {unreadTicketsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 h-4 w-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-white animate-in zoom-in">
                {unreadTicketsCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${isNotificationsOpen ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>Alertas</span>
        </button>
        <button 
          onClick={() => { setIsMobileMenuOpen(true); setIsNotificationsOpen(false); }} 
          className="flex flex-col items-center justify-center w-full h-full gap-1"
        >
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
      {isNotificationsOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsNotificationsOpen(false)}></div>
          
          <div id="mobile-notif-panel" className="relative bg-white w-full rounded-t-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full"><Bell className="text-amber-600" size={20} /></div>
                <span className="font-bold text-foreground text-sm">Tus Alertas</span>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] ml-1">{unreadTicketsCount} Nuevas</Badge>
              </div>
              <button onClick={() => setIsNotificationsOpen(false)} className="bg-muted text-muted-foreground hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 mb-2 space-y-2">
              {recentTickets.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">No tienes tickets ni alertas pendientes.</div>
              ) : (
                recentTickets.map(ticket => (
                  <Link 
                    key={ticket.id} 
                    href={`/tickets?ticketId=${ticket.id}`} 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="flex flex-col p-3.5 border border-gray-100 bg-gray-50 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-blue-600">{ticket.codigo}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${ticket.estado === 'Re-Abierto' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ticket.estado}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-800 leading-tight">{ticket.asunto}</span>
                    <span className="text-[10px] text-gray-500 mt-2 font-medium">De: {ticket.creadorNombre}</span>
                  </Link>
                ))
              )}
            </div>
            
            <Link 
              href="/tickets" 
              onClick={() => setIsNotificationsOpen(false)}
              className="mt-3 block text-center bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 p-3.5 rounded-xl transition-colors shadow-sm"
            >
              Ver Todos los Tickets
            </Link>
          </div>
        </div>
      )}
    </>
  );
}