import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userId = payload.id as string;
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const provinciaId = searchParams.get("provinciaId");
    const cantonId = searchParams.get("cantonId");
    let vendedorId = searchParams.get("vendedorId");

    if (userRol.toLowerCase() === "vendedor") {
      vendedorId = userId;
    }
    const whereVisitas: any = { estadoGestion: "Realizada" };
    const whereVentas: any = {};
    const wherePrendas: any = { pedido: { estado: { not: "Borrador" } } };

    if (fechaInicio && fechaFin) {
      const start = new Date(`${fechaInicio}T00:00:00-05:00`);
      const end = new Date(`${fechaFin}T23:59:59-05:00`);
      whereVisitas.fechaProgramada = { gte: start, lte: end }; // Corregido a fechaProgramada
      whereVentas.fechaVenta = { gte: start, lte: end };
      wherePrendas.createdAt = { gte: start, lte: end };
    }
    if (vendedorId) {
      whereVisitas.usuarioId = vendedorId; // Corregido a usuarioId
      whereVentas.vendedorId = vendedorId;
      wherePrendas.pedido = { ...wherePrendas.pedido, usuarioId: vendedorId };
    }
    if (provinciaId) {
      whereVisitas.institucion = { provinciaId: parseInt(provinciaId) };
      whereVentas.institucion = { provinciaId: parseInt(provinciaId) };
    }
    const [visitas, ventas] = await Promise.all([
      prisma.visitaAgenda.findMany({
        where: whereVisitas,
        include: { usuario: true },
      }),
      prisma.venta.findMany({
        where: whereVentas,
        include: { vendedor: true, institucion: true },
      }),
    ]);
    const totalVisitas = visitas.length;
    const totalContratos = ventas.length;
    const totalMontoVentas = ventas.reduce((acc, v) => {
      const numStr = String(v.valorContrato || "0").replace(/[^0-9.-]+/g, "");
      const num = parseFloat(numStr);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    const tasaCierre =
      totalVisitas > 0 ? Math.round((totalContratos / totalVisitas) * 100) : 0;
    const prendas = await prisma.detallePedido.findMany({
      where: wherePrendas,
    });
    let enRevision = 0,
      enTaller = 0,
      enEmpaque = 0,
      despachadas = 0;
    prendas.forEach((p) => {
      const est = (p.estadoOperacion || "").toLowerCase();
      if (est.includes("revision")) enRevision += p.cantidad;
      else if (
        est.includes("producci") ||
        est.includes("corte") ||
        est.includes("confeccion")
      )
        enTaller += p.cantidad;
      else if (est.includes("empaque") || est.includes("listos"))
        enEmpaque += p.cantidad;
      else if (est.includes("despacho")) despachadas += p.cantidad;
      else enTaller += p.cantidad;
    });
    const hoy = new Date();
    const prendasAtrasadasRaw = await prisma.detallePedido.findMany({
      where: {
        estadoOperacion: { not: "Despacho" },
        fechaEstimadaConfeccion: { lt: hoy },
      },
    });
    const prendasAtrasadas = prendasAtrasadasRaw.reduce(
      (acc, p) => acc + p.cantidad,
      0,
    );
    const mapVendedores = new Map();
    visitas.forEach((v) => {
      const vId = v.usuarioId;
      if (!mapVendedores.has(vId)) {
        mapVendedores.set(vId, {
          nombre: v.usuario?.nombre?.split(" ")[0] || "Desc.",
          visitas: 0,
          contratos: 0,
          monto: 0,
        });
      }
      mapVendedores.get(vId).visitas += 1;
    });

    ventas.forEach((v) => {
      const vId = v.vendedorId;
      if (!mapVendedores.has(vId)) {
        mapVendedores.set(vId, {
          nombre: v.vendedor?.nombre?.split(" ")[0] || "Desc.",
          visitas: 0,
          contratos: 0,
          monto: 0,
        });
      }
      mapVendedores.get(vId).contratos += 1;
      const num = parseFloat(
        String(v.valorContrato || "0").replace(/[^0-9.-]+/g, ""),
      );
      mapVendedores.get(vId).monto += isNaN(num) ? 0 : num;
    });

    const topVendedores = Array.from(mapVendedores.values())
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
    const ultimasVentas = ventas
      .sort(
        (a, b) =>
          new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime(),
      )
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        escuela: v.institucion?.nombre || "Sin Escuela",
        monto:
          parseFloat(
            String(v.valorContrato || "0").replace(/[^0-9.-]+/g, ""),
          ) || 0,
        vendedor: v.vendedor?.nombre || "Desc.",
        fecha: new Date(v.fechaVenta).toLocaleDateString("es-EC", {
          timeZone: "UTC",
        }),
      }));

    const urgentesRaw = await prisma.pedido.findMany({
      where: {
        estado: { notIn: ["Despachado", "Borrador"] },
        fechaRequerida: { not: null },
      },
      orderBy: { fechaRequerida: "asc" },
      take: 5,
      include: { institucion: true },
    });

    const entregasUrgentes = urgentesRaw.map((u) => ({
      id: u.id,
      codigo: `PED-${u.institucionId.slice(0, 6).toUpperCase()}`,
      escuela: u.institucion?.nombre || "Desconocida",
      fecha: u.fechaRequerida
        ? new Date(u.fechaRequerida).toLocaleDateString("es-EC", {
            timeZone: "UTC",
          })
        : "-",
      estado: u.estado,
    }));

    return NextResponse.json({
      userRol,
      kpis: {
        totalMontoVentas,
        totalContratos,
        totalVisitas,
        tasaCierre,
        enRevision,
        enTaller,
        enEmpaque,
        despachadas,
        prendasAtrasadas,
      },
      graficos: {
        rendimientoVendedores: topVendedores,
        embudoProduccion: [
          { name: "En Revisión", value: enRevision, color: "#F59E0B" },
          { name: "En Taller", value: enTaller, color: "#8B5CF6" },
          { name: "En Empaque", value: enEmpaque, color: "#3B82F6" },
          { name: "Despachado", value: despachadas, color: "#10B981" },
        ].filter((item) => item.value > 0),
      },
      tablas: { ultimasVentas, entregasUrgentes },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al generar stats" },
      { status: 500 },
    );
  }
}
