import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  calculateWeeklyVolume,
  calculateWeeklyFrequency,
  calculateStreak,
  getTotalStats,
  getPersonalRecords,
  getBodyPartDistribution,
  getExerciseProgressList,
  getExerciseHistory,
} from '@/lib/progress';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prismaMock = prisma as unknown as PrismaMock;

// Fecha fija (miércoles) para que las funciones que dependen de "hoy"
// (racha, filtros por semanas) sean deterministas.
const NOW = new Date('2026-08-12T12:00:00Z');

beforeEach(() => {
  resetPrismaMock(prismaMock);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function session(startedAt: string, extra: Record<string, unknown> = {}) {
  return { startedAt: new Date(startedAt), ...extra };
}

describe('getTotalStats', () => {
  it('agrega volumen, sets, duración promedio y ejercicios únicos', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      {
        startedAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: new Date('2026-08-10T11:00:00Z'), // 60 min
        sets: [
          { exerciseId: 'ex-1', weight: 100, reps: 5 },
          { exerciseId: 'ex-2', weight: 20, reps: 10 },
        ],
      },
      {
        startedAt: new Date('2026-08-11T10:00:00Z'),
        completedAt: new Date('2026-08-11T10:30:00Z'), // 30 min
        sets: [{ exerciseId: 'ex-1', weight: null, reps: 12 }], // peso corporal: volumen 0
      },
    ]);

    const stats = await getTotalStats('user-1');

    expect(stats).toEqual({
      totalSessions: 2,
      totalVolume: 700,
      avgSessionDuration: 45,
      totalSets: 3,
      totalExercises: 2,
    });
  });

  it('devuelve ceros sin dividir por cero cuando no hay sesiones', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([]);

    const stats = await getTotalStats('user-1');

    expect(stats.totalSessions).toBe(0);
    expect(stats.avgSessionDuration).toBe(0);
  });
});

describe('getPersonalRecords', () => {
  it('toma el mejor set por ejercicio (la DB ya ordena por peso desc) y ordena el resultado', async () => {
    prismaMock.workoutSet.findMany.mockResolvedValue([
      {
        exerciseId: 'ex-1',
        weight: 100,
        reps: 5,
        exercise: { name: 'Press banca', bodyPart: 'chest' },
        session: { startedAt: new Date('2026-08-01') },
      },
      {
        exerciseId: 'ex-2',
        weight: 120,
        reps: 3,
        exercise: { name: 'Sentadilla', bodyPart: 'upper legs' },
        session: { startedAt: new Date('2026-08-03') },
      },
      {
        // peso menor del mismo ejercicio: se ignora
        exerciseId: 'ex-1',
        weight: 90,
        reps: 8,
        exercise: { name: 'Press banca', bodyPart: 'chest' },
        session: { startedAt: new Date('2026-07-01') },
      },
    ]);

    const records = await getPersonalRecords('user-1');

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ exerciseId: 'ex-2', weight: 120 });
    expect(records[1]).toMatchObject({ exerciseId: 'ex-1', weight: 100, reps: 5 });
  });

  it('filtra por ejercicio cuando se pasa exerciseId', async () => {
    prismaMock.workoutSet.findMany.mockResolvedValue([]);

    await getPersonalRecords('user-1', 'ex-1');

    expect(prismaMock.workoutSet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ exerciseId: 'ex-1', session: { userId: 'user-1' } }),
      })
    );
  });
});

describe('getBodyPartDistribution', () => {
  it('agrupa volumen por parte del cuerpo con etiqueta en español y porcentaje', async () => {
    prismaMock.workoutSet.findMany.mockResolvedValue([
      { weight: 100, reps: 5, exercise: { bodyPart: 'chest' } }, // 500
      { weight: 50, reps: 10, exercise: { bodyPart: 'back' } }, // 500
      { weight: 100, reps: 10, exercise: { bodyPart: 'back' } }, // 1000
    ]);

    const result = await getBodyPartDistribution('user-1');

    expect(result[0]).toMatchObject({
      bodyPart: 'back',
      bodyPartLabel: 'Espalda',
      volume: 1500,
      percentage: 75,
    });
    expect(result[1]).toMatchObject({ bodyPart: 'chest', bodyPartLabel: 'Pecho', percentage: 25 });
  });

  it('usa el nombre crudo como etiqueta para partes del cuerpo desconocidas', async () => {
    prismaMock.workoutSet.findMany.mockResolvedValue([
      { weight: 10, reps: 10, exercise: { bodyPart: 'inventada' } },
    ]);

    const result = await getBodyPartDistribution('user-1');

    expect(result[0].bodyPartLabel).toBe('inventada');
  });

  it('acota por fecha cuando se pasan semanas', async () => {
    prismaMock.workoutSet.findMany.mockResolvedValue([]);

    await getBodyPartDistribution('user-1', 4);

    const where = prismaMock.workoutSet.findMany.mock.calls[0][0].where;
    expect(where.session.startedAt.gte).toBeInstanceOf(Date);
  });
});

