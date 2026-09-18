import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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
    const fInicio = searchParams.get("fechaInicio");
    const fFin = searchParams.get("fechaFin");
    const cantonId = searchParams.get("cantonId");
    const institucionId = searchParams.get("institucionId");
    const vendedorId = searchParams.get("vendedorId");
    const dateStart = fInicio
      ? new Date(`${fInicio}T00:00:00-05:00`)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const dateEnd = fFin
      ? new Date(`${fFin}T23:59:59.999-05:00`)
      : new Date(new Date().setHours(23, 59, 59, 999));
    const instFilters: any = {};
    if (cantonId) instFilters.parroquia = { cantonId: parseInt(cantonId) };
    const visitaFilters: any = {
      createdAt: { gte: dateStart, lte: dateEnd },
      institucionId: institucionId ? institucionId : undefined,
      institucion: cantonId ? instFilters : undefined,
    };

    if (userRol === "vendedor") {
      visitaFilters.usuarioId = userId;
    } else if (vendedorId) {
      visitaFilters.usuarioId = vendedorId;
    }
    const [visitas, ventas] = await Promise.all([
      prisma.visitaAgenda.findMany({
        where: visitaFilters,
        include: {
          institucion: {
            include: {
              parroquia: {
                include: { canton: { include: { provincia: true } } },
              },
            },
          },
          usuario: { select: { nombre: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.venta.findMany({
        where: {
          fechaVenta: { gte: dateStart, lte: dateEnd },
          vendedorId: userRol === "vendedor" ? userId : vendedorId || undefined,
        },
      }),
    ]);
    const dataConsolidada = visitas.map((v) => {
      const dateVisitaEcuador = new Date(
        new Date(v.createdAt).toLocaleString("en-US", {
          timeZone: "America/Guayaquil",
        }),
      );
      const ventasParaEstaVisita = ventas.filter(
        (venta) => venta.visitaId === v.id,
      );
      const totalVendidoVisita = ventasParaEstaVisita.reduce(
        (sum, vta) => sum + vta.valorContrato,
        0,
      );
      const contratosTexto = ventasParaEstaVisita
        .map((va) => `N° ${va.numContrato}`)
        .join(", ");
      return {
        id: v.id,
        fecha: dateVisitaEcuador.toLocaleDateString("es-EC"),
        hora: dateVisitaEcuador.toLocaleTimeString("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        vendedor: v.usuario.nombre,
        institucion: v.institucion.nombre,
        provincia: v.institucion.parroquia.canton.provincia.nombre,
        canton: v.institucion.parroquia.canton.nombre,
        tipoGestion: v.tipoGestion,
        estadoGestion: v.estadoGestion,
        resumen: v.resumenAcuerdos || "Sin resumen registrado",
        latitud: v.latitud,
        longitud: v.longitud,
        ventasRegistradas: ventasParaEstaVisita.length,
        totalVendido: totalVendidoVisita,
        detallesContratos: contratosTexto || "",
        edicionFechaHabilitada: v.edicionFechaHabilitada,
      };
    });

    return NextResponse.json(dataConsolidada);
  } catch (error) {
    console.error("Error en reporte consolidado:", error);
    return NextResponse.json(
      { error: "Error al generar reporte consolidado" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const body = await request.json();
    const {
      institucionId,
      tipoGestion,
      estadoGestion,
      resumenAcuerdos,
      latitud,
      longitud,
      fechaProgramada,
      horaProgramada,
      fechaProximoContacto,
      horaProximoContacto, // 🔥 AHORA ATRAPAMOS LA HORA
      huboVenta,
      esBorradorVenta,
      ventas,
      institucionIds,
      vendedorId, // 🔥 NUEVA BANDERA esBorradorVenta
    } = body;

    // ASIGNACIONES MASIVAS (VISTA GERENCIAL)
    if (
      institucionIds &&
      Array.isArray(institucionIds) &&
      institucionIds.length > 0
    ) {
      const targetVendedorId = vendedorId || userId;
      const hoyMasivo = new Date();
      const horaDefectoMasivo =
        horaProgramada || hoyMasivo.toTimeString().slice(0, 5);
      const programadaMasiva = fechaProgramada
        ? new Date(`${fechaProgramada}T12:00:00Z`)
        : hoyMasivo;
      const proximoMasivo = fechaProximoContacto
        ? new Date(`${fechaProximoContacto}T12:00:00Z`)
        : null;
      const visitasPromesas = institucionIds.map((id: string) => {
        return prisma.visitaAgenda.create({
          data: {
            institucionId: id,
            usuarioId: targetVendedorId,
            tipoGestion: tipoGestion || "Asignación Masiva",
            estadoGestion: estadoGestion || "Pendiente",
            resumenAcuerdos:
              resumenAcuerdos || "Escuela asignada desde el panel gerencial.",
            latitud: null,
            longitud: null,
            fechaProgramada: programadaMasiva,
            horaProgramada: String(horaDefectoMasivo),
            fechaProximoContacto: proximoMasivo,
            horaProximoContacto: horaProximoContacto || null, // 🔥 GUARDAMOS LA HORA
            esVisitaLibre: false,
          },
        });
      });

      await Promise.all(visitasPromesas);
      await prisma.institution.updateMany({
        where: { id: { in: institucionIds } },
        data: { vendedorId: targetVendedorId },
      });
      return NextResponse.json(
        {
          success: true,
          message: `Se asignaron ${institucionIds.length} escuelas correctamente.`,
        },
        { status: 201 },
      );
    }

    if (!institucionId)
      return NextResponse.json(
        { error: "Falta la institución" },
        { status: 400 },
      );

    // VALIDACIÓN DE NÚMEROS DE CONTRATO (Solo si no es borrador)
    if (
      huboVenta &&
      !esBorradorVenta &&
      Array.isArray(ventas) &&
      ventas.length > 0
    ) {
      const numerosContratos = ventas
        .map((v: any) => String(v.numContrato).trim())
        .filter((n: string) => n && n !== "S/N" && n !== "");
      if (numerosContratos.length > 0) {
        const contratosExistentes = await prisma.venta.findMany({
          where: { numContrato: { in: numerosContratos } },
          select: { numContrato: true },
        });
        if (contratosExistentes.length > 0) {
          const duplicados = contratosExistentes
            .map((c) => c.numContrato)
            .join(", ");
          return NextResponse.json(
            {
              error: `¡Atención! El contrato N° ${duplicados} ya se encuentra registrado.`,
            },
            { status: 400 },
          );
        }
      }
    }

    // CREACIÓN DE LA VISITA AGENDA
    const hoy = new Date();
    const horaDefecto = horaProgramada || hoy.toTimeString().slice(0, 5);
    const fechaProximo = fechaProximoContacto
      ? new Date(`${fechaProximoContacto}T12:00:00Z`)
      : null;

    const nuevaVisita = await prisma.visitaAgenda.create({
      data: {
        institucionId,
        usuarioId: userId,
        tipoGestion,
        estadoGestion,
        resumenAcuerdos,
        latitud,
        longitud,
        fechaProgramada: hoy,
        horaProgramada: String(horaDefecto),
        fechaProximoContacto: fechaProximo,
        horaProximoContacto: horaProximoContacto || null, // 🔥 GUARDAMOS LA HORA EN DB
        esVisitaLibre: true,
      },
    });

    // LÓGICA DE VENTAS
    if (huboVenta) {
      // 🔥 RUTA A: ES UN BORRADOR RÁPIDO 🔥
      if (esBorradorVenta) {
        const codigoBorrador = `BORRADOR-${Date.now().toString().slice(-6)}`;

        // 1. Venta vacía
        await prisma.venta.create({
          data: {
            institucionId,
            vendedorId: userId,
            visitaId: nuevaVisita.id,
            numContrato: codigoBorrador,
            valorContrato: 0,
            abono: 0,
            meses: 1,
            mesCobro: "Enero",
            cuotaMensual: 0,
            estadoTicket: "Borrador", // Estado especial
          },
        });

        // 2. Pedido vacío
        await prisma.pedido.create({
          data: {
            institucionId,
            usuarioId: userId,
            numContrato: codigoBorrador,
            nombreCliente: "Cliente en Borrador",
            estado: "Borrador",
            observacion:
              "Venta registrada rápidamente. Pendiente de llenar datos.",
          },
        });
      }
      // 🔥 RUTA B: ES UNA VENTA COMPLETA Y NORMAL 🔥
      else if (Array.isArray(ventas) && ventas.length > 0) {
        const catalogosCliente = await prisma.estadoCliente.findMany();
        const configSeguridad = await prisma.configuracionSeguridad.findUnique({
          where: { id: 1 },
        });
        const jefeTextil = configSeguridad?.encargadoBodegaTextilId || userId;
        const jefeElectro = configSeguridad?.encargadoBodegaElectroId || userId;

        const transaccionesVentas = ventas.map((v: any) => {
          const valor = parseFloat(v.valorContrato) || 0;
          const abonoVal = parseFloat(v.abono) || 0;
          const m = parseInt(v.meses) || 1;
          const cuota =
            parseFloat(v.cuotaMensual) ||
            parseFloat(((valor - abonoVal) / m).toFixed(2));
          return prisma.venta.create({
            data: {
              institucionId,
              vendedorId: userId,
              visitaId: nuevaVisita.id,
              numContrato: String(v.numContrato).trim(),
              valorContrato: valor,
              abono: abonoVal,
              meses: m,
              mesCobro: v.mesCobro || "Enero",
              cuotaMensual: cuota,
              tipoCobroId: v.tipoCobroId ? parseInt(v.tipoCobroId) : null,
              estadoClienteId: v.estadoClienteId
                ? parseInt(v.estadoClienteId)
                : null,
              estadoContratoId: v.estadoContratoId
                ? parseInt(v.estadoContratoId)
                : null,
              tipoClienteId: v.tipoClienteId ? parseInt(v.tipoClienteId) : null,
              tieneCedula: Boolean(v.tieneCedula),
              estadoTicket: "Pendiente Facturación",
            },
          });
        });
        await Promise.all(transaccionesVentas);

        const transaccionesPedidos = ventas
          .filter((v: any) => {
            const estadoEscogido = catalogosCliente.find(
              (e) =>
                e.id ===
                (v.estadoClienteId ? parseInt(v.estadoClienteId) : null),
            );
            const nombreEstado = estadoEscogido?.nombre?.toLowerCase() || "";
            const isEntregado = nombreEstado.includes("entregado");
            return (
              !isEntregado &&
              ((Array.isArray(v.prendas) && v.prendas.length > 0) ||
                v.nombreCliente)
            );
          })
          .map((v: any) => {
            const numContratoLimpio = String(v.numContrato || "").trim();
            const estadoEscogido = catalogosCliente.find(
              (e) =>
                e.id ===
                (v.estadoClienteId ? parseInt(v.estadoClienteId) : null),
            );
            const nombreEstado = estadoEscogido?.nombre?.toLowerCase() || "";
            const isElectro = nombreEstado.includes("electro");
            const tipoLogistica = isElectro ? "ELECTRO" : "TEXTIL";
            let operarioLogistica = isElectro ? jefeElectro : jefeTextil;
            if (userRol === "super_admin" && body.operarioAsignadoId) {
              operarioLogistica = body.operarioAsignadoId;
            }
            return prisma.pedido.create({
              data: {
                institucionId,
                usuarioId: userId,
                operarioAsignadoId: operarioLogistica,
                tipoPedido: tipoLogistica,
                numContrato: numContratoLimpio || null,
                nombreCliente:
                  v.nombreCliente ||
                  `Cliente Contrato #${numContratoLimpio || "S/N"}`,
                observacion: resumenAcuerdos || null,
                estado: "Borrador",
                detalles: {
                  create: (v.prendas || []).map((p: any) => ({
                    skuCodigo: p.skuCodigo || "S/COD",
                    tipoRopa: p.tipoRopa,
                    color: p.color,
                    genero: p.genero,
                    talla: p.talla,
                    cantidad: parseInt(p.cantidad) || 1,
                    bordado: p.bordado || null,
                    observacion: p.observacion || null,
                  })),
                },
              },
            });
          });
        if (transaccionesPedidos.length > 0) {
          await Promise.all(transaccionesPedidos);
        }
      }
    }

    await prisma.institution.update({
      where: { id: institucionId },
      data: {
        estadoComercial: huboVenta ? "Visitada" : estadoGestion,
        vendedorId: userId,
      },
    });

    return NextResponse.json(nuevaVisita, { status: 201 });
  } catch (error) {
    console.error("Error guardando visita, ventas y pedidos:", error);
    return NextResponse.json(
      { error: "Error interno al registrar la gestión" },
      { status: 500 },
    );
  }
}
