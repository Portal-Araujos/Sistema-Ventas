import { claveIdentificacion, type AnalisisCartera } from "./semaforo";
import type { ClienteCartera } from "./types";

export type MotivoEnvio = "REVENTA" | "SIN CONTRATO";

export type EstadoFiltroEnvio = "todos" | "pendientes" | "enviados";

export type CandidatoEnvio = {
  clave: string;
  identificacion: string;
  nombreCliente: string;
  categoria: string;
  provincia: string;
  ciudad: string;
  vendedorAnterior: string;
  movil: string;
  fechaVence: string;
  motivos: MotivoEnvio[];
  enviado: boolean;
  vendedorId: string | null;
  vendedorNombre: string | null;
  ticketCodigo: string | null;
  ticketId: number | null;
  fechaEnvio: string | null;
};

export type ClienteEnRegistro = {
  clave: string;
  identificacion: string;
  nombreCliente: string;
  motivo: string;
};

export type RegistroEnvio = {
  id: string;
  ticketId: number | null;
  ticketCodigo: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
  fecha: string;
  clientes: ClienteEnRegistro[];
};

export type EstadoEnvio = {
  vendedorId: string | null;
  vendedorNombre: string | null;
  ticketId: number | null;
  ticketCodigo: string | null;
  fechaEnvio: string;
};

export type ConteoVendedor = {
  vendedorId: string;
  vendedorNombre: string;
  total: number;
};

type AuditoriaEnvio = {
  id: string;
  detalles: string | null;
  createdAt: Date | string;
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function entero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) ? valor : null;
}

function fechaISO(valor: Date | string): string {
  return valor instanceof Date ? valor.toISOString() : String(valor);
}

export function parsearRegistrosEnvio(
  auditorias: AuditoriaEnvio[],
): RegistroEnvio[] {
  const registros: RegistroEnvio[] = [];

  for (const auditoria of auditorias) {
    if (!auditoria.detalles) continue;
    let datos: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(auditoria.detalles);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        continue;
      }
      datos = parsed as Record<string, unknown>;
    } catch {
      continue;
    }

    const clientesBrutos = Array.isArray(datos.clientes) ? datos.clientes : [];
    const clientes: ClienteEnRegistro[] = [];
    for (const cliente of clientesBrutos) {
      if (!cliente || typeof cliente !== "object") continue;
      const item = cliente as Record<string, unknown>;
      const clave = claveIdentificacion(texto(item.clave));
      if (!clave) continue;
      clientes.push({
        clave,
        identificacion: texto(item.identificacion),
        nombreCliente: texto(item.nombreCliente),
        motivo: texto(item.motivo),
      });
    }
    if (clientes.length === 0) continue;

    registros.push({
      id: auditoria.id,
      ticketId: entero(datos.ticketId),
      ticketCodigo: texto(datos.ticketCodigo) || null,
      vendedorId: texto(datos.vendedorId) || null,
      vendedorNombre: texto(datos.vendedorNombre) || null,
      fecha: fechaISO(auditoria.createdAt),
      clientes,
    });
  }

  return registros;
}

export function estadosPorCliente(
  registros: RegistroEnvio[],
): Map<string, EstadoEnvio> {
  const estados = new Map<string, EstadoEnvio>();
  for (const registro of registros) {
    const estado: EstadoEnvio = {
      vendedorId: registro.vendedorId,
      vendedorNombre: registro.vendedorNombre,
      ticketId: registro.ticketId,
      ticketCodigo: registro.ticketCodigo,
      fechaEnvio: registro.fecha,
    };
    for (const cliente of registro.clientes) {
      if (!estados.has(cliente.clave)) estados.set(cliente.clave, estado);
    }
  }
  return estados;
}

