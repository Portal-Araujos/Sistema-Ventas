import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request, context: any) {
  try {
    // 🔥 ACTUALIZACIÓN: En Next.js moderno, params debe desenvolverse (await)
    const params = await context.params;
    const filename = params.filename;

    const filePath = path.join(process.cwd(), "storage/uploads", filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Archivo no encontrado", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".pdf") contentType = "application/pdf";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    // 🔥 AHORA SÍ VEREMOS EL ERROR REAL EN PM2
    console.error("🚨 ERROR LEYENDO IMAGEN DESDE STORAGE:", error);
    return new NextResponse("Error interno al leer archivo", { status: 500 });
  }
}
