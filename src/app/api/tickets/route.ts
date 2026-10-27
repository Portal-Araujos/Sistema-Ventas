import { NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  getApiSession,
  isAdministrator,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  InvalidTicketAttachmentError,
  storeTicketAttachment,
} from "@/lib/ticket-uploads";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const userPermisos = (payload.permisos as string[]) || [];
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
        userRol === "administrador" ||
        userPermisos.includes("ver_todos_tickets") ||
        soyCreadorTicket ||
        soyAsignadoTicket ||
        (esJefe && ticket.tipo === miDepartamento);
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
      userPermisos.includes("ver_todos_tickets")|| userPermisos.includes("ver_todos_tickets");
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
        esSuperAdmin,
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
          isAdministrator(session) ||
          session.permisos.includes("ver_todos_tickets") ||
          ticketRelacionado.creadorId === userId ||
          ticketRelacionado.asignados.some((assignedUser) => assignedUser.id === userId) ||
          (currentUser?.esJefe === true && currentUser.departamento?.nombre === ticketRelacionado.tipo);

        if (!canAccessTicket) {
          return NextResponse.json({ error: "No tienes permisos para responder este ticket" }, { status: 403 });
        }

        const fileEntry = formData.get('file');
        if (fileEntry !== null && !(fileEntry instanceof File)) {
          return NextResponse.json({ error: "Archivo adjunto inválido" }, { status: 400 });
        }
        
        const file = fileEntry instanceof File ? fileEntry : null;
        let fileUrl = null;
        let fileTipo = null;
        let fileNombre = null;

        if (file) {
          const attachment = await storeTicketAttachment(file);
          fileUrl = attachment.url;
          fileTipo = attachment.mimeType;
          fileNombre = attachment.displayName;
        }

        const nuevoMensaje = await prisma.mensajeTicket.create({
          data: { 
            ticketId,
            remitenteId: userId, 
            contenido,
            adjuntoUrl: fileUrl, 
            adjuntoTipo: fileTipo, 
            adjuntoNombre: fileNombre 
          }
        });
        
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
        const tipo = formData.get('tipo') as string;
        const asunto = formData.get('asunto') as string;
        const prioridad = formData.get('prioridad') as string;
        const institucionId = formData.get('institucionId') as string;
        const mensajeInicial = formData.get('mensajeInicial') as string;
        const fechaLimite = formData.get('fechaLimite') as string;
        const asignadosIdsStr = formData.get('asignadosIds') as string;
        
        // Parseamos los IDs que ahora llegan como String en el FormData
        const asignadosIds = asignadosIdsStr ? JSON.parse(asignadosIdsStr) : [];
        
        let fechaLimiteCalc = null;
        if (fechaLimite) {
          fechaLimiteCalc = new Date(`${fechaLimite}T23:59:59.999-05:00`);
        }

        // Procesar Archivo (Imagen, PDF, Audio)
        const fileEntry = formData.get('file');
        const file = fileEntry instanceof File ? fileEntry : null;
        let fileUrl = null;
        let fileTipo = null;
        let fileNombre = null;

        if (file) {
          const attachment = await storeTicketAttachment(file);
          fileUrl = attachment.url;
          fileTipo = attachment.mimeType;
          fileNombre = attachment.displayName;
        }

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
            ticketCreado = await prisma.ticketGestion.create({
              data: {
                codigo: nuevoCodigo,
                tipo: tipo || "General",
                asunto,
                prioridad: prioridad || "Media",
                institucionId,
                creadorId: userId,
                asignados: asignadosData,
                fechaLimite: fechaLimiteCalc,
                estado: "Abierto",
                mensajes: {
                  create: {
                    remitenteId: userId,
                    contenido: mensajeInicial || "Ticket abierto.",
                    adjuntoUrl: fileUrl,
                    adjuntoTipo: fileTipo,
                    adjuntoNombre: fileNombre
                  },
                },
              },
            });
          } catch (error: any) {
            if (error.code === "P2002") {
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
    if (error instanceof InvalidTicketAttachmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error POST Tickets:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const body = await request.json();
    const { ticketId, nuevoEstado, motivoReapertura } = body;
    const ticket = await prisma.ticketGestion.findUnique({
      where: { id: parseInt(ticketId) },
    });
    if (!ticket)
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 },
      );
    if (nuevoEstado === "Cerrado") {
      if (ticket.creadorId !== userId) {
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
      if (userRol !== "super_admin")
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
    return NextResponse.json(
      { error: "Error al cambiar estado" },
      { status: 500 },
    );
  }
}
