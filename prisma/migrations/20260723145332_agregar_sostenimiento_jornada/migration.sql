/*
  Warnings:

  - You are about to drop the column `jornada` on the `instituciones` table. All the data in the column will be lost.
  - You are about to drop the column `sostenimiento` on the `instituciones` table. All the data in the column will be lost.
  - Added the required column `jornada_id` to the `instituciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sostenimiento_id` to the `instituciones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "instituciones" DROP COLUMN "jornada",
DROP COLUMN "sostenimiento",
ADD COLUMN     "jornada_id" INTEGER NOT NULL,
ADD COLUMN     "sostenimiento_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "sostenimientos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "sostenimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sostenimientos_nombre_key" ON "sostenimientos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_nombre_key" ON "jornadas"("nombre");

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_sostenimiento_id_fkey" FOREIGN KEY ("sostenimiento_id") REFERENCES "sostenimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
