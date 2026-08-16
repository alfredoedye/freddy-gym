import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { searchExercises } from '@/lib/exercises';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prismaMock = prisma as unknown as PrismaMock;

beforeEach(() => {
  resetPrismaMock(prismaMock);
  prismaMock.exercise.findMany.mockResolvedValue([]);
  prismaMock.exercise.count.mockResolvedValue(0);
});

function whereArg() {
  return prismaMock.exercise.findMany.mock.calls[0][0].where;
}

describe('searchExercises', () => {
  it('mapea categorías en español a los valores del dataset ("piernas" cubre ambas)', async () => {
    await searchExercises({ bodyPart: 'piernas' });

    expect(whereArg().bodyPart).toEqual({ in: ['upper legs', 'lower legs'] });
  });

  it('el filtro "todos" no restringe nada', async () => {
    await searchExercises({ bodyPart: 'todos', equipment: 'todos' });

    expect(whereArg()).toEqual({});
  });

  it('mapea equipamiento conocido en español al valor del dataset', async () => {
    await searchExercises({ equipment: 'Mancuernas' });

    expect(whereArg().equipment).toBe('dumbbell');
  });

  it('equipamiento desconocido cae a búsqueda contains case-insensitive', async () => {
    await searchExercises({ equipment: 'trineo' });

    expect(whereArg().equipment).toEqual({ contains: 'trineo', mode: 'insensitive' });
  });

  it('busca por nombre con trim y case-insensitive; ignora búsquedas en blanco', async () => {
    await searchExercises({ search: '  press banca  ' });
    expect(whereArg().name).toEqual({ contains: 'press banca', mode: 'insensitive' });

    resetPrismaMock(prismaMock);
    prismaMock.exercise.findMany.mockResolvedValue([]);
    prismaMock.exercise.count.mockResolvedValue(0);
    await searchExercises({ search: '   ' });
    expect(whereArg().name).toBeUndefined();
  });

  it('pagina con skip/take y calcula totalPages hacia arriba', async () => {
    prismaMock.exercise.count.mockResolvedValue(25);

    const result = await searchExercises({ page: 3, limit: 10 });

    const args = prismaMock.exercise.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(3);
  });
});
