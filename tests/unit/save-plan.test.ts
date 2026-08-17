import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import type { GeneratePlanInput } from '@/lib/ai/generate-plan';
import { buildGeneratedPlan } from '../helpers/fixtures';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prismaMock = prisma as unknown as PrismaMock;

const input: GeneratePlanInput = {
  userId: 'user-1',
  goal: 'HYPERTROPHY',
  durationWeeks: 8,
  daysPerWeek: 3,
  split: 'full_body',
};

const savedPlanRow = { id: 'plan-1', name: 'Plan de prueba', planDays: [] };

beforeEach(() => {
  resetPrismaMock(prismaMock);
  prismaMock.plan.create.mockResolvedValue({ id: 'plan-1' });
  prismaMock.plan.findUnique.mockResolvedValue(savedPlanRow);
});

describe('savePlanToDatabase', () => {
  it('pausa cualquier otro plan ACTIVE del usuario antes de crear el nuevo', async () => {
    await savePlanToDatabase('user-1', input, buildGeneratedPlan());

    expect(prismaMock.plan.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    });
    // el updateMany de pausa ocurre antes del create
    expect(prismaMock.plan.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      prismaMock.plan.create.mock.invocationCallOrder[0]
    );
  });

  it('crea el plan ACTIVE con los 7 días anidados y el orden de ejercicios 1..n', async () => {
    await savePlanToDatabase('user-1', input, buildGeneratedPlan());

    const createArgs = prismaMock.plan.create.mock.calls[0][0];
    expect(createArgs.data).toMatchObject({
      userId: 'user-1',
      name: 'Plan de prueba',
      status: 'ACTIVE',
      durationWeeks: 8,
      daysPerWeek: 3,
    });

    const days = createArgs.data.planDays.create;
    expect(days).toHaveLength(7);

    const firstDayExercises = days[0].exercises.create;
    expect(firstDayExercises.map((e: { order: number }) => e.order)).toEqual([1, 2, 3, 4, 5]);
    // sin notas del LLM se persiste null, no undefined ni string vacío
    expect(firstDayExercises[0].notes).toBeNull();

    const restDay = days[6];
    expect(restDay.isRest).toBe(true);
    expect(restDay.exercises.create).toHaveLength(0);
  });

  it('marca el plan anterior como COMPLETED, acotado al userId (no-op si es ajeno)', async () => {
    await savePlanToDatabase(
      'user-1',
      { ...input, previousPlanId: 'plan-previo' },
      buildGeneratedPlan()
    );

    expect(prismaMock.plan.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.plan.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'plan-previo', userId: 'user-1' },
      data: { status: 'COMPLETED' },
    });
  });

  it('sin previousPlanId solo hace el updateMany de pausa', async () => {
    await savePlanToDatabase('user-1', input, buildGeneratedPlan());

    expect(prismaMock.plan.updateMany).toHaveBeenCalledTimes(1);
  });

  it('devuelve el plan completo releído con sus relaciones', async () => {
    const result = await savePlanToDatabase('user-1', input, buildGeneratedPlan());

    expect(result).toBe(savedPlanRow);
    expect(prismaMock.plan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'plan-1' } })
    );
  });

  it('lanza error si la relectura del plan guardado devuelve null', async () => {
    prismaMock.plan.findUnique.mockResolvedValue(null);

    await expect(savePlanToDatabase('user-1', input, buildGeneratedPlan())).rejects.toThrow(
      'Error al guardar el plan'
    );
  });

  it('propaga el error si la transacción falla (nada que atrapar acá)', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('timeout de transacción'));

    await expect(savePlanToDatabase('user-1', input, buildGeneratedPlan())).rejects.toThrow(
      'timeout de transacción'
    );
  });
});
