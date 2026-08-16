import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getExerciseHistory, getPersonalRecords } from '@/lib/progress';
import { GET } from '@/app/api/progress/exercise/[id]/route';
import { jsonRequest, authedSession } from '../helpers/api';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/progress', () => ({
  getExerciseHistory: vi.fn(async () => []),
  getPersonalRecords: vi.fn(async () => []),
}));

const prismaMock = prisma as unknown as PrismaMock;
const getServerSessionMock = vi.mocked(getServerSession);
const historyMock = vi.mocked(getExerciseHistory);

const routeParams = { params: { id: 'ex-1' } };
const req = () => jsonRequest('/api/progress/exercise/ex-1', undefined, 'GET');

function historyEntry(bestWeight: number) {
  return { date: '2026-08-01', bestWeight, bestReps: 8, totalVolume: 1000, sets: 3 };
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  historyMock.mockReset();
  historyMock.mockResolvedValue([]);
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.exercise.findUnique.mockResolvedValue({ id: 'ex-1', name: 'Press banca' });
});

describe('GET /api/progress/exercise/[id]', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET(req(), routeParams)).status).toBe(401);
  });

  it('devuelve 404 si el ejercicio no existe', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue(null);

    expect((await GET(req(), routeParams)).status).toBe(404);
  });

  it('con menos de 4 sesiones la tendencia queda "stable"', async () => {
    historyMock.mockResolvedValue([historyEntry(50), historyEntry(80)] as never);

    const body = await (await GET(req(), routeParams)).json();

    expect(body.trend).toBe('stable');
    expect(body.totalSessions).toBe(2);
  });

  it('detecta tendencia ascendente comparando el primer y último cuarto del historial', async () => {
    historyMock.mockResolvedValue([
      historyEntry(50),
      historyEntry(55),
      historyEntry(60),
      historyEntry(70),
    ] as never);

    const body = await (await GET(req(), routeParams)).json();

    expect(body.trend).toBe('up'); // 70 > 50 × 1.05
  });

  it('detecta tendencia descendente', async () => {
    historyMock.mockResolvedValue([
      historyEntry(70),
      historyEntry(65),
      historyEntry(60),
      historyEntry(50),
    ] as never);

    const body = await (await GET(req(), routeParams)).json();

    expect(body.trend).toBe('down'); // 50 < 70 × 0.95
  });

  it('devuelve el ejercicio, historial y récords del usuario de la sesión', async () => {
    historyMock.mockResolvedValue([historyEntry(80)] as never);

    const body = await (await GET(req(), routeParams)).json();

    expect(body.exercise.id).toBe('ex-1');
    expect(body.history).toHaveLength(1);
    expect(historyMock).toHaveBeenCalledWith('user-1', 'ex-1');
  });
});
