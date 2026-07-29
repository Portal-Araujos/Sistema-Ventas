-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "visita_id" TEXT;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas_agenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
