// Shared API authorization is evaluated by the proxy before any handler mutates data.
export async function apiActionPermissions(request: Request): Promise<string[]> {
  const path = new URL(request.url).pathname;
  const method = request.method;
  if (["GET", "HEAD"].includes(method)) {
    const read: Record<string, string[]> = {
      "/api/ventas": ["ventas:ver"], "/api/agenda": ["agenda:ver"], "/api/agenda/dashboard": ["agenda:ver"], "/api/visitas": ["visitas:ver"], "/api/indicadores/semanal": ["indicadores:ver"], "/api/cobranzas/radar": ["cobranzas:ver"], "/api/base-consultas": ["base_consultas:ver"], "/api/operaciones": ["operaciones:ver"], "/api/produccion": ["produccion:ver"], "/api/empaque": ["empaque:ver"], "/api/guias": ["historial-despachos:ver", "empaque:ver"], "/api/tickets": ["tickets:ver"],
    };
    return read[path] || [];
  }
  if (method === "OPTIONS") return [];
  let body: Record<string, unknown> = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try { const parsed = await request.clone().json(); body = Array.isArray(parsed) ? { items: parsed } : parsed || {}; } catch { /* the handler reports malformed input */ }
  }
  if (path === "/api/ventas") return [method === "POST" ? "ventas:crear" : body.numContrato !== undefined ? "ventas:editar" : "ventas:validar"];
  if (path === "/api/ventas/masivo") return ["ventas:validar_masivo"];
  if (path === "/api/agenda") return ["agenda:crear"];
  if (path === "/api/agenda/masiva") return ["agenda:asignar"];
  if (path === "/api/visitas") return ["agenda:registrar_visita"];
  if (path === "/api/visitas/retroactiva") return [method === "PUT" ? "visitas:autorizar_fecha" : "visitas:editar_fecha"];
  if (path === "/api/indicadores/semanal") return ["indicadores:editar_metas"];
  if (path === "/api/cobranzas/radar") return ["cobranzas:crear_ticket"];
  if (path === "/api/base-consultas") return [method === "POST" ? "base_consultas:crear" : "base_consultas:editar"];
  if (["/api/pedidos/sku", "/api/pedidos/electro"].includes(path)) return [method === "POST" ? (body.importacion || Array.isArray(body.skus) && body.skus.length > 1 || Array.isArray(body.equipos) && body.equipos.length > 1 || Array.isArray(body.items) && body.items.length > 1) ? "skus:importar" : "skus:crear" : body.codigo !== undefined ? "skus:editar" : "skus:activar"];
  if (path === "/api/pedidos/cambios") return ["produccion:cambiar_prenda", "pedidos:cambiar_produccion"];
  if (path === "/api/pedidos") return [method === "DELETE" ? "pedidos:eliminar" : method === "POST" ? "pedidos:crear" : body.modo === "masivo" ? "pedidos:enviar" : body.modo === "recepcion_vendedor" ? "pedidos:recibir" : body.modo === "desbloquear_recepcion" ? "pedidos:desbloquear_recepcion" : "pedidos:editar"];
  if (path === "/api/operaciones") return [body.modo === "asignacion_stock" ? "operaciones:asignar_stock" : body.modo === "cambiar_fecha_requerida" ? "operaciones:cambiar_fecha" : "operaciones:editar"];
  if (path === "/api/produccion/asignacion") return ["produccion:ver"];
  if (path === "/api/produccion") return [String(body.modo || "").includes("empaque") ? "produccion:despachar" : "produccion:editar"];
  if (path === "/api/empaque") return [body.modo === "generar_guia" ? "empaque:despachar" : "empaque:editar"];
  if (path === "/api/guias") return ["empaque:anular"];
  if (path === "/api/roles") return [method === "POST" ? "roles:crear" : "roles:editar"];
  if (path === "/api/usuarios") return [method === "POST" ? "usuarios:crear" : "usuarios:editar"];
  if (path === "/api/usuarios/seguridad") return ["usuarios:seguridad"];
  if (path === "/api/usuarios/vendedores") return [method === "POST" ? "usuarios:crear" : "usuarios:editar"];
  if (path === "/api/seguridad") return ["configuracion:seguridad"];
  if (path === "/api/catalogos" || path === "/api/departamentos") return [method === "POST" ? "configuracion:crear" : "configuracion:editar"];
  if (/^\/api\/instituciones(?:\/[^/]+)?$/.test(path)) return [method === "DELETE" ? "instituciones:eliminar" : method === "POST" ? body.accion === "asignar" ? "instituciones:gestionar_asignaciones" : "instituciones:crear" : path === "/api/instituciones" ? "instituciones:gestionar_asignaciones" : "instituciones:editar"];
  return [];
}
