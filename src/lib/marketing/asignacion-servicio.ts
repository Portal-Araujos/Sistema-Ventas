import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  aClienteAsignable,
  aplicarAsignacionesPersistidas,
  canonizarVendedor,
  clientesCandidatos,
  describirFiltros,
  etiquetaCarga,
  redistribuirClientes,
  seleccionarAleatoriamente,
  type ClienteDistribuido,
  type ClienteRow,
  type SolicitudAsignacionManual,
} from "@/lib/marketing";
import { generarSiguienteCodigoTicket } from "@/lib/tickets/codigo";
import { registrarAuditoriaMarketing } from "./auditoria";
import { obtenerInstitucionCarteraMarketing } from "./institucion-ticket";

type ClientePrisma = Prisma.TransactionClient | typeof prisma;

export class AsignacionError extends Error {
  readonly status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.name = "AsignacionError";
    this.status = status;
  }
}

type CargaActiva = Prisma.MarketingCargaGetPayload<{
  include: { clientes: true };
}>;

type VendedorDestino = {
  usuario: { id: string; nombre: string };
  canonico: string;
};

export async function obtenerCargaActiva(
  cliente: ClientePrisma = prisma,
): Promise<CargaActiva> {
  const carga = await cliente.marketingCarga.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "desc" },
    include: { clientes: { orderBy: { fila: "asc" } } },
  });
  if (!carga) throw new AsignacionError("No hay una carga activa de Marketing");
  return carga;
}

export async function validarVendedorDestino(
  vendedorId: string,
  cliente: ClientePrisma = prisma,
): Promise<VendedorDestino> {
  const usuario = await cliente.usuario.findFirst({
    where: {
      id: vendedorId,
      activo: true,
      bloqueado: false,
      rol: { nombre: "vendedor" },
    },
    select: { id: true, nombre: true },
  });
  if (!usuario) {
    throw new AsignacionError("Selecciona un vendedor activo del sistema");
  }
  const canonico = canonizarVendedor(usuario.nombre);
  if (!canonico) {
    throw new AsignacionError(
      `El nombre "${usuario.nombre}" no corresponde a un vendedor de Marketing`,
    );
  }
  return { usuario, canonico };
}

function filasDeCarga(carga: CargaActiva): ClienteDistribuido[] {
  const filas: ClienteRow[] = carga.clientes.map((cliente) => ({
    fila: cliente.fila,
    identificacion: cliente.identificacion,
    nombreCliente: cliente.nombreCliente,
    numDocumento: cliente.numDocumento,
    fechaEmision: cliente.fechaEmision,
    fechaVence: cliente.fechaVence,
    total: cliente.total,
    ctas: cliente.ctas,
    abonado: cliente.abonado,
    cob: cliente.cob,
    saldo: cliente.saldo,
    ven: cliente.ven,
    dias: cliente.dias,
    movil: cliente.movil,
    vendedor: cliente.vendedor,
    cuota: cliente.cuota,
    saldoFecha: cliente.saldoFecha,
    categoriaOrigen: cliente.categoriaOrigen,
    provincia: cliente.provincia,
    ciudad: cliente.ciudad,
    direccion: cliente.direccion,
  }));

  const asignadosPorFila = new Map<number, string>();
  for (const cliente of carga.clientes) {
    const canonico = canonizarVendedor(cliente.vendedorAsignado);
    if (canonico) asignadosPorFila.set(cliente.fila, canonico);
  }

  const { aplicado } = redistribuirClientes(filas);
  return aplicarAsignacionesPersistidas(aplicado, asignadosPorFila);
}

export function resolverSeleccion(
  carga: CargaActiva,
  solicitud: SolicitudAsignacionManual,
  vendedorCanonico: string,
): { candidatos: ClienteDistribuido[]; seleccion: ClienteDistribuido[] } {
  const candidatos = clientesCandidatos(
    filasDeCarga(carga),
    solicitud.filtros,
    vendedorCanonico,
  );

  if (candidatos.length < solicitud.cantidad) {
    throw new AsignacionError(
      `Solo hay ${candidatos.length.toLocaleString("es-EC")} clientes disponibles con esos filtros`,
    );
  }

  const seleccion = seleccionarAleatoriamente(
    candidatos,
    solicitud.cantidad,
    solicitud.semilla,
  );

  if (solicitud.filas) {
    const esperadas = new Set(seleccion.map((fila) => fila.fila));
    const recibidas = new Set(solicitud.filas);
    const coincide =
      esperadas.size === recibidas.size &&
      [...esperadas].every((fila) => recibidas.has(fila));
    if (!coincide) {
      throw new AsignacionError(
        "La selección cambió. Vuelve a previsualizar antes de enviar.",
        409,
      );
    }
  }

  return { candidatos, seleccion };
}

