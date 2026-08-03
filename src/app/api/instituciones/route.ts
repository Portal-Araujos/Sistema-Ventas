import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

const parseOptionalInt = (val: any): number | null => {
  if (!val || val === '' || isNaN(Number(val))) return null;
  return parseInt(val);
};

// GET: OBTENER INSTITUCIONES (CON FILTRO DE CARTERA SEGÚN ROL)
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let userRol = 'vendedor';
    let userId = '';
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userRol = (payload.rol as string) || 'vendedor';
        userId = (payload.id as string) || '';
      } catch (e) {
        console.error("Error al verificar token en GET instituciones:", e);
      }
    }
    
    const { searchParams } = new URL(request.url);
    const cantonId = searchParams.get('cantonId');
    const filtroVendedor = searchParams.get('vendedorId');
    
    const where: any = {};
    if (userRol === 'vendedor') {
      where.vendedorId = userId;
    } else if (filtroVendedor) {
      where.vendedorId = filtroVendedor; 
    }
    if (cantonId) {
      where.parroquia = { cantonId: parseInt(cantonId) };
    }
    
    const instituciones = await prisma.institution.findMany({
      where,
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
        vendedor: { select: { id: true, nombre: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    
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
      nivelEducativo: inst.nivelEducativo?.nombre || 'N/A',
      areaId: inst.areaId,
      area: inst.area?.nombre || 'N/A',
      regimenId: inst.regimenId,
      regimen: inst.regimen?.nombre || 'N/A',
      vendedorId: inst.vendedorId || null,
      vendedorNombre: inst.vendedor ? inst.vendedor.nombre : 'Sin Asignar'
    }));
    
    return NextResponse.json(dataFormateada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener las instituciones' }, { status: 500 });
  }
}

