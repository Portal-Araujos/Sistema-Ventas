import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const base = await prisma.baseConsulta.findMany({
      include: {
        modalidad: true,
        institucion: { select: { nombre: true } }
      },
      orderBy: { nombres: 'asc' },
      take: 2000 
    });
    return NextResponse.json(base);
  } catch (error) {
    console.error("Error GET Base Consultas:", error);
    return NextResponse.json({ error: 'Error al cargar la base' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // PROCESAMIENTO MASIVO DESDE EXCEL
    if (body.masivo) {
      const rows = body.masivo;
      let count = 0;

      for (const row of rows) {
        // Flexibilidad en los nombres de las columnas del Excel
        const iden = String(row.Identificacion || row.identificacion || row.Cedula || row.cedula || '').trim();
        const nom = String(row.Nombres || row.nombres || row.Nombre || row.nombre || '').trim();
        const liq = parseFloat(row.LiquidoPagar || row.liquidoPagar || row['Líquido a Pagar'] || row.Liquido || 0);
        const modText = String(row.Modalidad || row.modalidad || '').trim();
        const escText = String(row.Escuela || row.escuela || row.Institucion || '').trim();

        if (!iden || !nom) continue; // Si no hay cédula o nombre, ignoramos la fila

        // 1. Gestionar Modalidad (La crea automáticamente si no existe)
        let modId = null;
        if (modText) {
          let mod = await prisma.modalidadLaboral.findFirst({ 
            where: { nombre: { equals: modText, mode: 'insensitive' } } 
          });
          if (!mod) {
            mod = await prisma.modalidadLaboral.create({ data: { nombre: modText.toUpperCase() } });
          }
          modId = mod.id;
        }

        // 2. Gestionar Escuela (Busca coincidencia aproximada)
        let instId = null;
        if (escText) {
          const inst = await prisma.institution.findFirst({ 
            where: { nombre: { contains: escText, mode: 'insensitive' } } 
          });
          if (inst) instId = inst.id;
        }

        // 3. Upsert: Si la cédula existe la actualiza, si no, la crea.
        await prisma.baseConsulta.upsert({
          where: { identificacion: iden },
          update: { 
            nombres: nom, 
            liquidoPagar: isNaN(liq) ? 0 : liq, 
            modalidadId: modId, 
            institucionId: instId 
          },
          create: { 
            identificacion: iden, 
            nombres: nom, 
            liquidoPagar: isNaN(liq) ? 0 : liq, 
            modalidadId: modId, 
            institucionId: instId 
          }
        });
        count++;
      }

      return NextResponse.json({ success: true, count });
    }
    // PROCESAMIENTO INDIVIDUAL (CREAR MANUALMENTE)
    if (body.identificacion && body.nombres && !body.masivo) {
      const nuevoCliente = await prisma.baseConsulta.create({
        data: {
          identificacion: body.identificacion,
          nombres: body.nombres,
          liquidoPagar: parseFloat(body.liquidoPagar) || 0,
          modalidadId: body.modalidadId ? parseInt(body.modalidadId) : null,
          institucionId: body.institucionId || null
        }
      });
      return NextResponse.json({ success: true, data: nuevoCliente });
    }

    return NextResponse.json({ error: 'Comando no reconocido' }, { status: 400 });
  } catch (error) {
    console.error("Error POST Masivo:", error);
    return NextResponse.json({ error: 'Error al procesar el Excel' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const clienteActualizado = await prisma.baseConsulta.update({
      where: { id: body.id },
      data: {
        identificacion: body.identificacion,
        nombres: body.nombres,
        liquidoPagar: parseFloat(body.liquidoPagar) || 0,
        modalidadId: body.modalidadId ? parseInt(body.modalidadId) : null,
        institucionId: body.institucionId || null
      }
    });

    return NextResponse.json({ success: true, data: clienteActualizado });
  } catch (error) {
    console.error("Error PUT Base Consultas:", error);
    return NextResponse.json({ error: 'Error al actualizar el cliente' }, { status: 500 });
  }
}