describe('getExerciseProgressList', () => {
  it('calcula sesiones únicas, mejor peso y tendencia ascendente', async () => {
    const mk = (weight: number, day: string) => ({
      exerciseId: 'ex-1',
      weight,
      exercise: { name: 'Press banca', bodyPart: 'chest' },
      session: { startedAt: new Date(day) },
    });
    prismaMock.workoutSet.findMany.mockResolvedValue([
      mk(50, '2026-08-01T10:00:00Z'),
      mk(50, '2026-08-01T10:10:00Z'), // mismo día: 1 sesión
      mk(60, '2026-08-08T10:00:00Z'),
      mk(60, '2026-08-08T10:10:00Z'),
    ]);

    const result = await getExerciseProgressList('user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      exerciseId: 'ex-1',
      sessionCount: 2,
      bestWeight: 60,
      lastWeight: 60,
      trend: 'up', // último 25% (60) > primer 25% (50) × 1.05
    });
  });

  it('marca tendencia estable cuando el peso no varía más de ±5%', async () => {
    const mk = (weight: number, day: string) => ({
      exerciseId: 'ex-1',
      weight,
      exercise: { name: 'Press banca', bodyPart: 'chest' },
      session: { startedAt: new Date(day) },
    });
    prismaMock.workoutSet.findMany.mockResolvedValue([
      mk(50, '2026-08-01'),
      mk(51, '2026-08-08'),
    ]);

    const result = await getExerciseProgressList('user-1');
    expect(result[0].trend).toBe('stable');
  });
});

describe('getExerciseHistory', () => {
  it('elige el mejor set por sesión: mayor peso, y a igual peso más reps (peso corporal incluido)', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      {
        startedAt: new Date('2026-08-01T10:00:00Z'),
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 8 }, // mismo peso, más reps: gana
          { weight: 90, reps: 12 },
        ],
      },
      {
        startedAt: new Date('2026-08-08T10:00:00Z'),
        sets: [
          { weight: null, reps: 15 },
          { weight: null, reps: 20 }, // peso corporal: gana por reps
        ],
      },
    ]);

    const history = await getExerciseHistory('user-1', 'ex-1');

    expect(history[0]).toMatchObject({
      date: '2026-08-01',
      bestWeight: 100,
      bestReps: 8,
      totalVolume: 100 * 5 + 100 * 8 + 90 * 12,
      sets: 3,
    });
    expect(history[1]).toMatchObject({ bestWeight: 0, bestReps: 20, totalVolume: 0 });
  });
});

describe('calculateStreak', () => {
  it('devuelve 0 sin sesiones', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([]);

    expect(await calculateStreak('user-1')).toBe(0);
  });

  it('cuenta semanas consecutivas terminando en la semana actual', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      session('2026-08-12T10:00:00Z'), // esta semana
      session('2026-08-05T10:00:00Z'), // semana pasada
      session('2026-07-29T10:00:00Z'), // hace dos semanas
    ]);

    expect(await calculateStreak('user-1')).toBe(3);
  });

  it('la racha sigue viva si la última semana entrenada fue la anterior a la actual', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      session('2026-08-05T10:00:00Z'),
    ]);

    expect(await calculateStreak('user-1')).toBe(1);
  });

  it('se corta a 0 si la última semana entrenada quedó lejos', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      session('2026-07-22T10:00:00Z'), // hace 3 semanas
      session('2026-07-15T10:00:00Z'),
    ]);

    expect(await calculateStreak('user-1')).toBe(0);
  });

  it('un hueco en el medio corta la cuenta', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      session('2026-08-12T10:00:00Z'), // esta semana
      session('2026-07-22T10:00:00Z'), // hueco de 2 semanas
    ]);

    expect(await calculateStreak('user-1')).toBe(1);
  });
});

describe('calculateWeeklyVolume / calculateWeeklyFrequency', () => {
  it('agrupa el volumen por semana ISO ignorando pesos nulos', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      {
        startedAt: new Date('2026-08-03T10:00:00Z'),
        sets: [
          { weight: 100, reps: 5 },
          { weight: null, reps: 10 },
        ],
      },
      { startedAt: new Date('2026-08-05T10:00:00Z'), sets: [{ weight: 50, reps: 10 }] },
      { startedAt: new Date('2026-08-10T10:00:00Z'), sets: [{ weight: 80, reps: 10 }] },
    ]);

    const result = await calculateWeeklyVolume('user-1', 8);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ weekLabel: 'Sem 1', volume: 1000 });
    expect(result[1]).toMatchObject({ weekLabel: 'Sem 2', volume: 800 });
  });

  it('con weeks null no filtra por fecha (período "todo")', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([]);

    await calculateWeeklyVolume('user-1', null);

    const where = prismaMock.workoutSession.findMany.mock.calls[0][0].where;
    expect(where.startedAt).toBeUndefined();
  });

  it('cuenta sesiones por semana', async () => {
    prismaMock.workoutSession.findMany.mockResolvedValue([
      session('2026-08-03T10:00:00Z'),
      session('2026-08-05T10:00:00Z'),
      session('2026-08-10T10:00:00Z'),
    ]);

    const result = await calculateWeeklyFrequency('user-1', 8);

    expect(result.map((r) => r.sessions)).toEqual([2, 1]);
  });
});
