import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "secret-fallback",
);

const parseId = (val: any) => {
  if (!val) return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
};

const parseMoney = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? 0 : num;
};

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
    const estadoParam = searchParams.get("estado") || "Borrador";
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const institucionIdParam = searchParams.get("institucionId");

    const whereCondition: any = {};

    if (estadoParam === "Borrador") {
      whereCondition.estado = "Borrador";
      if (userRol !== "super_admin") {
        whereCondition.usuarioId = userId;
      }
    } else {
      whereCondition.estado = { not: "Borrador" };
      if (userRol === "vendedor") {
        const vendedorInfo = await prisma.usuario.findUnique({
          where: { id: userId },
          include: { institucionesAsignadas: { select: { id: true } } },
        });
        const misEscuelas =
          vendedorInfo?.institucionesAsignadas.map((i: any) => i.id) || [];

        whereCondition.OR = [
          { usuarioId: userId },
          { institucionId: { in: misEscuelas } },
        ];
      }
    }

    if (institucionIdParam) {
      if (whereCondition.OR) {
        whereCondition.AND = [{ institucionId: institucionIdParam }];
      } else {
        whereCondition.institucionId = institucionIdParam;
      }
    }
    if (fechaInicio || fechaFin) {
      const startStr = fechaInicio
        ? `${fechaInicio}T00:00:00-05:00`
        : "1970-01-01T00:00:00-05:00";
      const endStr = fechaFin
        ? `${fechaFin}T23:59:59.999-05:00`
        : "2099-12-31T23:59:59.999-05:00";
      if (whereCondition.AND) {
        whereCondition.AND.push({
          createdAt: { gte: new Date(startStr), lte: new Date(endStr) },
        });
      } else {
        whereCondition.createdAt = {
          gte: new Date(startStr),
          lte: new Date(endStr),
        };
      }
    }
    const [pedidos, pedidosMaestros] = await Promise.all([
      prisma.pedido.findMany({
        where: whereCondition,
        include: {
          institucion: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          operarioAsignado: { select: { id: true, nombre: true } },
          detalles: {
            include: { usuarioReceptor: { select: { nombre: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pedido.findMany({
        where: { estado: { not: "Borrador" } },
        select: { id: true, institucionId: true, fechaRequerida: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const institucionIds = [
      ...new Set(pedidos.map((p: any) => p.institucionId)),
    ];
    const ventasGuardadas = await prisma.venta.findMany({
      where: { institucionId: { in: institucionIds } },
      select: {
        id: true,
        numContrato: true,
        institucionId: true,
        vendedorId: true,
        valorContrato: true,
        abono: true,
        meses: true,
        mesCobro: true,
        tipoCobroId: true,
        estadoClienteId: true,
        estadoContratoId: true,
        cuotaMensual: true,
        tipoClienteId: true,
        tieneCedula: true,
        numeroCedula: true,
      },
      orderBy: { fechaVenta: "desc" },
    });

    const mapaGrupos = new Map();
    const prioridadEstados = [
      "Pendiente en revision",
      "En produccion",
      "en empaque",
      "Listos para el despacho",
      "Despacho",
    ];

    for (const ped of pedidos as any[]) {
      const instId = ped.institucionId;
      let contratoExtraido = ped.numContrato
        ? String(ped.numContrato).trim()
        : "S/N";
      const fr = ped.fechaRequerida
        ? new Date(ped.fechaRequerida).toISOString().split("T")[0]
        : "sin-fecha";

      // 🔥 REGLA DE AGRUPAMIENTO BLINDADA 🔥
      let grupoKey = instId;
      if (ped.estado !== "Borrador") {
        grupoKey = `${instId}_${fr}`;
      } else {
        grupoKey = `${instId}_${ped.usuarioId}`; // Separa a cada vendedor
      }

      const ventaAsociada = ventasGuardadas.find((v) => {
        const vNum = v.numContrato ? String(v.numContrato).trim() : "S/N";
        return vNum === contratoExtraido && v.institucionId === instId;
      });

      let estadoRealPedido = ped.estado;
      if (ped.estado !== "Borrador") {
        const estPrendas = (ped.detalles || []).map(
          (d: any) => d.estadoOperacion || "Pendiente en revision",
        );
        if (estPrendas.length > 0) {
          let estadoMasRetrasado = "Despacho";
          for (const est of estPrendas) {
            if (
              prioridadEstados.indexOf(est) <
              prioridadEstados.indexOf(estadoMasRetrasado)
            ) {
              estadoMasRetrasado = est;
            }
          }
          estadoRealPedido = estadoMasRetrasado;
        }
      }

      let fechaValida = ped.fechaRequerida;
      if (fechaValida && new Date(fechaValida).getFullYear() < 2000)
        fechaValida = null;

      if (!mapaGrupos.has(grupoKey)) {
        const pedidoBase = pedidosMaestros.find((pm: any) => {
          const frPm = pm.fechaRequerida
            ? new Date(pm.fechaRequerida).toISOString().split("T")[0]
            : "sin-fecha";
          return pm.institucionId === instId && frPm === fr;
        });
        const idMaestro = pedidoBase ? pedidoBase.id : ped.id;

        mapaGrupos.set(grupoKey, {
          id: grupoKey,
          institucionId: instId, // Enviado al frontend para el DELETE
          vendedorId: ped.usuarioId, // Enviado al frontend para el PUT/DELETE
          codigoPedido:
            ped.estado === "Borrador"
              ? `PED-${instId.slice(0, 6).toUpperCase()}`
              : `PED-${idMaestro.slice(0, 6).toUpperCase()}`,
          institucionNombre: ped.institucion?.nombre || "Sin Escuela",
          vendedorNombre: ped.usuario?.nombre || "Sistema",
          fechaCreacion: ped.createdAt,
          fechaRequerida: fechaValida,
          contratosTotal: 0,
          paquetesCantidad: 0,
          totalPrendas: 0,
          estado: estadoRealPedido,
          updatedAt: ped.updatedAt,
          pedidosAsociados: [],
        });
      } else {
        const grupo = mapaGrupos.get(grupoKey);
        if (grupo.estado !== "Borrador" && estadoRealPedido !== "Borrador") {
          if (
            prioridadEstados.indexOf(estadoRealPedido) <
            prioridadEstados.indexOf(grupo.estado)
          )
            grupo.estado = estadoRealPedido;
        }
        if (
          fechaValida &&
          (!grupo.fechaRequerida ||
            new Date(fechaValida) > new Date(grupo.fechaRequerida))
        ) {
          grupo.fechaRequerida = fechaValida;
        }
      }

      const grupo = mapaGrupos.get(grupoKey);
      const unidadesEnEstePedido = (ped.detalles || []).reduce(
        (acc: number, item: any) => acc + (item.cantidad || 1),
        0,
      );

      grupo.pedidosAsociados.push({
        id: ped.id,
        numContrato: contratoExtraido,
        nombreCliente:
          ped.nombreCliente || `Cliente Contrato #${contratoExtraido}`,
        tipoPedido: ped.tipoPedido || "Pedido",
        observacion: ped.observacion || "",
        fechaRequerida: fechaValida,
        operarioAsignadoId: ped.operarioAsignadoId || "",
        operarioAsignadoNombre: ped.operarioAsignado?.nombre || "Auto-asignado",
        detalles: (ped.detalles || []).map((d: any) => ({
          ...d,
          entregadoHoy: d.recibidoPorVendedor,
        })),
        totalUnidadesContrato: unidadesEnEstePedido,
        estadoActualizadoOperaciones: estadoRealPedido,
        valorContrato: ventaAsociada?.valorContrato || 0,
        abono: ventaAsociada?.abono || 0,
        cuotaMensual: ventaAsociada?.cuotaMensual || 0,
        meses: ventaAsociada?.meses || 12,
        mesCobro: ventaAsociada?.mesCobro || "Enero",
        tipoCobroId: ventaAsociada?.tipoCobroId || "",
        estadoClienteId: ventaAsociada?.estadoClienteId || "",
        estadoContratoId: ventaAsociada?.estadoContratoId || "",
        tipoClienteId: ventaAsociada?.tipoClienteId || "",
        tieneCedula: ventaAsociada?.tieneCedula || false,
        numeroCedula: ventaAsociada?.numeroCedula || "",
      });

      const numContratosEnPedido =
        contratoExtraido !== "S/N"
          ? contratoExtraido.split(",").filter(Boolean).length
          : 1;
      grupo.contratosTotal += numContratosEnPedido;
      grupo.paquetesCantidad += numContratosEnPedido;
      grupo.totalPrendas += unidadesEnEstePedido;
      if (new Date(ped.updatedAt) > new Date(grupo.updatedAt))
        grupo.updatedAt = ped.updatedAt;
    }

    const resultado = Array.from(mapaGrupos.values()).map((g) => ({
      ...g,
      fechaCreacionTexto: new Date(g.fechaCreacion).toLocaleDateString(
        "es-EC",
        { timeZone: "America/Guayaquil" },
      ),
      fechaRequeridaTexto: g.fechaRequerida
        ? new Date(g.fechaRequerida).toLocaleDateString("es-EC", {
            timeZone: "UTC",
          })
        : "No asignada",
      updatedAt: new Date(g.updatedAt).toLocaleString("es-EC", {
        timeZone: "America/Guayaquil",
      }),
    }));

    return NextResponse.json({
      tabla: resultado,
      currentUser: { id: userId, rol: userRol },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al consultar pedidos" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    let userIdFallback = "";
    let userRol = "";

    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userIdFallback = payload.id as string;
      userRol = payload.rol as string;
    }

    const body = await request.json();
    const {
      modo,
      id,
      institucionId,
      detalles,
      numContrato,
      nombreCliente,
      fechaRequerida,
      valorContrato,
      abono,
      cuotaMensual,
      meses,
      mesCobro,
      tipoCobroId,
      estadoClienteId,
      estadoContratoId,
      tipoClienteId,
      tieneCedula,
      numeroCedula,
      observacion,
    } = body;

    if (modo === "recepcion_vendedor") {
      const { prendasIds } = body;
      if (!prendasIds || prendasIds.length === 0)
        return NextResponse.json(
          { error: "No se seleccionaron prendas" },
          { status: 400 },
        );

      await prisma.detallePedido.updateMany({
        where: { id: { in: prendasIds } },
        data: {
          recibidoPorVendedor: true,
          fechaRecepcion: new Date(),
          usuarioReceptorId: userIdFallback,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (modo === "desbloquear_recepcion") {
      const { prendaId } = body;
      if (!userRol.includes("admin"))
        return NextResponse.json(
          { error: "Solo un administrador puede desbloquear esto." },
          { status: 403 },
        );

      await prisma.detallePedido.update({
        where: { id: prendaId },
        data: {
          recibidoPorVendedor: false,
          fechaRecepcion: null,
          usuarioReceptorId: null,
        },
      });
      return NextResponse.json({ success: true });
    }

    const fechaParseada =
      fechaRequerida && fechaRequerida.length > 4
        ? new Date(`${fechaRequerida}T12:00:00Z`)
        : null;

    if (modo === "masivo") {
      // 🔥 Aislamos la acción solo para los borradores de ese vendedor específico
      const whereMasivo: any = { institucionId, estado: "Borrador" };
      if (body.vendedorId) whereMasivo.usuarioId = body.vendedorId;
      else if (userRol === "vendedor") whereMasivo.usuarioId = userIdFallback;

      const pedidosAEnviar = await prisma.pedido.findMany({
        where: whereMasivo,
        include: { institucion: { select: { nombre: true } } },
      });

      if (pedidosAEnviar.length > 0) {
        await prisma.pedido.updateMany({
          where: whereMasivo,
          data: {
            estado: "Pendiente en revisión",
            fechaRequerida: fechaParseada,
          },
        });

        // (Aquí sigue el código del gatillo que hicimos antes para avisar a Operaciones)
        const primerPedido = pedidosAEnviar[0];
        const codigoOP = `PED-${primerPedido.id.slice(0, 6).toUpperCase()}`;
        const nombreEscuela =
          primerPedido.institucion?.nombre || "la institución";

        await prisma.notificacion.create({
          data: {
            titulo: "📦 Nuevo Pedido Recibido",
            mensaje: `El vendedor ha enviado el pedido ${codigoOP} de ${nombreEscuela} para balance de stock.`,
            tipoModulo: "OPERACIONES",
            urlDestino: `/operaciones?pedidoId=${codigoOP}`,
            rolDestino: "admin",
          },
        });
      }
      return NextResponse.json({ success: true });
    } else {
      const pedidoAntiguo = await prisma.pedido.findUnique({ where: { id } });
      const oldNumContrato = pedidoAntiguo?.numContrato
        ? String(pedidoAntiguo.numContrato).trim()
        : "S/N";
      const numContratoLimpio =
        numContrato !== undefined ? String(numContrato).trim() : oldNumContrato;
      const idEscuelaReal = pedidoAntiguo
        ? pedidoAntiguo.institucionId
        : institucionId;
      let vendedorFinalId = pedidoAntiguo?.usuarioId || userIdFallback;
      const dueñoEscuela = await prisma.usuario.findFirst({
        where: { institucionesAsignadas: { some: { id: idEscuelaReal } } },
        select: { id: true },
      });
      if (dueñoEscuela) vendedorFinalId = dueñoEscuela.id;

      if (detalles) {
        await prisma.detallePedido.deleteMany({ where: { pedidoId: id } });
        const updateData: any = {};
        if (numContrato !== undefined)
          updateData.numContrato = numContratoLimpio || null;
        if (nombreCliente !== undefined)
          updateData.nombreCliente = nombreCliente;
        if (fechaRequerida !== undefined)
          updateData.fechaRequerida = fechaParseada;
        if (observacion !== undefined) updateData.observacion = observacion;

        updateData.usuarioId = vendedorFinalId;

        if (
          userRol === "super_admin" &&
          body.operarioAsignadoId !== undefined
        ) {
          updateData.operarioAsignadoId = body.operarioAsignadoId || null;
        }

        if (Array.isArray(detalles) && detalles.length > 0) {
          updateData.detalles = {
            create: detalles.map((d: any) => ({
              skuCodigo: d.skuCodigo || "S/N",
              tipoRopa: d.tipoRopa || "Prenda",
              color: d.color || "",
              genero: d.genero || "UNISEX",
              talla: d.talla || "M",
              cantidad: parseInt(d.cantidad) || 1,
              bordado: d.bordado || null,
              observacion: d.observacion || null,
              estadoOperacion: d.entregadoHoy
                ? "Entregado"
                : "Pendiente en revision",
              recibidoPorVendedor: d.entregadoHoy ? true : false,
              fechaRecepcion: d.entregadoHoy ? new Date() : null,
              usuarioReceptorId: d.entregadoHoy ? vendedorFinalId : null,
            })),
          };
        }
        await prisma.pedido.update({ where: { id }, data: updateData });
      }
      if (pedidoAntiguo) {
        const ventaExistente = await prisma.venta.findFirst({
          where: { institucionId: idEscuelaReal, numContrato: oldNumContrato },
        });

        const ventaData: any = {};
        if (numContrato !== undefined)
          ventaData.numContrato = numContratoLimpio;
        if (valorContrato !== undefined)
          ventaData.valorContrato = parseMoney(valorContrato);
        if (abono !== undefined) ventaData.abono = parseMoney(abono);
        if (cuotaMensual !== undefined)
          ventaData.cuotaMensual = parseMoney(cuotaMensual);
        if (meses !== undefined) ventaData.meses = parseInt(meses) || 12;
        if (mesCobro !== undefined) ventaData.mesCobro = String(mesCobro);
        if (tipoCobroId) ventaData.tipoCobroId = parseId(tipoCobroId);
        if (estadoClienteId)
          ventaData.estadoClienteId = parseId(estadoClienteId);
        if (estadoContratoId)
          ventaData.estadoContratoId = parseId(estadoContratoId);
        if (tipoClienteId) ventaData.tipoClienteId = parseId(tipoClienteId);
        if (tieneCedula !== undefined)
          ventaData.tieneCedula = Boolean(tieneCedula);
        if (numeroCedula !== undefined)
          ventaData.numeroCedula = numeroCedula
            ? String(numeroCedula).trim()
            : null;
        ventaData.vendedorId = vendedorFinalId;

        if (ventaExistente) {
          await prisma.venta.update({
            where: { id: ventaExistente.id },
            data: ventaData,
          });
        } else {
          await prisma.venta.create({
            data: {
              institucionId: idEscuelaReal,
              vendedorId: vendedorFinalId,
              fechaVenta: new Date(),
              numContrato: numContratoLimpio,
              valorContrato: parseMoney(valorContrato),
              abono: parseMoney(abono),
              cuotaMensual: parseMoney(cuotaMensual),
              meses: parseInt(meses) || 12,
              mesCobro: mesCobro ? String(mesCobro) : "Enero",
              tipoCobroId: parseId(tipoCobroId),
              estadoClienteId: parseId(estadoClienteId),
              estadoContratoId: parseId(estadoContratoId),
            },
          });
        }
      }
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    const { payload } = await jwtVerify(token!, JWT_SECRET);
    const userId = payload.id as string;
    const userRol = payload.rol as string;
    const body = await request.json();
    const fechaParseada =
      body.fechaRequerida && body.fechaRequerida.length > 4
        ? new Date(`${body.fechaRequerida}T12:00:00Z`)
        : null;
    const numContratoLimpio = body.numContrato
      ? String(body.numContrato).trim()
      : "S/N";

    let vendedorFinalId = userId;
    const dueñoEscuela = await prisma.usuario.findFirst({
      where: { institucionesAsignadas: { some: { id: body.institucionId } } },
      select: { id: true },
    });

    if (dueñoEscuela) {
      vendedorFinalId = dueñoEscuela.id;
    }
    let isElectro = false;
    if (body.estadoClienteId) {
      const estadoCli = await prisma.estadoCliente.findUnique({
        where: { id: parseId(body.estadoClienteId) || 0 },
      });
      if (estadoCli?.nombre?.toLowerCase().includes("electro"))
        isElectro = true;
    }
    const tipoLogistica = isElectro ? "ELECTRO" : "TEXTIL";
    const configSeguridad = await prisma.configuracionSeguridad.findUnique({
      where: { id: 1 },
    });
    const jefeElectro = configSeguridad?.encargadoBodegaElectroId || userId;
    const jefeTextil = configSeguridad?.encargadoBodegaTextilId || userId;
    let operarioDefinitivo = isElectro ? jefeElectro : jefeTextil;
    if (userRol === "super_admin" && body.operarioAsignadoId) {
      operarioDefinitivo = body.operarioAsignadoId;
    }
    const nuevoPedido = await prisma.pedido.create({
      data: {
        institucionId: body.institucionId,
        usuarioId: vendedorFinalId,
        operarioAsignadoId: operarioDefinitivo,
        tipoPedido: tipoLogistica,
        numContrato: body.numContrato || null,
        nombreCliente: body.nombreCliente || `Cliente`,
        fechaRequerida: fechaParseada,
        detalles: {
          create: (body.detalles || []).map((d: any) => ({
            skuCodigo: d.skuCodigo || "S/N",
            tipoRopa: d.tipoRopa || "Prenda",
            color: d.color || "",
            genero: d.genero || "UNISEX",
            talla: d.talla || "M",
            cantidad: parseInt(d.cantidad) || 1,
            bordado: d.bordado || null,
            observacion: d.observacion || null,
            estadoOperacion: d.entregadoHoy
              ? "Entregado"
              : "Pendiente en revision",
            recibidoPorVendedor: d.entregadoHoy ? true : false,
            fechaRecepcion: d.entregadoHoy ? new Date() : null,
            usuarioReceptorId: d.entregadoHoy ? vendedorFinalId : null,
          })),
        },
      },
    });
    await prisma.venta.create({
      data: {
        institucionId: body.institucionId,
        vendedorId: vendedorFinalId,
        numContrato: numContratoLimpio,
        fechaVenta: new Date(),
        valorContrato: parseMoney(body.valorContrato),
        abono: parseMoney(body.abono),
        cuotaMensual: parseMoney(body.cuotaMensual),
        meses: parseInt(body.meses) || 12,
        mesCobro: body.mesCobro ? String(body.mesCobro) : "Enero",
        tipoCobroId: parseId(body.tipoCobroId),
        estadoClienteId: parseId(body.estadoClienteId),
        estadoContratoId: parseId(body.estadoContratoId),
        tieneCedula: Boolean(body.tieneCedula),
        numeroCedula: body.numeroCedula
          ? String(body.numeroCedula).trim()
          : null,
      },
    });
    return NextResponse.json(nuevoPedido);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRol = payload.rol as string;
    const userId = payload.id as string;
    const { searchParams } = new URL(request.url);

    const institucionId =
      searchParams.get("institucionId") || searchParams.get("id");
    const vendedorId = searchParams.get("vendedorId");
    if (!institucionId) {
      return NextResponse.json(
        { error: "Falta ID para eliminar" },
        { status: 400 },
      );
    }
    await prisma.$transaction(async (tx) => {
      const whereClause: any = { institucionId, estado: "Borrador" };
      if (userRol === "vendedor") whereClause.usuarioId = userId;
      else if (vendedorId) whereClause.usuarioId = vendedorId;
      const pedidosABorrar = await tx.pedido.findMany({ where: whereClause });
      if (pedidosABorrar.length === 0) {
        throw new Error("No hay borradores para eliminar.");
      }
      for (const pedido of pedidosABorrar) {
        const ventaAsociada = await tx.venta.findFirst({
          where: {
            institucionId: pedido.institucionId,
            numContrato: pedido.numContrato || "S/N",
            vendedorId: pedido.usuarioId,
            estadoTicket: "Pendiente Facturación",
          },
        });
        await tx.pedido.delete({ where: { id: pedido.id } });
        if (ventaAsociada) {
          await tx.venta.delete({ where: { id: ventaAsociada.id } });
          if (ventaAsociada.visitaId) {
            const ventasRestantes = await tx.venta.count({
              where: { visitaId: ventaAsociada.visitaId },
            });
            if (ventasRestantes === 0) {
              const visita = await tx.visitaAgenda.findUnique({
                where: { id: ventaAsociada.visitaId },
              });
              if (visita) {
                if (visita.esVisitaLibre) {
                  await tx.visitaAgenda.delete({ where: { id: visita.id } });
                } else {
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const fechaProg = new Date(visita.fechaProgramada);
                  fechaProg.setHours(0, 0, 0, 0);
                  const nuevoEstado = fechaProg < hoy ? "Vencida" : "Pendiente";
                  await tx.visitaAgenda.update({
                    where: { id: visita.id },
                    data: { estadoGestion: nuevoEstado, resumenAcuerdos: null },
                  });
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Borradores eliminados.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar." },
      { status: 500 },
    );
  }
}
