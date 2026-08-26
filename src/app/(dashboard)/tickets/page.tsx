"use client";

import React, { useState, useEffect } from 'react';
import { Ticket, Search, Plus, AlertCircle, CheckCircle2, Clock, Inbox, ChevronRight, User, RefreshCw,Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TicketChatDrawer from '@/components/shared/TicketChatDrawer';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [instituciones, setInstituciones] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ id: '', rol: '', departamento: 'General', esSuperAdmin: false });

  const [tabActiva, setTabActiva] = useState('General');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const [nuevoModalOpen, setNuevoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 🔥 CORRECCIÓN: El tipo inicia vacío para obligar a elegir 🔥
  const [nuevoTicket, setNuevoTicket] = useState({
    tipo: '', 
    institucionId: '',
    asignadoAId: '',
    prioridad: 'Media',
    asunto: '',
    mensajeInicial: ''
  });

  const [busquedaInst, setBusquedaInst] = useState('');
  const [resultadosInst, setResultadosInst] = useState<any[]>([]);
  const [dropdownInst, setDropdownInst] = useState(false);

  const [busquedaUser, setBusquedaUser] = useState('');
  const [resultadosUser, setResultadosUser] = useState<any[]>([]);
  const [dropdownUser, setDropdownUser] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resDeptos = await fetch('/api/departamentos');
      const dataDeptos = await resDeptos.json();
      const listaDeptos = Array.isArray(dataDeptos) ? dataDeptos : [];
      setDepartamentos(listaDeptos);

      const resTickets = await fetch('/api/tickets');
      const dataTickets = await resTickets.json();
      
      if (dataTickets.tickets) {
        setTickets(dataTickets.tickets);
        setCurrentUser(dataTickets.currentUser);
        
        if (dataTickets.currentUser.esSuperAdmin) {
          setTabActiva('General');
        } else if (dataTickets.currentUser.rol === 'vendedor') {
          setTabActiva('Mios'); 
        } else {
          setTabActiva('MiArea'); 
        }
      }

      try {
        const resUsu = await fetch('/api/usuarios');
        if (resUsu.ok) {
          const dataUsu = await resUsu.json();
          setUsuarios(Array.isArray(dataUsu) ? dataUsu : (dataUsu.data || []));
        }
      } catch(e) {}

    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleBuscarEscuela = async (termino: string) => {
    setBusquedaInst(termino);
    if (termino.trim().length < 2) { setResultadosInst([]); setDropdownInst(false); return; }
    try {
      const res = await fetch(`/api/instituciones?search=${encodeURIComponent(termino)}&limit=15`);
      const json = await res.json();
      setResultadosInst(Array.isArray(json) ? json : (json.data || []));
      setDropdownInst(true);
    } catch (error) {}
  };

  const seleccionarEscuela = (inst: any) => {
    setNuevoTicket({ ...nuevoTicket, institucionId: inst.id });
    setBusquedaInst(`${inst.nombre} (${inst.canton || 'S/C'})`);
    setDropdownInst(false);
  };

  const handleBuscarUsuario = (termino: string) => {
    setBusquedaUser(termino);
    if (termino.trim().length < 1) { setResultadosUser([]); setDropdownUser(false); return; }
    const filtrados = usuarios.filter(u => u.nombre.toLowerCase().includes(termino.toLowerCase()));
    setResultadosUser(filtrados);
    setDropdownUser(true);
  };

  const seleccionarUsuario = (user: any) => {
    setNuevoTicket({ ...nuevoTicket, asignadoAId: user.id });
    setBusquedaUser(`${user.nombre} - ${user.rolNombre}`);
    setDropdownUser(false);
  };

  const handleCrearTicket = async () => {
    // 🔥 CORRECCIÓN: Validación estricta para que no se guarde como 'General' 🔥
    if (!nuevoTicket.tipo) {
      return alert("Por favor, selecciona a qué ÁREA RESPONSABLE va dirigido este ticket.");
    }
    if (!nuevoTicket.institucionId || !nuevoTicket.asunto || !nuevoTicket.mensajeInicial) {
      return alert("Completa la Institución, el Asunto y el Mensaje Inicial.");
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'crearTicket', ...nuevoTicket })
      });
      if (res.ok) {
        setNuevoModalOpen(false);
        // Reseteamos el formulario
        setNuevoTicket({ tipo: '', institucionId: '', asignadoAId: '', prioridad: 'Media', asunto: '', mensajeInicial: '' });
        setBusquedaInst('');
        setBusquedaUser('');
        await cargarDatos();
      } else { alert("Error al crear el ticket"); }
    } catch (e) { alert("Error de conexión"); } finally { setSaving(false); }
  };

  const abrirChat = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setChatOpen(true);
  };

  const getColorEstado = (est: string) => {
    switch (est) {
      case 'Abierto': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pendiente': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Cerrado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Re-Abierto': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ticketsFiltrados = tickets.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const pasaSearch = t.codigo.toLowerCase().includes(searchLower) || 
                       t.asunto.toLowerCase().includes(searchLower) ||
                       t.institucion?.nombre.toLowerCase().includes(searchLower);
    
    if (!pasaSearch) return false;

    if (currentUser.esSuperAdmin) {
      return tabActiva === 'General' || t.tipo === tabActiva;
    } else if (currentUser.rol === 'vendedor') {
      return true; 
    } else {
      if (tabActiva === 'MiArea') return t.tipo === currentUser.departamento;
      if (tabActiva === 'Mios') return t.asignadoAId === currentUser.id || t.creadorId === currentUser.id;
      return true;
    }
  });

  const conteoAbiertos = ticketsFiltrados.filter(t => t.estado === 'Abierto' || t.estado === 'Re-Abierto').length;
  const conteoEnProceso = ticketsFiltrados.filter(t => t.estado === 'En Proceso').length;
  const conteoPendientes = ticketsFiltrados.filter(t => t.estado === 'Pendiente').length;
  const conteoCerrados = ticketsFiltrados.filter(t => t.estado === 'Cerrado').length;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30 overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Ticket className="text-primary" /> Mesa de Ayuda
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de requerimientos y tickets operativos.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-md font-bold h-10 px-5 w-full sm:w-auto" onClick={() => setNuevoModalOpen(true)}>
          <Plus size={18} className="mr-2" /> Nuevo Ticket
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600"><Inbox size={24}/></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Abiertos</p><p className="text-2xl font-black text-gray-900">{conteoAbiertos}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><RefreshCw size={24}/></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">En Proceso</p><p className="text-2xl font-black text-gray-900">{conteoEnProceso}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><Clock size={24}/></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pendientes</p><p className="text-2xl font-black text-gray-900">{conteoPendientes}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><CheckCircle2 size={24}/></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resueltos</p><p className="text-2xl font-black text-gray-900">{conteoCerrados}</p></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-gray-200 pb-2">
        {/* 🔥 CONTENEDOR DE PESTAÑAS (SCROLL HORIZONTAL PARA MÓVILES Y MUCHAS ÁREAS) 🔥 */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          
          {currentUser.esSuperAdmin ? (
            <>
              <button onClick={() => setTabActiva('General')} className={`px-4 py-2 text-sm font-black transition-all rounded-t-lg whitespace-nowrap ${tabActiva === 'General' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-100'}`}>🌍 Vista Global</button>
              {departamentos.map(d => (
                <button key={d.id} onClick={() => setTabActiva(d.nombre)} className={`px-4 py-2 text-sm font-black transition-all rounded-t-lg whitespace-nowrap ${tabActiva === d.nombre ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-100'}`}>{d.nombre}</button>
              ))}
            </>
          ) : currentUser.rol === 'vendedor' ? (
            <button onClick={() => setTabActiva('Mios')} className={`px-4 py-2 text-sm font-black transition-all rounded-t-lg whitespace-nowrap border-b-2 border-primary text-primary bg-primary/5`}>👤 Mis Tickets Asignados</button>
          ) : (
            <>
              <button onClick={() => setTabActiva('MiArea')} className={`px-4 py-2 text-sm font-black transition-all rounded-t-lg whitespace-nowrap flex items-center gap-1 ${tabActiva === 'MiArea' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-100'}`}><Briefcase size={14}/> Área: {currentUser.departamento}</button>
              <button onClick={() => setTabActiva('Mios')} className={`px-4 py-2 text-sm font-black transition-all rounded-t-lg whitespace-nowrap flex items-center gap-1 ${tabActiva === 'Mios' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-100'}`}><User size={14}/> Mis Tickets (Directos)</button>
            </>
          )}

        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input className="pl-9 bg-white border-gray-200 h-10" placeholder="Buscar ticket, escuela..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Cargando mesa de ayuda...</div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <CheckCircle2 size={48} className="text-gray-300 mb-3"/>
            <p className="text-lg font-bold text-gray-500">Bandeja limpia</p>
            <p className="text-sm text-gray-400">No hay tickets en esta sección.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs font-black">
                <tr>
                  <th className="p-4">Ticket</th>
                  <th className="p-4">Asunto / Institución</th>
                  <th className="p-4">Área Responsable</th>
                  <th className="p-4">Asignado a</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ticketsFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => abrirChat(t.id)}>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{t.codigo}</div>
                      <div className={`text-[10px] font-black uppercase mt-0.5 ${t.prioridad === 'Alta' || t.prioridad === 'Urgente' ? 'text-red-500' : 'text-gray-400'}`}>Prio: {t.prioridad}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-primary truncate max-w-200px sm:max-w-300px">{t.asunto}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><AlertCircle size={10}/> {t.institucion?.nombre || 'General'}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-700">{t.tipo}</td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-800">{t.asignado?.nombre || 'Sin asignar'}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">De: {t.creador?.nombre}</div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`text-xs ${getColorEstado(t.estado)}`}>{t.estado}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 font-bold h-8">
                        Abrir Chat <ChevronRight size={16} className="ml-1"/>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TicketChatDrawer 
        isOpen={chatOpen} 
        onClose={() => { setChatOpen(false); setSelectedTicketId(null); cargarDatos(); }} 
        ticketId={selectedTicketId}
        currentUserId={currentUser.id}
        currentUserRol={currentUser.rol}
      />

      <Dialog open={nuevoModalOpen} onOpenChange={setNuevoModalOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw] bg-white p-4 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Plus size={20} className="text-primary"/> Generar Nuevo Ticket
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 🔥 CAMBIO: SELECTOR OBLIGATORIO DE ÁREA 🔥 */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-700 uppercase">Área Responsable (Para quién es) *</Label>
                <select className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white outline-none font-bold text-blue-700" value={nuevoTicket.tipo} onChange={e => setNuevoTicket({...nuevoTicket, tipo: e.target.value})}>
                  <option value="">-- Seleccione un Área --</option>
                  {departamentos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-700 uppercase">Nivel de Urgencia</Label>
                <select className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white outline-none font-bold" value={nuevoTicket.prioridad} onChange={e => setNuevoTicket({...nuevoTicket, prioridad: e.target.value})}>
                  <option value="Baja">🟢 Baja</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Alta">🟠 Alta</option>
                  <option value="Urgente">🔴 Urgente</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">Institución Involucrada *</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <Input className="pl-9 h-11 text-sm bg-white border-gray-300" placeholder="Escribe para buscar escuela..." value={busquedaInst} onChange={(e) => handleBuscarEscuela(e.target.value)} />
              </div>
              {dropdownInst && resultadosInst.length > 0 && (
                <ul className="absolute z-9999 w-full bg-white border border-gray-200 shadow-2xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {resultadosInst.map(inst => (
                    <li key={inst.id} className="px-4 py-2 hover:bg-primary/5 cursor-pointer border-b border-gray-50" onClick={() => seleccionarEscuela(inst)}>
                      <p className="text-sm font-bold text-gray-800">{inst.nombre}</p>
                      <p className="text-[10px] text-gray-500">{inst.canton}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 relative">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">Asignar a (Opcional)</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <Input className="pl-9 h-11 text-sm bg-white border-gray-300" placeholder="Buscar empleado o vendedor..." value={busquedaUser} onChange={(e) => handleBuscarUsuario(e.target.value)} onFocus={() => { if(!busquedaUser) handleBuscarUsuario(' '); }} />
              </div>
              {dropdownUser && (
                <ul className="absolute z-[9999 w-full bg-white border border-gray-200 shadow-2xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  <li className="px-4 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-50 text-red-600 text-sm font-bold" onClick={() => { setNuevoTicket({...nuevoTicket, asignadoAId: ''}); setBusquedaUser('Sin asignar / Cualquiera'); setDropdownUser(false); }}>
                    Dejar sin asignar
                  </li>
                  {resultadosUser.map(user => (
                    <li key={user.id} className="px-4 py-2 hover:bg-primary/5 cursor-pointer border-b border-gray-50" onClick={() => seleccionarUsuario(user)}>
                      <p className="text-sm font-bold text-gray-800">{user.nombre}</p>
                      <p className="text-[10px] text-primary uppercase font-black">{user.rolNombre || 'USUARIO'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">Asunto del Ticket *</Label>
              <Input placeholder="Ej: Falta copia de cédula contrato #1234" value={nuevoTicket.asunto} onChange={e => setNuevoTicket({...nuevoTicket, asunto: e.target.value})} className="h-11 text-sm font-medium border-gray-300" />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">Mensaje Inicial (Instrucciones) *</Label>
              <textarea 
                className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                placeholder="Escribe los detalles y lo que esperas que resuelvan..."
                value={nuevoTicket.mensajeInicial}
                onChange={e => setNuevoTicket({...nuevoTicket, mensajeInicial: e.target.value})}
              />
            </div>

          </div>
          <DialogFooter className="mt-4 border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNuevoModalOpen(false)} className="w-full sm:w-auto h-11 font-bold order-2 sm:order-1">Cancelar</Button>
            <Button className="w-full sm:w-auto h-11 bg-primary hover:bg-primary/90 text-white font-bold order-1 sm:order-2" disabled={saving} onClick={handleCrearTicket}>
              {saving ? 'Generando...' : 'Crear e Iniciar Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}