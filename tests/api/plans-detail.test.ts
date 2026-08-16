import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET, DELETE } from '@/app/api/plans/[planId]/route';
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
const getReq = () => jsonRequest('/api/plans/plan-1', undefined, 'GET');
const deleteReq = () => jsonRequest('/api/plans/plan-1', undefined, 'DELETE');

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('GET /api/plans/[planId]', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET(getReq(), routeParams)).status).toBe(401);
  });

  it('devuelve 404 si el plan no es del usuario (la consulta filtra por userId)', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const response = await GET(getReq(), routeParams);

    expect(response.status).toBe(404);
    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1', userId: 'user-1' },
      })
    );
  });

  it('devuelve el plan con días y ejercicios', async () => {
    const fullPlan = { id: 'plan-1', name: 'Mi Plan', planDays: [{ dayNumber: 1 }] };
    prismaMock.plan.findFirst.mockResolvedValue(fullPlan);

    const response = await GET(getReq(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan.id).toBe('plan-1');
    expect(body.plan.planDays).toHaveLength(1);
  });
});

describe('DELETE /api/plans/[planId]', () => {
  it('devuelve 404 si el plan no es del usuario, sin tocar nada', async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const response = await DELETE(deleteReq(), routeParams);

    expect(response.status).toBe(404);
    expect(prismaMock.plan.delete).not.toHaveBeenCalled();
    expect(prismaMock.plan.update).not.toHaveBeenCalled();
  });

  it('borra de verdad un plan sin entrenamientos registrados', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-1', userId: 'user-1' });
    prismaMock.workoutSession.count.mockResolvedValue(0);

    const response = await DELETE(deleteReq(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('deleted');
    expect(prismaMock.plan.delete).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
    expect(prismaMock.plan.update).not.toHaveBeenCalled();
  });

  it('cancela (no borra) un plan con historial, para no perder los datos', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-1', userId: 'user-1' });
    prismaMock.workoutSession.count.mockResolvedValue(5);
    prismaMock.plan.update.mockResolvedValue({ id: 'plan-1', status: 'CANCELLED' });

    const response = await DELETE(deleteReq(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('cancelled');
    expect(prismaMock.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: expect.objectContaining({ status: 'CANCELLED', endDate: expect.any(Date) }),
    });
    expect(prismaMock.plan.delete).not.toHaveBeenCalled();
  });
});
