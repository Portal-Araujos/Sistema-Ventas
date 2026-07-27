/*
  Warnings:

  - You are about to drop the column `canton_id` on the `instituciones` table. All the data in the column will be lost.
  - Added the required column `parroquia_id` to the `instituciones` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "instituciones" DROP CONSTRAINT "instituciones_canton_id_fkey";

-- AlterTable
ALTER TABLE "instituciones" DROP COLUMN "canton_id",
ADD COLUMN     "acceso_edificio_id" INTEGER,
ADD COLUMN     "area_id" INTEGER,
ADD COLUMN     "docentes_hombres" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "docentes_mujeres" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jurisdiccion_id" INTEGER,
ADD COLUMN     "modalidad_id" INTEGER,
ADD COLUMN     "nivel_educativo_id" INTEGER,
ADD COLUMN     "parroquia_id" INTEGER NOT NULL,
ADD COLUMN     "regimen_id" INTEGER;

-- CreateTable
CREATE TABLE "parroquias" (
    "id" SERIAL NOT NULL,
    "canton_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "parroquias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles_educativos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "niveles_educativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_educativas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "areas_educativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regimenes_escolares" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "regimenes_escolares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdicciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "jurisdicciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalidades_educativas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "modalidades_educativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesos_edificio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "accesos_edificio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_tamano" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "min_docentes" INTEGER NOT NULL DEFAULT 0,
    "max_docentes" INTEGER NOT NULL DEFAULT 9999,

    CONSTRAINT "reglas_tamano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "niveles_educativos_nombre_key" ON "niveles_educativos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "areas_educativas_nombre_key" ON "areas_educativas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "regimenes_escolares_nombre_key" ON "regimenes_escolares"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdicciones_nombre_key" ON "jurisdicciones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "modalidades_educativas_nombre_key" ON "modalidades_educativas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "accesos_edificio_nombre_key" ON "accesos_edificio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "reglas_tamano_nombre_key" ON "reglas_tamano"("nombre");

-- AddForeignKey
ALTER TABLE "parroquias" ADD CONSTRAINT "parroquias_canton_id_fkey" FOREIGN KEY ("canton_id") REFERENCES "cantones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_parroquia_id_fkey" FOREIGN KEY ("parroquia_id") REFERENCES "parroquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_nivel_educativo_id_fkey" FOREIGN KEY ("nivel_educativo_id") REFERENCES "niveles_educativos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_educativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_regimen_id_fkey" FOREIGN KEY ("regimen_id") REFERENCES "regimenes_escolares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_jurisdiccion_id_fkey" FOREIGN KEY ("jurisdiccion_id") REFERENCES "jurisdicciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_modalidad_id_fkey" FOREIGN KEY ("modalidad_id") REFERENCES "modalidades_educativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_acceso_edificio_id_fkey" FOREIGN KEY ("acceso_edificio_id") REFERENCES "accesos_edificio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
