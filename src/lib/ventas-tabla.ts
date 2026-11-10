type Auditoria = { verificacionFact?: string | null; observacionesFact?: string | null };
export function tarjetaVenta(venta: Auditoria): "Aprobadas" | "Novedades" | "Pendientes" {
  const auditoria = venta.verificacionFact?.trim() || "";
  if (auditoria && auditoria.toLowerCase() !== "sin validar") return "Aprobadas";
  const observacion = venta.observacionesFact?.trim() || "";
  return observacion && observacion.toLowerCase() !== "sin observaciones" ? "Novedades" : "Pendientes";
}

export function compararVentas(a: Record<string, unknown>, b: Record<string, unknown>, key: string, direction: "asc" | "desc") {
  const value = (v: Record<string, unknown>) => {
    if (key === "prendas") return Array.isArray(v.prendas) ? v.prendas.length : 0;
    if (key === "mesCobro") return ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].indexOf(String(v.mesCobro));
    return v[key] ?? "";
  };
  const av = value(a), bv = value(b);
  const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "es", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}
