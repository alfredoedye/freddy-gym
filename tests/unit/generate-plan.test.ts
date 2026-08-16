import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/ai/client';
import { generateTrainingPlan, type GeneratePlanInput } from '@/lib/ai/generate-plan';
import { buildGeneratedPlan, buildUserWithProfile } from '../helpers/fixtures';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

vi.mock('@/lib/progress', () => ({
  getTotalStats: vi.fn(async () => ({ totalSessions: 0 })),
  getPersonalRecords: vi.fn(async () => []),
}));

// callLLM se mockea; parseJSONResponse se mantiene real para que el pipeline
// de parseo/validación se ejercite de verdad.
vi.mock('@/lib/ai/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/client')>();
  return { ...actual, callLLM: vi.fn() };
});

const prismaMock = prisma as unknown as PrismaMock;
const callLLMMock = vi.mocked(callLLM);

const baseInput: GeneratePlanInput = {
  userId: 'user-1',
  goal: 'HYPERTROPHY',
  durationWeeks: 8,
  daysPerWeek: 3,
  split: 'full_body',
};

const exercisePool = [
  { id: 'ex-1', name: 'Press banca', target: 'pectorals', equipment: 'barbell', bodyPart: 'chest' },
  { id: 'ex-2', name: 'Sentadilla', target: 'quads', equipment: 'barbell', bodyPart: 'upper legs' },
];

function llmResponse(plan: unknown) {
  return { content: JSON.stringify(plan), usage: { inputTokens: 100, outputTokens: 500 } };
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  callLLMMock.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  prismaMock.user.findUnique.mockResolvedValue(buildUserWithProfile());
  prismaMock.exercise.findMany.mockResolvedValue(exercisePool);
});

describe('generateTrainingPlan', () => {
  it('genera un plan válido en el primer intento', async () => {
    callLLMMock.mockResolvedValue(llmResponse(buildGeneratedPlan({ trainingDays: 3 })));

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.days).toHaveLength(7);
    }
    expect(callLLMMock).toHaveBeenCalledTimes(1);
  });

  it('falla sin llamar al LLM si el usuario no tiene perfil', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', profile: null });

    const result = await generateTrainingPlan(baseInput);

    expect(result).toEqual({ success: false, error: 'Usuario o perfil no encontrado' });
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it('falla sin llamar al LLM si el pool de ejercicios está vacío', async () => {
    prismaMock.exercise.findMany.mockResolvedValue([]);

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(false);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it('reintenta cuando el LLM inventa un exerciseId, incluyendo la corrección en el prompt', async () => {
    callLLMMock
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan({ exerciseId: 'inventado' })))
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan({ exerciseId: 'ex-1' })));

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(true);
    expect(callLLMMock).toHaveBeenCalledTimes(2);

    const secondPrompt = callLLMMock.mock.calls[1][1];
    expect(secondPrompt).toContain('CORRECCIÓN');
    expect(secondPrompt).toContain('inventado');
  });

  it('reintenta cuando la cantidad de días de entrenamiento no coincide con lo pedido', async () => {
    // se pidieron 4 días pero el plan trae 3 — dos veces; la tercera es correcta
    callLLMMock
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan({ trainingDays: 3 })))
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan({ trainingDays: 3 })))
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan({ trainingDays: 4 })));

    const result = await generateTrainingPlan({ ...baseInput, daysPerWeek: 4 });

    expect(result.success).toBe(true);
    expect(callLLMMock).toHaveBeenCalledTimes(3);
  });

  it('se recupera de una respuesta que no es JSON', async () => {
    callLLMMock
      .mockResolvedValueOnce({ content: 'Perdón, no puedo generar eso.' })
      .mockResolvedValueOnce(llmResponse(buildGeneratedPlan()));

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(true);
    expect(callLLMMock).toHaveBeenCalledTimes(2);
  });

  it('agota los reintentos (3 llamadas en total) y devuelve error con detalle', async () => {
    callLLMMock.mockResolvedValue(llmResponse(buildGeneratedPlan({ exerciseId: 'inventado' })));

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No se pudo generar un plan válido');
      expect(result.details).toContain('inventado');
    }
    expect(callLLMMock).toHaveBeenCalledTimes(3);
  });

  it('agota los reintentos si el LLM falla siempre (p. ej. timeout)', async () => {
    callLLMMock.mockRejectedValue(new Error('timeout'));

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(false);
    expect(callLLMMock).toHaveBeenCalledTimes(3);
  });

  it('devuelve error controlado (no lanza) ante un fallo inesperado de la DB', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('conexión caída'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await generateTrainingPlan(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Error interno al generar el plan');
    }
  });

  it('ignora un previousPlanId ajeno: no agrega progresión si el plan no es del usuario', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null); // fetchProgressionData no encuentra nada
    callLLMMock.mockResolvedValue(llmResponse(buildGeneratedPlan()));

    const result = await generateTrainingPlan({ ...baseInput, previousPlanId: 'plan-ajeno' });

    expect(result.success).toBe(true);
    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-ajeno', userId: 'user-1' },
      })
    );
    const prompt = callLLMMock.mock.calls[0][1];
    expect(prompt).not.toContain('PROGRESIÓN DESDE PLAN ANTERIOR');
  });
});
