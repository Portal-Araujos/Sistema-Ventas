"use client";

import React, { useState, useEffect } from "react";
import {
  Ticket,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  HardDrive,
  Inbox,
  ChevronRight,
  User,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Briefcase,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import TicketChatDrawer from "@/components/shared/TicketChatDrawer";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [instituciones, setInstituciones] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    id: "",
    rol: "",
    departamento: "General",
    esSuperAdmin: false,
  });
  const [tabActiva, setTabActiva] = useState("General");
  const [searchTerm, setSearchTerm] = useState("");

  const [filtroCreador, setFiltroCreador] = useState("");
  const [filtroAsignado, setFiltroAsignado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ESTADOS DE FILTROS Y PAGINACIÓN
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key)
      return (
        <ArrowUpDown
          size={14}
          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      );
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="text-primary" />
    ) : (
      <ArrowDown size={14} className="text-primary" />
    );
  };

  const [chatOpen, setChatOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [nuevoModalOpen, setNuevoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalMantenimientoOpen, setModalMantenimientoOpen] = useState(false);
  const [mesesLimpieza, setMesesLimpieza] = useState("6");
  const [limpiando, setLimpiando] = useState(false);

  const ejecutarLimpiezaMasiva = async () => {
    if (
      !confirm(
        `¿Estás seguro de borrar todos los archivos físicos más antiguos de ${mesesLimpieza} meses? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setLimpiando(true);
    try {
      const res = await fetch("/api/tickets/mantenimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meses: parseInt(mesesLimpieza) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `✅ Mantenimiento exitoso: Se eliminaron ${data.borrados} archivos.`,
        );
        setModalMantenimientoOpen(false);
        cargarDatos();
      } else {
        alert(data.error || "Error al limpiar el servidor");
      }
    } catch (e) {
      alert("Error de conexión al servidor");
    } finally {
      setLimpiando(false);
    }
  };

  const [nuevoTicket, setNuevoTicket] = useState<{
    tipo: string;
    institucionId: string;
    asignadosIds: string[];
    prioridad: string;
    asunto: string;
    mensajeInicial: string;
    fechaLimite: string;
  }>({
    tipo: "",
    institucionId: "",
    asignadosIds: [],
    prioridad: "Media",
    asunto: "",
    mensajeInicial: "",
    fechaLimite: "",
  });

  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<any[]>([]);
  const [busquedaInst, setBusquedaInst] = useState("");
  const [resultadosInst, setResultadosInst] = useState<any[]>([]);
  const [dropdownInst, setDropdownInst] = useState(false);
  const [busquedaUser, setBusquedaUser] = useState("");
  const [resultadosUser, setResultadosUser] = useState<any[]>([]);
  const [dropdownUser, setDropdownUser] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resDeptos = await fetch("/api/departamentos");
      const dataDeptos = await resDeptos.json();
      setDepartamentos(Array.isArray(dataDeptos) ? dataDeptos : []);
      const resTickets = await fetch("/api/tickets");
      const dataTickets = await resTickets.json();

      if (dataTickets.tickets) {
        setTickets(dataTickets.tickets);
        setCurrentUser(dataTickets.currentUser);
        if (dataTickets.currentUser.esSuperAdmin) setTabActiva("General");
        else if (dataTickets.currentUser.rol === "vendedor")
          setTabActiva("Mios");
        else setTabActiva("MiArea");
      }
      try {
        const resUsu = await fetch("/api/usuarios");
        if (resUsu.ok) {
          const dataUsu = await resUsu.json();
          setUsuarios(Array.isArray(dataUsu) ? dataUsu : dataUsu.data || []);
        }
      } catch (e) {}
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get("ticketId");
    if (tId) {
      abrirChat(parseInt(tId));
      // Limpiamos la URL para que no se vuelva a abrir si recarga la página
      window.history.replaceState({}, "", "/tickets");
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tabActiva, estadoFiltro]);

  const handleBuscarEscuela = async (termino: string) => {
    setBusquedaInst(termino);
    if (termino.trim().length < 2) {
      setResultadosInst([]);
      setDropdownInst(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/instituciones?search=${encodeURIComponent(termino)}&limit=15`,
      );
      const json = await res.json();
      setResultadosInst(Array.isArray(json) ? json : json.data || []);
      setDropdownInst(true);
    } catch (error) {}
  };

  const seleccionarEscuela = (inst: any) => {
    setNuevoTicket({ ...nuevoTicket, institucionId: inst.id });
    setBusquedaInst(`${inst.nombre} (${inst.canton || "S/C"})`);
    setDropdownInst(false);
  };

  const normalizarTexto = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const handleBuscarUsuario = (termino: string) => {
    setBusquedaUser(termino);
    const termLimpio = normalizarTexto(termino.trim());
    if (termLimpio.length < 1) {
      setResultadosUser([]);
      setDropdownUser(false);
      return;
    }

    const filtrados = usuarios.filter(
      (u) =>
        normalizarTexto(u.nombre).includes(termLimpio) ||
        (u.rolNombre && normalizarTexto(u.rolNombre).includes(termLimpio)),
    );
    setResultadosUser(filtrados);
    setDropdownUser(true);
  };

  const seleccionarUsuario = (user: any) => {
    if (!nuevoTicket.asignadosIds.includes(user.id)) {
      setNuevoTicket((prev) => ({
        ...prev,
        asignadosIds: [...prev.asignadosIds, user.id],
      }));
      setUsuariosSeleccionados((prev) => [...prev, user]);
    }
    setBusquedaUser("");
    setDropdownUser(false);
  };

  const removerUsuario = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNuevoTicket((prev) => ({
      ...prev,
      asignadosIds: prev.asignadosIds.filter((id) => id !== userId),
    }));
    setUsuariosSeleccionados((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleCrearTicket = async () => {
    if (!nuevoTicket.tipo)
      return alert("Por favor, selecciona el ÁREA RESPONSABLE.");
    if (
      !nuevoTicket.institucionId ||
      !nuevoTicket.asunto ||
      !nuevoTicket.mensajeInicial
    )
      return alert("Completa Institución, Asunto y Mensaje.");
    if (nuevoTicket.asignadosIds.length === 0)
      return alert("Debes asignar el ticket a por lo menos 1 persona.");
    if (!nuevoTicket.fechaLimite)
      return alert("Debes seleccionar una Fecha Límite de resolución.");

    setSaving(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "crearTicket", ...nuevoTicket }),
      });
      if (res.ok) {
        setNuevoModalOpen(false);
        setNuevoTicket({
          tipo: "",
          institucionId: "",
          asignadosIds: [],
          prioridad: "Media",
          asunto: "",
          mensajeInicial: "",
          fechaLimite: "",
        });
        setUsuariosSeleccionados([]);
        setBusquedaInst("");
        setBusquedaUser("");
        await cargarDatos();
      } else {
        alert("Error al crear el ticket");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const abrirChat = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setChatOpen(true);
  };

  const getColorEstado = (est: string) => {
    switch (est) {
      case "Abierto":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "En Proceso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pendiente":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Cerrado":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Re-Abierto":
        return "bg-red-100 text-red-800 border-red-200";
      case "Vencido":
        return "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleFiltroEstado = (estado: string) => {
    setEstadoFiltro((prev) => (prev === estado ? null : estado));
  };

  const ticketsFiltrados = tickets.filter((t) => {
    if (filtroCreador && t.creador?.nombre !== filtroCreador) return false;
    if (
      filtroAsignado &&
      !t.asignados?.some((a: any) => a.nombre === filtroAsignado)
    )
      return false;
    if (fechaDesde || fechaHasta) {
      const fechaTicket = new Date(t.createdAt);
      if (fechaDesde && fechaTicket < new Date(`${fechaDesde}T00:00:00-05:00`))
        return false;
      if (fechaHasta && fechaTicket > new Date(`${fechaHasta}T23:59:59-05:00`))
        return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const pasaSearch =
      t.codigo.toLowerCase().includes(searchLower) ||
      t.asunto.toLowerCase().includes(searchLower) ||
      t.institucion?.nombre.toLowerCase().includes(searchLower);
    if (!pasaSearch) return false;

    if (estadoFiltro) {
      if (estadoFiltro === "Abierto") {
        if (t.estado !== "Abierto" && t.estado !== "Re-Abierto") return false;
      } else {
        if (t.estado !== estadoFiltro) return false;
      }
    } else {
      if (t.estado === "Cerrado" || t.estado === "Resuelto") return false;
    }
    if (currentUser.esSuperAdmin) {
      return tabActiva === "General" || t.tipo === tabActiva;
    } else if (currentUser.rol === "vendedor") {
      return true;
    } else {
      if (tabActiva === "MiArea") return t.tipo === currentUser.departamento;
      if (tabActiva === "Mios")
        return (
          t.creadorId === currentUser.id ||
          t.asignados?.some((a: any) => a.id === currentUser.id)
        );
      return true;
    }
  });
  // 🔥 ORDEN INTELIGENTE (3 NIVELES) 🔥
  const sortedTickets = [...ticketsFiltrados].sort((a, b) => {
    if (sortConfig) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    }
    // Nivel 1: Nuevos (<12h) o Urgentes | Nivel 2: Normales | Nivel 3: Cerrados/Vencidos
    const aNuevo = a.createdAt
      ? new Date().getTime() - new Date(a.createdAt).getTime() <
        12 * 60 * 60 * 1000
      : false;
    const bNuevo = b.createdAt
      ? new Date().getTime() - new Date(b.createdAt).getTime() <
        12 * 60 * 60 * 1000
      : false;
    const scoreA =
      aNuevo || a.prioridad === "Urgente" || a.prioridad === "Alta"
        ? 3
        : a.estado === "Cerrado" || a.estado === "Resuelto"
          ? 1
          : 2;
    const scoreB =
      bNuevo || b.prioridad === "Urgente" || b.prioridad === "Alta"
        ? 3
        : b.estado === "Cerrado" || b.estado === "Resuelto"
          ? 1
          : 2;

    if (scoreA !== scoreB) return scoreB - scoreA;
    // Si tienen la misma prioridad, ordenamos por la última respuesta (updatedAt)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const totalPages = Math.max(
    1,
    Math.ceil(sortedTickets.length / itemsPerPage),
  );
  const itemsPaginados = sortedTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const conteoAbiertos = tickets.filter(
    (t) => t.estado === "Abierto" || t.estado === "Re-Abierto",
  ).length;
  const conteoVencidos = tickets.filter((t) => t.estado === "Vencido").length;
  const conteoPendientes = tickets.filter(
    (t) => t.estado === "Pendiente",
  ).length;
  const conteoCerrados = tickets.filter((t) => t.estado === "Cerrado").length;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Ticket className="text-primary" /> Mesa de Ayuda
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de requerimientos y tickets operativos.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {currentUser.esSuperAdmin && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-10 shadow-sm"
              onClick={() => setModalMantenimientoOpen(true)}
            >
              <HardDrive size={18} className="mr-2" /> Mantenimiento
            </Button>
          )}
          <Button
            className="bg-primary hover:bg-primary/90 text-white shadow-md font-bold h-10 px-5 flex-1 sm:flex-none"
            onClick={() => setNuevoModalOpen(true)}
          >
            <Plus size={18} className="mr-2" /> Nuevo Ticket
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => toggleFiltroEstado("Abierto")}
          className={`bg-white p-4 rounded-2xl border cursor-pointer shadow-sm flex items-center gap-4 transition-all ${estadoFiltro === "Abierto" ? "ring-2 ring-amber-400 border-transparent bg-amber-50/30" : "border-gray-200 hover:border-amber-300"}`}
        >
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <Inbox size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Abiertos
            </p>
            <p className="text-2xl font-black text-gray-900">
              {conteoAbiertos}
            </p>
          </div>
        </div>
        <div
          onClick={() => toggleFiltroEstado("Vencido")}
          className={`bg-white p-4 rounded-2xl border cursor-pointer shadow-sm flex items-center gap-4 transition-all ${estadoFiltro === "Vencido" ? "ring-2 ring-rose-400 border-transparent bg-rose-50/30" : "border-gray-200 hover:border-rose-300"}`}
        >
          <div className="bg-rose-100 p-3 rounded-xl text-rose-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Vencidos (SLA)
            </p>
            <p className="text-2xl font-black text-rose-600 animate-pulse">
              {conteoVencidos}
            </p>
          </div>
        </div>
        <div
          onClick={() => toggleFiltroEstado("Pendiente")}
          className={`bg-white p-4 rounded-2xl border cursor-pointer shadow-sm flex items-center gap-4 transition-all ${estadoFiltro === "Pendiente" ? "ring-2 ring-purple-400 border-transparent bg-purple-50/30" : "border-gray-200 hover:border-purple-300"}`}
        >
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Pendientes
            </p>
            <p className="text-2xl font-black text-gray-900">
              {conteoPendientes}
            </p>
          </div>
        </div>
        <div
          onClick={() => toggleFiltroEstado("Cerrado")}
          className={`bg-white p-4 rounded-2xl border cursor-pointer shadow-sm flex items-center gap-4 transition-all ${estadoFiltro === "Cerrado" ? "ring-2 ring-emerald-400 border-transparent bg-emerald-50/30" : "border-gray-200 hover:border-emerald-300"}`}
        >
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Resueltos
            </p>
            <p className="text-2xl font-black text-gray-900">
              {conteoCerrados}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-0">
        <div className="flex flex-col lg:flex-row gap-4 w-full bg-gray-50/70 p-3 rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-full lg:w-1/2 relative">
            <Search
              size={18}
              className="absolute left-4 top-3.5 text-gray-400"
            />
            <Input
              className="pl-11 bg-white border-gray-200 h-11 rounded-xl text-sm font-medium w-full focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="Buscar ticket, asunto, escuela..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6 flex items-center justify-between bg-white border border-gray-200 rounded-xl px-2 h-11 shadow-sm hover:border-gray-300 transition-colors">
              <Input
                type="date"
                className="h-9 text-[11px] font-bold border-none w-full px-1 focus-visible:ring-0 text-center bg-transparent"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                title="Desde"
              />
              <span className="text-xs text-gray-300 font-black">-</span>
              <Input
                type="date"
                className="h-9 text-[11px] font-bold border-none w-full px-1 focus-visible:ring-0 text-center bg-transparent"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                title="Hasta"
              />
            </div>
            <select
              className="sm:col-span-3 h-11 border border-gray-200 rounded-xl px-2 text-[11px] font-bold bg-white text-gray-600 outline-none focus:border-primary shadow-sm hover:border-gray-300 transition-colors"
              value={filtroCreador}
              onChange={(e) => setFiltroCreador(e.target.value)}
            >
              <option value="">Creado por...</option>
              {Array.from(
                new Set(tickets.map((t) => t.creador?.nombre).filter(Boolean)),
              ).map((nombre: any) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
            <select
              className="sm:col-span-3 h-11 border border-gray-200 rounded-xl px-2 text-[11px] font-bold bg-white text-gray-600 outline-none focus:border-primary shadow-sm hover:border-gray-300 transition-colors"
              value={filtroAsignado}
              onChange={(e) => setFiltroAsignado(e.target.value)}
            >
              <option value="">Asignado a...</option>
              {Array.from(
                new Set(
                  tickets
                    .flatMap((t) => t.asignados?.map((a: any) => a.nombre))
                    .filter(Boolean),
                ),
              ).map((nombre: any) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full overflow-x-auto hide-scrollbar pt-1">
          {currentUser.esSuperAdmin ? (
            <>
              <button
                onClick={() => setTabActiva("General")}
                className={`px-4 py-2 text-sm font-black transition-all rounded-t-xl whitespace-nowrap ${tabActiva === "General" ? "border-b-2 border-primary text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100"}`}
              >
                🌍 Vista Global
              </button>
              {departamentos.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setTabActiva(d.nombre)}
                  className={`px-4 py-2 text-sm font-black transition-all rounded-t-xl whitespace-nowrap ${tabActiva === d.nombre ? "border-b-2 border-primary text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {d.nombre}
                </button>
              ))}
            </>
          ) : currentUser.rol === "vendedor" ? (
            <button
              onClick={() => setTabActiva("Mios")}
              className={`px-4 py-2 text-sm font-black transition-all rounded-t-xl whitespace-nowrap border-b-2 border-primary text-primary bg-primary/5`}
            >
              👤 Mis Tickets Asignados
            </button>
          ) : (
            <>
              <button
                onClick={() => setTabActiva("MiArea")}
                className={`px-4 py-2 text-sm font-black transition-all rounded-t-xl whitespace-nowrap flex items-center gap-1 ${tabActiva === "MiArea" ? "border-b-2 border-primary text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <Briefcase size={14} /> Área: {currentUser.departamento}
              </button>
              <button
                onClick={() => setTabActiva("Mios")}
                className={`px-4 py-2 text-sm font-black transition-all rounded-t-xl whitespace-nowrap flex items-center gap-1 ${tabActiva === "Mios" ? "border-b-2 border-primary text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <User size={14} /> Mis Tickets (Directos)
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs font-black select-none">
              <tr>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort("codigo")}
                >
                  <div className="flex items-center gap-1">
                    Ticket {getSortIcon("codigo")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort("institucionNombre")}
                >
                  <div className="flex items-center gap-1">
                    Asunto / Institución {getSortIcon("institucionNombre")}
                  </div>
                </th>
                <th
                  className="p-4 hidden md:table-cell cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort("tipo")}
                >
                  <div className="flex items-center gap-1">
                    Área {getSortIcon("tipo")}
                  </div>
                </th>
                <th className="p-4">Asignados</th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Tiempos SLA {getSortIcon("createdAt")}
                  </div>
                </th>
                <th
                  className="p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort("estado")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Estado {getSortIcon("estado")}
                  </div>
                </th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-gray-500 font-bold animate-pulse"
                  >
                    Cargando mesa de ayuda...
                  </td>
                </tr>
              ) : itemsPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={48} className="text-gray-300 mb-3" />
                      <p className="text-lg font-bold text-gray-500">
                        Bandeja limpia
                      </p>
                      <p className="text-sm text-gray-400">
                        No hay tickets que coincidan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                itemsPaginados.map((t) => {
                  const esNuevo = t.createdAt
                    ? new Date().getTime() - new Date(t.createdAt).getTime() <
                      12 * 60 * 60 * 1000
                    : false;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => abrirChat(t.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {t.codigo}
                          </span>
                          {esNuevo && (
                            <span className="bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-bounce shadow-sm">
                              ✨ NUEVO
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] font-black uppercase mt-0.5 ${t.prioridad === "Alta" || t.prioridad === "Urgente" ? "text-red-500" : "text-gray-400"}`}
                        >
                          Prioridad: {t.prioridad}
                        </div>
                      </td>
                      <td className="p-4">
                        <div
                          className="font-bold text-primary truncate max-w-200px sm:max-w-300px"
                          title={t.asunto}
                        >
                          {t.asunto}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <AlertCircle size={10} />{" "}
                          {t.institucion?.nombre || "General"}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700 hidden md:table-cell">
                        {t.tipo}
                      </td>
                      <td className="p-4">
                        <div className="text-[9px] text-gray-400 uppercase font-bold">
                          Para:
                        </div>
                        <div
                          className="text-xs font-bold text-gray-800 truncate max-w-150px"
                          title={t.asignados
                            ?.map((a: any) => a.nombre)
                            .join(", ")}
                        >
                          {t.asignados && t.asignados.length > 0
                            ? t.asignados.map((a: any) => a.nombre).join(", ")
                            : "Sin asignar"}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">
                          {" "}
                          De:{" "}
                          <span className="text-gray-600 normal-case">
                            {t.creador?.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] text-gray-500">
                          <span className="font-bold text-emerald-600">
                            Creación:
                          </span>{" "}
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleString("es-EC", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "S/N"}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          <span className="font-bold text-amber-600">
                            Límite:
                          </span>{" "}
                          {t.fechaLimite
                            ? new Date(t.fechaLimite).toLocaleDateString(
                                "es-EC",
                                { timeZone: "America/Guayaquil" },
                              )
                            : "Sin Límite"}
                        </div>
                        {t.fechaCierre && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            <span className="font-bold text-red-500">
                              Cerrado:
                            </span>{" "}
                            {new Date(t.fechaCierre).toLocaleString("es-EC", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          className={`text-xs ${getColorEstado(t.estado)}`}
                        >
                          {t.estado}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10 font-bold h-8"
                        >
                          Abrir Chat <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-2xl">
            <span className="text-xs text-gray-500 font-medium">
              Página {currentPage} de {totalPages} ({ticketsFiltrados.length}{" "}
              resultados)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                disabled={currentPage === 1}
                className="h-8 text-xs font-bold bg-white"
              >
                <ChevronLeft size={14} className="mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={currentPage === totalPages}
                className="h-8 text-xs font-bold bg-white"
              >
                Siguiente <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <TicketChatDrawer
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setSelectedTicketId(null);
          cargarDatos();
        }}
        ticketId={selectedTicketId}
        currentUserId={currentUser.id}
        currentUserRol={currentUser.rol}
      />

      <Dialog open={nuevoModalOpen} onOpenChange={setNuevoModalOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw] bg-white p-4 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Plus size={20} className="text-primary" /> Generar Nuevo Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-700 uppercase">
                  Área Responsable *
                </Label>
                <select
                  className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white outline-none font-bold text-blue-700"
                  value={nuevoTicket.tipo}
                  onChange={(e) =>
                    setNuevoTicket({ ...nuevoTicket, tipo: e.target.value })
                  }
                >
                  <option value="">-- Seleccione un Área --</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.nombre}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-700 uppercase">
                  Nivel de Urgencia
                </Label>
                <select
                  className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white outline-none font-bold"
                  value={nuevoTicket.prioridad}
                  onChange={(e) =>
                    setNuevoTicket({
                      ...nuevoTicket,
                      prioridad: e.target.value,
                    })
                  }
                >
                  <option value="Baja">🟢 Baja</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Alta">🟠 Alta</option>
                  <option value="Urgente">🔴 Urgente</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">
                Institución *
              </Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <Input
                  className="pl-9 h-11 text-sm bg-white border-gray-300"
                  placeholder="Buscar escuela..."
                  value={busquedaInst}
                  onChange={(e) => handleBuscarEscuela(e.target.value)}
                />
              </div>
              {dropdownInst && resultadosInst.length > 0 && (
                <ul className="absolute z-9999 w-full bg-white border border-gray-200 shadow-2xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {resultadosInst.map((inst) => (
                    <li
                      key={inst.id}
                      className="px-4 py-2 hover:bg-primary/5 cursor-pointer border-b border-gray-50"
                      onClick={() => seleccionarEscuela(inst)}
                    >
                      <p className="text-sm font-bold text-gray-800">
                        {inst.nombre}
                      </p>
                      <p className="text-[10px] text-gray-500">{inst.canton}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 🔥 ASIGNACIÓN MÚLTIPLE DE USUARIOS 🔥 */}
            <div className="space-y-2 relative">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">
                Asignar a (Múltiple) *
              </Label>

              {usuariosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {usuariosSeleccionados.map((u) => (
                    <Badge
                      key={u.id}
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 py-1 pr-2"
                    >
                      {u.nombre}
                      <button
                        type="button"
                        onClick={(e) => removerUsuario(e, u.id)}
                        className="ml-1 hover:text-red-500 focus:outline-none"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <Input
                  className="pl-9 h-11 text-sm bg-white border-gray-300"
                  placeholder="Buscar para añadir personas..."
                  value={busquedaUser}
                  onChange={(e) => handleBuscarUsuario(e.target.value)}
                  onFocus={() => {
                    if (!busquedaUser) handleBuscarUsuario(" ");
                  }}
                />
              </div>
              {dropdownUser && (
                <ul className="absolute z-9999 w-full bg-white border border-gray-200 shadow-2xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {resultadosUser.map((user) => (
                    <li
                      key={user.id}
                      className="px-4 py-2 hover:bg-primary/5 cursor-pointer border-b border-gray-50"
                      onClick={() => seleccionarUsuario(user)}
                    >
                      <p className="text-sm font-bold text-gray-800">
                        {user.nombre}
                      </p>
                      <p className="text-[10px] text-primary uppercase font-black">
                        {user.rolNombre || "USUARIO"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <Label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1">
                <Clock size={12} /> Fecha Límite de Resolución (Obligatorio)
              </Label>
              <Input
                type="date"
                className="h-11 bg-white border-gray-300 text-sm font-bold text-red-600"
                value={nuevoTicket.fechaLimite}
                onChange={(e) =>
                  setNuevoTicket({
                    ...nuevoTicket,
                    fechaLimite: e.target.value,
                  })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">
                Asunto del Ticket *
              </Label>
              <Input
                placeholder="Ej: Falta copia de cédula contrato #1234"
                value={nuevoTicket.asunto}
                onChange={(e) =>
                  setNuevoTicket({ ...nuevoTicket, asunto: e.target.value })
                }
                className="h-11 text-sm font-medium border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-gray-700 uppercase">
                Mensaje Inicial (Instrucciones) *
              </Label>
              <textarea
                className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none outline-none focus:border-primary"
                placeholder="Escribe los detalles..."
                value={nuevoTicket.mensajeInicial}
                onChange={(e) =>
                  setNuevoTicket({
                    ...nuevoTicket,
                    mensajeInicial: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4 border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setNuevoModalOpen(false)}
              className="w-full sm:w-auto h-11 font-bold order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto h-11 bg-primary hover:bg-primary/90 text-white font-bold order-1 sm:order-2"
              disabled={saving}
              onClick={handleCrearTicket}
            >
              {saving ? "Generando..." : "Crear e Iniciar Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modalMantenimientoOpen}
        onOpenChange={setModalMantenimientoOpen}
      >
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl border-t-4 border-red-500">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600 flex items-center gap-2">
              <HardDrive size={20} /> Limpieza de Almacenamiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-800 font-medium">
              Esta herramienta destruirá físicamente del servidor los archivos
              de los tickets antiguos.
              <br />
              <br />
              <b>El texto se mantendrá intacto.</b>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">
                Eliminar archivos más antiguos de:
              </Label>
              <select
                className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm font-bold bg-white outline-none"
                value={mesesLimpieza}
                onChange={(e) => setMesesLimpieza(e.target.value)}
              >
                <option value="3">Hace 3 Meses</option>
                <option value="6">Hace 6 Meses</option>
                <option value="9">Hace 9 Meses</option>
                <option value="12">Hace 1 Año</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setModalMantenimientoOpen(false)}
              disabled={limpiando}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={ejecutarLimpiezaMasiva}
              disabled={limpiando}
            >
              {limpiando ? (
                "Eliminando..."
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" /> Ejecutar Limpieza
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
