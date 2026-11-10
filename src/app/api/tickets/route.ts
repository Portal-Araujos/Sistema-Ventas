import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CambioError, datosPrenda, validarAccesoPedido, validarPrendaRecibida, puedeConsultarCambio } from "@/lib/cambios-prenda";
import {
  getApiSession,
  isAdministrator,
  hasPermission,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  InvalidTicketAttachmentError,
  ticketMessageData,
} from "@/lib/ticket-uploads";

export async function GET(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const userId = session.id;
    const userRol = session.rol;
    const userPermisos = session.permisos;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("alertas") === "true") {
      const whereAlertas: any = {
        estado: { in: ["Abierto", "Re-Abierto"] },
      };
      const esSuperAdmin =
        userRol === "super_admin" || userPermisos.includes("ver_todos_tickets");
      if (!esSuperAdmin) {
        whereAlertas.asignados = { some: { id: userId } };
      }

      const alertasTickets = await prisma.ticketGestion.findMany({
        where: whereAlertas,
        select: {
          id: true,
          codigo: true,
          estado: true,
          asunto: true,
          updatedAt: true,
          creador: { select: { nombre: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });
      const alertasFormateadas = alertasTickets.map((t: any) => ({
        id: t.id,
        codigo: t.codigo,
        estado: t.estado,
        asunto: t.asunto,
        updatedAt: t.updatedAt,
        creadorNombre: t.creador?.nombre || "Sistema",
      }));

      return NextResponse.json(alertasFormateadas);
    }

    const ticketsVencidos = await prisma.ticketGestion.findMany({
      where: {
        estado: { notIn: ["Cerrado", "Resuelto", "Vencido"] },
        fechaLimite: { lt: new Date() },
      },
    });

    if (ticketsVencidos.length > 0) {
      for (const t of ticketsVencidos) {
        await prisma.ticketGestion.update({
          where: { id: t.id },
          data: {
            estado: "Vencido",
            fechaCierre: new Date(),
            mensajes: {
              create: {
                remitenteId: userId,
                contenido:
                  "⚠️ Este ticket superó su fecha límite y ha sido marcado como VENCIDO. Aún pueden responder para darle solución.",
                esSistema: true,
              },
            },
          },
        });
      }
    }

    const dbUser = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { departamento: true },
    });
    const miDepartamento = dbUser?.departamento?.nombre || "General";
    const esJefe = dbUser?.esJefe || false;
    const ticketId = searchParams.get("id");

    if (ticketId) {
      const ticket = await prisma.ticketGestion.findUnique({
        where: { id: parseInt(ticketId) },
        include: {
          institucion: { select: { nombre: true } },
          creador: {
            select: { nombre: true, rol: { select: { nombre: true } } },
          },
          asignados: {
            select: {
              id: true,
              nombre: true,
              rol: { select: { nombre: true } },
            },
          },
          mensajes: {
            include: {
              remitente: {
                select: { nombre: true, rol: { select: { nombre: true } } },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket)
        return NextResponse.json(
          { error: "Ticket no encontrado" },
          { status: 404 },
        );

      const soyCreadorTicket = ticket.creadorId === userId;
      const soyAsignadoTicket = ticket.asignados.some((a: any) => a.id === userId);
      const puedeVerTicket =
        userRol === "super_admin" ||
        userPermisos.includes("ver_todos_tickets") ||
        soyCreadorTicket ||
        soyAsignadoTicket ||
        (esJefe && ticket.tipo === miDepartamento) ||
        await puedeConsultarCambio(prisma, session, ticket.pedidoId);
      if (!puedeVerTicket) {
        return NextResponse.json(
          { error: "Ticket no encontrado" },
          { status: 404 },
        );
      }

      // 🔥 1. EL "VISTO" DE WHATSAPP: RESETEAR CONTADOR AL ABRIR 🔥
      if (soyCreadorTicket && ticket.noLeidosCreador > 0) {
        await prisma.ticketGestion.update({ where: { id: ticket.id }, data: { noLeidosCreador: 0 } });
      } else if (soyAsignadoTicket && ticket.noLeidosAsignados > 0) {
        await prisma.ticketGestion.update({ where: { id: ticket.id }, data: { noLeidosAsignados: 0 } });
      }

      const ticketFormateado = {
        ...ticket,
        creador: ticket.creador
          ? { ...ticket.creador, rol: ticket.creador.rol?.nombre }
          : null,
        asignados: ticket.asignados.map((a: any) => ({
          ...a,
          rol: a.rol?.nombre,
        })),
        mensajes: ticket.mensajes.map((msg: any) => ({
          ...msg,
          remitente: msg.remitente
            ? { ...msg.remitente, rol: msg.remitente.rol?.nombre }
            : null,
        })),
      };

      return NextResponse.json(ticketFormateado);
    }

    const tipoFiltro = searchParams.get("tipo");
    const estadoFiltro = searchParams.get("estado");
    const whereClause: any = {};
    if (estadoFiltro) whereClause.estado = estadoFiltro;
    const esSuperAdmin = 
      userRol === "super_admin" || 
      userRol === "administrador" || 
      userPermisos.includes("ver_todos_tickets");
    if (!esSuperAdmin) {
      if (esJefe) {
        whereClause.OR = [
          { tipo: miDepartamento },
          { asignados: { some: { id: userId } } },
          { creadorId: userId },
        ];
      } else {
        whereClause.OR = [
          { asignados: { some: { id: userId } } },
          { creadorId: userId },
        ];
      }
    } else {
      if (tipoFiltro) whereClause.tipo = tipoFiltro;
    }

    const [tickets, usuariosActivos] = await Promise.all([
      prisma.ticketGestion.findMany({
        where: whereClause,
        include: {
          institucion: { select: { nombre: true } },
          asignados: { select: { id: true, nombre: true } },
          creador: { select: { id: true, nombre: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.usuario.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          rol: { select: { nombre: true } },
          departamento: { select: { nombre: true } },
        },
        orderBy: { nombre: "asc" },
      }),
    ]);

    const usuariosFormateados = usuariosActivos.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      rolNombre: u.rol?.nombre || "USUARIO",
      departamentoNombre: u.departamento?.nombre || "",
    }));

    return NextResponse.json({
      tickets,
      usuarios: usuariosFormateados, 
      currentUser: {
        id: userId,
        rol: userRol,
        departamento: miDepartamento,
        esSuperAdmin: userRol === "super_admin",
        puedeVerTodos: esSuperAdmin,
        esJefe,
      },
    });
  } catch (error) {
    console.error("Error GET Tickets:", error);
    return NextResponse.json(
      { error: "Error al obtener tickets" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const userId = session.id;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const accion = formData.get("accion") as string;
      if (accion === 'enviarMensaje') {
        if (!hasPermission(session, "tickets:responder")) return forbiddenResponse();
        const ticketIdValue = formData.get('ticketId');
        const contenidoValue = formData.get('contenido');
        const ticketId = Number(ticketIdValue);
        
        if (
          typeof ticketIdValue !== "string" ||
          !Number.isSafeInteger(ticketId) ||
          ticketId < 1 ||
          (contenidoValue !== null && typeof contenidoValue !== "string")
        ) {
          return NextResponse.json({ error: "Datos del mensaje inválidos" }, { status: 400 });
        }
        
        const contenido = typeof contenidoValue === "string" ? contenidoValue : "";
        if (contenido.length > 5000) {
          return NextResponse.json({ error: "El mensaje supera el tamaño permitido" }, { status: 400 });
        }

        const ticketRelacionado = await prisma.ticketGestion.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            codigo: true,
            creadorId: true,
            pedidoId: true,
            tipo: true,
            noLeidosAsignados: true,
            noLeidosCreador: true,
            asignados: { select: { id: true } },
          },
        });

        if (!ticketRelacionado) {
          return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
        }

        const currentUser = await prisma.usuario.findUnique({
          where: { id: userId },
          select: { esJefe: true, departamento: { select: { nombre: true } } },
        });

        const canAccessTicket =
          session.rol === "super_admin" ||
          session.permisos.includes("ver_todos_tickets") ||
          ticketRelacionado.creadorId === userId ||
          ticketRelacionado.asignados.some((assignedUser) => assignedUser.id === userId) ||
          (currentUser?.esJefe === true && currentUser.departamento?.nombre === ticketRelacionado.tipo) ||
          await puedeConsultarCambio(prisma, session, ticketRelacionado.pedidoId);

        if (!canAccessTicket) {
          return NextResponse.json({ error: "No tienes permisos para responder este ticket" }, { status: 403 });
        }

        const mensajesData = await ticketMessageData(formData, userId, contenido);
        const mensajesCreados = await prisma.$transaction(mensajesData.map(data => prisma.mensajeTicket.create({ data: { ...data, ticketId } })));
        const nuevoMensaje = mensajesCreados[0];

        const soyCreador = ticketRelacionado.creadorId === userId;

        await prisma.ticketGestion.update({
          where: { id: ticketId },
          data: {
            updatedAt: new Date(),
            noLeidosAsignados: soyCreador ? { increment: 1 } : ticketRelacionado.noLeidosAsignados,
            noLeidosCreador: !soyCreador ? { increment: 1 } : ticketRelacionado.noLeidosCreador,
          },
        });

        if (soyCreador) {
          for (const asignado of ticketRelacionado.asignados) {
            await prisma.notificacion.create({
              data: {
                titulo: `💬 Nueva respuesta en ${ticketRelacionado.codigo}`,
                mensaje: `El creador respondió: "${contenido.substring(0, 40)}${contenido.length > 40 ? "..." : ""}"`,
                tipoModulo: "TICKETS",
                urlDestino: `/tickets?ticketId=${ticketId}`,
                usuarioDestinoId: asignado.id,
              },
            });
          }
        } else {
          await prisma.notificacion.create({
            data: {
              titulo: `💬 Respondió tu ticket ${ticketRelacionado.codigo}`,
              mensaje: `Respuesta: "${contenido.substring(0, 40)}${contenido.length > 40 ? "..." : ""}"`,
              tipoModulo: "TICKETS",
              urlDestino: `/tickets?ticketId=${ticketId}`,
              usuarioDestinoId: ticketRelacionado.creadorId,
            },
          });
        }

        return NextResponse.json({ success: true, mensaje: nuevoMensaje }, { status: 201 });
      }
      
      if (accion === 'crearTicket') {
        if (!hasPermission(session, "tickets:crear")) return forbiddenResponse();
        const detallePedidoId = formData.get("detallePedidoId")?.toString() || null;
        const pedidoId = formData.get("pedidoId")?.toString() || null;
        const motivoCambio = formData.get("motivoCambio")?.toString().trim() || "";
        const cambioSolicitado = formData.get("cambioSolicitado")?.toString().trim() || "";
        const cantidadCambio = Number(formData.get("cantidadCambio"));
        if (Boolean(detallePedidoId) !== Boolean(pedidoId)) throw new CambioError("El cambio debe indicar pedido y prenda");
        if (detallePedidoId && (motivoCambio.length < 10 || !cambioSolicitado || !Number.isSafeInteger(cantidadCambio) || cantidadCambio < 1)) {
          throw new CambioError("Indica el motivo, el cambio solicitado y una cantidad válida");
        }
        const tipo = formData.get('tipo') as string;
        const asunto = formData.get('asunto') as string;
        const prioridad = formData.get('prioridad') as string;
        const institucionId = formData.get('institucionId') as string;
        const mensajeInicial = formData.get('mensajeInicial') as string;
        const fechaLimite = formData.get('fechaLimite') as string;
        const asignadosIdsStr = formData.get('asignadosIds') as string;
        
        // Parseamos los IDs que ahora llegan como String en el FormData
        const asignadosIds = asignadosIdsStr ? JSON.parse(asignadosIdsStr) : [];
        if (detallePedidoId && (!Array.isArray(asignadosIds) || !asignadosIds.every(id => typeof id === "string"))) throw new CambioError("Los asignados no son válidos");
        if (detallePedidoId && asignadosIds.length) {
          const validos = await prisma.usuario.count({ where: { id: { in: [...new Set<string>(asignadosIds)] }, activo: true, bloqueado: false } });
          if (validos !== new Set(asignadosIds).size) throw new CambioError("Selecciona usuarios activos para asignar el ticket");
        }
        
        let fechaLimiteCalc = null;
        if (fechaLimite) {
          fechaLimiteCalc = new Date(`${fechaLimite}T23:59:59.999-05:00`);
        }

        const mensajesIniciales = await ticketMessageData(formData, userId, mensajeInicial || "Ticket abierto.");

        let asignadosData = {};
        if (Array.isArray(asignadosIds) && asignadosIds.length > 0) {
          asignadosData = { connect: asignadosIds.map((id: string) => ({ id })) };
        }

        const ticketsTKT = await prisma.ticketGestion.findMany({
          where: { codigo: { startsWith: "TKT-" } },
          select: { codigo: true },
        });

        let maxNumber = 0;
        ticketsTKT.forEach((t) => {
          const numero = parseInt(t.codigo.replace("TKT-", ""));
          if (!isNaN(numero) && numero > maxNumber) {
            maxNumber = numero;
          }
        });

        let nextNumber = maxNumber + 1;
        let ticketCreado = null;
        let intentos = 0;

        while (!ticketCreado && intentos < 10) {
          const nuevoCodigo = `TKT-${nextNumber.toString().padStart(3, "0")}`;
          try {
            ticketCreado = await prisma.$transaction(async (tx) => {
              let prendaOriginal;
              if (detallePedidoId && pedidoId) {
                const pedido = await validarAccesoPedido(tx, session, pedidoId);
                const detalle = await tx.detallePedido.findUnique({ where: { id: detallePedidoId } });
                if (!detalle || detalle.pedidoId !== pedidoId || pedido.institucionId !== institucionId) throw new CambioError("La prenda no corresponde a este pedido");
                validarPrendaRecibida(detalle, cantidadCambio);
                const activo = await tx.ticketGestion.findFirst({ where: { detallePedidoId, estado: { not: "Cerrado" } } });
                if (activo) throw new CambioError(`Esta prenda ya tiene una solicitud activa: ${activo.codigo}`, 409);
                if (!tipo || !asunto?.trim() || !mensajeInicial?.trim() || !fechaLimiteCalc || isNaN(fechaLimiteCalc.getTime())) throw new CambioError("Completa área, asunto, descripción y fecha límite");
                const departamento = await tx.departamentoEmpresa.findFirst({ where: { nombre: tipo, activo: true } });
                if (!departamento) throw new CambioError("Selecciona un área activa");
                prendaOriginal = datosPrenda(detalle);
              }
              const creado = await tx.ticketGestion.create({
              data: {
                ...(detallePedidoId ? { detallePedidoId, pedidoId, cantidadCambio, motivoCambio, cambioSolicitado, prendaOriginal } : {}),
                codigo: nuevoCodigo,
                tipo: tipo || "General",
                asunto,
                prioridad: prioridad || "Media",
                institucionId,
                creadorId: userId,
                asignados: asignadosData,
                fechaLimite: fechaLimiteCalc,
                estado: "Abierto",
                mensajes: { create: mensajesIniciales },
              },
              });
              if (detallePedidoId) {
                await tx.notificacion.createMany({ data: [
                  { titulo: "Solicitud de cambio de prenda", mensaje: `${creado.codigo}: ${asunto}`, tipoModulo: "TICKETS", rolDestino: tipo.toLowerCase(), urlDestino: `/tickets?ticketId=${creado.id}` },
                  ...asignadosIds.map((id: string) => ({ titulo: "Cambio de prenda asignado", mensaje: `${creado.codigo}: ${asunto}`, tipoModulo: "TICKETS", usuarioDestinoId: id, urlDestino: `/tickets?ticketId=${creado.id}` })),
                ] });
              }
              return creado;
            }, { isolationLevel: "Serializable" });
          } catch (error: any) {
            if (error.code === "P2002") {
              if (detallePedidoId && String(error.meta?.target).includes("detalle_pedido_id")) throw new CambioError("Esta prenda ya tiene un ticket activo", 409);
              nextNumber++;
              intentos++;
            } else {
              throw error;
            }
          }
        }
        
        if (!ticketCreado) {
          return NextResponse.json({ error: "Colisión de sistema, intente nuevamente." }, { status: 500 });
        }
        return NextResponse.json({ success: true, ticket: ticketCreado }, { status: 201 });
      }
      
      return NextResponse.json({ error: "Acción FormData no válida" }, { status: 400 });
    }

    // Si llega un JSON simple por error (ya no debería pasar), lo bloqueamos:
    return NextResponse.json({ error: "Se esperaba FormData, no JSON" }, { status: 400 });

  } catch (error) {
    if (error instanceof CambioError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return NextResponse.json({ error: "La prenda cambió durante la solicitud. Actualiza e intenta nuevamente." }, { status: 409 });
    if (error instanceof InvalidTicketAttachmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error POST Tickets:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const userId = session.id;
    const userRol = session.rol;
    const body = await request.json();
    const { ticketId, nuevoEstado, motivoReapertura } = body;
    if (!hasPermission(session, nuevoEstado === "Cerrado" ? "tickets:cerrar" : nuevoEstado === "Re-Abierto" ? "tickets:reabrir" : "tickets:resolver")) return forbiddenResponse();
    const ticket = await prisma.ticketGestion.findUnique({
      where: { id: parseInt(ticketId) },
      include: { asignados: { select: { id: true } } },
    });
    if (!ticket)
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 },
      );
    const lector = await prisma.usuario.findUnique({ where: { id: session.id }, select: { esJefe: true, departamento: { select: { nombre: true } } } });
    if (session.rol !== "super_admin" && !hasPermission(session, "ver_todos_tickets") && ticket.creadorId !== session.id && !ticket.asignados.some(u => u.id === session.id) && !(lector?.esJefe && lector.departamento?.nombre === ticket.tipo) && !await puedeConsultarCambio(prisma, session, ticket.pedidoId)) return forbiddenResponse();
    if (ticket.pedidoId) {
      if (!["Abierto", "En Proceso", "Pendiente", "Resuelto", "Cerrado", "Re-Abierto"].includes(nuevoEstado)) throw new CambioError("Estado de ticket inválido");
      const asignado = await prisma.ticketGestion.count({ where: { id: ticket.id, asignados: { some: { id: userId } } } });
      if (session.rol !== "super_admin" && !session.permisos.includes("ver_todos_tickets") && ticket.creadorId !== userId && !asignado && !await puedeConsultarCambio(prisma, session, ticket.pedidoId)) throw new CambioError("No tienes acceso a este ticket", 403);
    }
    if (nuevoEstado === "Cerrado") {
      if (ticket.creadorId !== userId && session.rol !== "super_admin") {
        return NextResponse.json(
          {
            error:
              "Operación denegada. Solo la persona que abrió el ticket puede marcarlo como Resuelto/Cerrado.",
          },
          { status: 403 },
        );
      }
    }
    if (nuevoEstado === "Resuelto") {
      const ticketResuelto = await prisma.ticketGestion.update({
        where: { id: parseInt(ticketId) },
        data: {
          estado: "Resuelto",
          mensajes: {
            create: {
              remitenteId: userId,
              contenido: `✅ OPERACIÓN FINALIZADA. El equipo ha marcado este ticket como RESUELTO. Creador del ticket, por favor revise y confirme el "Cierre" o solicite una "Re-apertura".`,
              esSistema: true,
            },
          },
        },
      });
      return NextResponse.json({ success: true, ticket: ticketResuelto });
    }

    if (nuevoEstado === "Re-Abierto") {
      if (!hasPermission(session, "tickets:reabrir"))
        return NextResponse.json(
          { error: "Solo el Super Admin puede forzar reaperturas." },
          { status: 403 },
        );

      const ticketReabierto = await prisma.ticketGestion.update({
        where: { id: parseInt(ticketId) },
        data: {
          estado: "Re-Abierto",
          fechaCierre: null,
          fechaLimite: null,
          mensajes: {
            create: {
              remitenteId: userId,
              contenido: `⚠️ Ticket Re-Abierto. Motivo: ${motivoReapertura}`,
              esSistema: true,
            },
          },
        },
      });
      return NextResponse.json({ success: true, ticket: ticketReabierto });
    }

    const updateData: any = { estado: nuevoEstado };
    if (nuevoEstado === "Cerrado") updateData.fechaCierre = new Date();

    const ticketActualizado = await prisma.ticketGestion.update({
      where: { id: parseInt(ticketId) },
      data: updateData,
    });

    return NextResponse.json({ success: true, ticket: ticketActualizado });
  } catch (error) {
    if (error instanceof CambioError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "La prenda ya tiene otro ticket activo. Ciérralo antes de reabrir este." }, { status: 409 });
    return NextResponse.json(
      { error: "Error al cambiar estado" },
      { status: 500 },
    );
  }
}
