/**
 * Función principal del agente IA — genera un plan de entrenamiento completo.
 * Orquesta: perfil del usuario → pool de ejercicios → LLM → validación → resultado.
 */

import { prisma } from '@/lib/prisma';
import { getPersonalRecords, getTotalStats } from '@/lib/progress';
import { callLLM, parseJSONResponse } from './client';
import {
  SYSTEM_PROMPT,
  RESPONSE_FORMAT,
  buildUserContext,
  buildPlanRequest,
  buildProgressionContext,
  buildPersonalRecordsContext,
  buildExercisePool,
} from './prompts';
import {
  GeneratedPlanSchema,
  validateExerciseIds,
  type GeneratedPlan,
} from './schemas';

// === TIPOS ===

export interface GeneratePlanInput {
  userId: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  timePerSession?: number;
  previousPlanId?: string;
}

export interface GeneratePlanResult {
  success: true;
  plan: GeneratedPlan;
}

export interface GeneratePlanError {
  success: false;
  error: string;
  details?: string;
}

// === CONSTANTES ===

const MAX_RETRIES = 2;

// Mapeo de equipamiento disponible en gimnasio completo
const GYM_EQUIPMENT = [
  'body weight',
  'dumbbell',
  'barbell',
  'cable',
  'leverage machine',
  'smith machine',
  'kettlebell',
  'ez barbell',
  'weighted',
  'stability ball',
  'band',
  'rope',
  'medicine ball',
  'bosu ball',
  'roller',
  'olympic barbell',
  'trap bar',
  'assisted',
  'stationary bike',
  'elliptical machine',
  'stepmill machine',
];

// === FUNCIÓN PRINCIPAL ===

export async function generateTrainingPlan(
  input: GeneratePlanInput
): Promise<GeneratePlanResult | GeneratePlanError> {
  try {
    // 1. Obtener perfil del usuario
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return { success: false, error: 'Usuario o perfil no encontrado' };
    }

    // 2. Obtener ejercicios disponibles (filtrados por equipamiento)
    const exercises = await prisma.exercise.findMany({
      where: {
        equipment: { in: GYM_EQUIPMENT },
      },
      select: {
        id: true,
        name: true,
        target: true,
        equipment: true,
        bodyPart: true,
      },
    });

    if (exercises.length === 0) {
      return { success: false, error: 'No hay ejercicios disponibles en la base de datos' };
    }

    const validIds = new Set(exercises.map((e) => e.id));

    // 3. Construir contexto de progresión: histórico general de récords (siempre que
    //    exista, sin importar si se está regenerando un plan puntual) + progresión
    //    específica del plan anterior con feedback (solo al regenerar tras feedback).
    const progressionParts: string[] = [];

    const totalStats = await getTotalStats(input.userId);
    if (totalStats.totalSessions > 0) {
      const personalRecords = await getPersonalRecords(input.userId);
      const recordsSection = buildPersonalRecordsContext(
        personalRecords.map((r) => ({
          exerciseName: r.exerciseName,
          weight: r.weight,
          reps: r.reps,
        }))
      );
      if (recordsSection) progressionParts.push(recordsSection);
    }

    if (input.previousPlanId) {
      const progressionData = await fetchProgressionData(input.previousPlanId, input.userId);
      if (progressionData) {
        progressionParts.push(buildProgressionContext(progressionData));
      }
    }

    const progressionSection = progressionParts.join('\n\n');

    // 4. Construir el prompt completo
    const userContext = buildUserContext({ profile: user.profile, name: user.name || undefined });
    const planRequest = buildPlanRequest({
      goal: input.goal,
      durationWeeks: input.durationWeeks,
      daysPerWeek: input.daysPerWeek,
      split: input.split,
      timePerSession: input.timePerSession,
    });
    const exercisePool = buildExercisePool(exercises);

    const userPrompt = [
      userContext,
      '',
      planRequest,
      '',
      progressionSection,
      '',
      exercisePool,
      '',
      RESPONSE_FORMAT,
    ]
      .filter(Boolean)
      .join('\n');

    // 5. Llamar al LLM con reintentos
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await callLLM(SYSTEM_PROMPT, userPrompt, {
          temperature: 0.7,
          maxTokens: 4000,
          jsonMode: true,
        });

        // 6. Parsear JSON
        const parsed = parseJSONResponse(response.content);

        // 7. Validar con Zod
        const validated = GeneratedPlanSchema.parse(parsed);

        // 8. Validar IDs de ejercicios
        const idValidation = validateExerciseIds(validated, validIds);
        if (!idValidation.valid) {
          lastError = `IDs de ejercicios inválidos: ${idValidation.invalidIds.join(', ')}`;
          console.warn(
            `[AI Plan] Intento ${attempt + 1}: ${lastError}. Reintentando...`
          );
          continue;
        }

        // 9. Verificar que la cantidad de días de entrenamiento coincide
        const trainingDays = validated.days.filter((d) => !d.isRest);
        if (trainingDays.length !== input.daysPerWeek) {
          lastError = `Se solicitaron ${input.daysPerWeek} días de entrenamiento pero el plan tiene ${trainingDays.length}`;
          console.warn(
            `[AI Plan] Intento ${attempt + 1}: ${lastError}. Reintentando...`
          );
          continue;
        }

        // ¡Éxito!
        console.log(
          `[AI Plan] Plan generado exitosamente en intento ${attempt + 1}. ` +
          `Tokens: ${response.usage?.inputTokens || '?'} in / ${response.usage?.outputTokens || '?'} out`
        );

        return { success: true, plan: validated };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Error desconocido al parsear respuesta';
        console.warn(`[AI Plan] Intento ${attempt + 1} falló: ${lastError}`);
      }
    }

    // Agotamos reintentos
    return {
      success: false,
      error: 'No se pudo generar un plan válido después de varios intentos',
      details: lastError,
    };
  } catch (err) {
    console.error('[AI Plan] Error inesperado:', err);
    return {
      success: false,
      error: 'Error interno al generar el plan',
      details: err instanceof Error ? err.message : undefined,
    };
  }
}

