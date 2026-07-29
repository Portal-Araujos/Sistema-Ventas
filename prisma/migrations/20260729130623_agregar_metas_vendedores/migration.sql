-- CreateTable
CREATE TABLE "metas_vendedores" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "semana_anio" TEXT NOT NULL,
    "monto_meta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metas_vendedores_vendedor_id_semana_anio_key" ON "metas_vendedores"("vendedor_id", "semana_anio");

-- AddForeignKey
ALTER TABLE "metas_vendedores" ADD CONSTRAINT "metas_vendedores_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
