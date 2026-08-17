import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/plans/route';
import { authedSession } from '../helpers/api';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const prismaMock = prisma as unknown as PrismaMock;
const getServerSessionMock = vi.mocked(getServerSession);

const NOW = new Date('2026-08-12T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function plan(overrides: Record<string, unknown>) {
  return {
    id: 'plan-x',
    name: 'Plan',
    goal: 'HYPERTROPHY',
    durationWeeks: 8,
    daysPerWeek: 3,
    split: 'full_body',
    status: 'ACTIVE',
    startDate: daysAgo(15),
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/plans', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET()).status).toBe(401);
  });

  it('ordena con el activo primero: ACTIVE, PAUSED, COMPLETED, CANCELLED', async () => {
    // llegan ordenados por fecha desc, mezclados por estado
    prismaMock.plan.findMany.mockResolvedValue([
      plan({ id: 'p-completed', status: 'COMPLETED' }),
      plan({ id: 'p-cancelled', status: 'CANCELLED' }),
      plan({ id: 'p-active', status: 'ACTIVE' }),
      plan({ id: 'p-paused', status: 'PAUSED' }),
    ]);

    const body = await (await GET()).json();

    expect(body.plans.map((p: { id: string }) => p.id)).toEqual([
      'p-active',
      'p-paused',
      'p-completed',
      'p-cancelled',
    ]);
  });

  it('calcula el progreso del plan activo por semanas transcurridas', async () => {
    // 15 días → semana 3 de 8 → 38%
    prismaMock.plan.findMany.mockResolvedValue([
      plan({ status: 'ACTIVE', startDate: daysAgo(15), durationWeeks: 8 }),
    ]);

    const body = await (await GET()).json();

    expect(body.plans[0].progress).toBe(38);
  });

  it('el progreso queda en 100 para COMPLETED, tope 100 para activos vencidos, 0 para CANCELLED', async () => {
    prismaMock.plan.findMany.mockResolvedValue([
      plan({ id: 'p1', status: 'COMPLETED' }),
      plan({ id: 'p2', status: 'ACTIVE', startDate: daysAgo(365), durationWeeks: 4 }),
      plan({ id: 'p3', status: 'CANCELLED' }),
    ]);

    const body = await (await GET()).json();
    const byId = Object.fromEntries(
      body.plans.map((p: { id: string; progress: number }) => [p.id, p.progress])
    );

    expect(byId).toEqual({ p1: 100, p2: 100, p3: 0 });
  });

  it('solo lista planes del usuario de la sesión', async () => {
    prismaMock.plan.findMany.mockResolvedValue([]);

    await GET();

    expect(prismaMock.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('devuelve 500 controlado si la DB falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.plan.findMany.mockRejectedValue(new Error('DB caída'));

    expect((await GET()).status).toBe(500);
  });
});
