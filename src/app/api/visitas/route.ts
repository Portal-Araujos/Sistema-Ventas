import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function POST(request: Request) {
  try {
    // 1. SEGURIDAD: Identificar qué vendedor está registrando la visita
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const usuarioId = payload.id as string;

    // 2. Recibir los datos del celular/PC
    const body = await request.json();
    const { 
      institucionId, 
      tipoGestion, 
      estadoGestion, 
      resumenAcuerdos, 
      fechaProximoContacto,
      latitud, 
      longitud 
    } = body;

    if (!institucionId || !latitud || !longitud) {
      return NextResponse.json({ error: 'Faltan datos obligatorios o el GPS no fue capturado.' }, { status: 400 });
    }

    // 3. Crear el registro histórico de la visita en la Agenda
    const nuevaVisita = await prisma.visitaAgenda.create({
      data: {
        institucionId,
        usuarioId,
        fechaProgramada: new Date(), // Se registra con la fecha de hoy
        horaProgramada: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        tipoGestion,
        estadoGestion,
        resumenAcuerdos,
        // Si mandan fecha de próximo contacto, la formateamos
        fechaProximoContacto: fechaProximoContacto ? new Date(fechaProximoContacto) : null,
        latitud,
        longitud,
      }
    });

    // 4. MAGIA DE NEGOCIO: Actualizar el semáforo comercial de la Escuela
    let nuevoEstadoEscuela = 'Visitada';
    if (estadoGestion === 'Completada - Seguimiento') {
      nuevoEstadoEscuela = 'Seguimiento';
    }

    await prisma.institution.update({
      where: { id: institucionId },
      data: { estadoComercial: nuevoEstadoEscuela }
    });

    return NextResponse.json(nuevaVisita, { status: 201 });
  } catch (error) {
    console.error('Error registrando visita:', error);
    return NextResponse.json({ error: 'Error interno al guardar la visita' }, { status: 500 });
  }
}