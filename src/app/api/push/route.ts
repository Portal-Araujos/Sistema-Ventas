import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getApiSession, unauthorizedResponse } from "@/lib/api-auth";

export async function GET() {
  if (!await getApiSession()) return unauthorizedResponse();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (process.env.PUSH_ENABLED !== "true" || !publicKey || !process.env.VAPID_PRIVATE_KEY) return NextResponse.json({ error: "Push no está disponible todavía" }, { status: 503 });
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  try {
    const data = await request.json();
    const url = new URL(data.endpoint);
    const hosts = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns.windows.com", "notify.windows.com"];
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) || typeof data.keys?.p256dh !== "string" || typeof data.keys?.auth !== "string" || data.endpoint.length > 2048 || data.keys.p256dh.length > 256 || data.keys.auth.length > 256) {
      return NextResponse.json({ error: "El servicio de notificaciones de este navegador no está admitido o la suscripción es inválida." }, { status: 400 });
    }
    await prisma.suscripcionPush.upsert({ where: { endpoint: data.endpoint }, create: { usuarioId: session.id, endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth }, update: { usuarioId: session.id, p256dh: data.keys.p256dh, auth: data.keys.auth } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al registrar la suscripción push:", error instanceof Error ? error.name : "Error desconocido");
    return NextResponse.json({ error: "No se pudo guardar la suscripción. Inténtalo de nuevo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getApiSession();
  if (!session) return unauthorizedResponse();
  const data = await request.json();
  if (typeof data.endpoint !== "string") return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  await prisma.suscripcionPush.deleteMany({ where: { usuarioId: session.id, endpoint: data.endpoint } });
  return NextResponse.json({ success: true });
}
