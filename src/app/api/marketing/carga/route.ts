import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { parsearExcel } from "@/lib/marketing";

const MAX_TAMANO = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: "Selecciona un archivo Excel" }, { status: 400 });
    }
    if (archivo.size > MAX_TAMANO) {
      return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });
    }

    const { filas, faltantes } = parsearExcel(await archivo.arrayBuffer());
    if (faltantes.length) {
      return NextResponse.json(
        { error: `Faltan columnas obligatorias: ${faltantes.join(", ")}` },
        { status: 400 },
      );
    }
    if (!filas.length) {
      return NextResponse.json({ error: "El archivo no contiene registros" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.marketingCarga.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
      await tx.marketingCarga.create({
        data: {
          nombreArchivo: archivo.name.slice(0, 255),
          activo: true,
          totalRegistros: filas.length,
          creadoPorId: session.id,
          clientes: {
            create: filas.map((fila) => ({
              fila: fila.fila,
              identificacion: fila.identificacion,
              nombreCliente: fila.nombreCliente,
              movil: fila.movil,
              provincia: fila.provincia,
              ciudad: fila.ciudad,
              direccion: fila.direccion,
              vendedor: fila.vendedor,
            })),
          },
        },
      });
    });

    return NextResponse.json({ totalRegistros: filas.length }, { status: 201 });
  } catch (error) {
    console.error("Error cargando Excel de Marketing:", error);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}
