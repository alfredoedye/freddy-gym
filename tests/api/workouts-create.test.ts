import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/workouts/route';
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

const validBody = { planDayId: 'day-1', weekNumber: 2 };
const ownedPlanDay = { id: 'day-1', plan: { userId: 'user-1' } };

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.planDay.findUnique.mockResolvedValue(ownedPlanDay);
});

describe('POST /api/workouts', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/workouts', validBody));
    expect(response.status).toBe(401);
  });

  it('rechaza weekNumber inválido con 400', async () => {
    const response = await POST(jsonRequest('/api/workouts', { ...validBody, weekNumber: 0 }));

    expect(response.status).toBe(400);
    expect(prismaMock.workoutSession.create).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el día de plan no existe', async () => {
    prismaMock.planDay.findUnique.mockResolvedValue(null);

    const response = await POST(jsonRequest('/api/workouts', validBody));
    expect(response.status).toBe(404);
  });

  it('devuelve 404 si el día de plan pertenece a otro usuario', async () => {
    prismaMock.planDay.findUnique.mockResolvedValue({
      id: 'day-1',
      plan: { userId: 'otro-usuario' },
    });

    const response = await POST(jsonRequest('/api/workouts', validBody));

    expect(response.status).toBe(404);
    expect(prismaMock.workoutSession.create).not.toHaveBeenCalled();
  });

  it('reutiliza la sesión existente de ese día/semana en vez de duplicarla', async () => {
    const existing = { id: 'session-existente' };
    prismaMock.workoutSession.findUnique.mockResolvedValue(existing);

    const response = await POST(jsonRequest('/api/workouts', validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe('session-existente');
    expect(prismaMock.workoutSession.create).not.toHaveBeenCalled();
  });

  it('crea una sesión nueva con la clave usuario+día+semana (201)', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue(null);
    const created = { id: 'session-nueva' };
    prismaMock.workoutSession.create.mockResolvedValue(created);

    const response = await POST(jsonRequest('/api/workouts', validBody));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.session.id).toBe('session-nueva');
    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', planDayId: 'day-1', weekNumber: 2 },
    });
  });

  it('ante una carrera (P2002) devuelve la sesión ganadora en vez de fallar', async () => {
    const winner = { id: 'session-ganadora' };
    prismaMock.workoutSession.findUnique
      .mockResolvedValueOnce(null) // chequeo inicial: no existe todavía
      .mockResolvedValueOnce(winner); // releída tras perder la carrera
    prismaMock.workoutSession.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.14.0',
      })
    );

    const response = await POST(jsonRequest('/api/workouts', validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe('session-ganadora');
  });

  it('si tras el P2002 tampoco encuentra la fila, devuelve 500 controlado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.workoutSession.findUnique.mockResolvedValue(null);
    prismaMock.workoutSession.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.14.0',
      })
    );

    const response = await POST(jsonRequest('/api/workouts', validBody));
    expect(response.status).toBe(500);
  });
});
