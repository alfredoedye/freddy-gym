import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PATCH } from '@/app/api/plans/[planId]/exercises/[exerciseId]/route';
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

const routeParams = { params: { planId: 'plan-1', exerciseId: 'pe-1' } };

function patch(body: unknown) {
  return PATCH(jsonRequest('/api/plans/plan-1/exercises/pe-1', body, 'PATCH'), routeParams);
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.planExercise.findFirst.mockResolvedValue({ id: 'pe-1' });
  prismaMock.planExercise.update.mockResolvedValue({ id: 'pe-1', sets: 4 });
});

describe('PATCH /api/plans/[planId]/exercises/[exerciseId]', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await patch({ sets: 4 })).status).toBe(401);
  });

  it('devuelve 404 si el ejercicio no pertenece a un plan del usuario', async () => {
    prismaMock.planExercise.findFirst.mockResolvedValue(null);

    const response = await patch({ sets: 4 });

    expect(response.status).toBe(404);
    // el ownership se verifica a través de la cadena planDay → plan → userId
    expect(prismaMock.planExercise.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'pe-1',
        planDay: { planId: 'plan-1', plan: { userId: 'user-1' } },
      },
    });
  });

  it('actualiza la prescripción (series, reps, descanso, notas)', async () => {
    const response = await patch({ sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120, notes: 'lento' });

    expect(response.status).toBe(200);
    expect(prismaMock.planExercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pe-1' },
        data: { sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120, notes: 'lento' },
      })
    );
  });

  it('rechaza repsMin > repsMax con 400', async () => {
    const response = await patch({ repsMin: 12, repsMax: 8 });

    expect(response.status).toBe(400);
    expect(prismaMock.planExercise.update).not.toHaveBeenCalled();
  });

  it('al reemplazar el ejercicio, verifica que el nuevo exista en el catálogo', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue(null);

    const response = await patch({ exerciseId: 'ex-inexistente' });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('El ejercicio elegido no existe');
    expect(prismaMock.planExercise.update).not.toHaveBeenCalled();
  });

  it('reemplaza el ejercicio cuando el nuevo existe', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue({ id: 'ex-2' });

    const response = await patch({ exerciseId: 'ex-2' });

    expect(response.status).toBe(200);
    expect(prismaMock.planExercise.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { exerciseId: 'ex-2' } })
    );
  });
});
