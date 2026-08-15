/**
 * Persiste el plan generado por la IA en la base de datos.
 * Usa transacciones de Prisma para atomicidad.
 */

import { prisma } from '@/lib/prisma';
import type { Plan } from '@prisma/client';
import type { GeneratedPlan } from './schemas';
import type { GeneratePlanInput } from './generate-plan';

// Tipo extendido del plan guardado con sus relaciones
export type SavedPlan = Plan & {
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
  const savedPlan = await prisma.$transaction(async (tx) => {
    // 1. Crear el plan principal
    const plan = await tx.plan.create({
      data: {
        userId,
        name: generatedPlan.planName,
        goal: input.goal as any, // El enum ya está validado por Zod
        durationWeeks: input.durationWeeks,
        daysPerWeek: input.daysPerWeek,
        split: input.split,
        status: 'ACTIVE',
      },
    });

    // 2. Crear los días del plan con sus ejercicios
    for (const day of generatedPlan.days) {
      await tx.planDay.create({
        data: {
          planId: plan.id,
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
        },
      });
    }

    // 3. Si hay plan anterior activo, marcarlo como completado
    if (input.previousPlanId) {
      await tx.plan.update({
        where: { id: input.previousPlanId },
        data: { status: 'COMPLETED' },
      });
    }

    // 4. Retornar el plan completo con relaciones
    return tx.plan.findUnique({
      where: { id: plan.id },
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
  });

  if (!savedPlan) {
    throw new Error('Error al guardar el plan en la base de datos');
  }

  return savedPlan as SavedPlan;
}
