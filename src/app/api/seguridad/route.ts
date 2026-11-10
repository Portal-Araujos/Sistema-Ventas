import { getApiSession, hasPermission } from "@/lib/api-auth";
import { getJwtSecret } from "@/lib/jwt";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

async function isSuperAdmin() {
  const session = await getApiSession();
  return !!session && hasPermission(session, "configuracion:seguridad");
}

export async function GET() {
  if (!(await isSuperAdmin()))
    return NextResponse.json({ error: "Acceso Denegado" }, { status: 403 });
  const haceTresMeses = new Date();
  haceTresMeses.setMonth(haceTresMeses.getMonth() - 3);
  await prisma.bitacoraSeguridad.deleteMany({
    where: { createdAt: { lt: haceTresMeses } },
  });
  const config = await prisma.configuracionSeguridad.findUnique({
    where: { id: 1 },
  });
  const logs = await prisma.bitacoraSeguridad.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    config: config || { ipOficina: "", rolesBloqueados: "[]" },
    logs,
  });
}
export async function PUT(request: Request) {
  if (!(await isSuperAdmin()))
    return NextResponse.json({ error: "Acceso Denegado" }, { status: 403 });
  const { ipOficina, rolesBloqueados } = await request.json();
  const config = await prisma.configuracionSeguridad.upsert({
    where: { id: 1 },
    update: { ipOficina, rolesBloqueados: JSON.stringify(rolesBloqueados) },
    create: {
      id: 1,
      ipOficina,
      rolesBloqueados: JSON.stringify(rolesBloqueados),
    },
  });

  return NextResponse.json({ success: true, config });
}
