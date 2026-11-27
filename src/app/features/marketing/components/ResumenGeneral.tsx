"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SemaforoResponse } from "../types";

function fechaHora(valor: string): string {
  return new Date(valor).toLocaleString("es-EC");
}

function fecha(valor: string): string {
  return new Date(`${valor}T12:00:00Z`).toLocaleDateString("es-EC", {
    timeZone: "UTC",
  });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-gray-500">
        {etiqueta}
      </span>
      <span className="text-sm font-semibold text-gray-800">{valor}</span>
    </div>
  );
}

export default function ResumenGeneral({ datos }: { datos: SemaforoResponse }) {
  const carga = datos.carga;

  if (!carga) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No hay una cartera cargada para mostrar.
      </div>
    );
  }

  const filas = [...datos.resumen.grupos, datos.resumen.general];
  const filasSinContrato = [
    ...datos.resumen.sinContrato.grupos,
    datos.resumen.sinContrato.general,
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Dato etiqueta="Semana" valor={carga.semana} />
        <Dato etiqueta="Fecha y hora de carga" valor={fechaHora(carga.createdAt)} />
        <Dato etiqueta="Fecha de corte" valor={fecha(carga.fechaCorteISO)} />
        <Dato
          etiqueta="Registros cargados"
          valor={carga.totalRegistros.toLocaleString("es-EC")}
        />
        <Dato
          etiqueta="Identificaciones únicas"
          valor={carga.identificacionesUnicas.toLocaleString("es-EC")}
        />
        <Dato
          etiqueta="Año mínimo sin contrato"
          valor={
            carga.anioMinimoSinContrato
              ? String(carga.anioMinimoSinContrato)
              : "Sin filtro"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
        <span className="text-gray-600">
          Clientes únicos:{" "}
          <strong className="text-gray-900">
            {datos.indicadores.clientesUnicos.toLocaleString("es-EC")}
          </strong>
        </span>
        <span className="text-gray-600">
          Oportunidades de reventa:{" "}
          <strong className="text-gray-900">
            {datos.indicadores.oportunidadesReventa.toLocaleString("es-EC")}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="h-full rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4 text-center">
            <p className="text-sm font-bold text-gray-800">Tabla Operativa</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">
              Clientes existentes y oportunidades de reventa
            </p>
            <p className="mt-1 text-xs text-gray-500">
              E = identificación con documentos en la categoría · R =
              identificación con oportunidad de reventa
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">E</TableHead>
                <TableHead className="text-right">R</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow
                  key={fila.categoria}
                  className={
                    fila.categoria === "General" ? "font-semibold" : ""
                  }
                >
                  <TableCell>{fila.etiqueta}</TableCell>
                  <TableCell className="text-right">
                    {fila.e.toLocaleString("es-EC")}
                  </TableCell>
                  <TableCell className="text-right">
                    {fila.r.toLocaleString("es-EC")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="h-full rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4 text-center">
            <p className="text-sm font-bold text-gray-800">
              Oportunidades de reventa (sin contrato)
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasSinContrato.map((fila) => (
                <TableRow
                  key={fila.categoria}
                  className={
                    fila.categoria === "General" ? "font-semibold" : ""
                  }
                >
                  <TableCell>{fila.etiqueta}</TableCell>
                  <TableCell className="text-right">
                    {fila.total.toLocaleString("es-EC")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