function construirMensajeTicket({
  carga,
  vendedor,
  solicitud,
  seleccion,
}: {
  carga: CargaActiva;
  vendedor: VendedorDestino;
  solicitud: SolicitudAsignacionManual;
  seleccion: ClienteDistribuido[];
}): string {
  const lineas = seleccion.map(
    (cliente, indice) =>
      `${indice + 1}. ${cliente.identificacion || "Sin identificación"} — ${cliente.nombreCliente} — ${cliente.provincia || "Sin provincia"} / ${cliente.ciudad || "Sin ciudad"} — vendedor anterior: ${cliente.vendedorAsignado || "sin vendedor"}`,
  );

  return [
    `Se asignaron ${seleccion.length.toLocaleString("es-EC")} clientes a ${vendedor.usuario.nombre}.`,
    `Carga: ${etiquetaCarga(carga)} — ${carga.nombreArchivo}.`,
    `Filtros aplicados: ${describirFiltros(solicitud.filtros)}.`,
    `Selección aleatoria reproducible. Semilla: ${solicitud.semilla}.`,
    "",
    "Clientes asignados:",
    ...lineas,
  ].join("\n");
}

export async function previsualizarAsignacion(solicitud: SolicitudAsignacionManual) {
  const carga = await obtenerCargaActiva();
  const vendedor = await validarVendedorDestino(solicitud.vendedorId);
  const { candidatos, seleccion } = resolverSeleccion(
    carga,
    solicitud,
    vendedor.canonico,
  );

  return {
    carga: {
      id: carga.id,
      nombreArchivo: carga.nombreArchivo,
      semana: etiquetaCarga(carga),
      totalRegistros: carga.totalRegistros,
    },
    vendedor: {
      id: vendedor.usuario.id,
      nombre: vendedor.usuario.nombre,
      canonico: vendedor.canonico,
    },
    elegibles: candidatos.length,
    semilla: solicitud.semilla,
    clientes: seleccion.map(aClienteAsignable),
  };
}

export async function enviarAsignacion(
  solicitud: SolicitudAsignacionManual,
  sessionId: string,
) {
  const enviadoEn = new Date();

  for (let intento = 0; intento < 5; intento += 1) {
    const codigo = await generarSiguienteCodigoTicket();

    try {
      return await prisma.$transaction(
        async (tx) => {
          const carga = await tx.marketingCarga.findFirst({
            where: { id: solicitud.cargaId ?? undefined, activo: true },
            orderBy: { createdAt: "desc" },
            include: { clientes: { orderBy: { fila: "asc" } } },
          });
          if (!carga) {
            throw new AsignacionError("La carga vigente cambió. Recarga la página.");
          }

          const vendedor = await validarVendedorDestino(solicitud.vendedorId, tx);
          const { seleccion } = resolverSeleccion(
            carga,
            solicitud,
            vendedor.canonico,
          );
          const filas = seleccion.map((cliente) => cliente.fila);
          const institucionId = await obtenerInstitucionCarteraMarketing(
            tx,
            sessionId,
          );
          const mensaje = construirMensajeTicket({
            carga,
            vendedor,
            solicitud,
            seleccion,
          });

          await tx.marketingCliente.updateMany({
            where: { cargaId: carga.id, fila: { in: filas } },
            data: { vendedorAsignado: vendedor.canonico },
          });

          const ticket = await tx.ticketGestion.create({
            data: {
              codigo,
              tipo: "Marketing",
              asunto: `Cartera asignada — ${etiquetaCarga(carga)} — ${vendedor.usuario.nombre}`,
              prioridad: "Media",
              estado: "Abierto",
              institucionId,
              creadorId: sessionId,
              asignados: { connect: { id: vendedor.usuario.id } },
              mensajes: {
                create: {
                  remitenteId: sessionId,
                  contenido: mensaje,
                  esSistema: false,
                },
              },
            },
          });

          await tx.notificacion.create({
            data: {
              titulo: `${ticket.codigo}: cartera asignada`,
              mensaje: `${seleccion.length.toLocaleString("es-EC")} clientes asignados desde ${etiquetaCarga(carga)}.`,
              tipoModulo: "TICKETS",
              urlDestino: `/tickets?ticketId=${ticket.id}`,
              usuarioDestinoId: vendedor.usuario.id,
            },
          });

          await tx.marketingCarga.update({
            where: { id: carga.id },
            data: { enviadoEn },
          });

          const detalles: Record<string, unknown> = {
            vendedorId: vendedor.usuario.id,
            vendedor: vendedor.usuario.nombre,
            vendedorCanonico: vendedor.canonico,
            filtros: solicitud.filtros,
            cantidad: seleccion.length,
            semilla: solicitud.semilla,
            filas,
            ticketId: ticket.id,
            ticketCodigo: ticket.codigo,
          };
          await registrarAuditoriaMarketing({
            accion: "ASIGNACION_MANUAL_ENVIADA",
            cargaId: carga.id,
            nombreArchivo: carga.nombreArchivo,
            detalles,
            usuarioId: sessionId,
            cliente: tx,
          });

          return {
            enviadoEn: enviadoEn.toISOString(),
            totalAsignados: seleccion.length,
            ticket: {
              id: ticket.id,
              codigo: ticket.codigo,
              url: `/tickets?ticketId=${ticket.id}`,
            },
          };
        },
        { maxWait: 10_000, timeout: 30_000 },
      );
    } catch (error) {
      const esColision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("codigo");
      if (esColision && intento < 4) continue;
      throw error;
    }
  }

  throw new AsignacionError(
    "No se pudo generar el ticket. Vuelve a intentarlo.",
    500,
  );
}
