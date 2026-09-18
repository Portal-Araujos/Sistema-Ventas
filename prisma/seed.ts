import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "🌱 Sembrando datos completos: Geografía, Catálogos y Usuarios...",
  );

  // ---------------------------------------------------------
  // 1. SEGURIDAD: CREAR ROLES
  // ---------------------------------------------------------
  const rolSuperAdmin = await prisma.rol.upsert({
    where: { nombre: "super_admin" },
    update: {},
    create: { nombre: "super_admin" },
  });
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: "administrador" },
    update: {},
    create: { nombre: "administrador" },
  });
  const rolVendedor = await prisma.rol.upsert({
    where: { nombre: "vendedor" },
    update: {},
    create: { nombre: "vendedor" },
  });

  // ---------------------------------------------------------
  // 2. REGLAS DE NEGOCIO: TAMAÑO DE ESCUELAS
  // ---------------------------------------------------------
  await prisma.reglaTamano.upsert({
    where: { nombre: "Pequeña" },
    update: { minDocentes: 0, maxDocentes: 19 },
    create: { nombre: "Pequeña", minDocentes: 0, maxDocentes: 19 },
  });
  await prisma.reglaTamano.upsert({
    where: { nombre: "Mediana" },
    update: { minDocentes: 20, maxDocentes: 49 },
    create: { nombre: "Mediana", minDocentes: 20, maxDocentes: 49 },
  });
  await prisma.reglaTamano.upsert({
    where: { nombre: "Grande" },
    update: { minDocentes: 50, maxDocentes: 9999 },
    create: { nombre: "Grande", minDocentes: 50, maxDocentes: 9999 },
  });

  // ---------------------------------------------------------
  // 3. GEOGRAFÍA EN CASCADA (Ecuador)
  // ---------------------------------------------------------
  await prisma.provincia.upsert({
    where: { nombre: "Santa Elena" },
    update: {},
    create: {
      nombre: "Santa Elena",
      cantones: {
        create: [
          {
            nombre: "La Libertad",
            parroquias: { create: [{ nombre: "La Libertad" }] },
          },
          {
            nombre: "Salinas",
            parroquias: {
              create: [
                { nombre: "Salinas" },
                { nombre: "José Luis Tamayo" },
                { nombre: "Anconcito" },
              ],
            },
          },
          {
            nombre: "Santa Elena",
            parroquias: {
              create: [
                { nombre: "Santa Elena" },
                { nombre: "Ballenita" },
                { nombre: "Manglaralto" },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.provincia.upsert({
    where: { nombre: "Guayas" },
    update: {},
    create: {
      nombre: "Guayas",
      cantones: {
        create: [
          {
            nombre: "Guayaquil",
            parroquias: {
              create: [
                { nombre: "Tarqui" },
                { nombre: "Ximena" },
                { nombre: "Febres Cordero" },
              ],
            },
          },
          {
            nombre: "Daule",
            parroquias: {
              create: [{ nombre: "Daule" }, { nombre: "La Aurora" }],
            },
          },
        ],
      },
    },
  });

  await prisma.provincia.upsert({
    where: { nombre: "Pichincha" },
    update: {},
    create: {
      nombre: "Pichincha",
      cantones: {
        create: [
          {
            nombre: "Quito",
            parroquias: {
              create: [
                { nombre: "Iñaquito" },
                { nombre: "Cumbayá" },
                { nombre: "Calderón" },
              ],
            },
          },
        ],
      },
    },
  });

  // ---------------------------------------------------------
  // 4. NUEVOS CATÁLOGOS DINÁMICOS (Incluye Sostenimiento y Jornada)
  // ---------------------------------------------------------
  const sostenimientos = ["Fiscal", "Particular", "Fiscomisional", "Municipal"];
  for (const s of sostenimientos)
    await prisma.sostenimiento.upsert({
      where: { nombre: s },
      update: {},
      create: { nombre: s },
    });

  const jornadas = ["Matutina", "Vespertina", "Nocturna", "Doble"];
  for (const j of jornadas)
    await prisma.jornada.upsert({
      where: { nombre: j },
      update: {},
      create: { nombre: j },
    });

  const niveles = [
    "Inicial / Preescolar",
    "Educación General Básica",
    "Bachillerato General Unificado",
    "Educación Técnica",
  ];
  for (const n of niveles)
    await prisma.nivelEducativo.upsert({
      where: { nombre: n },
      update: {},
      create: { nombre: n },
    });

  const areas = ["Urbana", "Rural"];
  for (const a of areas)
    await prisma.areaEducativa.upsert({
      where: { nombre: a },
      update: {},
      create: { nombre: a },
    });

  const regimenes = ["Costa", "Sierra / Amazonía"];
  for (const r of regimenes)
    await prisma.regimenEscolar.upsert({
      where: { nombre: r },
      update: {},
      create: { nombre: r },
    });

  const jurisdicciones = ["Hispana", "Bilingüe Intercultural"];
  for (const j of jurisdicciones)
    await prisma.jurisdiccion.upsert({
      where: { nombre: j },
      update: {},
      create: { nombre: j },
    });

  const modalidades = ["Presencial", "Semipresencial", "A Distancia"];
  for (const m of modalidades)
    await prisma.modalidadEducativa.upsert({
      where: { nombre: m },
      update: {},
      create: { nombre: m },
    });

  const accesos = ["Terrestre", "Fluvial", "Aéreo", "Marítimo"];
  for (const ac of accesos)
    await prisma.accesoEdificio.upsert({
      where: { nombre: ac },
      update: {},
      create: { nombre: ac },
    });

  // ---------------------------------------------------------
  // 5. USUARIOS DEL SISTEMA (Con Argon2)
  // ---------------------------------------------------------
  const hashedPassword = await argon2.hash("admin123");
  const vendedorPassword = await argon2.hash("ventas123");

  await prisma.usuario.upsert({
    where: { email: "admin@sistema.com" },
    update: {},
    create: {
      nombre: "Super Administrador",
      email: "admin@sistema.com",
      passwordHash: hashedPassword,
      rolId: rolSuperAdmin.id,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "juan@ventas.com" },
    update: {},
    create: {
      nombre: "Juan Vendedor",
      email: "juan@ventas.com",
      passwordHash: vendedorPassword,
      rolId: rolVendedor.id,
      activo: true,
    },
  });

  console.log("✅ Base de datos sembrada con éxito.");
  console.log(`👤 Super Admin: admin@sistema.com / admin123`);
  console.log(`👤 Vendedor: juan@ventas.com / ventas123`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante la siembra:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
