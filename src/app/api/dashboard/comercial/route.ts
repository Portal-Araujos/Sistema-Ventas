import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userIdSession = payload.id as string;
    
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const provinciaId = searchParams.get('provinciaId');
    const cantonId = searchParams.get('cantonId');
    const tipoVentaId = searchParams.get('tipoVentaId'); // Que viaja al tipoClienteId
    let vendedorId = searchParams.get('vendedorId');

    // Seguridad: Si es vendedor, solo ve lo suyo
    if (userRol.toLowerCase() === 'vendedor') {
      vendedorId = userIdSession;
    }

    // ==========================================
    // 1. CONSTRUCCIÓN DE FILTROS MAESTROS
    // ==========================================
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const start = fechaDesde ? new Date(`${fechaDesde}T00:00:00-05:00`) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const end = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999-05:00`) : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    const whereGlobalInst: any = {};
    if (provinciaId) whereGlobalInst.parroquia = { canton: { provinciaId: parseInt(provinciaId) } };
    if (cantonId) whereGlobalInst.parroquia = { cantonId: parseInt(cantonId) };

    const whereVentas: any = { fechaVenta: { gte: start, lte: end } };
    const whereVisitas: any = { createdAt: { gte: start, lte: end } }; // Para visitas realizadas
    const whereAsignaciones: any = {}; // Para calcular la cobertura
    const whereTickets: any = { createdAt: { gte: start, lte: end } };
    const wherePedidos: any = { fechaPedido: { gte: start, lte: end } };

    if (vendedorId) {
      whereVentas.vendedorId = vendedorId;
      whereVisitas.usuarioId = vendedorId;
      whereAsignaciones.vendedorId = vendedorId;
      whereTickets.asignados = { some: { id: vendedorId } };
      wherePedidos.usuarioId = vendedorId;
    }

    if (Object.keys(whereGlobalInst).length > 0) {
      whereVentas.institucion = whereGlobalInst;
      whereVisitas.institucion = whereGlobalInst;
      whereAsignaciones.AND = [whereGlobalInst];
      wherePedidos.institucion = whereGlobalInst;
    }

    // El filtro de "Tipo de Venta" SOLO afecta al dinero y los pedidos, no a las visitas de agenda
    if (tipoVentaId) {
      whereVentas.tipoClienteId = parseInt(tipoVentaId);
    }

    // ==========================================
    // 2. EXTRACCIÓN PARALELA DE DATOS (Rendimiento)
    // ==========================================
    const [
      ventas, 
      visitas, 
      visitasAgendaRaw, 
      institucionesTotales, 
      tickets, 
      pedidos,
      metasRaw
    ] = await Promise.all([
      // A. Ventas
      prisma.venta.findMany({ 
        where: whereVentas, 
        include: { vendedor: true, tipoCliente: true } 
      }),
      // B. Visitas Realizadas
      prisma.visitaAgenda.findMany({ 
        where: { ...whereVisitas, estadoGestion: { notIn: ['Pendiente', 'No Visitada', 'No visitada'] } },
        include: { usuario: true }
      }),
      // C. Agenda completa (para sacar vencidas y libres)
      prisma.visitaAgenda.findMany({
        where: { 
          ...(vendedorId ? { usuarioId: vendedorId } : {}),
          ...(Object.keys(whereGlobalInst).length > 0 ? { institucion: whereGlobalInst } : {})
        }
      }),
      // D. Instituciones para Cobertura
      prisma.institution.findMany({ where: whereAsignaciones, select: { id: true, vendedorId: true } }),
      // E. Tickets
      prisma.ticketGestion.findMany({ where: whereTickets }),
      // F. Pedidos
      prisma.pedido.findMany({ where: wherePedidos, select: { id: true, estado: true, fechaRequerida: true, fechaEnvioOperaciones: true } }),
      // G. Metas
      prisma.metaVendedor.findMany({ where: vendedorId ? { vendedorId } : {} })
    ]);

    // ==========================================
    // 3. CÁLCULO DE KPIS FINANCIEROS Y ORIGEN
    // ==========================================
    let ventasRegistradas = 0;
    let ventasValidadas = 0;
    let pendienteValidacion = 0;
    let origen = { nuevas: 0, referidas: 0, recompras: 0 };
    let contratosConNovedades = 0;

    ventas.forEach(v => {
      const monto = v.valorContrato || 0;
      ventasRegistradas += monto;

      // Lógica estricta de validación
      const esValidada = v.estadoTicket?.includes('Validado') || (v.verificacionFact && v.verificacionFact !== 'Sin validar' && !v.estadoTicket?.includes('Rechazado') && !v.estadoTicket?.includes('Observado'));
      const tieneNovedad = v.estadoTicket?.includes('Observado') || v.estadoTicket?.includes('Rechazado') || (v.observacionesFact && v.observacionesFact !== 'Sin observaciones');

      if (esValidada) {
        ventasValidadas += monto;
      } else {
        pendienteValidacion += monto;
        if (tieneNovedad) contratosConNovedades++;
      }

      // Clasificación de Origen
      const tipo = v.tipoCliente?.nombre?.toUpperCase() || '';
      if (tipo.includes('NUEVA')) origen.nuevas += monto;
      else if (tipo.includes('REFERIDA')) origen.referidas += monto;
      else if (tipo.includes('RECOMPRA')) origen.recompras += monto;
    });

    const metaComercial = metasRaw.reduce((acc, m) => acc + (m.montoMeta || 0), 0);
    const cumplimientoValidado = metaComercial > 0 ? (ventasValidadas / metaComercial) * 100 : 0;
    const cumplimientoPotencial = metaComercial > 0 ? (ventasRegistradas / metaComercial) * 100 : 0;

    // ==========================================
    // 4. GESTIÓN DE CAMPO Y EMBUDO
    // ==========================================
    const instAsignadas = institucionesTotales.filter(i => i.vendedorId).length;
    const visitasRealizadas = visitas.length;
    const instVisitadasSet = new Set(visitas.map(v => v.institucionId));
    const instVisitadas = instVisitadasSet.size;
    const coberturaTerritorial = instAsignadas > 0 ? (instVisitadas / instAsignadas) * 100 : 0;
    
    const visitasLibres = visitas.filter(v => v.esVisitaLibre).length;
    
    // Visitas Vencidas (Agenda vieja que quedó Pendiente)
    const visitasVencidas = visitasAgendaRaw.filter(v => {
      const isPendiente = ['Pendiente', 'No Visitada', 'No visitada'].includes(v.estadoGestion);
      const fecha = v.fechaProximoContacto ? new Date(v.fechaProximoContacto) : new Date(v.fechaProgramada);
      return isPendiente && fecha < hoy;
    }).length;

    const cierres = ventas.length;
    const tasaConversion = visitasRealizadas > 0 ? (cierres / visitasRealizadas) * 100 : 0;

    // ==========================================
    // 5. COMPROMISOS Y FORMALIZACIÓN
    // ==========================================
    const pedidosBorrador = pedidos.filter(p => p.estado === 'Borrador').length;
    const pedidosEnviados = pedidos.filter(p => p.estado !== 'Borrador' || p.fechaEnvioOperaciones).length;
    
    let entregasProximas = 0;
    let entregasVencidas = 0;
    const enSieteDias = new Date(hoy);
    enSieteDias.setDate(hoy.getDate() + 7);

    pedidos.filter(p => p.estado !== 'Despachado' && p.fechaRequerida).forEach(p => {
      const fReq = new Date(p.fechaRequerida!);
      if (fReq < hoy) entregasVencidas++;
      else if (fReq <= enSieteDias) entregasProximas++;
    });

    const ticketsAbiertos = tickets.filter(t => !['Cerrado', 'Resuelto'].includes(t.estado)).length;
    const ticketsVencidos = tickets.filter(t => !['Cerrado', 'Resuelto'].includes(t.estado) && t.fechaLimite && new Date(t.fechaLimite) < hoy).length;
    
    const indiceFormalizacion = ventasRegistradas > 0 ? (ventasValidadas / ventasRegistradas) * 100 : 0;

    // ==========================================
    // 6. RANKING DE VENDEDORES (Rendimiento)
    // ==========================================
    const mapVendedores = new Map();
    // Pre-llenar con las ventas
    ventas.forEach(v => {
      const vId = v.vendedorId;
      if (!mapVendedores.has(vId)) {
        mapVendedores.set(vId, { id: vId, nombre: v.vendedor?.nombre || 'Desc.', ventaValidada: 0, meta: 0, visitas: 0, nuevas: 0 });
      }
      const monto = v.valorContrato || 0;
      const esValidada = v.estadoTicket?.includes('Validado') || (v.verificacionFact && v.verificacionFact !== 'Sin validar' && !v.estadoTicket?.includes('Rechazado'));
      if (esValidada) mapVendedores.get(vId).ventaValidada += monto;
      if (v.tipoCliente?.nombre?.toUpperCase().includes('NUEVA')) mapVendedores.get(vId).nuevas += monto;
    });

    // Sumar Visitas al Ranking
    visitas.forEach(v => {
      const vId = v.usuarioId;
      if (!mapVendedores.has(vId)) {
        mapVendedores.set(vId, { id: vId, nombre: v.usuario?.nombre || 'Desc.', ventaValidada: 0, meta: 0, visitas: 0, nuevas: 0 });
      }
      mapVendedores.get(vId).visitas += 1;
    });

    // Inyectar Metas al Ranking
    metasRaw.forEach(m => {
      if (mapVendedores.has(m.vendedorId)) {
        mapVendedores.get(m.vendedorId).meta += (m.montoMeta || 0);
      }
    });

    // Calcular porcentajes del Ranking
    const rankingVendedores = Array.from(mapVendedores.values()).map(v => {
      const porcCumplimiento = v.meta > 0 ? (v.ventaValidada / v.meta) * 100 : 0;
      const porcNuevas = v.ventaValidada > 0 ? (v.nuevas / v.ventaValidada) * 100 : 0;
      return {
        ...v,
        porcCumplimiento: Math.round(porcCumplimiento),
        porcNuevas: Math.round(porcNuevas)
      };
    }).sort((a, b) => b.porcCumplimiento - a.porcCumplimiento); // Orden predeterminado según el doc

    // ==========================================
    // 7. RESPUESTA FINAL JSON
    // ==========================================
    return NextResponse.json({
      financiero: {
        ventasRegistradas,
        ventasValidadas,
        pendienteValidacion,
        metaComercial,
        cumplimientoValidado: Math.round(cumplimientoValidado * 10) / 10,
        cumplimientoPotencial: Math.round(cumplimientoPotencial * 10) / 10
      },
      origen: {
        nuevas: origen.nuevas,
        referidas: origen.referidas,
        recompras: origen.recompras,
        porcNuevas: ventasRegistradas > 0 ? Math.round((origen.nuevas / ventasRegistradas) * 100) : 0,
        porcReferidas: ventasRegistradas > 0 ? Math.round((origen.referidas / ventasRegistradas) * 100) : 0,
        porcRecompras: ventasRegistradas > 0 ? Math.round((origen.recompras / ventasRegistradas) * 100) : 0,
      },
      campo: {
        instAsignadas,
        instVisitadas,
        visitasRealizadas,
        coberturaTerritorial: Math.round(coberturaTerritorial),
        visitasLibres,
        visitasVencidas,
        tasaConversion: Math.round(tasaConversion * 100) / 100,
        cierres
      },
      formalizacion: {
        contratosPendientesEnvio: ventas.length - pedidos.length, // Lógica simple referencial
        pendientesAuditoria: ventas.filter(v => v.estadoTicket === 'Pendiente Facturación').length,
        contratosConNovedades,
        ticketsAbiertos,
        ticketsVencidos,
        indiceFormalizacion: Math.round(indiceFormalizacion * 10) / 10
      },
      pedidos: {
        pedidosBorrador,
        pedidosEnviados,
        entregasProximas,
        entregasVencidas
      },
      ranking: rankingVendedores
    });

  } catch (error) {
    console.error("Error en Dashboard Comercial:", error);
    return NextResponse.json({ error: 'Error al generar indicadores' }, { status: 500 });
  }
}