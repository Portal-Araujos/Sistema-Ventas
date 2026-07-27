-- AlterTable
ALTER TABLE "instituciones" ADD COLUMN     "estado_comercial_id" INTEGER;

-- CreateTable
CREATE TABLE "estados_comerciales" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estados_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_comerciales_nombre_key" ON "estados_comerciales"("nombre");

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_estado_comercial_id_fkey" FOREIGN KEY ("estado_comercial_id") REFERENCES "estados_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
