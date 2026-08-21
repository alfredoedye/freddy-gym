import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST, DELETE } from '@/app/api/exercises/[id]/favorite/route';
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

const routeParams = { params: { id: 'ex-1' } };
const postReq = () => jsonRequest('/api/exercises/ex-1/favorite', undefined, 'POST');
const deleteReq = () => jsonRequest('/api/exercises/ex-1/favorite', undefined, 'DELETE');

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('POST /api/exercises/[id]/favorite', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await POST(postReq(), routeParams)).status).toBe(401);
  });

  it('devuelve 404 si el ejercicio no existe en el catálogo', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue(null);

    expect((await POST(postReq(), routeParams)).status).toBe(404);
    expect(prismaMock.favoriteExercise.upsert).not.toHaveBeenCalled();
  });

  it('marca el favorito con upsert (idempotente) para el usuario de la sesión', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue({ id: 'ex-1' });
    prismaMock.favoriteExercise.upsert.mockResolvedValue({});

    const response = await POST(postReq(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFavorite).toBe(true);
    expect(prismaMock.favoriteExercise.upsert).toHaveBeenCalledWith({
      where: { userId_exerciseId: { userId: 'user-1', exerciseId: 'ex-1' } },
      create: { userId: 'user-1', exerciseId: 'ex-1' },
      update: {},
    });
  });
});

describe('DELETE /api/exercises/[id]/favorite', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await DELETE(deleteReq(), routeParams)).status).toBe(401);
  });

  it('desmarca el favorito con deleteMany (no falla si no existía)', async () => {
    prismaMock.favoriteExercise.deleteMany.mockResolvedValue({ count: 0 });

    const response = await DELETE(deleteReq(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFavorite).toBe(false);
    expect(prismaMock.favoriteExercise.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', exerciseId: 'ex-1' },
    });
  });
});
