/**
 * Carga la rutina de lunes / miércoles / viernes como plan activo de un usuario.
 * Pausa el plan activo que tenga (misma invariante que save-plan.ts: un solo
 * plan ACTIVE). No vuelve a cargarla si ya existe un plan con el mismo nombre.
 *
 * Ejecutar: EMAIL=tu@email.com npx tsx scripts/load-my-routine.ts
 *
 * El plan no guarda pesos (se registran al entrenar y la app los recuerda para
 * la sesión siguiente), así que el peso de referencia va en la nota de cada
 * ejercicio.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAN_NAME = 'Mi rutina · Lun / Mié / Vie';
const DURATION_WEEKS = 12;

type Phase = 'WARMUP' | 'MAIN';
// [id del catálogo, fase, series, reps, nota]
type Row = [id: string, phase: Phase, sets: number, reps: number, notes: string | null];

const BIKE: Row = ['2138', 'WARMUP', 1, 1, '5 minutos'];

const ROUTINE: Array<{ dayNumber: number; name: string; exercises: Row[] }> = [
  {
    dayNumber: 1, // lunes
    name: 'Pecho, tríceps y cadera',
    exercises: [
      BIKE,
      ['0274', 'MAIN', 3, 30, 'Abdominales'],
      ['2135', 'MAIN', 3, 1, 'Plancha de antebrazos, sin peso'],
      ['0047', 'MAIN', 3, 6, 'Press inclinado con barra · 15 kg'],
      ['0308', 'MAIN', 3, 12, 'Apertura con mancuernas · 5 kg'],
      ['0577', 'MAIN', 3, 12, 'Chest press vertical · 50 kg'],
      ['0129', 'MAIN', 3, 12, 'Flexiones de tríceps en banco'],
      ['0597', 'MAIN', 3, 15, 'Abductores · 49 kg'],
      ['0598', 'MAIN', 3, 15, 'Aductores · 37 kg'],
      ['0201', 'MAIN', 3, 15, 'Tríceps en polea · 15 kg'],
    ],
  },
  {
    dayNumber: 3, // miércoles
    name: 'Piernas',
    exercises: [
      BIKE,
      ['0274', 'MAIN', 3, 30, 'Abdominales'],
      ['0662', 'MAIN', 3, 20, 'Push up'],
      ['0585', 'MAIN', 3, 12, 'Leg extension · 60 kg'],
      ['0739', 'MAIN', 3, 12, 'Linear leg press · 70 kg'],
      ['2286', 'MAIN', 3, 12, 'Glúteos en máquina · 40 kg'],
      ['0597', 'MAIN', 3, 12, 'Abductores · 53 kg'],
      ['0598', 'MAIN', 3, 12, 'Aductores · 41 kg'],
      ['0594', 'MAIN', 3, 12, 'Pantorrilla sentado · 50 kg'],
    ],
  },
  {
    dayNumber: 5, // viernes
    name: 'Brazos y pecho',
    exercises: [
      BIKE,
      ['0857', 'MAIN', 3, 12, 'Ab roller'],
      ['0336', 'MAIN', 3, 12, 'Estocadas con mancuernas'],
      ['0047', 'MAIN', 3, 8, 'Press inclinado con barra · 30 kg'],
      ['0868', 'MAIN', 3, 12, 'Bíceps en polea · 17 kg'],
      ['0201', 'MAIN', 3, 12, 'Tríceps en polea · 17 kg'],
      ['0294', 'MAIN', 3, 8, 'Bíceps con mancuernas · 12,5 kg'],
      ['0129', 'MAIN', 3, 12, 'Tríceps en banco'],
    ],
  },
];

async function main() {
  const email = process.env.EMAIL;
  if (!email) {
    console.error('❌ Falta EMAIL. Uso: EMAIL=tu@email.com npx tsx scripts/load-my-routine.ts');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) {
    console.error(`❌ No existe un usuario con email ${email}`);
    process.exit(1);
  }

  const existing = await prisma.plan.findFirst({
    where: { userId: user.id, name: PLAN_NAME, archivedAt: null },
  });
  if (existing) {
    console.log(`⚠️  ${email} ya tiene el plan "${PLAN_NAME}" (${existing.status}). No se creó otro.`);
    return;
  }

  const ids = Array.from(new Set(ROUTINE.flatMap((d) => d.exercises.map(([id]) => id))));
  const found = await prisma.exercise.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const missing = ids.filter((id) => !found.some((e) => e.id === id));
  if (missing.length > 0) {
    console.error(`❌ Faltan ejercicios en el catálogo: ${missing.join(', ')}. No se creó nada.`);
    process.exit(1);
  }

  const plan = await prisma.$transaction(async (tx) => {
    const paused = await tx.plan.updateMany({
      where: { userId: user.id, status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    });
    if (paused.count > 0) console.log(`⏸️  Se pausó el plan que estaba activo.`);

    return tx.plan.create({
      data: {
        userId: user.id,
        name: PLAN_NAME,
        goal: user.profile?.goal ?? 'HYPERTROPHY',
        durationWeeks: DURATION_WEEKS,
        daysPerWeek: ROUTINE.length,
        split: 'custom',
        status: 'ACTIVE',
        planDays: {
          create: [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
            const day = ROUTINE.find((d) => d.dayNumber === dayNumber);
            if (!day) return { dayNumber, name: 'Descanso', isRest: true };
            return {
              dayNumber,
              name: day.name,
              isRest: false,
              exercises: {
                create: day.exercises.map(([exerciseId, phase, sets, reps, notes], index) => ({
                  exerciseId,
                  order: index + 1,
                  phase,
                  sets,
                  repsMin: reps,
                  repsMax: reps,
                  restSeconds: phase === 'WARMUP' ? 30 : 90,
                  notes,
                })),
              },
            };
          }),
        },
      },
      select: { id: true },
    });
  });

  for (const day of ROUTINE) console.log(`📅 ${day.name}: ${day.exercises.length} ejercicios`);
  console.log(`\n✅ Plan "${PLAN_NAME}" creado y activo para ${email} (id ${plan.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
