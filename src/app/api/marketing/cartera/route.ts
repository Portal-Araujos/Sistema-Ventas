import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { etiquetaCarga, type ClienteCartera } from "@/lib/marketing";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const cargasDisponibles = await prisma.marketingCarga.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombreArchivo: true,
        createdAt: true,
        activo: true,
        semanaNumero: true,
        mes: true,
        anio: true,
      },
    });
    const listaCargas = cargasDisponibles.map((carga) => ({
      id: carga.id,
      nombreArchivo: carga.nombreArchivo,
      createdAt: carga.createdAt.toISOString(),
      semana: etiquetaCarga(carga),
      activo: carga.activo,
    }));

    const idSolicitado = new URL(request.url).searchParams.get("cargaId") || "";
    const carga = idSolicitado
      ? await prisma.marketingCarga.findUnique({
          where: { id: idSolicitado },
          include: { clientes: { orderBy: { fila: "asc" } } },
        })
      : await prisma.marketingCarga.findFirst({
          where: { activo: true },
          orderBy: { createdAt: "desc" },
          include: { clientes: { orderBy: { fila: "asc" } } },
        });

    if (!carga) {
      return NextResponse.json({
        carga: null,
        clientes: [],
        cargasDisponibles: listaCargas,
      });
    }

    const clientes: ClienteCartera[] = carga.clientes.map((cliente) => ({
      fila: cliente.fila,
      identificacion: cliente.identificacion,
      nombreCliente: cliente.nombreCliente,
      numDocumento: cliente.numDocumento,
      fechaEmision: cliente.fechaEmision,
      fechaVence: cliente.fechaVence,
      total: cliente.total,
      ctas: cliente.ctas,
      abonado: cliente.abonado,
      cob: cliente.cob,
      saldo: cliente.saldo,
      ven: cliente.ven,
      dias: cliente.dias,
      movil: cliente.movil,
      vendedor: cliente.vendedor,
      cuota: cliente.cuota,
      saldoFecha: cliente.saldoFecha,
      categoriaOrigen: cliente.categoriaOrigen,
      provincia: cliente.provincia,
      ciudad: cliente.ciudad,
      direccion: cliente.direccion,
    }));

    return NextResponse.json({
      carga: {
        id: carga.id,
        nombreArchivo: carga.nombreArchivo,
        createdAt: carga.createdAt.toISOString(),
        semana: etiquetaCarga(carga),
        esActiva: carga.activo,
        totalRegistros: carga.totalRegistros,
      },
      clientes,
      cargasDisponibles: listaCargas,
    });
  } catch (error) {
    console.error("Error consultando cartera de Marketing:", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera" }, { status: 500 });
  }
}
