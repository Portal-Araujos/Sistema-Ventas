import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    let userRol = 'vendedor';
    let userPermisos: string[] = [];

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userRol = (payload.rol as string) || 'vendedor';
        userPermisos = (payload.permisos as string[]) || [];
      } catch (e) {}
    }

    const provincias = await prisma.provincia.findMany({
      include: { cantones: { include: { parroquias: true } } },
      orderBy: { nombre: 'asc' }
    });

    const niveles = await prisma.nivelEducativo.findMany({ orderBy: { nombre: 'asc' } });
    const areas = await prisma.areaEducativa.findMany({ orderBy: { nombre: 'asc' } });
    const regimenes = await prisma.regimenEscolar.findMany({ orderBy: { nombre: 'asc' } });
    const jurisdicciones = await prisma.jurisdiccion.findMany({ orderBy: { nombre: 'asc' } });
    const modalidades = await prisma.modalidadEducativa.findMany({ orderBy: { nombre: 'asc' } });
    const accesos = await prisma.accesoEdificio.findMany({ orderBy: { nombre: 'asc' } });
    const sostenimientos = await prisma.sostenimiento.findMany({ orderBy: { nombre: 'asc' } });
    const jornadas = await prisma.jornada.findMany({ orderBy: { nombre: 'asc' } });
    const reglasTamano = await prisma.reglaTamano.findMany({ orderBy: { minDocentes: 'asc' } });
    const estadosComerciales = await prisma.estadoComercial.findMany({ orderBy: { id: 'asc' } });
    let estadosCliente = await prisma.estadoCliente.findMany({ orderBy: { id: 'asc' } });
    if (estadosCliente.length === 0) {
      await prisma.estadoCliente.createMany({
        data: [{ nombre: 'Pendiente' }, { nombre: 'Entregado' }, { nombre: 'Pedido' }]
      });
      estadosCliente = await prisma.estadoCliente.findMany({ orderBy: { id: 'asc' } });
    }
    let estadosContrato = await prisma.estadoContrato.findMany({ orderBy: { id: 'asc' } });
    if (estadosContrato.length === 0) {
      await prisma.estadoContrato.createMany({
        data: [{ nombre: 'Pendiente' }, { nombre: 'Entregado' }]
      });
      estadosContrato = await prisma.estadoContrato.findMany({ orderBy: { id: 'asc' } });
    }
    let tiposCobro = await prisma.tipoCobro.findMany({ orderBy: { id: 'asc' } });
    if (tiposCobro.length === 0) {
      await prisma.tipoCobro.createMany({
        data: [{ nombre: 'Débito' }, { nombre: 'Particular' }]
      });
      tiposCobro = await prisma.tipoCobro.findMany({ orderBy: { id: 'asc' } });
    }
    return NextResponse.json({
      userRol,
      userPermisos,
      provincias,
      niveles,
      areas,
      regimenes,
      jurisdicciones,
      modalidades,
      accesos,
      sostenimientos,
      jornadas,
      reglasTamano,
      estadosComerciales,
      estadosCliente,
      estadosContrato,
      tiposCobro
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar catálogos' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const { tipo, nombre, provinciaId, cantonId } = await request.json();
    if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    switch (tipo) {
      case 'provincia': return NextResponse.json(await prisma.provincia.create({ data: { nombre } }), { status: 201 });
      case 'canton': return NextResponse.json(await prisma.canton.create({ data: { nombre, provinciaId: parseInt(provinciaId) } }), { status: 201 });
      case 'parroquia': return NextResponse.json(await prisma.parroquia.create({ data: { nombre, cantonId: parseInt(cantonId) } }), { status: 201 });
      case 'nivel': return NextResponse.json(await prisma.nivelEducativo.create({ data: { nombre } }), { status: 201 });
      case 'area': return NextResponse.json(await prisma.areaEducativa.create({ data: { nombre } }), { status: 201 });
      case 'regimen': return NextResponse.json(await prisma.regimenEscolar.create({ data: { nombre } }), { status: 201 });
      case 'jurisdiccion': return NextResponse.json(await prisma.jurisdiccion.create({ data: { nombre } }), { status: 201 });
      case 'modalidad': return NextResponse.json(await prisma.modalidadEducativa.create({ data: { nombre } }), { status: 201 });
      case 'acceso': return NextResponse.json(await prisma.accesoEdificio.create({ data: { nombre } }), { status: 201 });
      case 'sostenimiento': return NextResponse.json(await prisma.sostenimiento.create({ data: { nombre } }), { status: 201 });
      case 'jornada': return NextResponse.json(await prisma.jornada.create({ data: { nombre } }), { status: 201 });
      case 'estadoComercial': return NextResponse.json(await prisma.estadoComercial.create({ data: { nombre, activo: true } }), { status: 201 });
      case 'estadoCliente': return NextResponse.json(await prisma.estadoCliente.create({ data: { nombre, activo: true } }), { status: 201 });
      case 'estadoContrato': return NextResponse.json(await prisma.estadoContrato.create({ data: { nombre, activo: true } }), { status: 201 });
      case 'tipoCobro': return NextResponse.json(await prisma.tipoCobro.create({ data: { nombre, activo: true } }), { status: 201 });
      default: return NextResponse.json({ error: 'Tipo de catálogo no válido' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar elemento' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const body = await request.json();
    const { id, tipo, nombre, minDocentes, maxDocentes, activo } = body;
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    let item;
    const numericId = parseInt(id);
    if (tipo === 'reglaTamano') {
      const minNuevo = parseInt(minDocentes);
      const maxNuevo = parseInt(maxDocentes);
      const reglasActuales = await prisma.reglaTamano.findMany({
        where: { id: { not: numericId } }
      });
      const hayChoque = reglasActuales.some(regla => {
        return (minNuevo <= regla.maxDocentes && maxNuevo >= regla.minDocentes);
      });
      if (hayChoque) {
        return NextResponse.json({ error: 'Rango inválido. Se solapa con otra regla existente.' }, { status: 400 });
      }
      item = await prisma.reglaTamano.update({
        where: { id: numericId },
        data: { minDocentes: minNuevo, maxDocentes: maxNuevo }
      });
      const todasLasReglas = await prisma.reglaTamano.findMany();
      const promesasActualizacion = todasLasReglas.map(regla => {
        return prisma.institution.updateMany({
          where: {
            totalDocentes: {
              gte: regla.minDocentes,
              lte: regla.maxDocentes,
            },
          },
          data: {
            tamano: regla.nombre,
          },
        });
      });
      await Promise.all(promesasActualizacion);
      return NextResponse.json(item);
    }
    if (['estadoComercial', 'estadoCliente', 'estadoContrato', 'tipoCobro'].includes(tipo)) {
      const dataUpdate: any = {};
      if (nombre) dataUpdate.nombre = nombre;
      if (typeof activo === 'boolean') dataUpdate.activo = activo;
      if (tipo === 'estadoComercial') item = await prisma.estadoComercial.update({ where: { id: numericId }, data: dataUpdate });
      if (tipo === 'estadoCliente') item = await prisma.estadoCliente.update({ where: { id: numericId }, data: dataUpdate });
      if (tipo === 'estadoContrato') item = await prisma.estadoContrato.update({ where: { id: numericId }, data: dataUpdate });
      if (tipo === 'tipoCobro') item = await prisma.tipoCobro.update({ where: { id: numericId }, data: dataUpdate });
      return NextResponse.json(item);
    }
    const data = { nombre };
    switch (tipo) {
      case 'provincia': item = await prisma.provincia.update({ where: { id: numericId }, data }); break;
      case 'canton': item = await prisma.canton.update({ where: { id: numericId }, data }); break;
      case 'parroquia': item = await prisma.parroquia.update({ where: { id: numericId }, data }); break;
      case 'nivel': item = await prisma.nivelEducativo.update({ where: { id: numericId }, data }); break;
      case 'area': item = await prisma.areaEducativa.update({ where: { id: numericId }, data }); break;
      case 'regimen': item = await prisma.regimenEscolar.update({ where: { id: numericId }, data }); break;
      case 'jurisdiccion': item = await prisma.jurisdiccion.update({ where: { id: numericId }, data }); break;
      case 'modalidad': item = await prisma.modalidadEducativa.update({ where: { id: numericId }, data }); break;
      case 'acceso': item = await prisma.accesoEdificio.update({ where: { id: numericId }, data }); break;
      case 'sostenimiento': item = await prisma.sostenimiento.update({ where: { id: numericId }, data }); break;
      case 'jornada': item = await prisma.jornada.update({ where: { id: numericId }, data }); break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar elemento' }, { status: 500 });
  }
}