import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get("vendedorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const hoy = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }),
    );
    hoy.setHours(0, 0, 0, 0);

    const start = fechaDesde ? new Date(`${fechaDesde}T00:00:00-05:00`) : hoy;
    const end = fechaHasta
      ? new Date(`${fechaHasta}T23:59:59.999-05:00`)
      : new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

    const visitaWhere: any = {
      fechaProgramada: { gte: start, lte: end },
    };
    if (vendedorId) {
      visitaWhere.usuarioId = vendedorId;
    }

    const instituciones = await prisma.institution.findMany({
      where: {
        visitas: { some: visitaWhere },
      },
      include: {
        parroquia: { include: { canton: { include: { provincia: true } } } },
        vendedor: true,
        visitas: {
          where: visitaWhere,
          orderBy: [{ fechaProgramada: "asc" }, { horaProgramada: "asc" }],
          include: { usuario: true }, // 🔥 AQUÍ ESTÁ LA SOLUCIÓN AL ERROR 🔥
        },
        tickets: {
          where: {
            tipo: "Cobranza",
            estado: { notIn: ["Cerrado", "Resuelto"] },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const radarData = instituciones.map((inst) => {
      return {
        id: inst.id,
        nombre: inst.nombre,
        ubicacion: `${inst.parroquia?.canton?.provincia?.nombre || ""} - ${inst.parroquia?.canton?.nombre || ""}`,
        vendedorId: inst.visitas[0]?.usuarioId || inst.vendedorId,
        vendedorNombre:
          inst.visitas[0]?.usuario?.nombre ||
          inst.vendedor?.nombre ||
          "Sin Asignar",
        proximaVisita:
          inst.visitas.length > 0 ? inst.visitas[0].fechaProgramada : null,
        horaProgramada:
          inst.visitas.length > 0 ? inst.visitas[0].horaProgramada : null,
        ticketsActivos: inst.tickets.length,
        ticketsList: inst.tickets,
      };
    });

    return NextResponse.json(radarData);
  } catch (error) {
    console.error("Error en radar:", error);
    return NextResponse.json(
      { error: "Error al cargar radar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const data = await request.formData();
    const institucionId = data.get("institucionId") as string;
    const vendedorId = data.get("vendedorId") as string;
    const deudor = data.get("deudor") as string;
    const monto = data.get("monto") as string;
    const instrucciones = data.get("instrucciones") as string;
    const file = data.get("file") as File | null;

    let fileUrl = null;
    let fileTipo = null;
    let fileNombre = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      fileUrl = `/uploads/${filename}`;
      fileTipo = file.type;
      fileNombre = file.name;
    }

    const nuevoTicket = await prisma.ticketGestion.create({
      data: {
        codigo: `COB-${Date.now().toString().slice(-6)}`,
        tipo: "Cobranza",
        asunto: `Cobro a ${deudor} - Monto: $${monto}`,
        estado: "Abierto",
        prioridad: "Alta",
        institucionId: institucionId,
        creadorId: userId,
        asignados: {
          connect: { id: vendedorId || userId },
        },
      },
    });

    await prisma.mensajeTicket.create({
      data: {
        ticketId: nuevoTicket.id,
        remitenteId: userId,
        contenido: instrucciones || "Por favor realizar gestión de cobro.",
        esSistema: true,
        adjuntoUrl: fileUrl,
        adjuntoTipo: fileTipo,
        adjuntoNombre: fileNombre,
      },
    });

    return NextResponse.json({ success: true, ticket: nuevoTicket });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al generar ticket" },
      { status: 500 },
    );
  }
}
