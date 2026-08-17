import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getPlanStats, shouldPromptFeedback } from '@/lib/plan-completion';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prismaMock = prisma as unknown as PrismaMock;

beforeEach(() => {
  resetPrismaMock(prismaMock);
});

describe('getPlanStats', () => {
  const basePlan = {
    id: 'plan-1',
    name: 'Plan Fuerza',
    goal: 'STRENGTH',
    durationWeeks: 4,
    planDays: [{}, {}, {}], // 3 días de entrenamiento
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-29'),
  };

  it('devuelve null si el plan no existe o no pertenece al usuario', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const stats = await getPlanStats('plan-ajeno', 'user-1');

    expect(stats).toBeNull();
    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'plan-ajeno', userId: 'user-1' } })
    );
  });

  it('calcula volumen, sets, reps, duración y completion rate', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(basePlan);
    prismaMock.workoutSession.findMany.mockResolvedValue([
      {
        weekNumber: 1,
        startedAt: new Date('2026-07-01T10:00:00Z'),
        completedAt: new Date('2026-07-01T11:00:00Z'),
        sets: [
          { weight: 100, reps: 5 },
          { weight: null, reps: 5 }, // peso corporal: cuenta para sets/reps pero no para volumen
          { weight: 80, reps: 8 },
        ],
      },
      {
        weekNumber: 1,
        startedAt: new Date('2026-07-03T10:00:00Z'),
        completedAt: new Date('2026-07-03T10:30:00Z'),
        sets: [],
      },
    ]);

    const stats = await getPlanStats('plan-1', 'user-1');

    expect(stats).not.toBeNull();
    expect(stats!.totalVolume).toBe(100 * 5 + 80 * 8);
    expect(stats!.totalSets).toBe(3);
    expect(stats!.totalReps).toBe(18);
    expect(stats!.totalDurationMinutes).toBe(90);
    expect(stats!.weeksCompleted).toBe(1);
    expect(stats!.totalSessions).toBe(2);
    expect(stats!.totalExpectedSessions).toBe(12); // 3 días × 4 semanas
    expect(stats!.completionRate).toBe(17); // round(2/12 × 100)
  });

  it('devuelve todo en cero cuando no hay sesiones completadas', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(basePlan);
    prismaMock.workoutSession.findMany.mockResolvedValue([]);

    const stats = await getPlanStats('plan-1', 'user-1');

    expect(stats!.totalVolume).toBe(0);
    expect(stats!.totalSessions).toBe(0);
    expect(stats!.completionRate).toBe(0);
    expect(stats!.weeksCompleted).toBe(0);
  });
});

describe('shouldPromptFeedback', () => {
  const activePlan = {
    id: 'plan-1',
    name: 'Plan Activo',
    durationWeeks: 4,
    feedback: [],
    planDays: [{}, {}, {}],
    endDate: null as Date | null,
  };

  it('no pide feedback si el usuario no tiene plan activo', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    expect(await shouldPromptFeedback('user-1')).toEqual({ shouldPrompt: false });
  });

  it('no pide feedback si el plan ya tiene feedback registrado', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({
      ...activePlan,
      feedback: [{ id: 'fb-1' }],
    });

    expect(await shouldPromptFeedback('user-1')).toEqual({ shouldPrompt: false });
  });

  it('pide feedback si la fecha de fin del plan ya pasó', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({
      ...activePlan,
      endDate: new Date('2020-01-01'),
    });

    expect(await shouldPromptFeedback('user-1')).toEqual({
      shouldPrompt: true,
      planId: 'plan-1',
      planName: 'Plan Activo',
    });
  });

  it('pide feedback si se completó al menos el 80% de las sesiones esperadas', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(activePlan);
    // checkPlanCompletion relee el plan por findUnique
    prismaMock.plan.findUnique.mockResolvedValue(activePlan);
    // esperadas: 3 × 4 = 12 → umbral 9.6 → 10 completadas alcanza
    prismaMock.workoutSession.count.mockResolvedValue(10);

    const result = await shouldPromptFeedback('user-1');

    expect(result.shouldPrompt).toBe(true);
    expect(result.planId).toBe('plan-1');
  });

  it('no pide feedback por debajo del 80% de sesiones', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(activePlan);
    prismaMock.plan.findUnique.mockResolvedValue(activePlan);
    prismaMock.workoutSession.count.mockResolvedValue(9); // 9 < 9.6

    expect(await shouldPromptFeedback('user-1')).toEqual({ shouldPrompt: false });
  });

  it('no pide feedback si el plan tiene fecha de fin futura y pocas sesiones', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({
      ...activePlan,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    prismaMock.plan.findUnique.mockResolvedValue(activePlan);
    prismaMock.workoutSession.count.mockResolvedValue(0);

    expect(await shouldPromptFeedback('user-1')).toEqual({ shouldPrompt: false });
  });
});
