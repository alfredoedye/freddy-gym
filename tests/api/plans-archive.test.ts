import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/plans/[planId]/archive/route';
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

const routeParams = { params: { planId: 'plan-1' } };
const req = () => jsonRequest('/api/plans/plan-1/archive', undefined, 'POST');

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.plan.update.mockImplementation(async ({ data }: { data: object }) => ({
    id: 'plan-1',
    ...data,
  }));
});

describe('POST /api/plans/[planId]/archive', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await POST(req(), routeParams)).status).toBe(401);
  });

  it('devuelve 404 si el plan no existe o no es del usuario', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    expect((await POST(req(), routeParams)).status).toBe(404);
    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith({
      where: { id: 'plan-1', userId: 'user-1' },
    });
  });

  it('archiva un plan terminado sin tocar su estado', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'COMPLETED' });

    const response = await POST(req(), routeParams);

    expect(response.status).toBe(200);
    const { data } = prismaMock.plan.update.mock.calls[0][0];
    expect(data.archivedAt).toBeInstanceOf(Date);
    expect(data.status).toBeUndefined();
    expect(data.endDate).toBeUndefined();
  });

  it('al archivar un plan activo además lo cancela para sacarlo del dashboard', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'ACTIVE' });

    const response = await POST(req(), routeParams);

    expect(response.status).toBe(200);
    const { data } = prismaMock.plan.update.mock.calls[0][0];
    expect(data.archivedAt).toBeInstanceOf(Date);
    expect(data.status).toBe('CANCELLED');
    expect(data.endDate).toBeInstanceOf(Date);
  });

  it('devuelve 500 controlado si la DB falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.plan.findFirst.mockRejectedValue(new Error('DB caída'));

    expect((await POST(req(), routeParams)).status).toBe(500);
  });
});
