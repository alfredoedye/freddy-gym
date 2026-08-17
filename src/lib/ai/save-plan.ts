/**
 * Persiste el plan generado por la IA en la base de datos.
 * Usa transacciones de Prisma para atomicidad.
 */

import { prisma } from '@/lib/prisma';
import type { Plan } from '@prisma/client';
import type { GeneratedPlan } from './schemas';
import type { GeneratePlanInput } from './generate-plan';

// Tipo extendido del plan guardado con sus relaciones
type SavedPlan = Plan & {
  planDays: Array<{
    id: string;
    dayNumber: number;
    name: string;
    isRest: boolean;
    exercises: Array<{
      id: string;
      exerciseId: string;
      order: number;
      phase: 'WARMUP' | 'MAIN' | 'COOLDOWN';
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number;
      notes: string | null;
      exercise: {
        id: string;
        name: string;
        imageUrl: string | null;
        gifUrl: string | null;
        target: string;
        equipment: string;
      };
    }>;
  }>;
};

/**
 * Guarda el plan generado en la base de datos dentro de una transacción.
 */
export async function savePlanToDatabase(
  userId: string,
  input: GeneratePlanInput,
  generatedPlan: GeneratedPlan
): Promise<SavedPlan> {
  // Transacción corta y de pocas idas a la DB: el timeout por default de las
  // transacciones interactivas de Prisma es 5s, y este guardado corre justo
  // después de 30-60s de generación LLM ya pagada — no puede darse el lujo de
  // vencerse por hacer un round trip por cada día del plan.
  const planId = await prisma.$transaction(async (tx) => {
    // 1. Invariante de un solo plan ACTIVE: pausar cualquier otro plan activo
    // antes de crear el nuevo. Sin esto, dos generaciones (ej. un reintento
    // tras un corte de red) dejan dos planes ACTIVE y el dashboard elige uno
    // al azar.
    await tx.plan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    });

    // 2. Crear plan + días + ejercicios en un solo create anidado
    const plan = await tx.plan.create({
      data: {
        userId,
        name: generatedPlan.planName,
        goal: input.goal as any, // El enum ya está validado por Zod
        durationWeeks: input.durationWeeks,
        daysPerWeek: input.daysPerWeek,
        split: input.split,
        status: 'ACTIVE',
        planDays: {
          create: generatedPlan.days.map((day) => ({
            dayNumber: day.dayNumber,
            name: day.name,
            isRest: day.isRest,
            exercises: {
              create: day.exercises.map((exercise, index) => ({
                exerciseId: exercise.exerciseId,
                order: index + 1,
                phase: exercise.phase,
                sets: exercise.sets,
                repsMin: exercise.repsMin,
                repsMax: exercise.repsMax,
                restSeconds: exercise.restSeconds,
                notes: exercise.notes || null,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    // 3. Si hay plan anterior, marcarlo como completado (pisa el PAUSED del
    // paso 1). updateMany + userId para que sea un no-op si previousPlanId
    // no pertenece a este usuario.
    if (input.previousPlanId) {
      await tx.plan.updateMany({
        where: { id: input.previousPlanId, userId },
        data: { status: 'COMPLETED' },
      });
    }

    return plan.id;
  });

  // 4. Leer el plan completo con relaciones fuera de la transacción
  const savedPlan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      planDays: {
        orderBy: { dayNumber: 'asc' },
        include: {
          exercises: {
            orderBy: { order: 'asc' },
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  gifUrl: true,
                  target: true,
                  equipment: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!savedPlan) {
    throw new Error('Error al guardar el plan en la base de datos');
  }

  return savedPlan as SavedPlan;
}
