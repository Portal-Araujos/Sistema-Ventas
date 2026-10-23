import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  forbiddenResponse,
  getApiSession,
  hasPermission,
  isAdministrator,
  unauthorizedResponse,
} from "@/lib/api-auth";

const parseOptionalInt = (val: any): number | null => {
  if (!val || val === "" || isNaN(Number(val))) return null;
  return parseInt(val);
};
export async function GET(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const tienePermisoGlobal = hasPermission(session, "instituciones:ver") || isAdministrator(session);
    const esVendedor = session.rol === "vendedor";

    if (!tienePermisoGlobal && !esVendedor) {
      return forbiddenResponse();
    }

    const requestedPage = Number(searchParams.get("page") || "1");
    const requestedLimit = Number(searchParams.get("limit") || "15");
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 15;
    const skip = (page - 1) * limit;
    const provinciaId = searchParams.get("provinciaId");
    const cantonId = searchParams.get("cantonId");
    const parroquiaId = searchParams.get("parroquiaId");
    const tamano = searchParams.get("tamano");
    const estado = searchParams.get("estado");
    const sostenimientoId = searchParams.get("sostenimientoId");
    const filtroVendedor = searchParams.get("vendedorId");
    const where: any = {};

    if (search) {
      where.nombre = { contains: search, mode: "insensitive" };
    }
    if (provinciaId || cantonId || parroquiaId) {
      where.parroquia = {};
      if (parroquiaId) {
        where.parroquia.id = parseInt(parroquiaId);
      } else if (cantonId) {
        where.parroquia.cantonId = parseInt(cantonId);
      } else if (provinciaId) {
        where.parroquia.canton = { provinciaId: parseInt(provinciaId) };
      }
    }
    if (tamano) where.tamano = tamano;
    if (estado) where.estadoComercial = estado;
    if (sostenimientoId) where.sostenimientoId = parseInt(sostenimientoId);
    
    if (filtroVendedor === "sin_asignar") {
      where.vendedorId = null;
    } else if (filtroVendedor) {
      where.vendedorId = filtroVendedor;
    }
    if (esVendedor) {
      if (search.length >= 2) {
      } else {
         where.OR = [
           { vendedorId: session.id },
           { visitas: { some: { usuarioId: session.id } } },
         ];
      }
    }

    const [total, instituciones] = await Promise.all([
      prisma.institution.count({ where }),
      prisma.institution.findMany({
        where,
        skip,
        take: limit,
        include: {
          parroquia: { include: { canton: { include: { provincia: true } } } },
          sostenimiento: true,
          jornada: true,
          nivelEducativo: true,
          area: true,
          regimen: true,
          jurisdiccion: true,
          modalidad: true,
          accesoEdificio: true,
          vendedor: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const dataFormateada = instituciones.map((inst) => ({
      id: inst.id,
      nombre: inst.nombre,
      provinciaId: inst.parroquia.canton.provincia.id,
      provincia: inst.parroquia.canton.provincia.nombre,
      cantonId: inst.parroquia.canton.id,
      canton: inst.parroquia.canton.nombre,
      parroquiaId: inst.parroquia.id,
      parroquia: inst.parroquia.nombre,
      docentesHombres: inst.docentesHombres,
      docentesMujeres: inst.docentesMujeres,
      docentes: inst.totalDocentes,
      tamano: inst.tamano,
      estado: inst.estadoComercial,
      sostenimientoId: inst.sostenimientoId,
      sostenimiento: inst.sostenimiento.nombre,
      jornadaId: inst.jornadaId,
      jornada: inst.jornada.nombre,
      nivelEducativoId: inst.nivelEducativoId,
      nivelEducativo: inst.nivelEducativo?.nombre || "N/A",
      areaId: inst.areaId,
      area: inst.area?.nombre || "N/A",
      regimenId: inst.regimenId,
      regimen: inst.regimen?.nombre || "N/A",
      vendedorId: inst.vendedorId || null,
      vendedorNombre: inst.vendedor ? inst.vendedor.nombre : "Sin Asignar",
    }));

    return NextResponse.json({
      data: dataFormateada,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener las instituciones" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    const userId = session.id;
    const userRol = session.rol;
    const body = await request.json();
    const getCatId = async (
      modelDelegate: any,
      nombre: string,
      cacheMap: Map<string, number>,
      extra: any = {},
    ) => {
      const val =
        nombre && String(nombre).trim() !== ""
          ? String(nombre).trim().toUpperCase()
          : "NO DEFINIDO";
      const cacheKey = extra.parentId ? `${extra.parentId}_${val}` : val;
      if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey)!;
      let item;
      if (extra.type === "canton") {
        item = await modelDelegate.findFirst({
          where: { nombre: val, provinciaId: extra.parentId },
        });
        if (!item)
          item = await modelDelegate.create({
            data: { nombre: val, provinciaId: extra.parentId },
          });
      } else if (extra.type === "parroquia") {
        item = await modelDelegate.findFirst({
          where: { nombre: val, cantonId: extra.parentId },
        });
        if (!item)
          item = await modelDelegate.create({
            data: { nombre: val, cantonId: extra.parentId },
          });
      } else {
        item = await modelDelegate.findFirst({ where: { nombre: val } });
        if (!item) item = await modelDelegate.create({ data: { nombre: val } });
      }
      cacheMap.set(cacheKey, item.id);
      return item.id;
    };
    if (body.isBulkUpdate) {
      if (!isAdministrator(session))
        return NextResponse.json(
          { error: "Solo administradores." },
          { status: 403 },
        );
      const { instituciones } = body;
      const reglas = await prisma.reglaTamano.findMany();
      const cache = {
        provincia: new Map(),
        canton: new Map(),
        parroquia: new Map(),
        sostenimiento: new Map(),
        jornada: new Map(),
        nivel: new Map(),
        area: new Map(),
        regimen: new Map(),
        jurisdiccion: new Map(),
        modalidad: new Map(),
        acceso: new Map(),
      };
      const updatePromises = [];

      for (const row of instituciones) {
        if (!row.nombre || !row.provincia || !row.canton || !row.parroquia)
          continue;

        const provId = await getCatId(
          prisma.provincia,
          row.provincia,
          cache.provincia,
        );
        const cantId = await getCatId(prisma.canton, row.canton, cache.canton, {
          type: "canton",
          parentId: provId,
        });
        const parrId = await getCatId(
          prisma.parroquia,
          row.parroquia,
          cache.parroquia,
          { type: "parroquia", parentId: cantId },
        );
        const sostId = await getCatId(
          prisma.sostenimiento,
          row.sostenimiento,
          cache.sostenimiento,
        );
        const jornId = await getCatId(
          prisma.jornada,
          row.jornada,
          cache.jornada,
        );
        const nivelId = row.nivelEducativo
          ? await getCatId(
              prisma.nivelEducativo,
              row.nivelEducativo,
              cache.nivel,
            )
          : null;
        const areaId = row.area
          ? await getCatId(prisma.areaEducativa, row.area, cache.area)
          : null;
        const regimenId = row.regimen
          ? await getCatId(prisma.regimenEscolar, row.regimen, cache.regimen)
          : null;
        const jurisId = row.jurisdiccion
          ? await getCatId(
              prisma.jurisdiccion,
              row.jurisdiccion,
              cache.jurisdiccion,
            )
          : null;
        const modalId = row.modalidad
          ? await getCatId(
              prisma.modalidadEducativa,
              row.modalidad,
              cache.modalidad,
            )
          : null;
        const accesoId = row.accesoEdificio
          ? await getCatId(
              prisma.accesoEdificio,
              row.accesoEdificio,
              cache.acceso,
            )
          : null;
        const hombres = parseInt(row.docentesHombres) || 0;
        const mujeres = parseInt(row.docentesMujeres) || 0;
        const totalDocentes = parseInt(row.totalDocentes) || hombres + mujeres;

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
        updatePromises.push(
          prisma.institution.updateMany({
            where: { nombre: String(row.nombre).trim(), parroquiaId: parrId },
            data: {
              sostenimientoId: sostId,
              jornadaId: jornId,
              docentesHombres: hombres,
              docentesMujeres: mujeres,
              totalDocentes,
              tamano: tamanoCalculado,
              nivelEducativoId: nivelId,
              areaId: areaId,
              regimenId: regimenId,
              jurisdiccionId: jurisId,
              modalidadId: modalId,
              accesoEdificioId: accesoId,
            },
          }),
        );
      }
      await prisma.$transaction(updatePromises);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!hasPermission(session, "instituciones:crear")) {
      return forbiddenResponse();
    }
    if (body.isBulk) {
      if (userRol !== "super_admin" && userRol !== "administrador")
        return NextResponse.json(
          { error: "Solo administradores." },
          { status: 403 },
        );
      const { instituciones } = body;
      const reglas = await prisma.reglaTamano.findMany();
      const cache = {
        provincia: new Map(),
        canton: new Map(),
        parroquia: new Map(),
        sostenimiento: new Map(),
        jornada: new Map(),
        nivel: new Map(),
        area: new Map(),
        regimen: new Map(),
        jurisdiccion: new Map(),
        modalidad: new Map(),
        acceso: new Map(),
      };
      const insertBatch = [];

      for (const row of instituciones) {
        if (!row.nombre || !row.provincia || !row.canton || !row.parroquia)
          continue;
        const provId = await getCatId(
          prisma.provincia,
          row.provincia,
          cache.provincia,
        );
        const cantId = await getCatId(prisma.canton, row.canton, cache.canton, {
          type: "canton",
          parentId: provId,
        });
        const parrId = await getCatId(
          prisma.parroquia,
          row.parroquia,
          cache.parroquia,
          { type: "parroquia", parentId: cantId },
        );
        const sostId = await getCatId(
          prisma.sostenimiento,
          row.sostenimiento,
          cache.sostenimiento,
        );
        const jornId = await getCatId(
          prisma.jornada,
          row.jornada,
          cache.jornada,
        );
        const nivelId = row.nivelEducativo
          ? await getCatId(
              prisma.nivelEducativo,
              row.nivelEducativo,
              cache.nivel,
            )
          : null;
        const areaId = row.area
          ? await getCatId(prisma.areaEducativa, row.area, cache.area)
          : null;
        const regimenId = row.regimen
          ? await getCatId(prisma.regimenEscolar, row.regimen, cache.regimen)
          : null;
        const jurisId = row.jurisdiccion
          ? await getCatId(
              prisma.jurisdiccion,
              row.jurisdiccion,
              cache.jurisdiccion,
            )
          : null;
        const modalId = row.modalidad
          ? await getCatId(
              prisma.modalidadEducativa,
              row.modalidad,
              cache.modalidad,
            )
          : null;
        const accesoId = row.accesoEdificio
          ? await getCatId(
              prisma.accesoEdificio,
              row.accesoEdificio,
              cache.acceso,
            )
          : null;
        const hombres = parseInt(row.docentesHombres) || 0;
        const mujeres = parseInt(row.docentesMujeres) || 0;
        const totalDocentes = parseInt(row.totalDocentes) || hombres + mujeres;

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
        insertBatch.push({
          nombre: String(row.nombre).trim(),
          sostenimientoId: sostId,
          jornadaId: jornId,
          parroquiaId: parrId,
          docentesHombres: hombres,
          docentesMujeres: mujeres,
          totalDocentes,
          tamano: tamanoCalculado,
          estadoComercial: "No visitada",
          nivelEducativoId: nivelId,
          areaId: areaId,
          regimenId: regimenId,
          jurisdiccionId: jurisId,
          modalidadId: modalId,
          accesoEdificioId: accesoId,
          creadoPor: userId,
          vendedorId: null,
        });
      }
      const parroquiaIdsUnicas = [
        ...new Set(insertBatch.map((i) => i.parroquiaId)),
      ];
      const escuelasExistentes = await prisma.institution.findMany({
        where: { parroquiaId: { in: parroquiaIdsUnicas } },
        select: { nombre: true, parroquiaId: true },
      });
      const setExistentes = new Set(
        escuelasExistentes.map(
          (e) => `${e.nombre.trim().toLowerCase()}_${e.parroquiaId}`,
        ),
      );
      const escuelasNuevas = insertBatch.filter((item) => {
        const huella = `${item.nombre.trim().toLowerCase()}_${item.parroquiaId}`;
        if (setExistentes.has(huella)) return false;
        setExistentes.add(huella);
        return true;
      });
      if (escuelasNuevas.length > 0) {
        await prisma.institution.createMany({
          data: escuelasNuevas,
          skipDuplicates: true,
        });
      }
      return NextResponse.json(
        {
          success: true,
          recibidos: insertBatch.length,
          guardados: escuelasNuevas.length,
          duplicados: insertBatch.length - escuelasNuevas.length,
        },
        { status: 201 },
      );
    }
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
      vendedorId &&
      !hasPermission(session, "instituciones:gestionar_asignaciones")
    ) {
      return forbiddenResponse();
    }
    const vendedorValido = vendedorId
      ? await prisma.usuario.findFirst({
          where: {
            id: vendedorId,
            activo: true,
            rol: { nombre: "vendedor" },
          },
          select: { id: true },
        })
      : null;
    if (vendedorId && !vendedorValido) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 400 },
      );
    }
    if (!parroquiaId || isNaN(Number(parroquiaId)))
      return NextResponse.json(
        { error: "Selecciona Provincia, Cantón y Parroquia." },
        { status: 400 },
      );
    if (!sostenimientoId || isNaN(Number(sostenimientoId)))
      return NextResponse.json(
        { error: "Sostenimiento requerido." },
        { status: 400 },
      );
    if (!jornadaId || isNaN(Number(jornadaId)))
      return NextResponse.json(
        { error: "Jornada requerida." },
        { status: 400 },
      );

    const existeManual = await prisma.institution.findFirst({
      where: {
        nombre: String(nombre).trim(),
        parroquiaId: parseInt(parroquiaId),
      },
    });
    if (existeManual)
      return NextResponse.json(
        { error: "Esta escuela ya está registrada en esa parroquia." },
        { status: 400 },
      );

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
    const nuevaInstitucion = await prisma.institution.create({
      data: {
        nombre: String(nombre).trim(),
        sostenimientoId: parseInt(sostenimientoId),
        jornadaId: parseInt(jornadaId),
        parroquiaId: parseInt(parroquiaId),
        docentesHombres: hombres,
        docentesMujeres: mujeres,
        totalDocentes,
        tamano: tamanoCalculado,
        estadoComercial: "No visitada",
        nivelEducativoId: parseOptionalInt(nivelEducativoId),
        areaId: parseOptionalInt(areaId),
        regimenId: parseOptionalInt(regimenId),
        jurisdiccionId: parseOptionalInt(jurisdiccionId),
        modalidadId: parseOptionalInt(modalidadId),
        accesoEdificioId: parseOptionalInt(accesoEdificioId),
        creadoPor: userId,
        vendedorId: vendedorValido?.id ?? null,
      },
    });
    return NextResponse.json(nuevaInstitucion, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorizedResponse();
    if (!hasPermission(session, "instituciones:gestionar_asignaciones")) {
      return forbiddenResponse();
    }

    const { institucionId, vendedorId } = await request.json();
    if (typeof institucionId !== "string" || !institucionId)
      return NextResponse.json(
        { error: "ID de institución requerido" },
        { status: 400 },
      );
    const vendedorValido = vendedorId
      ? await prisma.usuario.findFirst({
          where: {
            id: vendedorId,
            activo: true,
            rol: { nombre: "vendedor" },
          },
          select: { id: true },
        })
      : null;
    if (vendedorId && !vendedorValido) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 400 },
      );
    }
    const institucionActualizada = await prisma.institution.update({
      where: { id: institucionId },
      data: { vendedorId: vendedorValido?.id ?? null },
    });
    return NextResponse.json(institucionActualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
