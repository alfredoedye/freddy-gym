import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/auth/register/route';
import { jsonRequest } from '../helpers/api';
import { resetPrismaMock, type PrismaMock } from '../helpers/prisma-mock';

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('../helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prismaMock = prisma as unknown as PrismaMock;

const validBody = {
  name: 'Freddy',
  email: 'freddy@example.com',
  password: 'supersegura1',
};

beforeEach(() => {
  resetPrismaMock(prismaMock);
});

describe('POST /api/auth/register', () => {
  it('crea el usuario con la contraseña hasheada (nunca en texto plano)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'user-1' });

    const response = await POST(jsonRequest('/api/auth/register', validBody));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, userId: 'user-1' });

    const createArgs = prismaMock.user.create.mock.calls[0][0];
    expect(createArgs.data.password).not.toBe(validBody.password);
    expect(await bcrypt.compare(validBody.password, createArgs.data.password)).toBe(true);
  });

  it('rechaza un email inválido con 400', async () => {
    const response = await POST(
      jsonRequest('/api/auth/register', { ...validBody, email: 'no-es-un-email' })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Correo electrónico inválido');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas de menos de 8 caracteres con 400', async () => {
    const response = await POST(
      jsonRequest('/api/auth/register', { ...validBody, password: 'corta12' })
    );

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rechaza un nombre de menos de 2 caracteres con 400', async () => {
    const response = await POST(jsonRequest('/api/auth/register', { ...validBody, name: 'F' }));

    expect(response.status).toBe(400);
  });

  it('devuelve 409 si ya existe una cuenta con ese email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-existente' });

    const response = await POST(jsonRequest('/api/auth/register', validBody));

    expect(response.status).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('devuelve 500 controlado ante un body que no es JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(jsonRequest('/api/auth/register', '{esto no es json'));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Error interno del servidor');
  });

  it('devuelve 500 controlado si la DB falla al crear', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error('DB caída'));

    const response = await POST(jsonRequest('/api/auth/register', validBody));

    expect(response.status).toBe(500);
  });
});
