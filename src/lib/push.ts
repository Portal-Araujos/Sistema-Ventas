import * as webpush from "web-push";
import prisma from "@/lib/prisma";

const modulePermissions: Record<string, string> = {
  TICKETS: "tickets:ver", PEDIDOS: "pedidos:ver", OPERACIONES: "operaciones:ver",
  PRODUCCION: "produccion:ver", EMPAQUE: "empaque:ver", AGENDA: "agenda:ver",
};

/** Enviar únicamente después de que la transacción que creó la alerta haya terminado. */
export async function enviarPushNotificaciones(ids: number[]) {
  if (process.env.PUSH_ENABLED !== "true" || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !ids.length) return;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const notificaciones = await prisma.notificacion.findMany({ where: { id: { in: ids }, leido: false }, include: { usuarioDestino: { select: { departamentoId: true } } } });
    const dispositivos = await prisma.suscripcionPush.findMany({ include: { usuario: { include: { rol: true } } } });
    const envios: Array<() => Promise<void>> = [];
    for (const notificacion of notificaciones) {
      const permiso = modulePermissions[notificacion.tipoModulo];
      if (!permiso) continue;
      for (const dispositivo of dispositivos) {
        const usuario = dispositivo.usuario;
        if (!usuario.activo || usuario.bloqueado || !usuario.tokenSesionActual) continue;
        let permisos: unknown;
        try { permisos = JSON.parse(usuario.rol.permisos || "[]"); } catch { continue; }
        if (usuario.rol.nombre !== "super_admin" && (!Array.isArray(permisos) || !permisos.includes(permiso))) continue;
        const destinatario = usuario.id === notificacion.usuarioDestinoId || usuario.rol.nombre === notificacion.rolDestino || (notificacion.rolDestino === "admin" && ["administrador", "super_admin"].includes(usuario.rol.nombre)) || (notificacion.tipoModulo !== "TICKETS" && usuario.esJefe && usuario.departamentoId && usuario.departamentoId === notificacion.usuarioDestino?.departamentoId);
        if (!destinatario) continue;
        envios.push(async () => { try {
          const destino = notificacion.urlDestino;
          const url = destino && destino.startsWith("/") && !destino.startsWith("//") && !destino.includes("\\") ? destino : "/";
          await webpush.sendNotification({ endpoint: dispositivo.endpoint, keys: { p256dh: dispositivo.p256dh, auth: dispositivo.auth } }, JSON.stringify({ title: notificacion.titulo.slice(0, 120), body: notificacion.mensaje.slice(0, 240), tag: `notificacion-${notificacion.id}`, url }), { TTL: 86400, timeout: 5000 });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await prisma.suscripcionPush.deleteMany({ where: { id: dispositivo.id } });
          else console.error("No se pudo enviar una notificación push", status);
        } });
      }
    }
    for (let i = 0; i < envios.length; i += 10) await Promise.all(envios.slice(i, i + 10).map(enviar => enviar()));
  } catch (error) { console.error("Error en envío de notificaciones push", error); }
}
