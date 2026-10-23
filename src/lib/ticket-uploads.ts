import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export class InvalidTicketAttachmentError extends Error {}

function detectAttachmentType(buffer: Buffer): {
  mimeType: string;
  extension: string;
} | null {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { mimeType: "application/pdf", extension: ".pdf" };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { mimeType: "image/png", extension: ".png" };
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    return { mimeType: "image/jpeg", extension: ".jpg" };
  }
  if (
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a"
  ) {
    return { mimeType: "image/gif", extension: ".gif" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: ".webp" };
  }
  
  // 🔥 NUEVO: Cabeceras para Archivos de Audio 🔥
  // Cabecera estándar de WebM / Matroska (Audios del Navegador)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
  ) {
    return { mimeType: "audio/webm", extension: ".webm" };
  }

  // Cabecera estándar para MP3 (ID3 o sync word)
  if (
    buffer.length >= 3 &&
    (buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0))
  ) {
    return { mimeType: "audio/mpeg", extension: ".mp3" };
  }

  // Cabecera estándar para OGG
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).toString("ascii") === "OggS"
  ) {
    return { mimeType: "audio/ogg", extension: ".ogg" };
  }

  // Cabecera para WAV (RIFF...WAVE)
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return { mimeType: "audio/wav", extension: ".wav" };
  }

  // Si necesitas MP4/M4A (ftyp)
  if (
    buffer.length >= 8 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    return { mimeType: "audio/mp4", extension: ".m4a" };
  }

  return null;
}

export async function storeTicketAttachment(file: File) {
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE) {
    throw new InvalidTicketAttachmentError(
      "El archivo debe tener contenido y no superar 10 MB.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectAttachmentType(buffer);
  if (!detectedType) {
    throw new InvalidTicketAttachmentError(
      "Solo se permiten PDFs, Imágenes (JPG/PNG/GIF/WebP) y Audios (WebM/MP3/OGG/WAV).",
    );
  }

  const filename = `${randomUUID()}${detectedType.extension}`;
  const uploadDir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer, { flag: "wx" });

  return {
    url: `/uploads/${filename}`,
    mimeType: detectedType.mimeType,
    displayName: path.basename(file.name).slice(0, 255) || "adjunto",
  };
}

export function detectStoredAttachmentType(buffer: Buffer) {
  return detectAttachmentType(buffer);
}
