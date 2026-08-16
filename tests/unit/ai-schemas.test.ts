import { describe, it, expect } from 'vitest';
import {
  GeneratedPlanSchema,
  GeneratePlanRequestSchema,
  validateExerciseIds,
} from '@/lib/ai/schemas';
import { buildGeneratedPlan } from '../helpers/fixtures';

describe('GeneratedPlanSchema', () => {
  it('acepta un plan válido de 7 días con warmup, main y cooldown', () => {
    const result = GeneratedPlanSchema.safeParse(buildGeneratedPlan());
    expect(result.success).toBe(true);
  });

  it('usa MAIN como fase por defecto cuando el LLM la omite', () => {
    const plan = buildGeneratedPlan();
    // el segundo ejercicio del día 1 es MAIN; sacarle la fase no debe romper nada
    delete (plan.days[0].exercises[1] as Record<string, unknown>).phase;

    const result = GeneratedPlanSchema.parse(plan);
    expect(result.days[0].exercises[1].phase).toBe('MAIN');
  });

  it('rechaza un plan con menos de 7 días', () => {
    const plan = buildGeneratedPlan();
    plan.days.pop();

    const result = GeneratedPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('rechaza un plan con más de 7 días', () => {
    const plan = buildGeneratedPlan();
    plan.days.push({ dayNumber: 7, name: 'Extra', isRest: true, exercises: [] });

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un día de descanso que tiene ejercicios', () => {
    const plan = buildGeneratedPlan();
    plan.days[6].exercises = plan.days[0].exercises;

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un día de entrenamiento con menos de 3 ejercicios principales', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises = plan.days[0].exercises.filter((e) => e.phase !== 'MAIN').concat(
      plan.days[0].exercises.filter((e) => e.phase === 'MAIN').slice(0, 2)
    );

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un día de entrenamiento con más de 7 ejercicios principales', () => {
    const plan = buildGeneratedPlan();
    const main = plan.days[0].exercises.find((e) => e.phase === 'MAIN')!;
    plan.days[0].exercises.push(...Array.from({ length: 5 }, () => ({ ...main })));

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un día de entrenamiento sin calentamiento', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises = plan.days[0].exercises.filter((e) => e.phase !== 'WARMUP');

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un día de entrenamiento sin enfriamiento', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises = plan.days[0].exercises.filter((e) => e.phase !== 'COOLDOWN');

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza repsMin mayor que repsMax', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises[1].repsMin = 12;
    plan.days[0].exercises[1].repsMax = 8;

    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rechaza un ejercicio MAIN con una sola serie, pero lo permite en WARMUP', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises[1].sets = 1; // MAIN
    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);

    const plan2 = buildGeneratedPlan();
    plan2.days[0].exercises[0].sets = 1; // WARMUP
    expect(GeneratedPlanSchema.safeParse(plan2).success).toBe(true);
  });

  it('rechaza descansos fuera del rango 30-300 segundos', () => {
    const plan = buildGeneratedPlan();
    plan.days[0].exercises[1].restSeconds = 20;
    expect(GeneratedPlanSchema.safeParse(plan).success).toBe(false);

    const plan2 = buildGeneratedPlan();
    plan2.days[0].exercises[1].restSeconds = 301;
    expect(GeneratedPlanSchema.safeParse(plan2).success).toBe(false);
  });
});

describe('validateExerciseIds', () => {
  it('valida cuando todos los IDs existen en el pool', () => {
    const plan = buildGeneratedPlan({ exerciseId: 'ex-1' });
    const result = validateExerciseIds(plan, new Set(['ex-1', 'ex-2']));

    expect(result.valid).toBe(true);
    expect(result.invalidIds).toEqual([]);
  });

  it('reporta IDs inexistentes, sin duplicados', () => {
    const plan = buildGeneratedPlan({ exerciseId: 'inventado' });
    const result = validateExerciseIds(plan, new Set(['ex-1']));

    expect(result.valid).toBe(false);
    // "inventado" aparece en 15 slots (3 días × 5 ejercicios) pero se reporta una vez
    expect(result.invalidIds).toEqual(['inventado']);
  });
});

describe('GeneratePlanRequestSchema', () => {
  const validRequest = {
    goal: 'HYPERTROPHY',
    durationWeeks: 8,
    daysPerWeek: 4,
    split: 'push_pull_legs',
  };

  it('acepta una request válida, con y sin campos opcionales', () => {
    expect(GeneratePlanRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(
      GeneratePlanRequestSchema.safeParse({
        ...validRequest,
        timePerSession: 60,
        previousPlanId: 'plan-1',
      }).success
    ).toBe(true);
  });

  it('rechaza un objetivo que no existe en el enum', () => {
    expect(
      GeneratePlanRequestSchema.safeParse({ ...validRequest, goal: 'CARDIO' }).success
    ).toBe(false);
  });

  it('rechaza duración fuera de 4-16 semanas', () => {
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, durationWeeks: 3 }).success).toBe(false);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, durationWeeks: 17 }).success).toBe(false);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, durationWeeks: 4 }).success).toBe(true);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, durationWeeks: 16 }).success).toBe(true);
  });

  it('rechaza frecuencia fuera de 3-6 días por semana', () => {
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, daysPerWeek: 2 }).success).toBe(false);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, daysPerWeek: 7 }).success).toBe(false);
  });

  it('rechaza split vacío y timePerSession fuera de 30-120 minutos', () => {
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, split: '' }).success).toBe(false);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, timePerSession: 29 }).success).toBe(false);
    expect(GeneratePlanRequestSchema.safeParse({ ...validRequest, timePerSession: 121 }).success).toBe(false);
  });
});
