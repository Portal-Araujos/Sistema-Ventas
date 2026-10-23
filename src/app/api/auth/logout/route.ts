import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getApiSession();
    if (session) {
      await prisma.usuario.updateMany({
        where: {
          id: session.id,
          tokenSesionActual: session.sessionId,
        },
        data: { tokenSesionActual: null },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada correctamente",
    });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      expires: new Date(0),
      path: "/",
    };
    response.cookies.set("session_token", "", cookieOptions);
    response.cookies.set("last_activity", "", cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 },
    );
  }
}
