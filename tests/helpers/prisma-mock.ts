/**
 * Mock explícito del singleton de Prisma (`@/lib/prisma`).
 * Cubre solo los modelos/métodos que usa el código bajo test — si una ruta
 * empieza a usar un método nuevo, agregarlo acá (el test va a fallar con
 * "not a function", que es la señal).
 *
 * Uso en un test:
 *   vi.mock('@/lib/prisma', async () => {
 *     const { createPrismaMock } = await import('../helpers/prisma-mock');
 *     return { prisma: createPrismaMock() };
 *   });
 */

import { vi, type Mock } from 'vitest';

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export function createPrismaMock() {
  const mock = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    profile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    plan: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    planDay: { findUnique: vi.fn() },
    planExercise: { findFirst: vi.fn(), update: vi.fn() },
    planFeedback: { create: vi.fn() },
    workoutSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workoutSet: { upsert: vi.fn(), findMany: vi.fn() },
    exercise: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  };

  applyTransactionDefault(mock);
  return mock;
}

// $transaction soporta las dos formas de Prisma:
// - array de promesas → las espera todas
// - callback interactivo → lo invoca pasándole el propio mock como `tx`
function applyTransactionDefault(mock: { $transaction: Mock }) {
  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
}

/** Resetea todos los métodos y reinstala el comportamiento de $transaction. */
export function resetPrismaMock(mock: PrismaMock) {
  for (const value of Object.values(mock)) {
    if (typeof value === 'function') {
      (value as Mock).mockReset();
    } else {
      for (const fn of Object.values(value)) {
        (fn as Mock).mockReset();
      }
    }
  }
  applyTransactionDefault(mock);
}
