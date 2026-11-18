"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  deshabilitado: boolean;
  enviadoEn: string | null;
  onEnviado: () => void | Promise<void>;
};

export default function BotonEnvio({ deshabilitado, enviadoEn, onEnviado }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/marketing/enviar", { method: "POST" });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        throw new Error(cuerpo.error ?? "No se pudo enviar la cartera");
      }
      await onEnviado();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={enviar}
          disabled={deshabilitado || cargando}
        >
          <Send size={16} className="mr-2" />
          {cargando
            ? "Enviando…"
            : enviadoEn
              ? "Reenviar a vendedores"
              : "Enviar a vendedores"}
        </Button>
        {enviadoEn && (
          <span className="text-xs text-gray-500">
            Enviado el {new Date(enviadoEn).toLocaleString("es-EC")}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
