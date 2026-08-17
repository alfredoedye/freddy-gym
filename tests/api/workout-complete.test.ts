import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PATCH } from '@/app/api/workouts/[sessionId]/complete/route';
import { jsonRequest, authedSession } from '../helpers/api';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const prismaMock = prisma as unknown as PrismaMock;
const getServerSessionMock = vi.mocked(getServerSession);

const routeParams = { params: { sessionId: 'session-1' } };

function complete(body?: unknown) {
  return PATCH(jsonRequest('/api/workouts/session-1/complete', body, 'PATCH'), routeParams);
}

const startedAt = new Date('2026-08-12T10:00:00Z');

function mkSet(exerciseId: string, name: string, weight: number | null, reps: number) {
  return { exerciseId, weight, reps, exercise: { name } };
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('PATCH /api/workouts/[sessionId]/complete', () => {
  it('devuelve 401 sin sesión de usuario', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await complete()).status).toBe(401);
  });

  it('devuelve 404 si la sesión no existe o es de otro usuario', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue(null);
    expect((await complete()).status).toBe(404);

    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'otro-usuario',
      sets: [],
    });
    expect((await complete()).status).toBe(404);
    expect(prismaMock.workoutSession.update).not.toHaveBeenCalled();
  });

  it('completa la sesión y calcula duración, volumen y mejores series', async () => {
    const completedAt = new Date('2026-08-12T11:05:00Z'); // 65 min
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      startedAt,
      completedAt: null,
      notes: null,
      sets: [
        mkSet('ex-1', 'Press banca', 80, 8),
        mkSet('ex-1', 'Press banca', 100, 5), // mejor por peso
        mkSet('ex-1', 'Press banca', 100, 3), // mismo peso, menos reps: pierde
        mkSet('ex-2', 'Dominadas', null, 12), // peso corporal
      ],
    });
    prismaMock.workoutSession.update.mockResolvedValue({
      id: 'session-1',
      completedAt,
    });

    const response = await complete({ notes: 'buena sesión' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.duration).toBe('1h 5min');
    expect(body.stats.totalVolume).toBe(80 * 8 + 100 * 5 + 100 * 3);
    expect(body.stats.totalSets).toBe(4);
    expect(body.stats.exercisesCompleted).toBe(2);
    // mejores series: por ejercicio, mayor peso y a igual peso más reps
    expect(body.stats.bestSets[0]).toMatchObject({
      exerciseName: 'Press banca',
      weight: 100,
      reps: 5,
    });
    expect(body.stats.bestSets[1]).toMatchObject({ exerciseName: 'Dominadas', reps: 12 });

    expect(prismaMock.workoutSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({ notes: 'buena sesión', completedAt: expect.any(Date) }),
    });
  });

  it('es idempotente: si ya estaba completada conserva el completedAt original', async () => {
    const originalCompletedAt = new Date('2026-08-12T11:00:00Z');
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      startedAt,
      completedAt: originalCompletedAt,
      notes: 'ya estaba',
      sets: [],
    });
    prismaMock.workoutSession.update.mockResolvedValue({
      id: 'session-1',
      completedAt: originalCompletedAt,
    });

    const response = await complete();

    expect(response.status).toBe(200);
    expect(prismaMock.workoutSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({ completedAt: originalCompletedAt }),
    });
  });

  it('tolera un body vacío o no-JSON (las notas son opcionales)', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      startedAt,
      completedAt: null,
      notes: null,
      sets: [],
    });
    prismaMock.workoutSession.update.mockResolvedValue({
      id: 'session-1',
      completedAt: new Date('2026-08-12T10:45:00Z'),
    });

    const response = await complete(); // sin body
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.duration).toBe('45 min');
  });
});
