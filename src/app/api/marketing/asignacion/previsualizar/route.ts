import { NextResponse } from "next/server";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { normalizarSolicitudAsignacion } from "@/lib/marketing";
import {
  AsignacionError,
  previsualizarAsignacion,
} from "@/lib/marketing/asignacion-servicio";

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, "marketing:administrar")) return forbiddenResponse();

  try {
    const solicitud = normalizarSolicitudAsignacion(await request.json());
    if (!solicitud || solicitud.filas) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    return NextResponse.json(await previsualizarAsignacion(solicitud));
  } catch (error) {
    if (error instanceof AsignacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error previsualizando asignación de Marketing:", error);
    return NextResponse.json(
      { error: "No se pudo previsualizar la asignación" },
      { status: 500 },
    );
  }
}
