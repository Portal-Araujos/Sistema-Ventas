-- AlterTable
ALTER TABLE "accesos_edificio" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "areas_educativas" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "cantones" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "jornadas" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "jurisdicciones" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "modalidades_educativas" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "niveles_educativos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "parroquias" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "provincias" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "regimenes_escolares" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sostenimientos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "visitas_agenda" ADD COLUMN     "esVisitaLibre" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tipos_gestion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_gestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_sku" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipoRopa" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "institucion_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre_cliente" TEXT NOT NULL,
    "fecha_pedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_pedido" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "sku_codigo" TEXT NOT NULL,
    "tipo_ropa" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "bordado" TEXT,
    "observacion" TEXT,

    CONSTRAINT "detalles_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_gestion_nombre_key" ON "tipos_gestion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_sku_codigo_key" ON "catalogo_sku"("codigo");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_pedido" ADD CONSTRAINT "detalles_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
