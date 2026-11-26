import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  aISO,
  claveIdentificacion,
  etiquetaCarga,
  fechaCorteDeCarga,
  parsearExcel,
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
              numDocumento: fila.numDocumento,
              fechaEmision: fila.fechaEmision,
              fechaVence: fila.fechaVence,
              total: fila.total,
              ctas: fila.ctas,
              abonado: fila.abonado,
              cob: fila.cob,
              saldo: fila.saldo,
              ven: fila.ven,
              dias: fila.dias,
              movil: fila.movil,
              vendedor: fila.vendedor,
              cuota: fila.cuota,
              saldoFecha: fila.saldoFecha,
              categoriaOrigen: fila.categoriaOrigen,
              provincia: fila.provincia,
              ciudad: fila.ciudad,
              direccion: fila.direccion,
            })),
          },
        },
        select: { id: true, createdAt: true },
      });
      nuevaCargaId = nueva.id;
      fechaCarga = nueva.createdAt;
    });

    const etiqueta = etiquetaCarga({ semanaNumero, mes, anio, createdAt: fechaCarga });
    const fechaCorteISO = aISO(
      fechaCorteDeCarga({ semanaNumero, mes, anio, createdAt: fechaCarga }),
    );
    const identificacionesUnicas = new Set(
      filas.map((fila) => claveIdentificacion(fila.identificacion)),
    ).size;

    await registrarAuditoriaMarketing({
      accion: "CARGA_SUBIDA",
      cargaId: nuevaCargaId,
      nombreArchivo: archivo.name.slice(0, 255),
      detalles: {
        cargaId: nuevaCargaId,
        totalRegistros: filas.length,
        identificacionesUnicas,
        semana: etiqueta,
        fechaCorte: fechaCorteISO,
      },
      usuarioId: session.id,
    });

    return NextResponse.json(
      {
        cargaId: nuevaCargaId,
        totalRegistros: filas.length,
        semana: etiqueta,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error cargando Excel de Marketing:", error);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}
