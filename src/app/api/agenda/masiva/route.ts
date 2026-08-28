import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Solo los administradores pueden armar rutas' }, { status: 403 });
    }
    const body = await request.json();
    const { institucionIds, vendedorId, fechaProgramada, horaProgramada } = body;
    if (!institucionIds || institucionIds.length === 0 || !vendedorId || !fechaProgramada) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para armar la ruta' }, { status: 400 });
    }
    const escuelasAfectadas = await prisma.institution.findMany({
      where: { id: { in: institucionIds } },
      include: {
        vendedor: { select: { nombre: true, id: true } },
        visitas: {
          where: { estadoGestion: { in: ['Pendiente', 'No Visitada', 'No visitada', 'Reprogramada'] } },
          include: { usuario: { select: { nombre: true } } }
        }
      }
    });
    for (const escuela of escuelasAfectadas) {
      if (escuela.vendedorId && escuela.vendedorId !== vendedorId) {
         return NextResponse.json({ 
           error: `Bloqueo: La escuela "${escuela.nombre}" ya le pertenece a ${escuela.vendedor?.nombre || 'otro vendedor'}. Desmárcala de tu selección o retírala de su cartera primero.`
         }, { status: 400 });
      }
      if (escuela.visitas.length > 0) {
        const visitaProblema = escuela.visitas[0];
        const fechaVisitaObj = new Date(visitaProblema.fechaProgramada);
        const hoyObj = new Date();
        hoyObj.setHours(0, 0, 0, 0);
        const fechaFormateada = fechaVisitaObj.toLocaleDateString('es-EC', { timeZone: 'UTC' });
        const nombreDueño = visitaProblema.usuario?.nombre || 'el vendedor actual';

        if (fechaVisitaObj < hoyObj) {
          return NextResponse.json({
            error: `Bloqueo: "${escuela.nombre}" tiene una visita VENCIDA del ${fechaFormateada} con ${nombreDueño}. Deben reportarla antes de poder usar el asignador masivo aquí.`
          }, { status: 400 });
        } else {
          return NextResponse.json({
            error: `Colisión: "${escuela.nombre}" ya tiene una visita programada para ${nombreDueño} el ${fechaFormateada}. Quítala de tu selección masiva para poder continuar.`
          }, { status: 400 });
        }
      }
    }
    const fechaISO = new Date(`${fechaProgramada}T12:00:00Z`);
    const nuevasVisitas = institucionIds.map((instId: string) => ({
      institucionId: instId,
      usuarioId: vendedorId, 
      fechaProgramada: fechaISO, 
      horaProgramada: horaProgramada || '08:30',
      tipoGestion: 'Asignación Masiva', 
      estadoGestion: 'No Visitada', 
      esVisitaLibre: false
    }));
    const result = await prisma.visitaAgenda.createMany({
      data: nuevasVisitas,
      skipDuplicates: true
    });
    await prisma.institution.updateMany({
      where: { id: { in: institucionIds } },
      data: { vendedorId: vendedorId }
    });
    return NextResponse.json({ success: true, creadas: result.count }, { status: 201 });
  } catch (error) {
    console.error("Error Masiva:", error);
    return NextResponse.json({ error: 'Error interno al generar las rutas' }, { status: 500 });
  }
}