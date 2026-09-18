"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =========================================================
  // 🛡️ CAPTURADOR DE ALERTAS DEL MIDDLEWARE (SEGURIDAD) 🛡️
  // =========================================================
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "concurrencia":
          setError(
            "Tu inicio de sesión fue registrado en otro dispositivo, alguien más inició sesión.",
          );
          break;
        case "inactividad":
          setError(
            "Tu sesión se cerró por inactividad prolongada (30 min). Por favor, inicia sesión de nuevo.",
          );
          break;
        case "ip_invalida":
          setError(
            "Acceso bloqueado. Estás intentando ingresar desde una red de internet no autorizada.",
          );
          break;
        case "bloqueado":
          setError(
            "Tu cuenta ha sido bloqueada desde el sistema central. Contacta al Administrador.",
          );
          break;
        default:
          setError(
            "Tu sesión ha expirado por seguridad. Vuelve a iniciar sesión.",
          );
      }

      // Limpiamos la URL para que el mensaje no se quede pegado si el usuario recarga la página
      router.replace("/login");
    }
  }, [searchParams, router]);

  // 🔥 MAGIA ULTRA-INTELIGENTE: BÚSQUEDA POR PALABRAS CLAVE 🔥
  const getRedirectUrl = (rol: string, permisos: any[]) => {
    const rolLower = rol.toLowerCase();

    if (rolLower.includes("admin") || rolLower === "super_admin")
      return "/inicio";

    const modulosStr = Array.isArray(permisos)
      ? permisos.map((p) =>
          typeof p === "string"
            ? p.toLowerCase()
            : (p.modulo || p.nombre || "").toLowerCase(),
        )
      : [];

    if (modulosStr.length === 0) return "/login?error=SinPermisos";

    const tienePermiso = (palabras: string[]) => {
      return modulosStr.some((permiso) =>
        palabras.some((palabra) => permiso.includes(palabra)),
      );
    };

    if (tienePermiso(["inicio", "dashboard"])) return "/inicio";
    if (tienePermiso(["agenda"])) return "/agenda";
    if (tienePermiso(["operaciones"])) return "/operaciones";
    if (tienePermiso(["produccion", "taller"])) return "/produccion";
    if (tienePermiso(["empaque", "bodega"])) return "/empaque";
    if (tienePermiso(["despacho", "historial"])) return "/historial-despachos";
    if (tienePermiso(["cobranzas", "facturacion", "cartera"]))
      return "/cobranzas";
    if (tienePermiso(["tickets"])) return "/tickets";
    if (tienePermiso(["ventas", "pedidos"])) return "/pedidos";
    if (tienePermiso(["sku", "catalogo", "codigo"]))
      return "/configuraciones/skus";
    if (tienePermiso(["configuracion"])) return "/configuraciones";

    if (modulosStr[0]) {
      let moduloBase = modulosStr[0].split(":")[0].trim();
      moduloBase = moduloBase
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
      return `/${moduloBase}`;
    }

    return "/inicio";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        // 🔥 Capturamos el mensaje exacto de Rate Limiting o los 3 intentos desde el Backend
        throw new Error(data.error || "Error al iniciar sesión");
      }

      // 🚀 Usamos el Smart Redirect con los permisos extraídos
      const rutaDestino = getRedirectUrl(data.rol, data.permisos || []);
      router.push(rutaDestino);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-card py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-border relative overflow-hidden">
        {/* Línea decorativa superior */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

        {error && (
          <div className="mb-5 bg-red-50/80 border border-red-200 p-4 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <p className="text-sm text-red-800 font-semibold leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-bold text-foreground"
            >
              Correo Electrónico
            </Label>
            <div className="mt-1.5">
              <Input
                id="email"
                type="email"
                required
                className="w-full h-11 bg-white focus:ring-primary focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@araujos.com"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-bold text-foreground"
            >
              Contraseña
            </Label>
            <div className="mt-1.5 relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full h-11 pr-10 bg-white focus:ring-primary focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base font-bold shadow-md transition-transform active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "Validando Seguridad..." : "Entrar al sistema"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// 🛡️ Wrapper obligatorio en Next.js App Router para usar `useSearchParams` sin perjudicar el rendimiento 🛡️
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]` from-gray-50 to-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Logo Araujos"
          className="h-28 w-70 object-contain mb-2 drop-shadow-sm"
        />
        <h2 className="mt-1 text-center text-3xl font-black text-gray-900 tracking-tight">
          Iniciar Sesión
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-gray-500 uppercase tracking-widest">
          Sistema de Gestión Corporativa
        </p>
      </div>

      <Suspense
        fallback={
          <div className="mt-8 text-center text-gray-400 font-bold animate-pulse">
            Cargando módulo de seguridad...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
