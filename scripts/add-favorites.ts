/**
 * Marca como favoritos de un usuario los ejercicios de su rutina habitual.
 * Idempotente: se puede correr varias veces sin duplicar ni fallar.
 *
 * Ejecutar: EMAIL=tu@email.com npx tsx scripts/add-favorites.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// id del catálogo (prisma/data/exercises.json) → cómo aparece en la rutina
const FAVORITES: Array<[id: string, label: string]> = [
  ['2138', 'Bici (entrada en calor)'],
  ['0274', 'Abdominales'],
  ['2135', 'Plancha de antebrazos'],
  ['0857', 'Ab roller'],
  ['0662', 'Push up'],
  ['0047', 'Press inclinado con barra'],
  ['0308', 'Apertura con mancuernas'],
  ['0577', 'Chest press vertical (máquina)'],
  ['0129', 'Flexiones de tríceps en banco'],
  ['0201', 'Tríceps en polea'],
  ['0868', 'Bíceps en polea'],
  ['0294', 'Bíceps con mancuernas'],
  ['0597', 'Abductores (máquina)'],
  ['0598', 'Aductores (máquina)'],
  ['0585', 'Leg extension'],
  ['0739', 'Linear leg press'],
  ['2286', 'Glúteos (máquina)'],
  ['0594', 'Pantorrilla sentado (máquina)'],
  ['0336', 'Estocadas con mancuernas'],
];

async function main() {
  const email = process.env.EMAIL;
  if (!email) {
    console.error('❌ Falta EMAIL. Uso: EMAIL=tu@email.com npx tsx scripts/add-favorites.ts');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ No existe un usuario con email ${email}`);
    process.exit(1);
  }

  const ids = FAVORITES.map(([id]) => id);
  const found = await prisma.exercise.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(found.map((e) => [e.id, e.name]));

  const missing = FAVORITES.filter(([id]) => !nameById.has(id));
  for (const [id, label] of missing) {
    console.warn(`⚠️  No está en el catálogo: ${id} (${label})`);
  }

  const result = await prisma.favoriteExercise.createMany({
    data: found.map((e) => ({ userId: user.id, exerciseId: e.id })),
    skipDuplicates: true,
  });

  for (const [id, label] of FAVORITES) {
    if (nameById.has(id)) console.log(`⭐ ${label} → ${nameById.get(id)}`);
  }
  console.log(`\n✅ ${result.count} favoritos nuevos para ${email} (${nameById.size} en total en la lista)`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