// === HELPERS INTERNOS ===

/**
 * Obtiene datos del plan anterior para contexto de progresión.
 * Requiere userId para verificar que el plan pertenece al usuario que genera el nuevo plan.
 */
async function fetchProgressionData(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      feedback: true,
      planDays: {
        include: {
          exercises: {
            include: { exercise: true },
          },
          workouts: {
            include: { sets: true },
          },
        },
      },
    },
  });

  if (!plan || plan.feedback.length === 0) return null;

  const feedback = plan.feedback[0];

  // Calcular pesos promedio por ejercicio
  const weightsByExercise: Record<string, { name: string; weights: number[] }> = {};

  for (const day of plan.planDays) {
    for (const workout of day.workouts) {
      for (const set of workout.sets) {
        if (set.weight && set.completed) {
          const exercise = day.exercises.find((e) => e.exerciseId === set.exerciseId);
          const name = exercise?.exercise?.name || set.exerciseId;

          if (!weightsByExercise[set.exerciseId]) {
            weightsByExercise[set.exerciseId] = { name, weights: [] };
          }
          weightsByExercise[set.exerciseId].weights.push(set.weight);
        }
      }
    }
  }

  const averageWeights = Object.values(weightsByExercise).map((data) => ({
    exerciseName: data.name,
    avgWeight: Math.round(
      data.weights.reduce((sum, w) => sum + w, 0) / data.weights.length
    ),
  }));

  // Calcular tasa de completitud
  const totalExpectedSessions = plan.durationWeeks * plan.daysPerWeek;
  const totalSessions = plan.planDays.reduce(
    (sum, day) => sum + day.workouts.length,
    0
  );
  const completionRate = Math.round((totalSessions / totalExpectedSessions) * 100);

  return {
    feedback,
    previousPlanName: plan.name,
    previousSplit: plan.split,
    averageWeights,
    completionRate: Math.min(completionRate, 100),
    totalSessions,
  };
}
