CREATE TABLE "lecturas_mensajes_ticket" (
  "mensajeId" INTEGER NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "leidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("mensajeId", "usuarioId"),
  FOREIGN KEY ("mensajeId") REFERENCES "mensajes_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "lecturas_notificaciones" (
  "notificacionId" INTEGER NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "leidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("notificacionId", "usuarioId"),
  FOREIGN KEY ("notificacionId") REFERENCES "notificaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
