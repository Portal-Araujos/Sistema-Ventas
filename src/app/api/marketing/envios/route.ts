import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generarSiguienteCodigoTicket } from "@/lib/tickets/codigo";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  claveIdentificacion,
  construirCandidatos,
  cuerpoMensajeTicket,
  etiquetaCarga,
  etiquetaMotivos,
  registrarAuditoriaMarketing,
} from "@/lib/marketing";
import {
  aClienteCartera,
  analizarCarga,
  datosDeEnvios,
  obtenerCarga,
} from "@/lib/marketing/consulta";

const INSTITUCION_SISTEMA = "[SISTEMA] Cartera Marketing";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const cargaId = new URL(request.url).searchParams.get("cargaId") || "";
    const [carga, envios] = await Promise.all([
      obtenerCarga(cargaId),
      datosDeEnvios(),
    ]);
    const filas = carga ? carga.clientes.map(aClienteCartera) : [];
    const candidatos = carga
      ? construirCandidatos(analizarCarga(carga), filas, envios.estados)
      : [];

    return NextResponse.json({
      carga: carga ? { id: carga.id, semana: etiquetaCarga(carga) } : null,
      vendedores: envios.vendedores,
      candidatos,
      conteos: envios.conteos,
      registros: envios.registros.map((registro) => ({
        id: registro.id,
        ticketId: registro.ticketId,
        ticketCodigo: registro.ticketCodigo,
        vendedorNombre: registro.vendedorNombre,
        fecha: registro.fecha,
        cantidad: registro.clientes.length,
      })),
    });
  } catch (error) {
    console.error("Error consultando envíos de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la información de envíos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const cuerpo: unknown = await request.json();
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    const datos = cuerpo as Record<string, unknown>;
    const cargaId = typeof datos.cargaId === "string" ? datos.cargaId : "";
    const vendedorId =
      typeof datos.vendedorId === "string" ? datos.vendedorId : "";
    const clavesSolicitadas = Array.isArray(datos.claves) ? datos.claves : [];
    if (!vendedorId || clavesSolicitadas.length === 0) {
      return NextResponse.json(
        { error: "Selecciona un vendedor y al menos un cliente" },
        { status: 400 },
      );
    }

    const [carga, envios, vendedor, institucion] = await Promise.all([
      obtenerCarga(cargaId),
      datosDeEnvios(),
      prisma.usuario.findFirst({
        where: { id: vendedorId, activo: true, rol: { nombre: "vendedor" } },
        select: { id: true, nombre: true },
      }),
      prisma.institution.findFirst({
        where: { nombre: INSTITUCION_SISTEMA },
        select: { id: true },
      }),
    ]);

    if (!carga) {
      return NextResponse.json(
        { error: "No hay una carga de Marketing disponible" },
        { status: 400 },
      );
    }
    if (!vendedor) {
      return NextResponse.json(
        { error: "Vendedor no encontrado o inactivo" },
        { status: 400 },
      );
    }
    if (!institucion) {
      return NextResponse.json(
        { error: `Falta la institución de sistema «${INSTITUCION_SISTEMA}»` },
        { status: 400 },
      );
    }

    const candidatos = construirCandidatos(
      analizarCarga(carga),
      carga.clientes.map(aClienteCartera),
      envios.estados,
    );
    const porClave = new Map(candidatos.map((cliente) => [cliente.clave, cliente]));
    const seleccionados: (typeof candidatos)[number][] = [];
    const vistas = new Set<string>();

    for (const valor of clavesSolicitadas) {
      if (typeof valor !== "string") continue;
      const clave = claveIdentificacion(valor);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      const cliente = porClave.get(clave);
      if (!cliente || cliente.enviado) {
        return NextResponse.json(
          {
            error: `El cliente ${valor} no está disponible para envío`,
          },
          { status: 400 },
        );
      }
      seleccionados.push(cliente);
    }

    if (seleccionados.length === 0) {
      return NextResponse.json(
        { error: "No se seleccionaron clientes válidos" },
        { status: 400 },
      );
    }

    const semana = etiquetaCarga(carga);
    const contenido = cuerpoMensajeTicket({
      semana,
      vendedorNombre: vendedor.nombre,
      clientes: seleccionados,
    });
    const detalleClientes = seleccionados.map((cliente) => ({
      clave: cliente.clave,
      identificacion: cliente.identificacion,
      nombreCliente: cliente.nombreCliente,
      motivo: etiquetaMotivos(cliente.motivos),
    }));

    const resultado = await prisma.$transaction(async (tx) => {
      const codigo = await generarSiguienteCodigoTicket(tx);
      const ticket = await tx.ticketGestion.create({
        data: {
          codigo,
          tipo: "Marketing",
          asunto: `Clientes Marketing — ${semana} — ${vendedor.nombre}`,
          estado: "Abierto",
          prioridad: "Media",
          institucionId: institucion.id,
          creadorId: session.id,
          asignados: { connect: { id: vendedor.id } },
        },
      });
      await tx.mensajeTicket.create({
        data: {
          ticketId: ticket.id,
          remitenteId: session.id,
          contenido,
          esSistema: true,
        },
      });
      await registrarAuditoriaMarketing({
        accion: "ENVIO_TICKET",
        cargaId: carga.id,
        nombreArchivo: carga.nombreArchivo,
        detalles: {
          ticketId: ticket.id,
          ticketCodigo: ticket.codigo,
          vendedorId: vendedor.id,
          vendedorNombre: vendedor.nombre,
          clientes: detalleClientes,
        },
        usuarioId: session.id,
        cliente: tx,
      });
      return ticket;
    });

    return NextResponse.json({
      success: true,
      ticketId: resultado.id,
      ticketCodigo: resultado.codigo,
      enviados: seleccionados.length,
    });
  } catch (error) {
    console.error("Error enviando clientes de Marketing por ticket:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el ticket" },
      { status: 500 },
    );
  }
}
