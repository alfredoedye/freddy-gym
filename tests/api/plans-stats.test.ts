import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { getPlanStats } from '@/lib/plan-completion';
import { GET } from '@/app/api/plans/[planId]/stats/route';
import { jsonRequest, authedSession } from '../helpers/api';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/plan-completion', () => ({ getPlanStats: vi.fn() }));

const getServerSessionMock = vi.mocked(getServerSession);
const getPlanStatsMock = vi.mocked(getPlanStats);

const routeParams = { params: { planId: 'plan-1' } };
const req = () => jsonRequest('/api/plans/plan-1/stats', undefined, 'GET');

beforeEach(() => {
  getServerSessionMock.mockReset();
  getPlanStatsMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('GET /api/plans/[planId]/stats', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET(req(), routeParams)).status).toBe(401);
    expect(getPlanStatsMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el plan no existe o no es del usuario', async () => {
    getPlanStatsMock.mockResolvedValue(null);

    const response = await GET(req(), routeParams);

    expect(response.status).toBe(404);
    // el userId de la sesión viaja al cálculo — es lo que impide leer stats ajenas
    expect(getPlanStatsMock).toHaveBeenCalledWith('plan-1', 'user-1');
  });

  it('devuelve las estadísticas del plan', async () => {
    const stats = { planName: 'Mi Plan', completionRate: 85, totalVolume: 12000 };
    getPlanStatsMock.mockResolvedValue(stats as never);

    const response = await GET(req(), routeParams);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stats);
  });

  it('devuelve 500 controlado si el cálculo falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getPlanStatsMock.mockRejectedValue(new Error('DB caída'));

    expect((await GET(req(), routeParams)).status).toBe(500);
  });
});
