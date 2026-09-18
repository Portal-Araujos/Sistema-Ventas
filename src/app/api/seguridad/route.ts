import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);
async function isSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.rol === "super_admin";
  } catch {
    return false;
  }
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
