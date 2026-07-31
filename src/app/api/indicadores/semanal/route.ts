import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userId = payload.id as string;

    const { searchParams } = new URL(request.url);
    const fechaLunesStr = searchParams.get('fechaLunes') || getLunesActual();

    // 1. Calcular rango de la semana (Lunes a Domingo)
    const fechaLunes = new Date(`${fechaLunesStr}T00:00:00-05:00`);
    const fechaDomingo = new Date(fechaLunes);
    fechaDomingo.setDate(fechaLunes.getDate() + 6);
    fechaDomingo.setHours(23, 59, 59, 999);

    const semanaAnioKey = fechaLunesStr;

    // 2. Filtro de Vendedores
    const whereUsuarios: any = { activo: true };
    if (userRol === 'vendedor') {
      whereUsuarios.id = userId;
    } else {
      whereUsuarios.rol = { nombre: { in: ['vendedor', 'VENDEDOR', 'Vendedor'] } };
    }

    // 3. Consultar Vendedores, Ventas y Metas
    const [vendedores, ventasSemana, metas] = await Promise.all([
      prisma.usuario.findMany({
        where: whereUsuarios,
        select: { id: true, nombre: true, email: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.venta.findMany({
        where: {
          fechaVenta: { gte: fechaLunes, lte: fechaDomingo },
          vendedorId: userRol === 'vendedor' ? userId : undefined
        }
      }),
      prisma.metaVendedor.findMany({
        where: { semanaAnio: semanaAnioKey }
      })
    ]);

    // 4. LÓGICA DE DOBLE MATEMÁTICA (APROBADAS VS EN TRÁNSITO)
    const reporte = vendedores.map(vend => {
      const ventasVend = ventasSemana.filter(v => v.vendedorId === vend.id);
      
      // Objetos para guardar la suma por día
      const diasReales = { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0 };
      const diasTransito = { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0 };

      ventasVend.forEach(v => {
        const fechaEc = new Date(new Date(v.fechaVenta).toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
        const diaSemana = fechaEc.getDay(); // 0: Dom, 1: Lun...

        // REGLA: ¿Es una venta Real (Aprobada) o En Tránsito (Bloqueada)?
        const esValida = v.verificacionFact && v.verificacionFact !== 'Sin validar';
        const targetObj = esValida ? diasReales : diasTransito;

        if (diaSemana === 1) targetObj.lunes += v.valorContrato;
        else if (diaSemana === 2) targetObj.martes += v.valorContrato;
        else if (diaSemana === 3) targetObj.miercoles += v.valorContrato;
        else if (diaSemana === 4) targetObj.jueves += v.valorContrato;
        else if (diaSemana === 5) targetObj.viernes += v.valorContrato;
        else if (diaSemana === 6) targetObj.sabado += v.valorContrato;
      });

      // Cálculos Matemáticos de la Sábana Real (La que importa para la Meta)
      const cierreSemanal = Object.values(diasReales).reduce((a, b) => a + b, 0);
      const metaObj = metas.find(m => m.vendedorId === vend.id);
      const metaMonto = metaObj ? metaObj.montoMeta : 0;
      const porcentajeCumplido = metaMonto > 0 ? parseFloat(((cierreSemanal / metaMonto) * 100).toFixed(1)) : 0;

      // Cálculo del Tránsito (El Limbo)
      const transitoTotal = Object.values(diasTransito).reduce((a, b) => a + b, 0);

      return {
        vendedorId: vend.id,
        vendedorNombre: vend.nombre,
        diasReales,
        diasTransito,
        cierreSemanal,
        transitoTotal,
        metaMonto,
        porcentajeCumplido
      };
    });

    return NextResponse.json({
      semanaFechaLunes: fechaLunesStr,
      reporte
    });
  } catch (error) {
    console.error("Error en indicador semanal:", error);
    return NextResponse.json({ error: 'Error al generar indicadores' }, { status: 500 });
  }
}

// POST: DEFINIR METAS SEMANALES (Intacto)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.rol !== 'super_admin' && payload.rol !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { fechaLunes, metas } = await request.json(); 
    if (!fechaLunes || !Array.isArray(metas)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const transacciones = metas.map((m: any) =>
      prisma.metaVendedor.upsert({
        where: {
          vendedorId_semanaAnio: {
            vendedorId: m.vendedorId,
            semanaAnio: fechaLunes
          }
        },
        update: { montoMeta: parseFloat(m.montoMeta) || 0 },
        create: {
          vendedorId: m.vendedorId,
          semanaAnio: fechaLunes,
          montoMeta: parseFloat(m.montoMeta) || 0
        }
      })
    );

    await prisma.$transaction(transacciones);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al guardar metas:", error);
    return NextResponse.json({ error: 'Error al guardar metas' }, { status: 500 });
  }
}

function getLunesActual(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const lunes = new Date(d.setDate(diff));
  return lunes.toISOString().split('T')[0];
}