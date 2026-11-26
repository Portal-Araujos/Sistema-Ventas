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
  cuotasDe,
  etiquetaCarga,
  filtrarDocumentos,
  FILTROS_SEMAFORO_VACIOS,
  GRUPOS_SEMAFORO,
  esColumnaOrdenableSemaforo,
  ordenarDocumentos,
  provinciasDe,
  resumenVacio,
  type ClienteCartera,
  type FiltrosSemaforo,
  type GrupoSemaforoId,
  type OrdenSemaforo,
  type TabSemaforo,
} from "@/lib/marketing";

const POR_PAGINA = 15;

function tabValida(valor: string): TabSemaforo {
  if (valor === "resumen" || valor === "general" || valor === "sin-contrato") {
    return valor;
  }
  if (GRUPOS_SEMAFORO.some((grupo) => grupo.id === valor)) {
    return valor as TabSemaforo;
  }
  return "resumen";
}

function ordenDeParams(params: URLSearchParams): OrdenSemaforo | null {
  const columna = params.get("ordenColumna") ?? "";
  const direccion = params.get("ordenDireccion") ?? "asc";
  if (!esColumnaOrdenableSemaforo(columna)) return null;
  if (direccion !== "asc" && direccion !== "desc") return null;
  return { columna, direccion };
}

function categoriasPorGrupoVacio(): Record<GrupoSemaforoId, string[]> {
  const vacio = {} as Record<GrupoSemaforoId, string[]>;
  for (const grupo of GRUPOS_SEMAFORO) vacio[grupo.id] = [];
  return vacio;
}

function anioMinimoDeAuditoria(detalles: string | null): number | null {
  if (!detalles) return null;
  try {
    const parsed: unknown = JSON.parse(detalles);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const valor = (parsed as Record<string, unknown>).anioMinimoSinContrato;
    return typeof valor === "number" &&
      Number.isInteger(valor) &&
      valor >= 1900 &&
      valor <= 2100
      ? valor
      : null;
  } catch {
    return null;
  }
}

function aClienteCartera(cliente: {
  fila: number;
  identificacion: string;
  nombreCliente: string;
  numDocumento: string;
  fechaEmision: string;
  fechaVence: string;
  total: string;
  ctas: string;
  abonado: string;
  cob: string;
  saldo: string;
  ven: string;
  dias: string;
  movil: string;
  vendedor: string;
  cuota: string;
  saldoFecha: string;
  categoriaOrigen: string;
  provincia: string;
  ciudad: string;
  direccion: string;
}): ClienteCartera {
  return {
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
  };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const params = new URL(request.url).searchParams;
    const tab = tabValida(params.get("tab") || "resumen");
    const paginaSolicitada = Number(params.get("pagina"));
    const pagina =
      Number.isInteger(paginaSolicitada) && paginaSolicitada > 0
        ? paginaSolicitada
        : 1;
    const filtros: FiltrosSemaforo = { ...FILTROS_SEMAFORO_VACIOS };
    for (const clave of Object.keys(filtros) as (keyof FiltrosSemaforo)[]) {
      filtros[clave] = params.get(clave) ?? "";
    }
    const orden = ordenDeParams(params);

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

    const idSolicitado = params.get("cargaId") || "";
    const carga = idSolicitado
      ? await prisma.marketingCarga.findUnique({
          where: { id: idSolicitado },
          include: {
            clientes: { orderBy: { fila: "asc" } },
            auditorias: {
              where: { accion: "CARGA_SUBIDA" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { detalles: true },
            },
          },
        })
      : await prisma.marketingCarga.findFirst({
          where: { activo: true },
          orderBy: { createdAt: "desc" },
          include: {
            clientes: { orderBy: { fila: "asc" } },
            auditorias: {
              where: { accion: "CARGA_SUBIDA" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { detalles: true },
            },
          },
        });

    if (!carga) {
      return NextResponse.json({
        carga: null,
        cargasDisponibles: listaCargas,
        resumen: resumenVacio(),
        indicadores: { clientesUnicos: 0, oportunidadesReventa: 0 },
        documentos: [],
        totalDocumentos: 0,
        pagina: 1,
        porPagina: POR_PAGINA,
        categorias: [],
        categoriasPorGrupo: categoriasPorGrupoVacio(),
        provincias: [],
        cuotas: [],
      });
    }

    const analisis = analizarCartera(
      {
        ...carga,
        semana: etiquetaCarga(carga),
        anioMinimoSinContrato: anioMinimoDeAuditoria(
          carga.auditorias[0]?.detalles ?? null,
        ),
      },
      carga.clientes.map(aClienteCartera),
    );

    const baseDocumentos =
      tab === "sin-contrato"
        ? analisis.sinContrato
        : tab === "general"
          ? [...analisis.documentos, ...analisis.sinContrato]
          : [
              ...analisis.documentos,
              ...analisis.sinContrato.filter(
                (documento) => documento.grupo === tab,
              ),
            ];
    const provincias = provinciasDe(baseDocumentos);
    const cuotas = cuotasDe(baseDocumentos);
    const filtradas = ordenarDocumentos(
      filtrarDocumentos(baseDocumentos, filtros, tab),
      orden,
    );

    return NextResponse.json({
      carga: analisis.carga,
      cargasDisponibles: listaCargas,
      resumen: analisis.resumen,
      indicadores: analisis.indicadores,
      documentos: filtradas.slice(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA,
      ),
      totalDocumentos: filtradas.length,
      pagina,
      porPagina: POR_PAGINA,
      categorias: analisis.categorias,
      categoriasPorGrupo: analisis.categoriasPorGrupo,
      provincias,
      cuotas,
    });
  } catch (error) {
    console.error("Error consultando semaforización de Marketing:", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera" }, { status: 500 });
  }
}
