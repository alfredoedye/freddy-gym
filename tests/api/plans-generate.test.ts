import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { generateTrainingPlan } from '@/lib/ai/generate-plan';
import { savePlanToDatabase } from '@/lib/ai/save-plan';
import { POST } from '@/app/api/plans/generate/route';
import { jsonRequest, authedSession } from '../helpers/api';
import { buildGeneratedPlan } from '../helpers/fixtures';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ai/generate-plan', () => ({ generateTrainingPlan: vi.fn() }));
vi.mock('@/lib/ai/save-plan', () => ({ savePlanToDatabase: vi.fn() }));

const prismaMock = prisma as unknown as PrismaMock;
const getServerSessionMock = vi.mocked(getServerSession);
const generateMock = vi.mocked(generateTrainingPlan);
const saveMock = vi.mocked(savePlanToDatabase);

const validBody = {
  goal: 'HYPERTROPHY',
  durationWeeks: 8,
  daysPerWeek: 3,
  split: 'full_body',
};

const savedPlan = { id: 'plan-1', name: 'Plan de prueba' };

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  generateMock.mockReset();
  saveMock.mockReset();

  getServerSessionMock.mockResolvedValue(authedSession() as never);
  prismaMock.plan.findFirst.mockResolvedValue(null); // sin plan reciente
  prismaMock.plan.count.mockResolvedValue(0); // sin generaciones hoy
  generateMock.mockResolvedValue({ success: true, plan: buildGeneratedPlan() });
  saveMock.mockResolvedValue(savedPlan as never);
});

describe('POST /api/plans/generate', () => {
  it('devuelve 401 sin sesión y no toca la DB ni el LLM', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/plans/generate', validBody));

    expect(response.status).toBe(401);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('genera y guarda el plan para el usuario de la sesión (caso feliz)', async () => {
    const response = await POST(jsonRequest('/api/plans/generate', validBody));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.plan.id).toBe('plan-1');

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', goal: 'HYPERTROPHY', daysPerWeek: 3 })
    );
    expect(saveMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({ planName: 'Plan de prueba' })
    );
  });

  it('es idempotente: con un plan creado hace <2 min devuelve 409 sin generar otro', async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: 'plan-reciente' });

    const response = await POST(jsonRequest('/api/plans/generate', validBody));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.existingPlanId).toBe('plan-reciente');
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('corta con 429 al llegar al tope diario de generaciones', async () => {
    prismaMock.plan.count.mockResolvedValue(10);

    const response = await POST(jsonRequest('/api/plans/generate', validBody));

    expect(response.status).toBe(429);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('todavía permite generar con 9 generaciones en el día', async () => {
    prismaMock.plan.count.mockResolvedValue(9);

    const response = await POST(jsonRequest('/api/plans/generate', validBody));

    expect(response.status).toBe(201);
  });

  it('rechaza un body inválido con 400 y detalle por campo', async () => {
    const response = await POST(
      jsonRequest('/api/plans/generate', { ...validBody, daysPerWeek: 8, goal: 'CARDIO' })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.details).toHaveProperty('daysPerWeek');
    expect(body.details).toHaveProperty('goal');
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si previousPlanId no pertenece al usuario', async () => {
    prismaMock.plan.findFirst
      .mockResolvedValueOnce(null) // chequeo de plan reciente
      .mockResolvedValueOnce(null); // chequeo de ownership del plan anterior

    const response = await POST(
      jsonRequest('/api/plans/generate', { ...validBody, previousPlanId: 'plan-ajeno' })
    );

    expect(response.status).toBe(404);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('acepta previousPlanId propio y lo pasa a la generación', async () => {
    prismaMock.plan.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'plan-previo' });

    const response = await POST(
      jsonRequest('/api/plans/generate', { ...validBody, previousPlanId: 'plan-previo' })
    );

    expect(response.status).toBe(201);
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ previousPlanId: 'plan-previo' })
    );
  });

  it('devuelve 500 con el mensaje de error si la generación falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    generateMock.mockResolvedValue({
      success: false,
      error: 'No se pudo generar un plan válido después de varios intentos',
    });

    const response = await POST(jsonRequest('/api/plans/generate', validBody));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('No se pudo generar');
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('devuelve 500 controlado si el guardado en DB explota', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    saveMock.mockRejectedValue(new Error('transacción vencida'));

    const response = await POST(jsonRequest('/api/plans/generate', validBody));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Error interno del servidor');
  });
});
