import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { validaciones } = await request.json(); 
    // validaciones es un array: [{ id, verificacion, observaciones, estadoTicket }]

    if (!validaciones || validaciones.length === 0) {
      return NextResponse.json({ error: 'No hay datos para procesar' }, { status: 400 });
    }

    // Transacción masiva: Actualiza todos los contratos al mismo tiempo
    const transacciones = validaciones.map((v: any) =>
      prisma.venta.update({
        where: { id: v.id },
        data: {
          verificacionFact: v.verificacion,
          observacionesFact: v.observaciones,
          estadoTicket: v.estadoTicket
        }
      })
    );

    await prisma.$transaction(transacciones);

    return NextResponse.json({ success: true, actualizados: validaciones.length });
  } catch (error) {
    console.error("Error en validación masiva:", error);
    return NextResponse.json({ error: 'Error interno en validación masiva' }, { status: 500 });
  }
}