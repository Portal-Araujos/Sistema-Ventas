CREATE TABLE "suscripciones_push" (
  "id" TEXT PRIMARY KEY,
  "usuarioId" TEXT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "suscripciones_push_usuarioId_idx" ON "suscripciones_push"("usuarioId");
