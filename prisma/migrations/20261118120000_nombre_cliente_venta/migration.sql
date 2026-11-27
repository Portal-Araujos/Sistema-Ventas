ALTER TABLE "ventas" ADD COLUMN "nombre_cliente" TEXT;

UPDATE "ventas" AS v
SET "nombre_cliente" = p.nombre
FROM (
  SELECT "institucion_id", "num_contrato", MIN(TRIM("nombre_cliente")) AS nombre
  FROM "pedidos"
  WHERE NULLIF(TRIM("nombre_cliente"), '') IS NOT NULL
  GROUP BY "institucion_id", "num_contrato"
  HAVING COUNT(DISTINCT TRIM("nombre_cliente")) = 1
) AS p
WHERE v."institucion_id" = p."institucion_id" AND v."num_contrato" = p."num_contrato";
