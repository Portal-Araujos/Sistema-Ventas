import { NextResponse } from "next/server";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  construirCandidatos,
  filtrarDocumentos,
  GRUPOS_SEMAFORO,
  ordenarDocumentos,
  ordenarPorUbicacion,
  type EstadoFiltroEnvio,
  type OrdenUbicacion,
  type TabSemaforo,
} from "@/lib/marketing";
import {
  aClienteCartera,
  analizarCarga,
  baseDocumentosDe,
  datosDeEnvios,
  filtrosDeParams,
  obtenerCarga,
  ordenDeParams,
  tabValida,
} from "@/lib/marketing/consulta";
import {
  columnasValidas,
  filtrarCandidatos,
  libroABuffer,
  libroDocumentos,
  libroEnvios,
  libroResumen,
} from "@/lib/marketing/exportar-excel";

const NOMBRES_ARCHIVO: Record<TabSemaforo, string> = {
  resumen: "Resumen",
  general: "General",
  "sin-contrato": "Sin_Contrato",
  envios: "Envios",
  mediaciones: "Mediaciones",
  "cobro-particular": "Cobro_Particular",
  "debito-bancario": "Debito_Bancario",
  refinanciamiento: "Refinanciamiento",
};

function etiquetaTab(tab: TabSemaforo): string {
  if (tab === "resumen") return "Resumen General";
  if (tab === "general") return "General";
  if (tab === "sin-contrato") return "Sin Contrato";
  if (tab === "envios") return "Envío a vendedores";
  return GRUPOS_SEMAFORO.find((grupo) => grupo.id === tab)?.etiqueta ?? tab;
}

function estadoDeParams(valor: string): EstadoFiltroEnvio {
  return valor === "pendientes" || valor === "enviados" ? valor : "todos";
}

function ordenUbicacionDeParams(valor: string): OrdenUbicacion | null {
  return valor === "asc" || valor === "desc" ? valor : null;
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const params = new URL(request.url).searchParams;
    const tab = tabValida(params.get("tab") || "resumen");
    const cargaId = params.get("cargaId") || "";

    let libro;
    if (tab === "envios") {
      const [carga, envios] = await Promise.all([
        obtenerCarga(cargaId),
        datosDeEnvios(),
      ]);
      const candidatos = carga
        ? construirCandidatos(
            analizarCarga(carga),
            carga.clientes.map(aClienteCartera),
            envios.estados,
          )
        : [];
      const candidatosFiltrados = filtrarCandidatos(
        candidatos,
        params.get("busqueda") ?? "",
        estadoDeParams(params.get("estado") ?? ""),
        params.get("ubicacion") ?? "",
      );
      const ordenUbicacion = ordenUbicacionDeParams(
        params.get("ordenUbicacion") ?? "",
      );
      libro = libroEnvios({
        candidatos: ordenUbicacion
          ? ordenarPorUbicacion(candidatosFiltrados, ordenUbicacion)
          : candidatosFiltrados,
        conteos: envios.conteos,
        registros: envios.registros,
      });
    } else {
      const carga = await obtenerCarga(cargaId);
      if (!carga) {
        return NextResponse.json(
          { error: "No hay una carga de Marketing disponible" },
          { status: 404 },
        );
      }
      const analisis = analizarCarga(carga);
      if (tab === "resumen") {
        libro = libroResumen({ analisis });
      } else {
        const columnas = columnasValidas(
          (params.get("columnas") ?? "")
            .split(",")
            .map((columna) => columna.trim())
            .filter(Boolean),
        );
        const documentos = ordenarDocumentos(
          filtrarDocumentos(
            baseDocumentosDe(analisis, tab),
            filtrosDeParams(params),
            tab,
          ),
          ordenDeParams(params),
        );
        libro = libroDocumentos({
          documentos,
          columnas,
          nombreHoja: etiquetaTab(tab),
        });
      }
    }

    const bytes = await libroABuffer(libro);
    const nombre = `Marketing_${NOMBRES_ARCHIVO[tab]}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exportando Marketing a Excel:", error);
    return NextResponse.json(
      { error: "No se pudo exportar a Excel" },
      { status: 500 },
    );
  }
}
