import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-fallback');

// Validador rápido de Super Admin
async function isSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.rol === 'super_admin';
  } catch { return false; }
}

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });

  // 🧹 1. LIMPIEZA AUTOMÁTICA (AUTO-VACUUM)
  // Calculamos la fecha exacta de hace 3 meses
  const haceTresMeses = new Date();
  haceTresMeses.setMonth(haceTresMeses.getMonth() - 3);

  // Borramos físicamente de la base de datos todo lo más viejo que 3 meses
  await prisma.bitacoraSeguridad.deleteMany({
    where: { createdAt: { lt: haceTresMeses } }
  });

  // 2. Traemos la configuración y los últimos 300 registros (para la paginación)
  const config = await prisma.configuracionSeguridad.findUnique({ where: { id: 1 } });
  const logs = await prisma.bitacoraSeguridad.findMany({ 
    orderBy: { createdAt: 'desc' }, 
    take: 300 
  });

  return NextResponse.json({ 
    config: config || { ipOficina: '', rolesBloqueados: '[]' }, 
    logs 
  });
}

export async function PUT(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });

  const { ipOficina, rolesBloqueados } = await request.json();
  
  // Guardamos la nueva IP y los roles dinámicamente
  const config = await prisma.configuracionSeguridad.upsert({
    where: { id: 1 },
    update: { ipOficina, rolesBloqueados: JSON.stringify(rolesBloqueados) },
    create: { id: 1, ipOficina, rolesBloqueados: JSON.stringify(rolesBloqueados) }
  });

  return NextResponse.json({ success: true, config });
}