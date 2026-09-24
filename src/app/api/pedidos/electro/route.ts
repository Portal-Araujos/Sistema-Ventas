import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback"
);

// 1. OBTENER EL INVENTARIO ELECTRO 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const whereClause: any = {};

    if (q.trim().length > 0) {
      whereClause.OR = [
        { codigo: { contains: q, mode: "insensitive" } },
        { producto: { contains: q, mode: "insensitive" } },
        { familia: { contains: q, mode: "insensitive" } },
        { marcaModelo: { contains: q, mode: "insensitive" } },
      ];
    }

    const catalogos = await prisma.catalogoElectro.findMany({
      where: whereClause,
      orderBy: { codigo: "asc" },
    });

    return NextResponse.json({ success: true, raw: catalogos });
  } catch (error) {
    console.error("Error al cargar Catálogo Electro:", error);
    return NextResponse.json({ error: "Error al cargar catálogo de tecnología" }, { status: 500 });
  }
}

// 2. GUARDAR UNO O VARIOS EQUIPOS (MASIVO O INDIVIDUAL) 
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const body = await request.json();
    const datosArray = Array.isArray(body) ? body : body.equipos;
    
    if (!datosArray || !Array.isArray(datosArray)) {
      return NextResponse.json({ error: "Formato de datos incorrecto" }, { status: 400 });
    }

    const dataLimpia = datosArray
      .map((item: any) => ({
        codigo: item.codigo ? String(item.codigo).trim().toUpperCase() : "",
        producto: item.producto ? String(item.producto).trim().toUpperCase() : "",
        familia: item.familia ? String(item.familia).trim().toUpperCase() : "",
        marcaModelo: item.marcaModelo ? String(item.marcaModelo).trim().toUpperCase() : "",
        garantia: item.garantia ? String(item.garantia).trim().toUpperCase() : "N/A",
        activo: item.activo !== undefined ? item.activo : true,
      }))
      .filter((item) => item.codigo !== "" && item.familia !== "");

    if (dataLimpia.length === 0) {
      return NextResponse.json({ error: "Datos inválidos o vacíos." }, { status: 400 });
    }

    const operaciones = dataLimpia.map((equipo) =>
      prisma.catalogoElectro.upsert({
        where: { codigo: equipo.codigo },
        update: {
          familia: equipo.familia,
          producto: equipo.producto,
          marcaModelo: equipo.marcaModelo,
          garantia: equipo.garantia,
          activo: equipo.activo,
        },
        create: {
          codigo: equipo.codigo,
          familia: equipo.familia,
          producto: equipo.producto,
          marcaModelo: equipo.marcaModelo,
          garantia: equipo.garantia,
          activo: equipo.activo,
        },
      })
    );

    await prisma.$transaction(operaciones);
    
    return NextResponse.json({
      success: true,
      message: `¡Subida exitosa! Se procesaron ${dataLimpia.length} equipos en bodega.`,
    });
  } catch (error) {
    console.error("Error subiendo Equipos:", error);
    return NextResponse.json({ error: "Error al procesar los equipos" }, { status: 500 });
  }
}

// 3. ACTIVAR / DESACTIVAR UN EQUIPO 
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, activo } = body;
    if (!id) return NextResponse.json({ error: "ID es requerido" }, { status: 400 });

    const equipoActualizado = await prisma.catalogoElectro.update({
      where: { id },
      data: { activo },
    });

    return NextResponse.json({ success: true, data: equipoActualizado });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 });
  }
}