import { getApiSession, hasPermission, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
import { getJwtSecret } from "@/lib/jwt";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const whereClause: any = {};

    if (q.trim().length > 0) {
      whereClause.OR = [
        { codigo: { contains: q, mode: "insensitive" } },
        { tipoRopa: { contains: q, mode: "insensitive" } },
      ];
    }

    const catalogos = await prisma.catalogoSKU.findMany({
      where: whereClause,
      orderBy: { codigo: "asc" },
    });

    return NextResponse.json({
      success: true,
      raw: catalogos,
    });
  } catch (error) {
    console.error("Error al cargar SKUs:", error);
    return NextResponse.json(
      { error: "Error al cargar catálogo SKU" },
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
    await jwtVerify(token, getJwtSecret());
    const body = await request.json();
    const datosExcel = Array.isArray(body) ? body : body.skus;
    if (!datosExcel || !Array.isArray(datosExcel)) {
      return NextResponse.json(
        { error: "Formato de datos incorrecto" },
        { status: 400 },
      );
    }
    const dataLimpia = datosExcel
      .map((item: any) => ({
        codigo: item.codigo ? String(item.codigo).trim().toUpperCase() : "",
        tipoRopa: item.tipoRopa
          ? String(item.tipoRopa).trim().toUpperCase()
          : "",
        color: item.color ? String(item.color).trim().toUpperCase() : "",
        genero: item.genero
          ? String(item.genero).trim().toUpperCase()
          : "UNISEX",
        talla: item.talla ? String(item.talla).trim().toUpperCase() : "N/A",
        activo: item.activo !== undefined ? item.activo : true,
        categoriaItem: item.categoriaItem || "TEXTIL",
      }))
      .filter((item) => item.codigo !== "" && item.tipoRopa !== "");

    if (dataLimpia.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío o los datos son inválidos." },
        { status: 400 },
      );
    }
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!body.importacion && dataLimpia.length === 1 && !hasPermission(session, "skus:editar") && await prisma.catalogoSKU.findUnique({ where: { codigo: dataLimpia[0].codigo } })) return NextResponse.json({ error: "El código ya existe. Usa la acción de edición." }, { status: 409 });
    const operaciones = dataLimpia.map((sku) =>
      prisma.catalogoSKU.upsert({
        where: { codigo: sku.codigo },
        update: {
          tipoRopa: sku.tipoRopa,
          color: sku.color,
          genero: sku.genero,
          talla: sku.talla,
          activo: sku.activo,
          categoriaItem: sku.categoriaItem,
        },
        create: {
          codigo: sku.codigo,
          tipoRopa: sku.tipoRopa,
          color: sku.color,
          genero: sku.genero,
          talla: sku.talla,
          activo: sku.activo,
          categoriaItem: sku.categoriaItem,
        },
      }),
    );
    await prisma.$transaction(operaciones);
    return NextResponse.json({
      success: true,
      message: `¡Subida exitosa! Se procesaron ${dataLimpia.length} SKUs en bodega.`,
      creados: dataLimpia.length,
    });
  } catch (error) {
    console.error("Error subiendo SKUs:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo masivo" },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const { id, activo, codigo } = await request.json();
    const editar = codigo !== undefined;
    if (!hasPermission(session, editar ? "skus:editar" : "skus:activar")) return forbiddenResponse();
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1 || (editar ? typeof codigo !== "string" || !codigo.trim() : typeof activo !== "boolean")) return NextResponse.json({ error: "Datos del código inválidos" }, { status: 400 });
    const item = await prisma.catalogoSKU.update({ where: { id: Number(id) }, data: editar ? { codigo: codigo.trim().toUpperCase() } : { activo } });
    // Orders contain their original SKU as a snapshot; never rewrite those rows.
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
    return NextResponse.json({ error: "No se pudo actualizar el código" }, { status: 500 });
  }
}