export function conteosPorVendedor(
  registros: RegistroEnvio[],
): ConteoVendedor[] {
  const conteos = new Map<string, { nombre: string; clientes: Set<string> }>();
  for (const registro of registros) {
    if (!registro.vendedorId) continue;
    const actual = conteos.get(registro.vendedorId) ?? {
      nombre: registro.vendedorNombre ?? "Vendedor",
      clientes: new Set<string>(),
    };
    for (const cliente of registro.clientes) actual.clientes.add(cliente.clave);
    conteos.set(registro.vendedorId, actual);
  }
  return [...conteos]
    .map(([vendedorId, dato]) => ({
      vendedorId,
      vendedorNombre: dato.nombre,
      total: dato.clientes.size,
    }))
    .sort((a, b) => a.vendedorNombre.localeCompare(b.vendedorNombre, "es"));
}

export function etiquetaMotivos(motivos: MotivoEnvio[]): string {
  if (motivos.includes("REVENTA") && motivos.includes("SIN CONTRATO")) {
    return "Reventa y sin contrato";
  }
  if (motivos.includes("REVENTA")) return "Reventa";
  if (motivos.includes("SIN CONTRATO")) return "Sin contrato";
  return "—";
}

export function construirCandidatos(
  analisis: AnalisisCartera,
  filas: ClienteCartera[],
  estados: Map<string, EstadoEnvio>,
): CandidatoEnvio[] {
  const representantes = new Map<string, ClienteCartera>();
  for (const documento of analisis.sinContrato) {
    representantes.set(claveIdentificacion(documento.identificacion), documento);
  }
  for (const documento of analisis.documentos) {
    const clave = claveIdentificacion(documento.identificacion);
    if (!representantes.has(clave)) representantes.set(clave, documento);
  }
  for (const fila of filas) {
    const clave = claveIdentificacion(fila.identificacion);
    if (!representantes.has(clave)) representantes.set(clave, fila);
  }

  const reventa = new Set(analisis.idsReventa);
  const sinContrato = new Set(
    analisis.sinContrato.map((documento) =>
      claveIdentificacion(documento.identificacion),
    ),
  );
  const claves = new Set<string>([...reventa, ...sinContrato]);
  const candidatos: CandidatoEnvio[] = [];

  for (const clave of claves) {
    const fila = representantes.get(clave);
    if (!fila) continue;

    const motivos: MotivoEnvio[] = [];
    if (reventa.has(clave)) motivos.push("REVENTA");
    if (sinContrato.has(clave)) motivos.push("SIN CONTRATO");
    const estado = estados.get(clave);

    candidatos.push({
      clave,
      identificacion: fila.identificacion,
      nombreCliente: fila.nombreCliente,
      categoria: fila.categoriaOrigen,
      provincia: fila.provincia,
      ciudad: fila.ciudad,
      vendedorAnterior: fila.vendedor,
      movil: fila.movil,
      fechaVence: fila.fechaVence,
      motivos,
      enviado: Boolean(estado),
      vendedorId: estado?.vendedorId ?? null,
      vendedorNombre: estado?.vendedorNombre ?? null,
      ticketCodigo: estado?.ticketCodigo ?? null,
      ticketId: estado?.ticketId ?? null,
      fechaEnvio: estado?.fechaEnvio ?? null,
    });
  }

  return candidatos.sort(
    (a, b) =>
      a.nombreCliente.localeCompare(b.nombreCliente, "es") ||
      a.identificacion.localeCompare(b.identificacion, "es"),
  );
}

export function cuerpoMensajeTicket({
  semana,
  vendedorNombre,
  clientes,
}: {
  semana: string;
  vendedorNombre: string;
  clientes: CandidatoEnvio[];
}): string {
  const lineas = [
    `Se asignaron ${clientes.length} cliente(s) a ${vendedorNombre}.`,
    `Carga: ${semana}.`,
    "",
    "Clientes asignados:",
  ];

  clientes.forEach((cliente, indice) => {
    const ubicacion =
      [cliente.provincia, cliente.ciudad].filter(Boolean).join(" / ") ||
      "Sin ubicación";
    const anterior = cliente.vendedorAnterior || "N/A";
    const movil = cliente.movil || "—";
    lineas.push(
      `${indice + 1}. Nombre: ${cliente.nombreCliente} — Móvil: ${movil} — Identificación: ${cliente.identificacion} — ${etiquetaMotivos(cliente.motivos)} — ${ubicacion} — vendedor anterior: ${anterior}`,
    );
  });

  return lineas.join("\n");
}
