import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/plans/[planId]/activate/route';
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

const routeParams = { params: { planId: 'plan-2' } };

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('POST /api/plans/[planId]/activate', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/plans/plan-2/activate'), routeParams);
    expect(response.status).toBe(401);
  });

  it('devuelve 404 si el plan no pertenece al usuario', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const response = await POST(jsonRequest('/api/plans/plan-2/activate'), routeParams);

    expect(response.status).toBe(404);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('activa el plan, pausa los otros ACTIVE y reinicia startDate', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-2', userId: 'user-1' });
    const activated = { id: 'plan-2', status: 'ACTIVE' };
    prismaMock.plan.update.mockResolvedValue(activated);

    const response = await POST(jsonRequest('/api/plans/plan-2/activate'), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan.id).toBe('plan-2');

    // pausa cualquier otro plan activo del usuario, excluyendo el objetivo
    expect(prismaMock.plan.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE', id: { not: 'plan-2' } },
      data: { status: 'PAUSED' },
    });
    expect(prismaMock.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-2' },
      data: expect.objectContaining({ status: 'ACTIVE', startDate: expect.any(Date) }),
    });
  });

  it('devuelve 500 controlado si la transacción falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-2', userId: 'user-1' });
    prismaMock.$transaction.mockRejectedValue(new Error('DB caída'));

    const response = await POST(jsonRequest('/api/plans/plan-2/activate'), routeParams);
    expect(response.status).toBe(500);
  });
});
