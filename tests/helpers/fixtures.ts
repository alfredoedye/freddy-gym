/**
 * Fixtures compartidos: construyen datos válidos según los schemas reales,
 * para que cada test mute solo lo que le interesa romper.
 */

import type { GeneratedPlan } from '@/lib/ai/schemas';

interface BuildPlanOptions {
  /** Cantidad de días de entrenamiento (el resto hasta 7 son descanso). */
  trainingDays?: number;
  /** ID de ejercicio usado en todos los slots. */
  exerciseId?: string;
}

/**
 * Plan generado válido según GeneratedPlanSchema: 7 días, y cada día de
 * entrenamiento con 1 WARMUP + 3 MAIN + 1 COOLDOWN.
 */
export function buildGeneratedPlan(options: BuildPlanOptions = {}): GeneratedPlan {
  const trainingDays = options.trainingDays ?? 3;
  const exerciseId = options.exerciseId ?? 'ex-1';

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;

    if (i < trainingDays) {
      return {
        dayNumber,
        name: `Día ${dayNumber} - Entrenamiento`,
        isRest: false,
        exercises: [
          { exerciseId, phase: 'WARMUP' as const, sets: 1, repsMin: 10, repsMax: 15, restSeconds: 30 },
          { exerciseId, phase: 'MAIN' as const, sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90 },
          { exerciseId, phase: 'MAIN' as const, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
          { exerciseId, phase: 'MAIN' as const, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
          { exerciseId, phase: 'COOLDOWN' as const, sets: 1, repsMin: 1, repsMax: 1, restSeconds: 30 },
        ],
      };
    }

    return { dayNumber, name: 'Descanso', isRest: true, exercises: [] };
  });

  return {
    planName: 'Plan de prueba',
    description: 'Plan generado para tests',
    days,
  };
}

/** Perfil completo como lo devuelve prisma.user.findUnique({ include: { profile } }). */
export function buildUserWithProfile(userId = 'user-1') {
  return {
    id: userId,
    name: 'Freddy',
    email: 'freddy@example.com',
    profile: {
      id: 'profile-1',
      userId,
      birthDate: new Date('1995-06-15'),
      sex: 'MALE',
      height: 180,
      weight: 80,
      goal: 'HYPERTROPHY',
      level: 'INTERMEDIATE',
    },
  };
}
