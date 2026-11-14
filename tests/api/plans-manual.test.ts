import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import { POST } from '@/app/api/plans/manual/route';
import { jsonRequest, authedSession } from '../helpers/api';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ai/save-plan', () => ({ savePlanToDatabase: vi.fn() }));

const getServerSessionMock = vi.mocked(getServerSession);
const saveMock = vi.mocked(savePlanToDatabase);

const validBody = {
  name: 'Mi rutina',
  goal: 'HYPERTROPHY',
  durationWeeks: 12,
  trainingDays: [5, 1, 3],
};

beforeEach(() => {
  getServerSessionMock.mockReset();
  saveMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
  saveMock.mockResolvedValue({ id: 'plan-1' } as never);
});

describe('POST /api/plans/manual', () => {
  it('devuelve 401 sin sesión y no guarda nada', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/plans/manual', validBody));

    expect(response.status).toBe(401);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('crea el esqueleto de 7 días: los elegidos vacíos y numerados en orden, el resto descanso', async () => {
    const response = await POST(jsonRequest('/api/plans/manual', validBody));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.plan.id).toBe('plan-1');

    const [userId, input, plan] = saveMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(input).toMatchObject({ daysPerWeek: 3, split: 'custom', durationWeeks: 12 });
    expect(plan.planName).toBe('Mi rutina');
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((d) => d.exercises.length === 0)).toBe(true);
    expect(plan.days.filter((d) => !d.isRest).map((d) => [d.dayNumber, d.name])).toEqual([
      [1, 'Día 1'],
      [3, 'Día 2'],
      [5, 'Día 3'],
    ]);
  });

  it.each([
    ['sin días de entrenamiento', { ...validBody, trainingDays: [] }],
    ['con días repetidos', { ...validBody, trainingDays: [1, 1] }],
    ['con un día fuera de rango', { ...validBody, trainingDays: [8] }],
    ['con nombre vacío', { ...validBody, name: '   ' }],
    ['con objetivo inexistente', { ...validBody, goal: 'YOGA' }],
    ['con JSON malformado', '{no es json'],
  ])('rechaza con 400 %s', async (_label, body) => {
    const response = await POST(jsonRequest('/api/plans/manual', body));

    expect(response.status).toBe(400);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
