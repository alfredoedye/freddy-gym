/**
 * API Route: POST/DELETE /api/exercises/[id]/favorite
 * POST marca un ejercicio como favorito del usuario, DELETE lo desmarca.
 * Ambos son idempotentes: repetir la operación no falla.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id: params.id } });
    if (!exercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    await prisma.favoriteExercise.upsert({
      where: {
        userId_exerciseId: { userId: session.user.id, exerciseId: params.id },
      },
      create: { userId: session.user.id, exerciseId: params.id },
      update: {},
    });

    return NextResponse.json({ isFavorite: true });
  } catch (error) {
    console.error('Error en POST /api/exercises/[id]/favorite:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.favoriteExercise.deleteMany({
      where: { userId: session.user.id, exerciseId: params.id },
    });

    return NextResponse.json({ isFavorite: false });
  } catch (error) {
    console.error('Error en DELETE /api/exercises/[id]/favorite:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
