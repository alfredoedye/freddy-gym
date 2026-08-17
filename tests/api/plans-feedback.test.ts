import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/plans/feedback/route';
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

const validBody = { planId: 'plan-1', difficulty: 'JUST_RIGHT' };
const ownedPlan = { id: 'plan-1', userId: 'user-1', feedback: [] };

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.plan.findFirst.mockResolvedValue(ownedPlan);
});

describe('POST /api/plans/feedback', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/plans/feedback', validBody));
    expect(response.status).toBe(401);
  });

  it('guarda el feedback y marca el plan como COMPLETED en una transacción', async () => {
    const response = await POST(jsonRequest('/api/plans/feedback', validBody));

    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);

    expect(prismaMock.planFeedback.create).toHaveBeenCalledWith({
      data: { planId: 'plan-1', difficulty: 'JUST_RIGHT', notes: null },
    });
    expect(prismaMock.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: expect.objectContaining({ status: 'COMPLETED', endDate: expect.any(Date) }),
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('combina notas y grupos musculares difíciles en un solo campo de notas', async () => {
    await POST(
      jsonRequest('/api/plans/feedback', {
        ...validBody,
        notes: 'Muy bueno',
        muscleGroupFeedback: ['espalda', 'piernas'],
      })
    );

    expect(prismaMock.planFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notes: 'Muy bueno. Grupos musculares difíciles: espalda, piernas',
      }),
    });
  });

  it('rechaza una dificultad fuera del enum con 400', async () => {
    const response = await POST(
      jsonRequest('/api/plans/feedback', { ...validBody, difficulty: 'IMPOSSIBLE' })
    );

    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza notas de más de 2000 caracteres con 400', async () => {
    const response = await POST(
      jsonRequest('/api/plans/feedback', { ...validBody, notes: 'x'.repeat(2001) })
    );

    expect(response.status).toBe(400);
  });

  it('devuelve 404 si el plan no pertenece al usuario', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const response = await POST(jsonRequest('/api/plans/feedback', validBody));

    expect(response.status).toBe(404);
    expect(prismaMock.planFeedback.create).not.toHaveBeenCalled();
  });

  it('devuelve 409 si el plan ya tiene feedback (no lo duplica)', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({
      ...ownedPlan,
      feedback: [{ id: 'fb-existente' }],
    });

    const response = await POST(jsonRequest('/api/plans/feedback', validBody));

    expect(response.status).toBe(409);
    expect(prismaMock.planFeedback.create).not.toHaveBeenCalled();
  });

  it('devuelve 500 controlado si la transacción falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.$transaction.mockRejectedValue(new Error('deadlock'));

    const response = await POST(jsonRequest('/api/plans/feedback', validBody));

    expect(response.status).toBe(500);
  });
});
