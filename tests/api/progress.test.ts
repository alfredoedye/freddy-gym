import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import {
  calculateWeeklyVolume,
  calculateWeeklyFrequency,
  calculateStreak,
  getTotalStats,
  getBodyPartDistribution,
  getExerciseProgressList,
  getPersonalRecords,
} from '@/lib/progress';
import { GET } from '@/app/api/progress/route';
import { jsonRequest, authedSession } from '../helpers/api';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/progress', () => ({
  calculateWeeklyVolume: vi.fn(async () => []),
  calculateWeeklyFrequency: vi.fn(async () => []),
  calculateStreak: vi.fn(async () => 3),
  getTotalStats: vi.fn(async () => ({ totalSessions: 10 })),
  getBodyPartDistribution: vi.fn(async () => []),
  getExerciseProgressList: vi.fn(async () => []),
  getPersonalRecords: vi.fn(async () => []),
}));

const getServerSessionMock = vi.mocked(getServerSession);
const volumeMock = vi.mocked(calculateWeeklyVolume);
const frequencyMock = vi.mocked(calculateWeeklyFrequency);
const streakMock = vi.mocked(calculateStreak);
const totalStatsMock = vi.mocked(getTotalStats);
const bodyPartMock = vi.mocked(getBodyPartDistribution);
const progressListMock = vi.mocked(getExerciseProgressList);
const recordsMock = vi.mocked(getPersonalRecords);

const req = (qs = '') => jsonRequest(`/api/progress${qs}`, undefined, 'GET');

beforeEach(() => {
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  vi.mocked(volumeMock).mockClear();
  vi.mocked(frequencyMock).mockClear();
  vi.mocked(streakMock).mockClear();
  vi.mocked(totalStatsMock).mockClear();
  vi.mocked(bodyPartMock).mockClear();
  vi.mocked(progressListMock).mockClear();
  vi.mocked(recordsMock).mockClear();
});

describe('GET /api/progress', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET(req())).status).toBe(401);
  });

  it('el tab por defecto es "resumen" con período de 8 semanas', async () => {
    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('weeklyVolume');
    expect(body).toHaveProperty('weeklyFrequency');
    expect(body.streak).toBe(3);
    expect(body.totalStats.totalSessions).toBe(10);
    expect(volumeMock).toHaveBeenCalledWith('user-1', 8);
  });

  it('parsea el período: "4w" → 4 semanas, "all" → sin límite, basura → 8', async () => {
    await GET(req('?period=4w'));
    expect(volumeMock).toHaveBeenLastCalledWith('user-1', 4);

    await GET(req('?period=all'));
    expect(volumeMock).toHaveBeenLastCalledWith('user-1', null);

    await GET(req('?period=basura'));
    expect(volumeMock).toHaveBeenLastCalledWith('user-1', 8);
  });

  it('el tab "ejercicios" devuelve lista de progreso y récords', async () => {
    const response = await GET(req('?tab=ejercicios'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('exercises');
    expect(body).toHaveProperty('personalRecords');
    expect(progressListMock).toHaveBeenCalledWith('user-1');
    expect(volumeMock).not.toHaveBeenCalled();
  });

  it('el tab "cuerpo" devuelve la distribución por grupo muscular con el período', async () => {
    const response = await GET(req('?tab=cuerpo&period=12w'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('bodyPartDistribution');
    expect(bodyPartMock).toHaveBeenCalledWith('user-1', 12);
  });

  it('rechaza un tab desconocido con 400', async () => {
    expect((await GET(req('?tab=inexistente'))).status).toBe(400);
  });

  it('devuelve 500 controlado si un cálculo falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    streakMock.mockRejectedValueOnce(new Error('DB caída'));

    expect((await GET(req())).status).toBe(500);
  });
});
