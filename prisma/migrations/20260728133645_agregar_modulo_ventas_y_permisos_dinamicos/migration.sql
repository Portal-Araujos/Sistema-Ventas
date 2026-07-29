-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "permisos" TEXT DEFAULT '[]';

-- CreateTable
CREATE TABLE "estados_clientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estados_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_contratos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estados_contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_cobro" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "fecha_venta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institucion_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "num_contrato" TEXT NOT NULL,
    "valor_contrato" DOUBLE PRECISION NOT NULL,
    "meses" INTEGER NOT NULL,
    "mes_cobro" TEXT NOT NULL,
    "cuota_mensual" DOUBLE PRECISION NOT NULL,
    "estado_cliente_id" INTEGER,
    "estado_contrato_id" INTEGER,
    "tipo_cobro_id" INTEGER,
    "observaciones_facturacion" TEXT,
    "verificacion_facturacion" TEXT,
    "estado_ticket" TEXT NOT NULL DEFAULT 'Pendiente Facturación',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_clientes_nombre_key" ON "estados_clientes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estados_contratos_nombre_key" ON "estados_contratos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_cobro_nombre_key" ON "tipos_cobro"("nombre");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_estado_cliente_id_fkey" FOREIGN KEY ("estado_cliente_id") REFERENCES "estados_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_estado_contrato_id_fkey" FOREIGN KEY ("estado_contrato_id") REFERENCES "estados_contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tipo_cobro_id_fkey" FOREIGN KEY ("tipo_cobro_id") REFERENCES "tipos_cobro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
