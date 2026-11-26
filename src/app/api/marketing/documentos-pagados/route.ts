import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  analizarCartera,
  claveIdentificacion,
  etiquetaCarga,
  type ClienteCartera,
  type DocumentoPagado,
} from "@/lib/marketing";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  const identificacion = new URL(request.url).searchParams.get("identificacion") || "";
  if (!identificacion.trim()) {
    return NextResponse.json(
      { error: "Indica una identificación" },
      { status: 400 },
    );
  }

  try {
    const cargas = await prisma.marketingCarga.findMany({
      orderBy: { createdAt: "desc" },
      include: { clientes: { orderBy: { fila: "asc" } } },
    });

    const claveBuscada = claveIdentificacion(identificacion);
    const documentos: DocumentoPagado[] = [];

    for (const carga of cargas) {
      const filas: ClienteCartera[] = carga.clientes.map((cliente) => ({
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
      const analisis = analizarCartera(
        { ...carga, semana: etiquetaCarga(carga) },
        filas,
      );
      documentos.push(
        ...analisis.pagados.filter(
          (documento) =>
            claveIdentificacion(documento.identificacion) === claveBuscada,
        ),
      );
    }

    return NextResponse.json({ documentos });
  } catch (error) {
    console.error("Error consultando documentos pagados de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo consultar el historial de documentos pagados" },
      { status: 500 },
    );
  }
}
