"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MESES_DEL_ANIO } from "@/lib/marketing/semana";

export type ResultadoCarga = {
  cargaId: string;
  totalRegistros: number;
  descartados?: number;
  anioMinimoSinContrato?: number | null;
  semana: string;
};

type Props = {
  onCargado: (resultado: ResultadoCarga) => void | Promise<void>;
};

export default function CargaExcel({ onCargado }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [semana, setSemana] = useState(() =>
    String(Math.ceil(new Date().getDate() / 7)),
  );
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1));
  const [anio, setAnio] = useState(() => String(new Date().getFullYear()));
  const [anioMinimoSinContrato, setAnioMinimoSinContrato] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);

  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 11 }, (_, indice) => anioActual - 5 + indice);
  const aniosMinimo = Array.from(
    { length: 21 },
    (_, indice) => anioActual - 15 + indice,
  );

  const subir = async () => {
    if (!archivo) return;
    const numeroSemana = Number(semana);
    const numeroMes = Number(mes);
    const numeroAnio = Number(anio);
    const numeroAnioMinimo =
      anioMinimoSinContrato === "" ? null : Number(anioMinimoSinContrato);
    if (
      !Number.isInteger(numeroSemana) ||
      numeroSemana < 1 ||
      numeroSemana > 5 ||
      !Number.isInteger(numeroMes) ||
      numeroMes < 1 ||
      numeroMes > 12 ||
      !Number.isInteger(numeroAnio) ||
      numeroAnio < 1900 ||
      numeroAnio > 2100 ||
      (numeroAnioMinimo !== null &&
        (!Number.isInteger(numeroAnioMinimo) ||
          numeroAnioMinimo < 1900 ||
          numeroAnioMinimo > 2100))
    ) {
      setError("Selecciona una semana, mes y año válidos.");
      return;
    }
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const datos = new FormData();
      datos.append("archivo", archivo);
      datos.append("semana", String(numeroSemana));
      datos.append("mes", String(numeroMes));
      datos.append("anio", String(numeroAnio));
      datos.append("anioMinimoSinContrato", anioMinimoSinContrato);
      const respuesta = await fetch("/api/marketing/carga", {
        method: "POST",
        body: datos,
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(cuerpo.error ?? "No se pudo cargar el archivo");
      }
      const cargado = cuerpo as ResultadoCarga;
      setArchivo(null);
      setResultado(cargado);
      await onCargado(cargado);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Upload size={16} />
          Seleccionar Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          />
        </label>
        {archivo && <span className="text-sm text-gray-600">{archivo.name}</span>}
        <Button type="button" onClick={() => void subir()} disabled={!archivo || cargando}>
          {cargando ? "Procesando…" : "Cargar cartera"}
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Semana del mes
          <select
            value={semana}
            onChange={(evento) => setSemana(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((numero) => (
              <option key={numero} value={numero}>
                Semana {numero}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Mes
          <select
            value={mes}
            onChange={(evento) => setMes(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {MESES_DEL_ANIO.map((nombre, indice) => (
              <option key={nombre} value={indice + 1}>
                {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Año
          <select
            value={anio}
            onChange={(evento) => setAnio(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {anios.map((numero) => (
              <option key={numero} value={numero}>
                {numero}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Año mínimo sin contrato
          <select
            value={anioMinimoSinContrato}
            onChange={(evento) => setAnioMinimoSinContrato(evento.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Sin filtro</option>
            {aniosMinimo.map((numero) => (
              <option key={numero} value={numero}>
                {numero}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {resultado && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
          <p className="font-bold">
            {resultado.semana} cargada · {resultado.totalRegistros.toLocaleString("es-EC")}{" "}
            registros
          </p>
          {resultado.descartados ? (
            <p>
              {resultado.descartados.toLocaleString("es-EC")} registros descartados
              (consumidor final)
            </p>
          ) : null}
          {resultado.anioMinimoSinContrato ? (
            <p>
              Año mínimo sin contrato: {resultado.anioMinimoSinContrato}
            </p>
          ) : null}
          <Link
            href="/marketing/historial"
            className="mt-1 inline-block font-bold text-green-800 underline"
          >
            Ver historial de cargas
          </Link>
        </div>
      )}
    </div>
  );
}
