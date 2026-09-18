"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Eye,
  Search,
  Navigation,
  ChevronLeft,
  AlertCircle,
  Plus,
  ChevronRight,
  CalendarCheck,
  Clock,
  AlertTriangle,
  PieChart,
  CheckCircle2,
  UserX,
  Unlock,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import VisitaGPSForm from "@/app/features/visitas/components/VisitaGPSForm";

type TabType =
  | "ruta"
  | "visitadas"
  | "proximas"
  | "vencidas"
  | "sinAsignar"
  | "cobertura"
  | "correcciones";

export default function AgendaPage() {
  const router = useRouter();

  const [dataAgenda, setDataAgenda] = useState<{
    ruta: any[];
    visitadas: any[];
    proximas: any[];
    vencidas: any[];
    sinAsignar: any[];
    correcciones: any[];
    cobertura: { asignadas: number; visitadas: number; porcentaje: number };
  }>({
    ruta: [],
    visitadas: [],
    proximas: [],
    vencidas: [],
    sinAsignar: [],
    correcciones: [],
    cobertura: { asignadas: 0, visitadas: 0, porcentaje: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [catalogos, setCatalogos] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [userRol, setUserRol] = useState("vendedor");
  const [tabActiva, setTabActiva] = useState<TabType>("ruta");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabURL = params.get("tab");
      if (
        [
          "ruta",
          "visitadas",
          "proximas",
          "vencidas",
          "sinAsignar",
          "cobertura",
          "correcciones",
        ].includes(tabURL || "")
      ) {
        setTabActiva(tabURL as TabType);
      }
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvincia, setSelectedProvincia] = useState("");
  const [selectedCanton, setSelectedCanton] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const hoyStr = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }),
  )
    .toISOString()
    .split("T")[0];
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [modalVisita, setModalVisita] = useState<{
    open: boolean;
    inst: any;
    isLibre: boolean;
  }>({ open: false, inst: null, isLibre: false });
  const [modalRetro, setModalRetro] = useState({ open: false, visitaId: "" });
  const [nuevaFechaRetro, setNuevaFechaRetro] = useState("");
  const [savingRetro, setSavingRetro] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nuevaVisita, setNuevaVisita] = useState({
    institucionId: "",
    usuarioId: "",
    fechaProgramada: "",
    horaProgramada: "09:00",
    tipoGestion: "Visita Presencial",
  });
  const [toast, setToast] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);
  const showToast = (tipo: "exito" | "error", texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 6000);
  };

  const cargarAgenda = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let url = "/api/agenda?";
      if (selectedVendedor) url += `vendedorId=${selectedVendedor}&`;
      if (fechaDesde) url += `fechaDesde=${fechaDesde}&`;
      if (fechaHasta) url += `fechaHasta=${fechaHasta}&`;

      const [resAgenda, resCat, resVend] = await Promise.all([
        fetch(url),
        fetch("/api/catalogos"),
        fetch("/api/usuarios/vendedores"),
      ]);

      const dataAgendaJson = await resAgenda.json();
      const catDataJson = await resCat.json();
      const vendDataJson = await resVend.json();

      if (!dataAgendaJson.error) setDataAgenda(dataAgendaJson);
      setCatalogos(catDataJson);
      setVendedores(Array.isArray(vendDataJson) ? vendDataJson : []);
      if (catDataJson.userRol) setUserRol(catDataJson.userRol);
    } catch (e) {
      console.error("Error al cargar agenda:", e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    cargarAgenda(false);
  }, [selectedVendedor, fechaDesde, fechaHasta]);
  useEffect(() => {
    setCurrentPage(1);
  }, [tabActiva, searchTerm, selectedProvincia, selectedCanton]);

  const handleAgendar = async () => {
    if (
      !nuevaVisita.institucionId ||
      !nuevaVisita.usuarioId ||
      !nuevaVisita.fechaProgramada
    ) {
      showToast("error", "Por favor llena todos los campos obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaVisita),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al agendar.");
      }

      showToast("exito", "¡Visita agendada correctamente!");
      setModalOpen(false);
      setNuevaVisita({
        institucionId: "",
        usuarioId: "",
        fechaProgramada: "",
        horaProgramada: "09:00",
        tipoGestion: "Visita Presencial",
      });
      cargarAgenda();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarRetro = async () => {
    if (!nuevaFechaRetro) return;
    setSavingRetro(true);
    try {
      const res = await fetch("/api/visitas/retroactiva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitaId: modalRetro.visitaId,
          nuevaFecha: nuevaFechaRetro,
        }),
      });
      if (!res.ok) throw new Error();
      setModalRetro({ open: false, visitaId: "" });
      showToast(
        "exito",
        "¡Fecha de la visita y contratos corregida con éxito! 🔒",
      );

      if (dataAgenda.correcciones.length <= 1) setTabActiva("visitadas");
      cargarAgenda(true);
    } catch (e) {
      showToast("error", "Error al corregir la fecha.");
    } finally {
      setSavingRetro(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("no visitada") || s.includes("sin asignar"))
      return "#d9d9d9";
    if (s.includes("no interesado")) return "#ff3b30";
    if (s.includes("seguimiento")) return "#ff9500";
    if (s.includes("visitada") || s.includes("realizada")) return "#34c759";
    if (s.includes("pendiente")) return "#007aff";
    return "#d9d9d9";
  };

  const filterList = (lista: any[]) =>
    lista.filter((item) => {
      if (
        searchTerm &&
        !item.nombreInstitucion.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      if (selectedProvincia && item.provinciaId !== parseInt(selectedProvincia))
        return false;
      if (selectedCanton && item.cantonId !== parseInt(selectedCanton))
        return false;
      return true;
    });

  const listaActual =
    tabActiva !== "cobertura" ? filterList(dataAgenda[tabActiva] || []) : [];
  const totalPages = Math.max(1, Math.ceil(listaActual.length / itemsPerPage));
  const itemsPaginados = listaActual.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const cantonesDisponibles = selectedProvincia
    ? catalogos?.provincias?.find(
        (p: any) => p.id === parseInt(selectedProvincia),
      )?.cantones || []
    : [];
  const esAdmin = userRol === "super_admin" || userRol === "administrador";

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <Calendar className="text-primary" /> Mi Agenda de Gestión
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controla tus rutas, seguimientos y rendimiento territorial.
          </p>
        </div>
        <div className="flex gap-2">
          {esAdmin && (
            <select
              className="h-10 border border-gray-300 rounded-xl px-3 text-sm bg-white text-gray-700 shadow-sm"
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
            >
              <option value="">👤 Todos los Vendedores</option>
              {vendedores.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => setModalOpen(true)}
            variant="outline"
            className="h-10 font-bold shadow-sm rounded-xl"
          >
            <Plus size={16} className="mr-2" /> Agendar Manual
          </Button>
          <Button
            onClick={() =>
              setModalVisita({ open: true, inst: null, isLibre: true })
            }
            className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md rounded-xl h-10"
          >
            <Navigation size={18} className="mr-2" /> Visita Libre
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 border-b border-gray-200 hide-scrollbar pb-1">
        <button
          onClick={() => setTabActiva("ruta")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "ruta" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
        >
          <MapPin size={18} /> Mi Ruta ({dataAgenda.ruta.length})
        </button>

        {dataAgenda.correcciones?.length > 0 && (
          <button
            onClick={() => setTabActiva("correcciones")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "correcciones" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-amber-600 hover:bg-amber-50/50 rounded-t-xl"}`}
          >
            <Edit3
              size={18}
              className={
                tabActiva !== "correcciones"
                  ? "animate-pulse text-amber-500"
                  : ""
              }
            />
            Correcciones
            <Badge className="bg-amber-500 text-white border border-amber-600 shadow-sm animate-pulse">
              {dataAgenda.correcciones.length}
            </Badge>
          </button>
        )}

        <button
          onClick={() => setTabActiva("visitadas")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "visitadas" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
        >
          <CheckCircle2 size={18} /> Visitadas{" "}
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
            {dataAgenda.visitadas.length}
          </Badge>
        </button>
        <button
          onClick={() => setTabActiva("proximas")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "proximas" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
        >
          <Clock size={18} /> Próximas{" "}
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
            {dataAgenda.proximas.length}
          </Badge>
        </button>
        <button
          onClick={() => setTabActiva("vencidas")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "vencidas" ? "border-red-500 text-red-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
        >
          <AlertTriangle size={18} /> Vencidas{" "}
          <Badge className="bg-red-100 text-red-700 border border-red-200">
            {dataAgenda.vencidas.length}
          </Badge>
        </button>
        {esAdmin && (
          <button
            onClick={() => setTabActiva("sinAsignar")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "sinAsignar" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
          >
            <UserX size={18} /> Sin Asignar{" "}
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
              {dataAgenda.sinAsignar.length}
            </Badge>
          </button>
        )}
        {esAdmin && (
          <button
            onClick={() => setTabActiva("cobertura")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-all border-b-[3px] whitespace-nowrap ${tabActiva === "cobertura" ? "border-purple-500 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl"}`}
          >
            <PieChart size={18} /> Cobertura Territorio
          </button>
        )}
      </div>

      {tabActiva !== "cobertura" && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <Input
                className="pl-9 h-10 text-sm bg-gray-50 border-gray-200 w-full sm:w-220px"
                placeholder="Buscar escuela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-700 bg-gray-50"
              value={selectedProvincia}
              onChange={(e) => {
                setSelectedProvincia(e.target.value);
                setSelectedCanton("");
              }}
            >
              <option value="">Todas las Provincias</option>
              {catalogos?.provincias?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <select
              disabled={!selectedProvincia}
              className="h-10 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-700 bg-gray-50 disabled:opacity-50"
              value={selectedCanton}
              onChange={(e) => setSelectedCanton(e.target.value)}
            >
              <option value="">Todos los Cantones</option>
              {cantonesDisponibles.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100 w-full xl:w-auto">
            <CalendarCheck className="text-blue-500" size={20} />
            <div className="flex flex-wrap items-center gap-2 w-full justify-between sm:justify-start">
              <div>
                <Label className="text-[10px] font-black text-gray-500 uppercase">
                  Desde
                </Label>
                <Input
                  type="date"
                  className="h-8 text-xs bg-white border-blue-200 w-125px"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] font-black text-gray-500 uppercase">
                  Hasta
                </Label>
                <Input
                  type="date"
                  className="h-8 text-xs bg-white border-blue-200 w-125px"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 VISTA DE COBERTURA */}
      {tabActiva === "cobertura" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
            <h3 className="text-gray-500 font-black uppercase tracking-wider text-sm mb-3">
              Escuelas Asignadas
            </h3>
            <p className="text-6xl font-black text-blue-900">
              {dataAgenda.cobertura.asignadas}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
            <h3 className="text-gray-500 font-black uppercase tracking-wider text-sm mb-3">
              Escuelas Visitadas
            </h3>
            <p className="text-6xl font-black text-emerald-600">
              {dataAgenda.cobertura.visitadas}
            </p>
          </div>
          <div className="`bg-gradient-to-br` from-primary/10 to-primary/5 p-8 rounded-3xl shadow-sm border border-primary/20 text-center flex flex-col justify-center">
            <h3 className="text-primary font-black uppercase tracking-wider text-sm mb-2">
              Cobertura del Territorio
            </h3>
            <p className="text-7xl font-black text-primary drop-shadow-sm">
              {dataAgenda.cobertura.porcentaje}%
            </p>
            <div className="w-full bg-white rounded-full h-4 mt-6 overflow-hidden border border-primary/10 shadow-inner">
              <div
                className="bg-primary h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${dataAgenda.cobertura.porcentaje}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 📋 VISTA DE TABLA GERENCIAL DE ALTA DENSIDAD */}
      {tabActiva !== "cobertura" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-500 font-bold animate-pulse">
              Sincronizando Tabla...
            </div>
          ) : itemsPaginados.length === 0 ? (
            <div className="bg-white p-16 text-center text-gray-500 flex flex-col items-center">
              <CalendarCheck size={56} className="text-gray-300 mb-4" />
              <p className="text-xl font-black text-gray-700">
                No hay registros en esta pestaña.
              </p>
              <p className="text-sm mt-1">
                Modifica tus filtros de búsqueda o fecha.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-gray-600 min-w-200px">
                      Institución
                    </TableHead>
                    <TableHead className="font-bold text-gray-600">
                      Ubicación
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 min-w-250px">
                      Detalle de Gestión
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">
                      Estado
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsPaginados.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-slate-50/50 ${tabActiva === "vencidas" ? "bg-red-50/30" : tabActiva === "correcciones" ? "bg-amber-50/30" : ""}`}
                    >
                      <TableCell>
                        <div className="font-black text-gray-900 text-sm mb-1">
                          {item.nombreInstitucion}
                        </div>
                        {esAdmin && tabActiva === "sinAsignar" && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-[10px] bg-gray-50 text-gray-500"
                          >
                            Escuela Libre
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1 uppercase">
                          <MapPin size={12} className="text-primary shrink-0" />{" "}
                          {item.canton} <br /> {item.parroquia}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tabActiva === "ruta" && (
                          <>
                            <p className="text-[10px] font-black text-gray-500 uppercase">
                              Visita Programada / Rango Activo
                            </p>
                            <p className="text-xs font-bold text-primary flex items-center gap-1">
                              <Clock size={12} /> Programada:{" "}
                              {item.fechaProgramada}{" "}
                              {item.horaProgramada
                                ? `a las ${item.horaProgramada}`
                                : ""}
                            </p>
                            {item.fechaProximoContacto &&
                              item.fechaProximoContacto !==
                                item.fechaProgramada &&
                              item.estadoComercial !== "Seguimiento" && (
                                <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                                  ⏳ Fecha Límite Rango:{" "}
                                  {item.fechaProximoContacto}
                                </p>
                              )}
                          </>
                        )}
                        {tabActiva === "visitadas" && (
                          <>
                            <p className="text-[10px] font-black text-gray-500 uppercase">
                              Resumen de Visita
                            </p>
                            <p className="text-xs text-gray-800 line-clamp-2">
                              {item.resumenAcuerdos}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">
                              Realizada:{" "}
                              {new Date(
                                item.fechaVisitaReal,
                              ).toLocaleDateString("es-EC")}
                            </p>
                          </>
                        )}
                        {tabActiva === "correcciones" && (
                          <>
                            <p className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1">
                              <Unlock size={12} /> Corrección Habilitada
                            </p>
                            <p className="text-xs text-gray-800 line-clamp-2">
                              {item.resumenAcuerdos}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">
                              Fecha Original:{" "}
                              {new Date(
                                item.fechaVisitaReal,
                              ).toLocaleDateString("es-EC")}
                            </p>
                          </>
                        )}
                        {tabActiva === "proximas" && (
                          <>
                            <p className="text-[10px] font-black text-gray-500 uppercase">
                              Próxima Visita Futura
                            </p>
                            <p className="text-xs text-gray-800 line-clamp-2">
                              {item.resumenAcuerdos ||
                                "Acuerdo de recontacto futuro"}
                            </p>
                            <p className="text-[11px] text-blue-700 font-black flex items-center gap-1 mt-1">
                              <Calendar size={12} /> Programada:{" "}
                              {item.fechaProgramada}{" "}
                              {item.horaProgramada
                                ? `a las ${item.horaProgramada}`
                                : ""}
                            </p>
                          </>
                        )}
                        {tabActiva === "vencidas" && (
                          <>
                            <p className="text-[10px] font-black text-red-600 uppercase">
                              ⚠️ Atención Urgente
                            </p>
                            <p className="text-xs text-gray-800">
                              Debiste contactar a esta escuela y no se registró
                              la visita.
                            </p>
                            <p className="text-[11px] text-red-700 font-black flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} /> Vencida desde:{" "}
                              {item.fechaProgramada}{" "}
                              {item.horaProgramada
                                ? `a las ${item.horaProgramada}`
                                : ""}
                            </p>
                          </>
                        )}
                        {tabActiva === "sinAsignar" && (
                          <>
                            <p className="text-[10px] font-black text-amber-700 uppercase">
                              Sin Vendedor Asignado
                            </p>
                            <p className="text-xs text-gray-700 font-medium">
                              Disponible para prospección o asignación masiva.
                            </p>
                          </>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(
                              item.estadoComercial,
                            ),
                            color:
                              getStatusColor(item.estadoComercial) === "#d9d9d9"
                                ? "#111111"
                                : "#FFFFFF",
                          }}
                          className="font-bold tracking-wide"
                        >
                          {item.estadoComercial}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-bold text-gray-700 hover:bg-gray-100 h-8"
                            onClick={() =>
                              router.push(
                                `/instituciones/${item.institucionId}`,
                              )
                            }
                          >
                            <Eye size={14} className="mr-1" /> Ficha Técnica
                          </Button>
                          {(tabActiva === "ruta" ||
                            tabActiva === "vencidas" ||
                            tabActiva === "proximas" ||
                            tabActiva === "sinAsignar") && (
                            <Button
                              size="sm"
                              className={`w-full text-xs font-bold text-white shadow-sm h-8 ${tabActiva === "vencidas" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`}
                              onClick={() =>
                                setModalVisita({
                                  open: true,
                                  inst: item,
                                  isLibre: false,
                                })
                              }
                            >
                              <Navigation size={14} className="mr-1" /> Reg.
                              Visita
                            </Button>
                          )}
                          {tabActiva === "correcciones" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setModalRetro({ open: true, visitaId: item.id })
                              }
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black tracking-wide h-8 shadow-sm"
                            >
                              <Edit3 size={14} className="mr-1" /> CORREGIR
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 🔥 CONTROLES DE PAGINACIÓN STRICT 15 🔥 */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">
                Página {currentPage} de {totalPages} ({listaActual.length} en
                total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs font-bold"
                >
                  <ChevronLeft size={14} className="mr-1" /> Ant.
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs font-bold"
                >
                  Sig. <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA AGENDAR MANUALMENTE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 border-b pb-3 flex items-center gap-2">
              <Calendar className="text-primary" /> Agendar Nueva Visita
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-gray-600">
                Institución / Escuela *
              </Label>
              <select
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm mt-1 bg-white"
                value={nuevaVisita.institucionId}
                onChange={(e) =>
                  setNuevaVisita({
                    ...nuevaVisita,
                    institucionId: e.target.value,
                  })
                }
              >
                <option value="">Seleccione una escuela...</option>
                {dataAgenda.sinAsignar.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.nombreInstitucion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-600">
                Vendedor a Asignar *
              </Label>
              <select
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm mt-1 bg-white"
                value={nuevaVisita.usuarioId}
                onChange={(e) =>
                  setNuevaVisita({ ...nuevaVisita, usuarioId: e.target.value })
                }
              >
                <option value="">Seleccione un vendedor...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-600">
                  Fecha *
                </Label>
                <Input
                  type="date"
                  className="h-10 mt-1"
                  value={nuevaVisita.fechaProgramada}
                  onChange={(e) =>
                    setNuevaVisita({
                      ...nuevaVisita,
                      fechaProgramada: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-600">
                  Hora *
                </Label>
                <Input
                  type="time"
                  className="h-10 mt-1"
                  value={nuevaVisita.horaProgramada}
                  onChange={(e) =>
                    setNuevaVisita({
                      ...nuevaVisita,
                      horaProgramada: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-600">
                Tipo de Gestión
              </Label>
              <select
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm mt-1 bg-white"
                value={nuevaVisita.tipoGestion}
                onChange={(e) =>
                  setNuevaVisita({
                    ...nuevaVisita,
                    tipoGestion: e.target.value,
                  })
                }
              >
                <option value="Visita Presencial">Visita Presencial</option>
                <option value="Llamada Telefónica">Llamada Telefónica</option>
                <option value="Entrega de Muestras">Entrega de Muestras</option>
                <option value="Cierre de Contrato">Cierre de Contrato</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white font-bold"
              disabled={saving}
              onClick={handleAgendar}
            >
              {saving ? "Validando..." : "Guardar Agenda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA CORRECCIÓN DE FECHA (Retroactiva) */}
      <Dialog
        open={modalRetro.open}
        onOpenChange={(val) => setModalRetro({ ...modalRetro, open: val })}
      >
        <DialogContent className="sm:max-w-sm bg-white p-6 rounded-2xl border-t-4 border-amber-500">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-amber-600 flex items-center gap-2">
              <Calendar size={20} /> Corregir Fecha de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-gray-500 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100">
              El administrador te ha habilitado para corregir la fecha de este
              cierre. <br />
              <br />
              Selecciona la fecha <strong>real</strong> en la que hiciste la
              venta. Esto actualizará todos los contratos y pedidos asociados
              automáticamente.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-600 uppercase">
                Fecha Real de la Gestión *
              </Label>
              <Input
                type="date"
                className="h-10 text-sm font-bold bg-gray-50 border-gray-300 focus:bg-white focus:border-amber-500 focus:ring-amber-500"
                value={nuevaFechaRetro}
                onChange={(e) => setNuevaFechaRetro(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRetro({ open: false, visitaId: "" })}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4"
              disabled={savingRetro}
              onClick={handleGuardarRetro}
            >
              {savingRetro ? "Guardando..." : "Guardar y Bloquear 🔒"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPONENTE VISITA GPS */}
      <VisitaGPSForm
        isOpen={modalVisita.open}
        onOpenChange={(val) => setModalVisita({ ...modalVisita, open: val })}
        isLibre={modalVisita.isLibre}
        institucionPreseleccionada={
          modalVisita.inst
            ? {
                id: modalVisita.inst.institucionId,
                nombre: modalVisita.inst.nombreInstitucion,
                canton: modalVisita.inst.canton,
              }
            : null
        }
        onSuccess={() => cargarAgenda(true)}
      />

      {/* TOAST PARA ALERTAS DEL ESCUDO */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-9999 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white max-w-md ${toast.tipo === "exito" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {toast.tipo === "exito" ? (
            <CheckCircle2 size={24} className="shrink-0" />
          ) : (
            <AlertCircle size={24} className="shrink-0" />
          )}
          <span className="font-bold text-sm leading-tight">{toast.texto}</span>
        </div>
      )}
    </div>
  );
}
