-- AlterTable
ALTER TABLE "instituciones" ADD COLUMN     "vendedor_id" TEXT;

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
