-- AlterTable
ALTER TABLE "detalles_pedido" ADD COLUMN     "estado_empaque" TEXT NOT NULL DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "fecha_fin_empaque" TIMESTAMP(3),
ADD COLUMN     "fecha_inicio_empaque" TIMESTAMP(3),
ADD COLUMN     "fecha_requerida" DATE,
ADD COLUMN     "linea_produccion" TEXT,
ADD COLUMN     "motivo_cambio_fecha" TEXT,
ADD COLUMN     "num_contrato" TEXT,
ADD COLUMN     "operario_asignado" TEXT,
ADD COLUMN     "responsable_empaque" TEXT,
ADD COLUMN     "tipo_pedido" TEXT NOT NULL DEFAULT 'Pedido',
ALTER COLUMN "estado" SET DEFAULT 'Borrador';

-- CreateTable
CREATE TABLE "estados_operacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estados_operacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_produccion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estados_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_produccion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lineas_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operarios" (
    "id" SERIAL NOT NULL,
    "nombre_apellido" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_operacion_nombre_key" ON "estados_operacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estados_produccion_nombre_key" ON "estados_produccion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "lineas_produccion_nombre_key" ON "lineas_produccion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "operarios_nombre_apellido_key" ON "operarios"("nombre_apellido");
