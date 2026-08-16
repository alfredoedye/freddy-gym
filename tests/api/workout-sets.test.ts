import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/workouts/[sessionId]/sets/route';
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

const validSet = {
  exerciseId: 'ex-1',
  setNumber: 1,
  reps: 10,
  weight: 60,
  completed: true,
};

// Sesión de un día de plan que prescribe ex-1 con 4 series
const planSession = {
  id: 'session-1',
  userId: 'user-1',
  completedAt: null,
  planDay: {
    exercises: [{ exerciseId: 'ex-1', sets: 4 }],
  },
};

function postSet(body: unknown) {
  return POST(jsonRequest('/api/workouts/session-1/sets', body), routeParams);
}

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.workoutSession.findUnique.mockResolvedValue(planSession);
  prismaMock.workoutSet.upsert.mockResolvedValue({ id: 'set-1' });
});

describe('POST /api/workouts/[sessionId]/sets', () => {
  it('devuelve 401 sin sesión de usuario', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await postSet(validSet)).status).toBe(401);
  });

  it('devuelve 404 si la sesión de workout no existe', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue(null);

    expect((await postSet(validSet)).status).toBe(404);
  });

  it('devuelve 404 si la sesión pertenece a otro usuario (no filtra el motivo)', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      ...planSession,
      userId: 'otro-usuario',
    });

    expect((await postSet(validSet)).status).toBe(404);
    expect(prismaMock.workoutSet.upsert).not.toHaveBeenCalled();
  });

  it('no permite modificar sets de una sesión ya completada', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      ...planSession,
      completedAt: new Date(),
    });

    const response = await postSet(validSet);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('La sesión ya fue completada');
  });

  it('rechaza datos basura que ensuciarían PRs y progresión (peso, reps, rpe, serie)', async () => {
    expect((await postSet({ ...validSet, weight: 501 })).status).toBe(400);
    expect((await postSet({ ...validSet, reps: 201 })).status).toBe(400);
    expect((await postSet({ ...validSet, rpe: 11 })).status).toBe(400);
    expect((await postSet({ ...validSet, setNumber: 0 })).status).toBe(400);
    expect((await postSet({ ...validSet, setNumber: 51 })).status).toBe(400);
    expect(prismaMock.workoutSet.upsert).not.toHaveBeenCalled();
  });

  it('rechaza un ejercicio que no pertenece al día del plan', async () => {
    const response = await postSet({ ...validSet, exerciseId: 'ex-de-otro-dia' });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('El ejercicio no pertenece a este día del plan');
  });

  it('permite hasta 3 series extra sobre lo prescripto, no más', async () => {
    // prescripto: 4 series → 7 permitidas
    expect((await postSet({ ...validSet, setNumber: 7 })).status).toBe(200);
    expect((await postSet({ ...validSet, setNumber: 8 })).status).toBe(400);
  });

  it('hace upsert del set con completedAt cuando está completado', async () => {
    const response = await postSet(validSet);

    expect(response.status).toBe(200);
    expect(prismaMock.workoutSet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId_exerciseId_setNumber: {
            sessionId: 'session-1',
            exerciseId: 'ex-1',
            setNumber: 1,
          },
        },
        create: expect.objectContaining({ completed: true, completedAt: expect.any(Date) }),
        update: expect.objectContaining({ completed: true, completedAt: expect.any(Date) }),
      })
    );
  });

  it('al desmarcar un set guarda completedAt null y rpe null si no viene', async () => {
    await postSet({ ...validSet, completed: false, rpe: undefined });

    const args = prismaMock.workoutSet.upsert.mock.calls[0][0];
    expect(args.update.completedAt).toBeNull();
    expect(args.update.rpe).toBeNull();
  });

  it('acepta reps y weight en null (set planificado pero aún sin datos)', async () => {
    const response = await postSet({ ...validSet, reps: null, weight: null, completed: false });

    expect(response.status).toBe(200);
  });

  it('en sesiones libres (sin planDay) no exige que el ejercicio sea del plan', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      completedAt: null,
      planDay: null,
    });

    const response = await postSet({ ...validSet, exerciseId: 'cualquier-ejercicio', setNumber: 12 });

    expect(response.status).toBe(200);
  });

  it('devuelve 500 controlado si el upsert falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.workoutSet.upsert.mockRejectedValue(new Error('DB caída'));

    expect((await postSet(validSet)).status).toBe(500);
  });
});
