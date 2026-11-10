BEGIN;

ALTER TABLE "tickets_gestion"
ADD COLUMN "pedido_id" TEXT,
ADD COLUMN "detalle_pedido_id" TEXT,
ADD COLUMN "cantidad_cambio" INTEGER,
ADD COLUMN "motivo_cambio" TEXT,
ADD COLUMN "prenda_original" JSONB,
ADD COLUMN "cambio_solicitado" TEXT;

CREATE INDEX "tickets_gestion_pedido_id_idx" ON "tickets_gestion"("pedido_id");
CREATE INDEX "tickets_gestion_detalle_pedido_id_estado_idx" ON "tickets_gestion"("detalle_pedido_id", "estado");
CREATE UNIQUE INDEX "tickets_cambio_prenda_activo_key" ON "tickets_gestion"("detalle_pedido_id") WHERE "detalle_pedido_id" IS NOT NULL AND "estado" <> 'Cerrado';
ALTER TABLE "tickets_gestion" ADD CONSTRAINT "tickets_cambio_cantidad_positiva" CHECK ("cantidad_cambio" IS NULL OR "cantidad_cambio" > 0);
ALTER TABLE "tickets_gestion" ADD CONSTRAINT "tickets_gestion_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets_gestion" ADD CONSTRAINT "tickets_gestion_detalle_pedido_id_fkey" FOREIGN KEY ("detalle_pedido_id") REFERENCES "detalles_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cambios_prenda_produccion" (
  "id" TEXT NOT NULL,
  "detalle_pedido_id" TEXT NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "usuario_nombre" TEXT NOT NULL,
  "motivo" TEXT NOT NULL,
  "anterior" JSONB NOT NULL,
  "nuevo" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cambios_prenda_produccion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cambios_prenda_produccion_detalle_pedido_id_created_at_idx" ON "cambios_prenda_produccion"("detalle_pedido_id", "created_at");
ALTER TABLE "cambios_prenda_produccion" ADD CONSTRAINT "cambios_prenda_produccion_detalle_pedido_id_fkey" FOREIGN KEY ("detalle_pedido_id") REFERENCES "detalles_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
