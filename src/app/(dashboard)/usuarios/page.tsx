"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Plus,
  Edit3,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  ShieldCheck,
  Activity,
  Save,
  ServerCrash,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";

type TabType = "personal" | "seguridad";

export default function UsuariosPage() {
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [rolesDinamicos, setRolesDinamicos] = useState<any[]>([]);

  // 🔥 NUEVO ESTADO: Departamentos 🔥
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [modalDeptoOpen, setModalDeptoOpen] = useState(false);
  const [nuevoDeptoNombre, setNuevoDeptoNombre] = useState("");
  const [savingDepto, setSavingDepto] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // 🔥 SE AGREGÓ departamentoId 🔥
  const initialForm = {
    id: "",
    nombre: "",
    email: "",
    password: "",
    rolId: "",
    departamentoId: "",
    activo: true,
  };
  const [formUser, setFormUser] = useState(initialForm);

  const [configSeguridad, setConfigSeguridad] = useState({
    ipOficina: "",
    rolesBloqueados: [] as string[],
  });
  const [logsSeguridad, setLogsSeguridad] = useState<any[]>([]);
  const [loadingSeguridad, setLoadingSeguridad] = useState(false);
  const [savingSeguridad, setSavingSeguridad] = useState(false);
  const [currentPageSeguridad, setCurrentPageSeguridad] = useState(1);
  const itemsPerPageSeguridad = 15;

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      // 🔥 AHORA CARGAMOS TAMBIÉN LOS DEPARTAMENTOS 🔥
      const [resUsers, resRoles, resDeptos] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/roles"),
        fetch("/api/departamentos"),
      ]);
      setUsuarios(await resUsers.json());
      setRolesDinamicos(await resRoles.json());
      setDepartamentos(await resDeptos.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const cargarSeguridad = async () => {
    setLoadingSeguridad(true);
    try {
      const res = await fetch("/api/seguridad");
      const data = await res.json();
      if (!data.error) {
        setConfigSeguridad({
          ipOficina: data.config?.ipOficina || "",
          rolesBloqueados: data.config?.rolesBloqueados
            ? JSON.parse(data.config.rolesBloqueados)
            : [],
        });
        setLogsSeguridad(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSeguridad(false);
    }
  };

  useEffect(() => {
    if (activeTab === "personal") cargarUsuarios();
    else cargarSeguridad();
  }, [activeTab]);

  // 🔥 NUEVA FUNCIÓN: Crear Departamento 🔥
  const handleCrearDepartamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoDeptoNombre.trim()) return;
    setSavingDepto(true);
    try {
      const res = await fetch("/api/departamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoDeptoNombre }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear área");
      }
      setNuevoDeptoNombre("");
      cargarUsuarios(); // Recargamos para ver el nuevo departamento en las listas
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingDepto(false);
    }
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const isEditing = !!formUser.id;
      const payload: any = { ...formUser };
      if (isEditing && !payload.password) delete payload.password;

      // Parsear el departamentoId a Número
      if (payload.departamentoId) {
        payload.departamentoId = parseInt(payload.departamentoId);
      } else {
        payload.departamentoId = null;
      }

      const res = await fetch("/api/usuarios", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setModalOpen(false);
      cargarUsuarios();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleBloqueo = async (
    usuarioId: string,
    nombre: string,
    estaBloqueado: boolean,
  ) => {
    if (
      !confirm(
        `¿Estás seguro de querer ${estaBloqueado ? "DESBLOQUEAR" : "BLOQUEAR"} a ${nombre}?`,
      )
    )
      return;
    try {
      const res = await fetch("/api/usuarios/seguridad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_bloqueo", usuarioId }),
      });
      if (!res.ok) throw new Error("Error al cambiar seguridad");
      cargarUsuarios();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleToggleRolBloqueado = (rolNombre: string) => {
    setConfigSeguridad((prev) => {
      const roles = prev.rolesBloqueados.includes(rolNombre)
        ? prev.rolesBloqueados.filter((r) => r !== rolNombre)
        : [...prev.rolesBloqueados, rolNombre];
      return { ...prev, rolesBloqueados: roles };
    });
  };

  const handleGuardarConfigSeguridad = async () => {
    setSavingSeguridad(true);
    try {
      const res = await fetch("/api/seguridad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configSeguridad),
      });
      if (!res.ok) throw new Error("Error al guardar");
      alert("✅ ¡Configuración de seguridad guardada con éxito!");
    } catch (e) {
      alert("❌ Error al guardar configuración");
    } finally {
      setSavingSeguridad(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 min-h-screen bg-gray-50/30">
      {/* CABECERA Y TABS */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <User className="text-primary" /> Gestión y Seguridad
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Controla tu equipo y protege el sistema contra accesos no autorizados.
        </p>

        <div className="flex gap-4 border-b border-gray-200 mt-6">
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-3 px-2 text-sm font-bold transition-all border-b-[3px] flex items-center gap-2 ${activeTab === "personal" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            <User size={16} /> Personal del Sistema
          </button>
          <button
            onClick={() => setActiveTab("seguridad")}
            className={`pb-3 px-2 text-sm font-bold transition-all border-b-[3px] flex items-center gap-2 ${activeTab === "seguridad" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-red-600"}`}
          >
            <ShieldCheck size={16} /> Panel de Seguridad
          </button>
        </div>
      </div>
      {activeTab === "personal" && (
        <div className="animate-in fade-in duration-300">
          <div className="flex gap-3 justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => setModalDeptoOpen(true)}
              className="font-bold border-gray-300 text-gray-700 shadow-sm"
            >
              <Briefcase size={16} className="mr-2" /> Áreas / Departamentos
            </Button>

            <Button
              onClick={() => {
                setFormUser(initialForm);
                setModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
            >
              <Plus size={16} className="mr-1" /> Nuevo Usuario
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-gray-700">
                    Nombre / Email
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">
                    Rol y Área
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">
                    Estado
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 font-bold text-gray-500 animate-pulse"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-black text-gray-900 text-sm">
                          {u.nombre}
                        </div>
                        <div className="text-xs font-medium text-gray-500">
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`uppercase text-[10px] tracking-wider font-bold ${u.rolNombre === "super_admin" ? "bg-purple-100 text-purple-800" : "bg-blue-50 text-blue-700"}`}
                        >
                          {u.rolNombre.replace("_", " ")}
                        </Badge>
                        {/* 🔥 MOSTRAR EL DEPARTAMENTO ASIGNADO 🔥 */}
                        {u.departamento && (
                          <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase flex items-center justify-center gap-1">
                            <Briefcase size={10} /> {u.departamento.nombre}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.bloqueado ? (
                          <Badge className="bg-red-100 text-red-700 border border-red-200 font-bold animate-pulse">
                            <Lock size={12} className="mr-1" /> Bloqueado
                          </Badge>
                        ) : u.activo ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold">
                            <CheckCircle2 size={12} className="mr-1" /> Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 border border-gray-200 font-bold">
                            <XCircle size={12} className="mr-1" /> Suspendido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.rolNombre !== "super admin" &&
                        u.rolNombre !== "super_admin" ? (
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormUser({
                                  ...u,
                                  password: "",
                                  rolId: u.rolId.toString(),
                                  departamentoId:
                                    u.departamentoId?.toString() || "",
                                });
                                setModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-gray-600"
                            >
                              <Edit3 size={16} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleBloqueo(u.id, u.nombre, u.bloqueado)
                              }
                              className={`h-8 w-8 p-0 ${u.bloqueado ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}
                              title={
                                u.bloqueado
                                  ? "Desbloquear Cuenta"
                                  : "Bloquear Cuenta"
                              }
                            >
                              {u.bloqueado ? (
                                <Unlock size={16} />
                              ) : (
                                <Lock size={16} />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex justify-center"
                            title="Super Admin Protegido"
                          >
                            <ShieldAlert size={20} className="text-gray-300" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === "seguridad" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
              <ShieldCheck className="text-red-600" /> Guardián de Oficina
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Configura la IP de tu internet. Si alguien intenta iniciar sesión
              fuera de esta red, el sistema lo bloqueará automáticamente.
            </p>

            <div className="space-y-5">
              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase">
                  Dirección IP Autorizada
                </Label>
                <Input
                  placeholder="Ej: 186.42.11.55"
                  value={configSeguridad.ipOficina}
                  onChange={(e) =>
                    setConfigSeguridad({
                      ...configSeguridad,
                      ipOficina: e.target.value,
                    })
                  }
                  className="mt-1.5 font-mono bg-gray-50"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase mb-2 block">
                  Roles Restringidos a esta IP
                </Label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-200px overflow-y-auto">
                  {rolesDinamicos
                    .filter(
                      (r) =>
                        r.nombre !== "super_admin" && r.nombre !== "vendedor",
                    )
                    .map((rol) => (
                      <label
                        key={rol.id}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={configSeguridad.rolesBloqueados.includes(
                            rol.nombre,
                          )}
                          onChange={() => handleToggleRolBloqueado(rol.nombre)}
                          className="rounded text-red-600 focus:ring-red-600"
                        />
                        <span className="uppercase text-xs">
                          {rol.nombre.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <Button
                onClick={handleGuardarConfigSeguridad}
                disabled={savingSeguridad}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold h-11"
              >
                <Save size={16} className="mr-2" />{" "}
                {savingSeguridad ? "Guardando..." : "Aplicar Seguridad"}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity className="text-blue-600" /> Monitoreo de Ataques
                (Bots)
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-gray-600">
                      Fecha y Hora
                    </TableHead>
                    <TableHead className="font-bold text-xs text-gray-600">
                      IP del Atacante
                    </TableHead>
                    <TableHead className="font-bold text-xs text-gray-600">
                      Evento
                    </TableHead>
                    <TableHead className="font-bold text-xs text-gray-600 text-center">
                      Castigo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSeguridad ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : logsSeguridad.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-gray-500 font-bold"
                      >
                        Sistema seguro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logsSeguridad
                      .slice(
                        (currentPageSeguridad - 1) * itemsPerPageSeguridad,
                        currentPageSeguridad * itemsPerPageSeguridad,
                      )
                      .map((log) => (
                        <TableRow key={log.id} className="hover:bg-red-50/30">
                          <TableCell className="text-xs text-gray-600 font-medium">
                            {new Date(log.createdAt).toLocaleString("es-EC")}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-gray-900">
                            {log.ip === "::1" ? "127.0.0.1 (Local)" : log.ip}
                          </TableCell>
                          <TableCell>
                            {log.evento === "RATE_LIMIT_ACTIVADO" ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                                BLOQUEO AUTOMÁTICO
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                INTENTO FALLIDO
                              </Badge>
                            )}
                            {log.emailIntentado && (
                              <div className="text-[10px] text-gray-500 mt-1">
                                Target: {log.emailIntentado}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {log.nivelBloqueo === 3 ? (
                              <span className="text-xs font-black text-red-600">
                                24H
                              </span>
                            ) : log.nivelBloqueo === 2 ? (
                              <span className="text-xs font-black text-amber-600">
                                30M
                              </span>
                            ) : log.nivelBloqueo === 1 ? (
                              <span className="text-xs font-black text-blue-600">
                                15M
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {logsSeguridad.length > itemsPerPageSeguridad && (
              <div className="p-4 border-t flex justify-between items-center bg-gray-50/50">
                <span className="text-xs text-gray-500 font-medium">
                  Página {currentPageSeguridad} de{" "}
                  {Math.ceil(logsSeguridad.length / itemsPerPageSeguridad)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageSeguridad((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPageSeguridad === 1}
                    className="h-8 text-xs font-bold"
                  >
                    Ant.
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageSeguridad((p) =>
                        Math.min(
                          Math.ceil(
                            logsSeguridad.length / itemsPerPageSeguridad,
                          ),
                          p + 1,
                        ),
                      )
                    }
                    disabled={
                      currentPageSeguridad ===
                      Math.ceil(logsSeguridad.length / itemsPerPageSeguridad)
                    }
                    className="h-8 text-xs font-bold"
                  >
                    Sig.
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={modalDeptoOpen} onOpenChange={setModalDeptoOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-3">
              <Briefcase className="text-primary" /> Gestionar Áreas Operativas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <form
              onSubmit={handleCrearDepartamento}
              className="flex gap-2 items-end"
            >
              <div className="flex-1">
                <Label className="text-xs font-bold text-gray-600 uppercase">
                  Crear Nuevo Departamento
                </Label>
                <Input
                  required
                  placeholder="Ej. Logística, Bodega 2..."
                  value={nuevoDeptoNombre}
                  onChange={(e) => setNuevoDeptoNombre(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={savingDepto}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-4"
              >
                {savingDepto ? "..." : <Plus size={18} />}
              </Button>
            </form>

            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-2 border-b border-gray-200 font-bold text-[10px] text-gray-500 uppercase text-center tracking-widest">
                Catálogo de Áreas Actuales
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                {departamentos.length === 0 ? (
                  <li className="p-4 text-center text-xs text-gray-500 font-bold">
                    No hay departamentos creados.
                  </li>
                ) : (
                  departamentos.map((d) => (
                    <li
                      key={d.id}
                      className="p-3 text-sm font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50"
                    >
                      <CheckCircle2 size={16} className="text-emerald-500" />{" "}
                      {d.nombre}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-3">
              <User className="text-primary" />{" "}
              {formUser.id ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGuardarUsuario} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-gray-600 uppercase">
                Nombre Completo *
              </Label>
              <Input
                required
                placeholder="Ej. Juan Pérez"
                value={formUser.nombre}
                onChange={(e) =>
                  setFormUser({ ...formUser, nombre: e.target.value })
                }
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600 uppercase">
                Correo Electrónico *
              </Label>
              <Input
                required
                type="email"
                placeholder="juan@empresa.com"
                value={formUser.email}
                onChange={(e) =>
                  setFormUser({ ...formUser, email: e.target.value })
                }
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600 uppercase">
                Contraseña {formUser.id ? "(Opcional)" : "*"}
              </Label>
              <Input
                required={!formUser.id}
                type="password"
                placeholder={
                  formUser.id ? "Escribe para cambiarla..." : "Contraseña..."
                }
                value={formUser.password}
                onChange={(e) =>
                  setFormUser({ ...formUser, password: e.target.value })
                }
                className="mt-1 h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-600 uppercase">
                  Asignar Rol *
                </Label>
                <select
                  required
                  className="w-full h-10 border border-gray-300 rounded-lg px-2 text-sm mt-1 outline-none"
                  value={formUser.rolId}
                  onChange={(e) =>
                    setFormUser({ ...formUser, rolId: e.target.value })
                  }
                >
                  <option value="">Rol...</option>
                  {rolesDinamicos.map(
                    (r) =>
                      r.nombre !== "super_admin" && (
                        <option key={r.id} value={r.id} className="uppercase">
                          {r.nombre.replace("_", " ")}
                        </option>
                      ),
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-600 uppercase">
                  Área Operativa *
                </Label>
                <select
                  className="w-full h-10 border border-gray-300 rounded-lg px-2 text-sm mt-1 outline-none"
                  value={formUser.departamentoId}
                  onChange={(e) =>
                    setFormUser({ ...formUser, departamentoId: e.target.value })
                  }
                >
                  <option value="">General (Sin Área)</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formUser.id && (
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border mt-2">
                <Label className="text-xs font-bold text-gray-700 uppercase">
                  Estado:
                </Label>
                <select
                  className="h-9 border border-gray-300 rounded-lg px-2 text-xs font-bold text-gray-700 outline-none"
                  value={formUser.activo ? "true" : "false"}
                  onChange={(e) =>
                    setFormUser({
                      ...formUser,
                      activo: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">🟢 Permitir Acceso</option>
                  <option value="false">🔴 Suspender Cuenta</option>
                </select>
              </div>
            )}
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingUser}
                className="bg-primary text-white font-bold"
              >
                {savingUser ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
