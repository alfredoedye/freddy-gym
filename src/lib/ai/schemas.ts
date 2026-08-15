/**
 * Schemas Zod para validar la respuesta del LLM al generar planes.
 * Asegura que el JSON generado sea estructuralmente correcto.
 */

import { z } from 'zod';

// Schema para un ejercicio dentro del plan generado
export const PlanExerciseSchema = z.object({
  exerciseId: z.string().min(1, 'El ID del ejercicio es requerido'),
  phase: z.enum(['WARMUP', 'MAIN', 'COOLDOWN']).default('MAIN'),
  sets: z.number().int().min(1).max(6),
  repsMin: z.number().int().min(1).max(30),
  repsMax: z.number().int().min(1).max(30),
  restSeconds: z.number().int().min(30).max(300),
  notes: z.string().optional(),
}).refine((data) => data.repsMin <= data.repsMax, {
  message: 'repsMin debe ser menor o igual a repsMax',
  path: ['repsMin'],
}).refine((data) => data.phase !== 'MAIN' || data.sets >= 2, {
  message: 'Los ejercicios principales deben tener al menos 2 series',
  path: ['sets'],
});

// Schema para un día del plan
export const PlanDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  name: z.string().min(1, 'El nombre del día es requerido'),
  isRest: z.boolean(),
  exercises: z.array(PlanExerciseSchema),
}).refine(
  (data) => {
    // Si es día de descanso, no debe tener ejercicios
    if (data.isRest) return data.exercises.length === 0;

    // Si no es descanso: 3-7 ejercicios principales, al menos 1 de calentamiento y 1 de enfriamiento
    const mainCount = data.exercises.filter((e) => e.phase === 'MAIN').length;
    const warmupCount = data.exercises.filter((e) => e.phase === 'WARMUP').length;
    const cooldownCount = data.exercises.filter((e) => e.phase === 'COOLDOWN').length;
    return mainCount >= 3 && mainCount <= 7 && warmupCount >= 1 && cooldownCount >= 1;
  },
  {
    message:
      'Los días de entrenamiento deben tener 3-7 ejercicios principales, al menos 1 de calentamiento y 1 de enfriamiento. Los días de descanso deben tener 0 ejercicios.',
    path: ['exercises'],
  }
);

// Schema completo del plan generado por el LLM
export const GeneratedPlanSchema = z.object({
  planName: z.string().min(1, 'El nombre del plan es requerido'),
  description: z.string().min(1, 'La descripción del plan es requerida'),
  days: z.array(PlanDaySchema).length(7, 'El plan debe tener exactamente 7 días'),
});

// Tipos derivados de los schemas
export type GeneratedPlanExercise = z.infer<typeof PlanExerciseSchema>;
export type GeneratedPlanDay = z.infer<typeof PlanDaySchema>;
export type GeneratedPlan = z.infer<typeof GeneratedPlanSchema>;

/**
 * Valida que todos los exerciseIds en el plan existan en el pool disponible.
 */
export function validateExerciseIds(
  plan: GeneratedPlan,
  validIds: Set<string>
): { valid: boolean; invalidIds: string[] } {
  const invalidIds: string[] = [];

  for (const day of plan.days) {
    for (const exercise of day.exercises) {
      if (!validIds.has(exercise.exerciseId)) {
        invalidIds.push(exercise.exerciseId);
      }
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds: Array.from(new Set(invalidIds)), // eliminar duplicados
  };
}

// Schema para la request de generación de plan (validación del input del usuario)
export const GeneratePlanRequestSchema = z.object({
  goal: z.enum(['HYPERTROPHY', 'STRENGTH', 'ENDURANCE', 'FAT_LOSS', 'RECOMPOSITION']),
  durationWeeks: z.number().int().min(4).max(16),
  daysPerWeek: z.number().int().min(3).max(6),
  split: z.string().min(1),
  timePerSession: z.number().int().min(30).max(120).optional(),
  previousPlanId: z.string().optional(),
});

export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;
