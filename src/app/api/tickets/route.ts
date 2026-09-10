import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const userPermisos = (payload.permisos as string[]) || [];
    const { searchParams } = new URL(request.url);

    if (searchParams.get('alertas') === 'true') {
      const whereAlertas: any = {
        estado: { in: ['Abierto', 'Re-Abierto'] }
      };
      const esSuperAdmin = userRol === 'super_admin' || userPermisos.includes('ver_todos_tickets');
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
          creador: { select: { nombre: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });
      const alertasFormateadas = alertasTickets.map((t: any) => ({
        id: t.id,
        codigo: t.codigo,
        estado: t.estado,
        asunto: t.asunto,
        updatedAt: t.updatedAt, 
        creadorNombre: t.creador?.nombre || 'Sistema'
      }));

      return NextResponse.json(alertasFormateadas); 
    }

    const ticketsVencidos = await prisma.ticketGestion.findMany({
      where: {
        estado: { notIn: ['Cerrado', 'Resuelto'] },
        fechaLimite: { lt: new Date() }
      }
    });

    if (ticketsVencidos.length > 0) {
      for (const t of ticketsVencidos) {
        await prisma.ticketGestion.update({
          where: { id: t.id },
          data: {
            estado: 'Cerrado',
            fechaCierre: new Date(),
            mensajes: {
              create: {
                remitenteId: userId, 
                contenido: '⚠️ Ticket cerrado automáticamente por caducidad de fecha límite (SLA).',
                esSistema: true
              }
            }
          }
        });
      }
    }

    const dbUser = await prisma.usuario.findUnique({ 
      where: { id: userId },
      include: { departamento: true } 
    });
    const miDepartamento = dbUser?.departamento?.nombre || 'General';
    const ticketId = searchParams.get('id');

    if (ticketId) {
      const ticket = await prisma.ticketGestion.findUnique({
        where: { id: parseInt(ticketId) },
        include: {
          institucion: { select: { nombre: true } },
          creador: { select: { nombre: true, rol: { select: { nombre: true } } } },
          asignados: { select: { id: true, nombre: true, rol: { select: { nombre: true } } } }, 
          mensajes: {
            include: { remitente: { select: { nombre: true, rol: { select: { nombre: true } } } } },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

      const ticketFormateado = {
        ...ticket,
        creador: ticket.creador ? { ...ticket.creador, rol: ticket.creador.rol?.nombre } : null,
        asignados: ticket.asignados.map((a: any) => ({ ...a, rol: a.rol?.nombre })),
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
          { asignados: { some: { id: userId } } },
          { creadorId: userId }
        ];
      } else {
        whereClause.OR = [
          { tipo: miDepartamento },       
          { asignados: { some: { id: userId } } }, 
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
        asignados: { select: { nombre: true } }, 
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

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const accion = formData.get('accion') as string;

      if (accion === 'enviarMensaje') {
        const ticketId = formData.get('ticketId') as string;
        const contenido = formData.get('contenido') as string;
        const file = formData.get('file') as File | null;

        let fileUrl = null;
        let fileTipo = null;
        let fileNombre = null;

        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const uploadDir = path.join(process.cwd(), 'public/uploads');
          
          await mkdir(uploadDir, { recursive: true });
          const filepath = path.join(uploadDir, filename);
          await writeFile(filepath, buffer);

          fileUrl = `/uploads/${filename}`;
          fileTipo = file.type;
          fileNombre = file.name;
        }

        const nuevoMensaje = await prisma.mensajeTicket.create({
          data: { 
            ticketId: parseInt(ticketId), 
            remitenteId: userId, 
            contenido: contenido || '', 
            adjuntoUrl: fileUrl, 
            adjuntoTipo: fileTipo, 
            adjuntoNombre: fileNombre 
          }
        });
        await prisma.ticketGestion.update({
          where: { id: parseInt(ticketId) },
          data: { updatedAt: new Date() }
        });
        return NextResponse.json({ success: true, mensaje: nuevoMensaje }, { status: 201 });
      }
      return NextResponse.json({ error: 'Acción FormData no válida' }, { status: 400 });
    }
    const body = await request.json();
    const { accion } = body; 
    
    if (accion === 'crearTicket') {
      const { tipo, asunto, prioridad, institucionId, asignadosIds, mensajeInicial, fechaLimite } = body;
      let fechaLimiteCalc = null;
      if (fechaLimite) {
        // Le sumamos el 23:59:59 para que venza al FINAL de ese día en hora Ecuador
        fechaLimiteCalc = new Date(`${fechaLimite}T23:59:59.999-05:00`); 
      }
      let asignadosData = {};
      if (asignadosIds && Array.isArray(asignadosIds) && asignadosIds.length > 0) {
        asignadosData = { connect: asignadosIds.map((id: string) => ({ id })) };
      }

      const ticketsTKT = await prisma.ticketGestion.findMany({
        where: { codigo: { startsWith: 'TKT-' } },
        select: { codigo: true }
      });

      let maxNumber = 0;
      ticketsTKT.forEach(t => {
        const numero = parseInt(t.codigo.replace('TKT-', ''));
        if (!isNaN(numero) && numero > maxNumber) { maxNumber = numero; }
      });

      let nextNumber = maxNumber + 1;
      let ticketCreado = null;
      let intentos = 0;

      while (!ticketCreado && intentos < 10) {
        const nuevoCodigo = `TKT-${nextNumber.toString().padStart(3, '0')}`;
        try {
          ticketCreado = await prisma.ticketGestion.create({
            data: {
              codigo: nuevoCodigo,
              tipo: tipo || 'General',
              asunto,
              prioridad: prioridad || 'Media',
              institucionId,
              creadorId: userId,
              asignados: asignadosData,
              fechaLimite: fechaLimiteCalc, 
              estado: 'Abierto',
              mensajes: {
                create: { remitenteId: userId, contenido: mensajeInicial || 'Ticket abierto.' }
              }
            }
          });
        } catch (error: any) {
          if (error.code === 'P2002') { nextNumber++; intentos++; } 
          else { throw error; }
        }
      }
      if (!ticketCreado) return NextResponse.json({ error: 'Colisión de sistema, intente nuevamente.' }, { status: 500 });
      return NextResponse.json({ success: true, ticket: ticketCreado }, { status: 201 });
    }
    
    return NextResponse.json({ error: 'Acción JSON no válida' }, { status: 400 });
  } catch (error) {
    console.error("Error POST Tickets:", error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}

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
    if (nuevoEstado === 'Cerrado') {
      if (ticket.creadorId !== userId) {
        return NextResponse.json({ error: 'Operación denegada. Solo la persona que abrió el ticket puede marcarlo como Resuelto/Cerrado.' }, { status: 403 });
      }
    }

    if (nuevoEstado === 'Re-Abierto') {
      if (userRol !== 'super_admin') return NextResponse.json({ error: 'Solo el Super Admin puede forzar reaperturas.' }, { status: 403 });
      
      const ticketReabierto = await prisma.ticketGestion.update({
        where: { id: parseInt(ticketId) },
        data: {
          estado: 'Re-Abierto',
          fechaCierre: null,
          fechaLimite: null, 
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