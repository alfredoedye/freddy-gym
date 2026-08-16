import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET, POST, PUT } from '@/app/api/profile/route';
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

// birthDate de alguien de ~30 años: siempre dentro del rango 14-80
const birthDate = new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const validBody = {
  name: 'Freddy',
  birthDate,
  sex: 'MALE',
  height: 180,
  weight: 80,
  goal: 'HYPERTROPHY',
  level: 'INTERMEDIATE',
};

beforeEach(() => {
  resetPrismaMock(prismaMock);
  getServerSessionMock.mockReset();
  getServerSessionMock.mockResolvedValue(authedSession() as never);
});

describe('GET /api/profile', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    expect((await GET()).status).toBe(401);
  });

  it('devuelve 404 si el usuario no tiene perfil', async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null);

    expect((await GET()).status).toBe(404);
  });

  it('devuelve el perfil del usuario de la sesión', async () => {
    const profile = { id: 'profile-1', userId: 'user-1', goal: 'STRENGTH' };
    prismaMock.profile.findUnique.mockResolvedValue(profile);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(profile);
    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});

describe('POST /api/profile', () => {
  it('devuelve 401 sin sesión', async () => {
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await POST(jsonRequest('/api/profile', validBody));
    expect(response.status).toBe(401);
  });

  it('devuelve 409 si el usuario ya tiene perfil', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-existente' });

    const response = await POST(jsonRequest('/api/profile', validBody));

    expect(response.status).toBe(409);
    expect(prismaMock.profile.create).not.toHaveBeenCalled();
  });

  it('rechaza con 400 a menores de 14 años', async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const twelveYearsAgo = new Date(Date.now() - 12 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const response = await POST(
      jsonRequest('/api/profile', { ...validBody, birthDate: twelveYearsAgo })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza con 400 medidas fuera de rango (altura, peso)', async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null);

    const r1 = await POST(jsonRequest('/api/profile', { ...validBody, height: 90 }));
    const r2 = await POST(jsonRequest('/api/profile', { ...validBody, weight: 250 }));

    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
  });

  it('crea el perfil y actualiza el nombre del usuario en una transacción', async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const created = { id: 'profile-1', userId: 'user-1', goal: 'HYPERTROPHY' };
    prismaMock.profile.create.mockResolvedValue(created);

    const response = await POST(jsonRequest('/api/profile', validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Freddy' },
    });
    const createArgs = prismaMock.profile.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.birthDate).toBeInstanceOf(Date);
  });
});

describe('PUT /api/profile', () => {
  it('acepta actualizaciones parciales sin tocar el nombre del usuario', async () => {
    const updated = { id: 'profile-1', weight: 82 };
    prismaMock.profile.update.mockResolvedValue(updated);

    const response = await PUT(jsonRequest('/api/profile', { weight: 82 }, 'PUT'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updated);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { weight: 82 },
    });
  });

  it('actualiza el nombre del usuario cuando viene en el body', async () => {
    prismaMock.profile.update.mockResolvedValue({ id: 'profile-1' });

    await PUT(jsonRequest('/api/profile', { name: 'Alfredo' }, 'PUT'));

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Alfredo' },
    });
  });

  it('rechaza valores parciales inválidos con 400', async () => {
    const response = await PUT(jsonRequest('/api/profile', { goal: 'CARDIO' }, 'PUT'));

    expect(response.status).toBe(400);
    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });
});
