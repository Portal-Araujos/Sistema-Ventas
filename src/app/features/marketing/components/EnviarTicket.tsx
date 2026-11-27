"use client";

import { useState } from "react";
import { type VendedorEnvio } from "@/lib/marketing";

type Props = {
  cargaId: string;
  vendedores: VendedorEnvio[];
  claves: string[];
  onEnviado: () => void | Promise<void>;
};

export default function EnviarTicket({
  cargaId,
  vendedores,
  claves,
  onEnviado,
}: Props) {
  const [vendedorId, setVendedorId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");

  const enviar = async () => {
    if (!vendedorId || claves.length === 0) return;
    setEnviando(true);
    setError("");
    setResultado("");
    try {
      const respuesta = await fetch("/api/marketing/envios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargaId,
          vendedorId,
          claves,
        }),
      });
      const cuerpo = (await respuesta.json()) as {
        error?: string;
        ticketCodigo?: string;
        enviados?: number;
      };
      if (!respuesta.ok) throw new Error(cuerpo.error || "No se pudo enviar");
      setResultado(
        `Ticket ${cuerpo.ticketCodigo} enviado con ${cuerpo.enviados} cliente(s).`,
      );
      await onEnviado();
    } catch (errorEnvio) {
      setError(
        errorEnvio instanceof Error
          ? errorEnvio.message
          : "No se pudo enviar el ticket.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Envío de ticket
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-gray-700">
          Vendedor
          <select
            value={vendedorId}
            onChange={(evento) => setVendedorId(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="">Seleccionar vendedor…</option>
            {vendedores.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs font-semibold text-gray-700">
          <strong>{claves.length}</strong> cliente(s) seleccionado(s)
        </p>
        <button
          type="button"
          disabled={enviando || !vendedorId || claves.length === 0}
          onClick={() => void enviar()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "Enviar ticket"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {resultado && <p className="text-sm text-green-700">{resultado}</p>}
    </section>
  );
}
