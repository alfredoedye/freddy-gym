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

describe('searchExercises con favoritos', () => {
  beforeEach(() => {
    prismaMock.favoriteExercise.findMany.mockResolvedValue([{ exerciseId: 'fav-1' }]);
  });

  it('sin userId no consulta favoritos ni marca isFavorite', async () => {
    prismaMock.exercise.findMany.mockResolvedValue([{ id: 'ex-1' }]);
    prismaMock.exercise.count.mockResolvedValue(1);

    const result = await searchExercises({});

    expect(prismaMock.favoriteExercise.findMany).not.toHaveBeenCalled();
    expect(result.exercises[0].isFavorite).toBeUndefined();
  });

  it('con userId marca isFavorite en cada resultado', async () => {
    prismaMock.exercise.findMany.mockResolvedValue([{ id: 'fav-1' }, { id: 'otro' }]);
    prismaMock.exercise.count.mockResolvedValue(2);

    const result = await searchExercises({ userId: 'user-1' });

    expect(result.exercises).toEqual([
      { id: 'fav-1', isFavorite: true },
      { id: 'otro', isFavorite: false },
    ]);
  });

  it('favoritesOnly restringe a los ids favoritos del usuario', async () => {
    await searchExercises({ userId: 'user-1', favoritesOnly: true });

    expect(whereArg().id).toEqual({ in: ['fav-1'] });
  });

  it('favoritesFirst antepone favoritos y pagina como una sola lista', async () => {
    // favTotal=1, restTotal=4 (Promise.all: primero favoritos, después el resto)
    prismaMock.exercise.count.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    prismaMock.exercise.findMany
      .mockResolvedValueOnce([{ id: 'fav-1' }])
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);

    const result = await searchExercises({
      userId: 'user-1',
      favoritesFirst: true,
      page: 1,
      limit: 3,
    });

    expect(result.exercises.map((e: { id: string }) => e.id)).toEqual(['fav-1', 'a', 'b']);
    expect(result.exercises[0].isFavorite).toBe(true);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(2);

    // La segunda consulta excluye favoritos y solo completa el límite restante
    const secondCall = prismaMock.exercise.findMany.mock.calls[1][0];
    expect(secondCall.where.id).toEqual({ notIn: ['fav-1'] });
    expect(secondCall.take).toBe(2);
    expect(secondCall.skip).toBe(0);
  });

  it('favoritesFirst en páginas posteriores saltea los favoritos ya listados', async () => {
    // favTotal=1, restTotal=10 — página 2 con límite 3 arranca en el offset 3,
    // que cae dentro del "resto": skip = offset - favTotal = 2
    prismaMock.exercise.count.mockResolvedValueOnce(1).mockResolvedValueOnce(10);
    prismaMock.exercise.findMany.mockResolvedValueOnce([{ id: 'c' }, { id: 'd' }, { id: 'e' }]);

    const result = await searchExercises({
      userId: 'user-1',
      favoritesFirst: true,
      page: 2,
      limit: 3,
    });

    expect(prismaMock.exercise.findMany).toHaveBeenCalledTimes(1);
    const call = prismaMock.exercise.findMany.mock.calls[0][0];
    expect(call.where.id).toEqual({ notIn: ['fav-1'] });
    expect(call.skip).toBe(2);
    expect(call.take).toBe(3);
    expect(result.exercises.map((e: { id: string }) => e.id)).toEqual(['c', 'd', 'e']);
  });
});
