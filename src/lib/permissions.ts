export type PermissionSession = { rol: string; permisos: string[] };
const modulePermissions = (modulo: string, prefix: string, actions: [string, string][]) => ({ modulo, permisos: actions.map(([action, label]) => ({ id: `${prefix}:${action}`, label })) });
export const PERMISSION_MODULES = [
  modulePermissions("Inicio", "inicio", [["ver", "Ver panel principal"]]),
  modulePermissions("Instituciones", "instituciones", [["ver", "Ver instituciones"], ["crear", "Crear instituciones"], ["editar", "Editar instituciones"], ["eliminar", "Eliminar instituciones"], ["gestionar_asignaciones", "Asignar vendedores y armar rutas"]]),
  modulePermissions("Agenda", "agenda", [["ver", "Ver agenda"], ["crear", "Agendar visitas"], ["registrar_visita", "Registrar visita / visita libre"], ["asignar", "Armar rutas masivas"]]),
  modulePermissions("Seguimientos", "visitas", [["ver", "Ver seguimientos y GPS"], ["exportar", "Exportar seguimientos"], ["autorizar_fecha", "Autorizar corrección de fecha"], ["editar_fecha", "Corregir fecha autorizada"]]),
  modulePermissions("Ventas", "ventas", [["ver", "Ver ventas"], ["crear", "Crear contratos / ventas"], ["editar", "Editar ventas"], ["validar", "Auditar facturación"], ["validar_masivo", "Auditar ventas mediante Excel"], ["exportar", "Exportar ventas"]]),
  modulePermissions("Base de clientes", "base_consultas", [["ver", "Consultar clientes"], ["crear", "Crear / importar clientes"], ["editar", "Editar clientes"]]),
  modulePermissions("Indicadores", "indicadores", [["ver", "Ver indicadores"], ["editar_metas", "Definir y editar metas"], ["exportar", "Exportar indicadores"]]),
  modulePermissions("Cobranzas", "cobranzas", [["ver", "Ver cobranzas"], ["crear_ticket", "Crear gestión / ticket de cobranza"]]),
  modulePermissions("Catálogo SKU", "skus", [["ver", "Ver catálogo"], ["crear", "Crear códigos"], ["editar", "Editar códigos y características"], ["importar", "Importar catálogo"], ["activar", "Activar / desactivar códigos"], ["gestionar", "Administrar catálogo (permiso anterior)"]]),
  modulePermissions("Pedidos", "pedidos", [["ver", "Ver pedidos"], ["crear", "Crear pedidos"], ["editar", "Editar pedidos"], ["eliminar", "Eliminar pedidos"], ["enviar", "Enviar a Operaciones"], ["recibir", "Confirmar recepción"], ["desbloquear_recepcion", "Desbloquear recepción"], ["cambiar_produccion", "Modificar prendas en producción"]]),
  modulePermissions("Operaciones", "operaciones", [["ver", "Ver Operaciones"], ["editar", "Cambiar estados y observaciones"], ["asignar_stock", "Distribuir stock y enviar a producción"], ["cambiar_fecha", "Reprogramar fecha de entrega"]]),
  modulePermissions("Producción", "produccion", [["ver", "Ver taller"], ["editar", "Cambiar estado de taller"], ["cambiar_prenda", "Cambiar prendas con motivo"], ["asignar", "Reasignar operario responsable"], ["despachar", "Enviar a empaque / despacho"]]),
  modulePermissions("Empaque y guías", "empaque", [["ver", "Ver empaque"], ["editar", "Gestionar empaque"], ["despachar", "Generar guía de despacho"], ["anular", "Anular guía / despacho"]]),
  modulePermissions("Historial de despachos", "historial-despachos", [["ver", "Ver guías"], ["exportar", "Imprimir / exportar guías"]]),
  { modulo: "Tickets", permisos: [...modulePermissions("", "tickets", [["ver", "Ver tickets propios y asignados"], ["crear", "Crear tickets"], ["responder", "Responder tickets"], ["resolver", "Cambiar estado / resolver tickets"], ["cerrar", "Cerrar tickets propios"], ["reabrir", "Reabrir tickets"], ["eliminar_adjunto", "Eliminar adjuntos"], ["mantenimiento", "Limpiar adjuntos antiguos"]]).permisos, { id: "ver_todos_tickets", label: "Ver tickets de todas las áreas" }] },
  modulePermissions("Usuarios", "usuarios", [["ver", "Ver usuarios"], ["crear", "Crear usuarios"], ["editar", "Editar usuarios y asignar roles"], ["seguridad", "Bloquear / desbloquear usuarios"], ["gestionar", "Administrar usuarios (permiso anterior)"]]),
  modulePermissions("Roles y permisos", "roles", [["ver", "Ver roles"], ["crear", "Crear roles"], ["editar", "Editar permisos de roles"]]),
  modulePermissions("Configuración", "configuracion", [["ver", "Ver configuración"], ["crear", "Crear catálogos / departamentos"], ["editar", "Editar catálogos"], ["seguridad", "Configurar seguridad de acceso"]]),
];
export const PERMISSION_IDS = new Set(PERMISSION_MODULES.flatMap(m => m.permisos.map(p => p.id)));
export function can(session: PermissionSession | null | undefined, permission: string) {
  return !!session && (session.rol === "super_admin" || session.permisos.includes(permission));
}
export const PAGE_PERMISSIONS: Record<string, string> = {
  "/configuracion/skus": "skus:ver", "/instituciones": "instituciones:ver", "/base_consultas": "base_consultas:ver",
  "/historial-despachos": "historial-despachos:ver", "/seguimientos": "visitas:ver", "/visitas": "visitas:ver", "/ventas": "ventas:ver", "/agenda": "agenda:ver", "/indicadores": "indicadores:ver", "/cobranzas": "cobranzas:ver", "/pedidos": "pedidos:ver", "/operaciones": "operaciones:ver", "/produccion": "produccion:ver", "/empaque": "empaque:ver", "/tickets": "tickets:ver", "/usuarios": "usuarios:ver", "/roles": "roles:ver", "/configuracion": "configuracion:ver", "/inicio": "inicio:ver",
};
