import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT: El Administrador abre o cierra el candado (🔒 / 🔓)
export async function PUT(request: Request) {
  try {
    const { visitaId, habilitar } = await request.json();
    const actualizado = await prisma.visitaAgenda.update({
      where: { id: visitaId },
      data: { edicionFechaHabilitada: habilitar }
    });
    return NextResponse.json({ success: true, estado: actualizado.edicionFechaHabilitada });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cambiar candado' }, { status: 500 });
  }
}

// POST: El Vendedor envía la nueva fecha (✍️ Corrección)
export async function POST(request: Request) {
  try {
    const { visitaId, nuevaFecha } = await request.json();

    // 1. Verificamos que el admin realmente haya abierto el candado
    const visita = await prisma.visitaAgenda.findUnique({ where: { id: visitaId } });
    if (!visita || !visita.edicionFechaHabilitada) {
      return NextResponse.json({ error: 'Esta visita no está habilitada para edición' }, { status: 403 });
    }

    // Configuramos la nueva fecha al mediodía para evitar saltos de zona horaria
    const fechaBase = new Date(`${nuevaFecha}T12:00:00Z`);

    // 2. Extraemos todos los números de contrato de esta visita para poder alterar los Pedidos también
    const ventas = await prisma.venta.findMany({ where: { visitaId } });
    const numerosContrato = ventas.map(v => v.numContrato).filter(Boolean);

    // 3. LA MAGIA: Transacción Atómica (O se actualiza todo, o no se actualiza nada)
    await prisma.$transaction([
      // A) Actualizamos la Visita y CERRRAMOS EL CANDADO
      prisma.visitaAgenda.update({
        where: { id: visitaId },
        data: { createdAt: fechaBase, edicionFechaHabilitada: false }
      }),
      // B) Actualizamos todos los Contratos de esa visita
      prisma.venta.updateMany({
        where: { visitaId },
        data: { fechaVenta: fechaBase }
      }),
      // C) Actualizamos los Pedidos en el Taller que coincidan con esos contratos
      ...(numerosContrato.length > 0 ? [
        prisma.pedido.updateMany({
          where: { numContrato: { in: numerosContrato } },
          data: { fechaPedido: fechaBase, createdAt: fechaBase }
        })
      ] : [])
    ]);

    return NextResponse.json({ success: true, message: 'Fechas actualizadas correctamente' });
  } catch (error) {
    console.error("Error retroactivo:", error);
    return NextResponse.json({ error: 'Error al actualizar las fechas' }, { status: 500 });
  }
}