import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  isAdministrator,
  unauthorizedResponse,
} from "@/lib/api-auth";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "instituciones:ver")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const where: {
      id: string;
      OR?: Array<
        | { vendedorId: string }
        | { visitas: { some: { usuarioId: string } } }
      >;
    } = { id };
    if (session.rol === "vendedor") {
      where.OR = [
        { vendedorId: session.id },
        { visitas: { some: { usuarioId: session.id } } },
      ];
    }

    const institucion = await prisma.institution.findFirst({
      where,
      include: {
        parroquia: {
          include: { canton: { include: { provincia: true } } },
        },
        sostenimiento: true,
        jornada: true,
        nivelEducativo: true,
        area: true,
        regimen: true,
        jurisdiccion: true,
        modalidad: true,
        accesoEdificio: true,
        vendedor: { select: { id: true, nombre: true } },
        usuarioCreador: { select: { id: true, nombre: true } },
        visitas: {
          where: { estadoGestion: { not: "No Visitada" } },
          select: {
            id: true,
            tipoGestion: true,
            estadoGestion: true,
            createdAt: true,
            resumenAcuerdos: true,
            latitud: true,
            longitud: true,
            fechaProgramada: true,
            usuario: { select: { nombre: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        ventas: {
          select: {
            id: true,
            numContrato: true,
            fechaVenta: true,
            valorContrato: true,
            estadoTicket: true,
          },
          orderBy: { fechaVenta: "desc" },
        },
      },
    });

    if (!institucion) {
      return NextResponse.json(
        { error: "Institución no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(institucion);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener institución" },
      { status: 500 },
    );
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "instituciones:editar")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    if (session.rol === "vendedor") {
      const asignacion = await prisma.institution.findFirst({
        where: {
          id,
          OR: [
            { vendedorId: session.id },
            { visitas: { some: { usuarioId: session.id } } },
          ],
        },
        select: { id: true },
      });
      if (!asignacion) {
        return NextResponse.json(
          { error: "Institución no encontrada" },
          { status: 404 },
        );
      }
    }
    const body = await request.json();
    const {
      nombre,
      sostenimientoId,
      jornadaId,
      parroquiaId,
      docentesHombres,
      docentesMujeres,
      nivelEducativoId,
      areaId,
      regimenId,
      jurisdiccionId,
      modalidadId,
      accesoEdificioId,
      vendedorId,
    } = body;

    if (
      !isAdministrator(session) &&
      vendedorId !== undefined &&
      vendedorId !== session.id
    ) {
      return forbiddenResponse();
    }
    const vendedorValido = isAdministrator(session) && vendedorId
      ? await prisma.usuario.findFirst({
          where: {
            id: vendedorId,
            activo: true,
            rol: { nombre: "vendedor" },
          },
          select: { id: true },
        })
      : null;
    if (isAdministrator(session) && vendedorId && !vendedorValido) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 400 },
      );
    }
    const hombres = parseInt(docentesHombres) || 0;
    const mujeres = parseInt(docentesMujeres) || 0;
    const totalDocentes = hombres + mujeres;
    const reglas = await prisma.reglaTamano.findMany();
    let tamanoCalculado = "Pequeña";
    for (const regla of reglas) {
      if (
        totalDocentes >= regla.minDocentes &&
        totalDocentes <= regla.maxDocentes
      ) {
        tamanoCalculado = regla.nombre;
        break;
      }
    }
    const institucionActualizada = await prisma.institution.update({
      where: { id },
      data: {
        nombre,
        sostenimientoId: parseInt(sostenimientoId),
        jornadaId: parseInt(jornadaId),
        parroquiaId: parseInt(parroquiaId),
        docentesHombres: hombres,
        docentesMujeres: mujeres,
        totalDocentes,
        tamano: tamanoCalculado,
        nivelEducativoId: nivelEducativoId ? parseInt(nivelEducativoId) : null,
        areaId: areaId ? parseInt(areaId) : null,
        regimenId: regimenId ? parseInt(regimenId) : null,
        jurisdiccionId: jurisdiccionId ? parseInt(jurisdiccionId) : null,
        modalidadId: modalidadId ? parseInt(modalidadId) : null,
        accesoEdificioId: accesoEdificioId ? parseInt(accesoEdificioId) : null,
        vendedorId: isAdministrator(session)
          ? vendedorValido?.id ?? null
          : session.id,
      },
    });

    return NextResponse.json(institucionActualizada);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar institución" },
      { status: 500 },
    );
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!isAdministrator(session)) return forbiddenResponse();
    const { id } = await params;
    await prisma.institution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar institución" },
      { status: 500 },
    );
  }
}
