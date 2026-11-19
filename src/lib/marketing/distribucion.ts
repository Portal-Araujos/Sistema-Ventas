import { claveCliente, claveUbicacion, claveVendedor } from "./normalize";
import {
  VENDEDORES_ACTUALES,
  esVendedorActual,
  esVendedorAnterior,
  nombreVendedorActual,
} from "./vendedores";
import type {
  ClienteDistribuido,
  ClienteRow,
  ResultadoDistribucion,
} from "./types";

const ORDEN: readonly string[] = VENDEDORES_ACTUALES;

export function prepararCliente(
  fila: ClienteRow,
  vendedorAsignado: string = fila.vendedor,
): ClienteDistribuido {
  const vendedorOriginal = fila.vendedor;
  return {
    ...fila,
    claveCliente: claveCliente(fila.identificacion, fila.nombreCliente, fila.movil),
    claveVendedor: claveVendedor(vendedorOriginal),
    provinciaKey: claveUbicacion(fila.provincia),
    ciudadKey: claveUbicacion(fila.ciudad),
    vendedorOriginal,
    vendedorAsignado,
  };
}

export function redistribuirClientes(filas: ClienteRow[]): ResultadoDistribucion {
  const base = filas.map((fila) => prepararCliente(fila));
  const original = base.map((fila) => ({ ...fila }));
  const actuales = base.filter((fila) => esVendedorActual(fila.claveVendedor));
  const anteriores = base.filter((fila) => esVendedorAnterior(fila.claveVendedor));

  // Presencia: clientes distintos por vendedor y ubicación, solo carteras actuales.
  const presenciaCiudad = new Map<string, number>();
  const vistosCiudad = new Set<string>();
  for (const fila of actuales) {
    if (!fila.ciudadKey) continue;
    const visto = `${fila.claveCliente}|${fila.claveVendedor}|${fila.provinciaKey}|${fila.ciudadKey}`;
    if (vistosCiudad.has(visto)) continue;
    vistosCiudad.add(visto);
    const clave = `${fila.provinciaKey}|${fila.ciudadKey}|${fila.claveVendedor}`;
    presenciaCiudad.set(clave, (presenciaCiudad.get(clave) ?? 0) + 1);
  }

  const presenciaProvincia = new Map<string, number>();
  const vistosProvincia = new Set<string>();
  for (const fila of actuales) {
    if (!fila.provinciaKey) continue;
    const visto = `${fila.claveCliente}|${fila.claveVendedor}|${fila.provinciaKey}`;
    if (vistosProvincia.has(visto)) continue;
    vistosProvincia.add(visto);
    const clave = `${fila.provinciaKey}|${fila.claveVendedor}`;
    presenciaProvincia.set(clave, (presenciaProvincia.get(clave) ?? 0) + 1);
  }

  const grupos = new Map<string, ClienteDistribuido[]>();
  for (const fila of anteriores) {
    const grupo = grupos.get(fila.claveCliente) ?? [];
    grupo.push(fila);
    grupos.set(fila.claveCliente, grupo);
  }

  const asignacionesCiudad = new Map<string, number>();
  const asignacionesProvincia = new Map<string, number>();
  const aplicado: ClienteDistribuido[] = actuales.map((fila) => ({ ...fila }));
  let nuevasRelaciones = 0;
  let yaEstabanAsignados = 0;
  let pendientesRevision = 0;

  for (const claveClienteGrupo of [...grupos.keys()].sort()) {
    const grupo = grupos.get(claveClienteGrupo)!;
    const conUbicacion = grupo.filter(
      (fila) => fila.provinciaKey || fila.ciudadKey,
    );
    let provinciaKey = "";
    let ciudadKey = "";
    let muestra = grupo[0];

    if (conUbicacion.length) {
      const conteos = new Map<string, { c: number; n: number }>();
      for (const fila of conUbicacion) {
        const clave = `${fila.provinciaKey}|${fila.ciudadKey}`;
        const actual = conteos.get(clave) ?? { c: 0, n: 0 };
        actual.n += 1;
        if (actual.c === 0) actual.c = conteos.size + 1;
        conteos.set(clave, actual);
      }
      let mejor: { clave: string; n: number } | null = null;
      for (const [clave, dato] of conteos) {
        if (!mejor || dato.n > mejor.n) mejor = { clave, n: dato.n };
      }
      if (mejor) {
        [provinciaKey, ciudadKey] = mejor.clave.split("|");
        muestra =
          conUbicacion.find(
            (fila) =>
              fila.provinciaKey === provinciaKey && fila.ciudadKey === ciudadKey,
          ) ?? grupo[0];
      }
    }

    const porCiudad = ORDEN.map((nombre) => ({
      nombre,
      clave: claveVendedor(nombre),
      cantidad: ciudadKey
        ? (presenciaCiudad.get(`${provinciaKey}|${ciudadKey}|${claveVendedor(nombre)}`) ?? 0)
        : 0,
    }));
    const maxCiudad = Math.max(0, ...porCiudad.map((v) => v.cantidad));
    let elegido = "";

    if (maxCiudad > 0) {
      const empatados = porCiudad.filter((v) => v.cantidad === maxCiudad);
      const region = `${provinciaKey}|${ciudadKey}`;
      const ganador = empatados.reduce((mejor, actual) => {
        const asignadasActual = asignacionesCiudad.get(`${region}|${actual.clave}`) ?? 0;
        const asignadasMejor = asignacionesCiudad.get(`${region}|${mejor.clave}`) ?? 0;
        if (asignadasActual !== asignadasMejor)
          return asignadasActual < asignadasMejor ? actual : mejor;
        return ORDEN.indexOf(actual.nombre) < ORDEN.indexOf(mejor.nombre)
          ? actual
          : mejor;
      });
      const claveAsignacion = `${region}|${ganador.clave}`;
      asignacionesCiudad.set(
        claveAsignacion,
        (asignacionesCiudad.get(claveAsignacion) ?? 0) + 1,
      );
      elegido = ganador.nombre;
    } else {
      const porProvincia = ORDEN.map((nombre) => ({
        nombre,
        clave: claveVendedor(nombre),
        cantidad: provinciaKey
          ? (presenciaProvincia.get(`${provinciaKey}|${claveVendedor(nombre)}`) ?? 0)
          : 0,
      }));
      const maxProvincia = Math.max(0, ...porProvincia.map((v) => v.cantidad));
      if (maxProvincia > 0) {
        const empatados = porProvincia.filter((v) => v.cantidad === maxProvincia);
        const ganador = empatados.reduce((mejor, actual) => {
          const asignadasActual = asignacionesProvincia.get(`${provinciaKey}|${actual.clave}`) ?? 0;
          const asignadasMejor = asignacionesProvincia.get(`${provinciaKey}|${mejor.clave}`) ?? 0;
          if (asignadasActual !== asignadasMejor)
            return asignadasActual < asignadasMejor ? actual : mejor;
          return ORDEN.indexOf(actual.nombre) < ORDEN.indexOf(mejor.nombre)
            ? actual
            : mejor;
        });
        const claveAsignacion = `${provinciaKey}|${ganador.clave}`;
        asignacionesProvincia.set(
          claveAsignacion,
          (asignacionesProvincia.get(claveAsignacion) ?? 0) + 1,
        );
        elegido = ganador.nombre;
      }
    }

    const vendedoresYa = new Set(
      actuales
        .filter((fila) => fila.claveCliente === claveClienteGrupo)
        .map((fila) => nombreVendedorActual(fila.claveVendedor))
        .filter(Boolean),
    );

    if (!elegido) {
      pendientesRevision += 1;
      aplicado.push({ ...muestra, vendedorAsignado: muestra.vendedorOriginal });
    } else if (vendedoresYa.has(elegido)) {
      yaEstabanAsignados += 1;
      for (const fila of original) {
        if (fila.claveCliente === claveClienteGrupo) fila.vendedorAsignado = elegido;
      }
    } else {
      nuevasRelaciones += 1;
      aplicado.push({ ...muestra, vendedorAsignado: elegido });
      for (const fila of original) {
        if (fila.claveCliente === claveClienteGrupo) fila.vendedorAsignado = elegido;
      }
    }
  }

  return {
    original,
    aplicado,
    metricas: {
      registrosLeidos: filas.length,
      clientesHistoricos: grupos.size,
      nuevasRelaciones,
      yaEstabanAsignados,
      pendientesRevision,
    },
  };
}
