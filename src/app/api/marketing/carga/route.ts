import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  compararCargas,
  etiquetaCarga,
  parsearExcel,
  type ClienteRow,
} from "@/lib/marketing";
import { registrarAuditoriaMarketing } from "@/lib/marketing/auditoria";

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

    const semanaNumero = Number(formData.get("semana"));
    const mes = Number(formData.get("mes"));
    const anio = Number(formData.get("anio"));
    if (
      !Number.isInteger(semanaNumero) ||
      semanaNumero < 1 ||
      semanaNumero > 5 ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !Number.isInteger(anio) ||
      anio < 1900 ||
      anio > 2100
    ) {
      return NextResponse.json(
        { error: "Selecciona una semana del mes, mes y año válidos" },
        { status: 400 },
      );
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

    const anterior = await prisma.marketingCarga.findFirst({
      where: { activo: true },
      orderBy: { createdAt: "desc" },
      select: {
        clientes: {
          select: {
            fila: true,
            identificacion: true,
            nombreCliente: true,
            movil: true,
            provincia: true,
            ciudad: true,
            direccion: true,
            vendedor: true,
          },
        },
      },
    });
    const anteriores: ClienteRow[] = (anterior?.clientes ?? []).map((cliente) => ({
      fila: cliente.fila,
      identificacion: cliente.identificacion,
      nombreCliente: cliente.nombreCliente,
      movil: cliente.movil,
      provincia: cliente.provincia,
      ciudad: cliente.ciudad,
      direccion: cliente.direccion,
      vendedor: cliente.vendedor,
    }));
    const { cambios, resumen } = compararCargas(anteriores, filas);

    let nuevaCargaId = "";
    let fechaCarga = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.marketingCarga.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
      const nueva = await tx.marketingCarga.create({
        data: {
          nombreArchivo: archivo.name.slice(0, 255),
          activo: true,
          totalRegistros: filas.length,
          creadoPorId: session.id,
          semanaNumero,
          mes,
          anio,
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
          cambios: {
            create: cambios.map((cambio) => ({
              claveCliente: cambio.claveCliente,
              identificacion: cambio.identificacion,
              nombreCliente: cambio.nombreCliente,
              tipo: cambio.tipo,
              campo: cambio.campo,
              valorAnterior: cambio.valorAnterior,
              valorNuevo: cambio.valorNuevo,
            })),
          },
        },
        select: { id: true, createdAt: true },
      });
      nuevaCargaId = nueva.id;
      fechaCarga = nueva.createdAt;
    });
    const etiqueta = etiquetaCarga({ semanaNumero, mes, anio, createdAt: fechaCarga });

    await registrarAuditoriaMarketing({
      accion: "CARGA_SUBIDA",
      cargaId: nuevaCargaId,
      nombreArchivo: archivo.name.slice(0, 255),
      detalles: {
        totalRegistros: filas.length,
        semana: etiqueta,
        ...resumen,
      },
      usuarioId: session.id,
    });

    return NextResponse.json(
      {
        cargaId: nuevaCargaId,
        totalRegistros: filas.length,
        semana: etiqueta,
        ...resumen,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error cargando Excel de Marketing:", error);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}
