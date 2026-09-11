import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, context: any) {
  try {
    // Obtenemos el nombre del archivo de la URL
    const filename = context.params.filename;
    
    // Buscamos el archivo en nuestra nueva bóveda segura
    const filePath = path.join(process.cwd(), 'storage/uploads', filename);

    // Si el archivo no existe físicamente, devolvemos 404
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    // Leemos el archivo
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determinamos el tipo de contenido básico
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.pdf') contentType = 'application/pdf';

    // Enviamos el archivo al cliente
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Error interno', { status: 500 });
  }
}