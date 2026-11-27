import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  cuotasDe,
  etiquetaCarga,
  filtrarDocumentos,
  GRUPOS_SEMAFORO,
  ordenarDocumentos,
  provinciasDe,
  resumenVacio,
  type GrupoSemaforoId,
} from "@/lib/marketing";
import {
  analizarCarga,
  baseDocumentosDe,
  filtrosDeParams,
  obtenerCarga,
  ordenDeParams,
  tabValida,
} from "@/lib/marketing/consulta";

const POR_PAGINA = 15;

function categoriasPorGrupoVacio(): Record<GrupoSemaforoId, string[]> {
  const vacio = {} as Record<GrupoSemaforoId, string[]>;
  for (const grupo of GRUPOS_SEMAFORO) vacio[grupo.id] = [];
  return vacio;
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
    const filtros = filtrosDeParams(params);
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

    const carga = await obtenerCarga(params.get("cargaId") || "");

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

    const analisis = analizarCarga(carga);
    const baseDocumentos = baseDocumentosDe(analisis, tab);
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