// POST: CREAR NUEVA INSTITUCIÓN (MANUAL O IMPORTACIÓN MASIVA)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    
    const usuarioExiste = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuarioExiste) return NextResponse.json({ error: 'Sesión caducada.' }, { status: 401 });
    
    const body = await request.json();

    // ============================================================================
    // 🧠 CEREBRO 1: IMPORTACIÓN MASIVA (BULK EXCEL) CON FILTRO DUPLICADOS
    // ============================================================================
    if (body.isBulk) {
      if (userRol !== 'super_admin' && userRol !== 'administrador') {
        return NextResponse.json({ error: 'Solo administradores pueden importar masivamente.' }, { status: 403 });
      }

      const { instituciones } = body;
      const reglas = await prisma.reglaTamano.findMany();

      const cache = {
        provincia: new Map(), canton: new Map(), parroquia: new Map(),
        sostenimiento: new Map(), jornada: new Map(), nivel: new Map(),
        area: new Map(), regimen: new Map(), jurisdiccion: new Map(),
        modalidad: new Map(), acceso: new Map()
      };

      const getCatId = async (modelDelegate: any, nombre: string, cacheMap: Map<string, number>, extra: any = {}) => {
        const val = (nombre && String(nombre).trim() !== '') ? String(nombre).trim().toUpperCase() : 'NO DEFINIDO';
        const cacheKey = extra.parentId ? `${extra.parentId}_${val}` : val;
        if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey)!;

        let item;
        if (extra.type === 'canton') {
          item = await modelDelegate.findFirst({ where: { nombre: val, provinciaId: extra.parentId } });
          if (!item) item = await modelDelegate.create({ data: { nombre: val, provinciaId: extra.parentId } });
        } else if (extra.type === 'parroquia') {
          item = await modelDelegate.findFirst({ where: { nombre: val, cantonId: extra.parentId } });
          if (!item) item = await modelDelegate.create({ data: { nombre: val, cantonId: extra.parentId } });
        } else {
          item = await modelDelegate.findFirst({ where: { nombre: val } });
          if (!item) item = await modelDelegate.create({ data: { nombre: val } });
        }
        cacheMap.set(cacheKey, item.id);
        return item.id;
      };

      const insertBatch = [];

      // 1. Armamos todo el paquete con sus IDs reales
      for (const row of instituciones) {
        if (!row.nombre || !row.provincia || !row.canton || !row.parroquia) continue;

        const provId = await getCatId(prisma.provincia, row.provincia, cache.provincia);
        const cantId = await getCatId(prisma.canton, row.canton, cache.canton, { type: 'canton', parentId: provId });
        const parrId = await getCatId(prisma.parroquia, row.parroquia, cache.parroquia, { type: 'parroquia', parentId: cantId });

        const sostId = await getCatId(prisma.sostenimiento, row.sostenimiento, cache.sostenimiento);
        const jornId = await getCatId(prisma.jornada, row.jornada, cache.jornada);
        const nivelId = row.nivelEducativo ? await getCatId(prisma.nivelEducativo, row.nivelEducativo, cache.nivel) : null;
        const areaId = row.area ? await getCatId(prisma.areaEducativa, row.area, cache.area) : null;
        const regimenId = row.regimen ? await getCatId(prisma.regimenEscolar, row.regimen, cache.regimen) : null;
        const jurisId = row.jurisdiccion ? await getCatId(prisma.jurisdiccion, row.jurisdiccion, cache.jurisdiccion) : null;
        const modalId = row.modalidad ? await getCatId(prisma.modalidadEducativa, row.modalidad, cache.modalidad) : null;
        const accesoId = row.accesoEdificio ? await getCatId(prisma.accesoEdificio, row.accesoEdificio, cache.acceso) : null;

        const hombres = parseInt(row.docentesHombres) || 0;
        const mujeres = parseInt(row.docentesMujeres) || 0;
        const totalDocentes = parseInt(row.totalDocentes) || (hombres + mujeres);

        let tamanoCalculado = 'Pequeña';
        for (const regla of reglas) {
          if (totalDocentes >= regla.minDocentes && totalDocentes <= regla.maxDocentes) {
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
          estadoComercial: 'No visitada',
          nivelEducativoId: nivelId,
          areaId: areaId,
          regimenId: regimenId,
          jurisdiccionId: jurisId,
          modalidadId: modalId,
          accesoEdificioId: accesoId,
          creadoPor: userId,
          vendedorId: null
        });
      }

      // 2. FILTRO DE DUPLICADOS (Huella Dactilar: Nombre + Parroquia)
      const parroquiaIdsUnicas = [...new Set(insertBatch.map(i => i.parroquiaId))];
      const escuelasExistentes = await prisma.institution.findMany({
        where: { parroquiaId: { in: parroquiaIdsUnicas } },
        select: { nombre: true, parroquiaId: true }
      });
      
      const setExistentes = new Set(escuelasExistentes.map(e => `${e.nombre.trim().toLowerCase()}_${e.parroquiaId}`));
      
      const escuelasNuevas = insertBatch.filter(item => {
        const huella = `${item.nombre.trim().toLowerCase()}_${item.parroquiaId}`;
        if (setExistentes.has(huella)) return false; // Ya existe, la ignoramos
        setExistentes.add(huella); // La añadimos al set local por si viene duplicada en el mismo Excel
        return true;
      });

      // 3. Inserción Masiva
      if (escuelasNuevas.length > 0) {
        await prisma.institution.createMany({
          data: escuelasNuevas,
          skipDuplicates: true
        });
      }

      return NextResponse.json({ 
        success: true, 
        recibidos: insertBatch.length,
        guardados: escuelasNuevas.length,
        duplicados: insertBatch.length - escuelasNuevas.length
      }, { status: 201 });
    }

    // ============================================================================
    // 🧠 CEREBRO 2: CREACIÓN MANUAL (EL FORMULARIO)
    // ============================================================================
    const {
      nombre, sostenimientoId, jornadaId, parroquiaId,
      docentesHombres, docentesMujeres,
      nivelEducativoId, areaId, regimenId, jurisdiccionId, modalidadId, accesoEdificioId, vendedorId
    } = body;
    
    if (!parroquiaId || isNaN(Number(parroquiaId))) return NextResponse.json({ error: 'Selecciona Provincia, Cantón y Parroquia.' }, { status: 400 });
    if (!sostenimientoId || isNaN(Number(sostenimientoId))) return NextResponse.json({ error: 'Sostenimiento requerido.' }, { status: 400 });
    if (!jornadaId || isNaN(Number(jornadaId))) return NextResponse.json({ error: 'Jornada requerida.' }, { status: 400 });
    
    // Verificamos duplicado manual
    const existeManual = await prisma.institution.findFirst({
      where: { nombre: String(nombre).trim(), parroquiaId: parseInt(parroquiaId) }
    });
    if (existeManual) return NextResponse.json({ error: 'Esta escuela ya está registrada en esa parroquia.' }, { status: 400 });

    const hombres = parseInt(docentesHombres) || 0;
    const mujeres = parseInt(docentesMujeres) || 0;
    const totalDocentes = hombres + mujeres;
    
    const reglas = await prisma.reglaTamano.findMany();
    let tamanoCalculado = 'Pequeña';
    for (const regla of reglas) {
      if (totalDocentes >= regla.minDocentes && totalDocentes <= regla.maxDocentes) {
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
        estadoComercial: 'No visitada',
        nivelEducativoId: parseOptionalInt(nivelEducativoId),
        areaId: parseOptionalInt(areaId),
        regimenId: parseOptionalInt(regimenId),
        jurisdiccionId: parseOptionalInt(jurisdiccionId),
        modalidadId: parseOptionalInt(modalidadId),
        accesoEdificioId: parseOptionalInt(accesoEdificioId),
        creadoPor: userId,
        vendedorId: vendedorId || null
      }
    });
    
    return NextResponse.json(nuevaInstitucion, { status: 201 });
  } catch (error) {
    console.error('Error creando institución:', error);
    return NextResponse.json({ error: 'Error interno al guardar la institución' }, { status: 500 });
  }
}

// PUT: REASIGNAR VENDEDOR
export async function PUT(request: Request) {
  try {
    const { institucionId, vendedorId } = await request.json();
    if (!institucionId) return NextResponse.json({ error: 'ID de institución requerido' }, { status: 400 });
    
    const institucionActualizada = await prisma.institution.update({
      where: { id: institucionId },
      data: { vendedorId: vendedorId ? vendedorId : null }
    });
    return NextResponse.json(institucionActualizada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al reasignar vendedor' }, { status: 500 });
  }
}