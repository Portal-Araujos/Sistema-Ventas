import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// ==========================================
// 🔍 GET: OBTENER TICKETS (INTERDEPARTAMENTAL)
// ==========================================
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const userPermisos = (payload.permisos as string[]) || [];

    const dbUser = await prisma.usuario.findUnique({ 
      where: { id: userId },
      include: { departamento: true } 
    });
    const miDepartamento = dbUser?.departamento?.nombre || 'General';

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');
    const vista = searchParams.get('vista'); 

    if (ticketId) {
      const ticket = await prisma.ticketGestion.findUnique({
        where: { id: parseInt(ticketId) },
        include: {
          institucion: { select: { nombre: true } },
          creador: { select: { nombre: true, rol: { select: { nombre: true } } } },
          asignado: { select: { nombre: true, rol: { select: { nombre: true } } } },
          mensajes: {
            include: { 
              remitente: { select: { nombre: true, rol: { select: { nombre: true } } } } 
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

      const ticketFormateado = {
        ...ticket,
        creador: ticket.creador ? { ...ticket.creador, rol: ticket.creador.rol?.nombre } : null,
        asignado: ticket.asignado ? { ...ticket.asignado, rol: ticket.asignado.rol?.nombre } : null,
        mensajes: ticket.mensajes.map((msg: any) => ({
          ...msg,
          remitente: msg.remitente ? { ...msg.remitente, rol: msg.remitente.rol?.nombre } : null
        }))
      };

      return NextResponse.json(ticketFormateado);
    }

    const tipoFiltro = searchParams.get('tipo'); 
    const estadoFiltro = searchParams.get('estado'); 

    const whereClause: any = {};
    if (estadoFiltro) whereClause.estado = estadoFiltro;

    const esSuperAdmin = userRol === 'super_admin' || userPermisos.includes('ver_todos_tickets');

    if (!esSuperAdmin) {
      if (userRol === 'vendedor') {
        whereClause.OR = [
          { asignadoAId: userId },
          { creadorId: userId }
        ];
      } else {
        // 🔥 MAGIA AQUÍ: Ve los de su área, los asignados a él Y los que él envió a otras áreas 🔥
        whereClause.OR = [
          { tipo: miDepartamento },       
          { asignadoAId: userId },        
          { creadorId: userId }           
        ];
      }
    } else {
      if (tipoFiltro) whereClause.tipo = tipoFiltro;
    }

    const tickets = await prisma.ticketGestion.findMany({
      where: whereClause,
      include: {
        institucion: { select: { nombre: true } },
        asignado: { select: { nombre: true } },
        creador: { select: { nombre: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ tickets, currentUser: { id: userId, rol: userRol, departamento: miDepartamento, esSuperAdmin } });
  } catch (error) {
    console.error("Error GET Tickets:", error);
    return NextResponse.json({ error: 'Error al obtener tickets' }, { status: 500 });
  }
}

// ==========================================
// 🚀 POST: CREAR TICKET O ENVIAR MENSAJE
// ==========================================
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const body = await request.json();
    const { accion } = body; 

    if (accion === 'crearTicket') {
      const { tipo, asunto, prioridad, institucionId, asignadoAId, mensajeInicial } = body;

      const ultimoTicket = await prisma.ticketGestion.findFirst({ orderBy: { id: 'desc' } });
      let nextNumber = 1;
      if (ultimoTicket && ultimoTicket.codigo.startsWith('TKT-')) {
        nextNumber = parseInt(ultimoTicket.codigo.replace('TKT-', '')) + 1;
      }
      const nuevoCodigo = `TKT-${nextNumber.toString().padStart(3, '0')}`;

      const nuevoTicket = await prisma.ticketGestion.create({
        data: {
          codigo: nuevoCodigo,
          tipo: tipo || 'General', // 🔥 AHORA RESPETAMOS EL ÁREA QUE ELIGIÓ EL USUARIO 🔥
          asunto,
          prioridad: prioridad || 'Media',
          institucionId,
          creadorId: userId,
          asignadoAId: asignadoAId || null,
          estado: 'Abierto',
          mensajes: {
            create: {
              remitenteId: userId,
              contenido: mensajeInicial || 'Ticket abierto.',
            }
          }
        }
      });
      return NextResponse.json({ success: true, ticket: nuevoTicket }, { status: 201 });
    }

    if (accion === 'enviarMensaje') {
      const { ticketId, contenido, adjuntoUrl, adjuntoTipo, adjuntoNombre } = body;

      const nuevoMensaje = await prisma.mensajeTicket.create({
        data: { ticketId: parseInt(ticketId), remitenteId: userId, contenido, adjuntoUrl, adjuntoTipo, adjuntoNombre }
      });

      await prisma.ticketGestion.update({
        where: { id: parseInt(ticketId) },
        data: { updatedAt: new Date() }
      });

      return NextResponse.json({ success: true, mensaje: nuevoMensaje }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error("Error POST Tickets:", error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}

// ==========================================
// 🔄 PUT: CAMBIAR ESTADO
// ==========================================
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const body = await request.json();
    const { ticketId, nuevoEstado, motivoReapertura } = body;

    const ticket = await prisma.ticketGestion.findUnique({ where: { id: parseInt(ticketId) } });
    if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

    if (nuevoEstado === 'Re-Abierto') {
      if (userRol !== 'super_admin') return NextResponse.json({ error: 'Solo Super Admin.' }, { status: 403 });
      
      const ticketReabierto = await prisma.ticketGestion.update({
        where: { id: parseInt(ticketId) },
        data: {
          estado: 'Re-Abierto',
          fechaCierre: null,
          mensajes: {
            create: { remitenteId: userId, contenido: `⚠️ Ticket Re-Abierto. Motivo: ${motivoReapertura}`, esSistema: true }
          }
        }
      });
      return NextResponse.json({ success: true, ticket: ticketReabierto });
    }

    const updateData: any = { estado: nuevoEstado };
    if (nuevoEstado === 'Cerrado') updateData.fechaCierre = new Date();

    const ticketActualizado = await prisma.ticketGestion.update({
      where: { id: parseInt(ticketId) },
      data: updateData
    });

    return NextResponse.json({ success: true, ticket: ticketActualizado });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cambiar estado' }, { status: 500 });
  }
}