/**
 * Helpers para invocar route handlers de Next.js directamente en tests.
 */

import { NextRequest } from 'next/server';

/**
 * Construye un NextRequest con body JSON.
 * Si `body` es un string se envía tal cual (para simular JSON malformado).
 */
export function jsonRequest(path: string, body?: unknown, method = 'POST'): NextRequest {
  const init: Record<string, unknown> = {
    method,
    headers: { 'content-type': 'application/json' },
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    // Node exige `duplex` cuando un Request lleva body
    init.duplex = 'half';
  }

  return new NextRequest(
    `http://localhost:3000${path}`,
    init as ConstructorParameters<typeof NextRequest>[1]
  );
}

/** Sesión NextAuth mínima, como la devuelve getServerSession. */
export function authedSession(userId = 'user-1') {
  return { user: { id: userId } };
}
