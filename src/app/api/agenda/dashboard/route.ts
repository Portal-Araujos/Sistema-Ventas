import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const vendedorFiltroFront = searchParams.get('vendedorId');

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Si es vendedor, forzamos su ID. Si es admin, usa el filtro.
    const isVendedor = payload.rol === 'vendedor';
    const finalUserId = isVendedor ? (payload.id as string) : (vendedorFiltroFront || undefined);

    // Fechas para Prisma
    const hoyEcuador = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
    const inicioHoyISO = new Date(hoyEcuador.getFullYear(), hoyEcuador.getMonth(), hoyEcuador.getDate());
    const finHoyISO = new Date(hoyEcuador.getFullYear(), hoyEcuador.getMonth(), hoyEcuador.getDate(), 23, 59, 59);

    const baseWhere = finalUserId ? { usuarioId: finalUserId } : {};

    // 🔥 TARJETAS DEL DÍA
    const visitasHoy = await prisma.visitaAgenda.count({
      where: { ...baseWhere, fechaProgramada: { gte: inicioHoyISO, lte: finHoyISO } }
    });

    const seguimientosVencidos = await prisma.visitaAgenda.count({
      where: { ...baseWhere, fechaProgramada: { lt: inicioHoyISO }, estadoGestion: 'Pendiente' }
    });

    const proximasVisitas = await prisma.visitaAgenda.count({
      where: { ...baseWhere, fechaProgramada: { gt: finHoyISO }, estadoGestion: 'Pendiente' }
    });

    // 🔥 MÉTRICAS "EN EL CORTE"
    const corteWhere: any = { ...baseWhere };
    if (fechaInicio && fechaFin) {
      corteWhere.fechaProgramada = { 
        gte: new Date(`${fechaInicio}T00:00:00Z`), 
        lte: new Date(`${fechaFin}T23:59:59Z`) 
      };
    }

    const todasVisitasCorte = await prisma.visitaAgenda.findMany({
      where: corteWhere,
      select: { institucionId: true, estadoGestion: true, esVisitaLibre: true }
    });

    const institucionesAsignadas = todasVisitasCorte.length;
    const visitasRealizadasList = todasVisitasCorte.filter(v => v.estadoGestion !== 'Pendiente');
    
    const institucionesUnicasVisitadas = new Set(visitasRealizadasList.map(v => v.institucionId)).size;
    const nuevasInstituciones = visitasRealizadasList.filter(v => v.esVisitaLibre).length;

    let totalCartera = 0;
    if (finalUserId) {
      totalCartera = await prisma.institution.count({ where: { vendedorId: finalUserId } });
    } else {
      totalCartera = await prisma.institution.count(); 
    }

    const coberturaPorcentaje = totalCartera > 0 ? Math.round((institucionesUnicasVisitadas / totalCartera) * 100) : 0;

    return NextResponse.json({
      tarjetas: { visitasHoy, seguimientosVencidos, proximasVisitas },
      corte: { institucionesAsignadas, institucionesVisitadas: visitasRealizadasList.length, institucionesDiferentesVisitadas: institucionesUnicasVisitadas, totalVisitasRealizadas: visitasRealizadasList.length, nuevasInstitucionesVisitadas: nuevasInstituciones, coberturaTerritorio: coberturaPorcentaje }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}