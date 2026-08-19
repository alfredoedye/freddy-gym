/**
 * API Route: PATCH/DELETE /api/plans/[planId]/exercises/[exerciseId]
 * PATCH edita la prescripción de un ejercicio dentro de un plan (series, reps,
 * descanso, notas, orden) y/o lo reemplaza por otro ejercicio del catálogo.
 * DELETE lo quita del día por completo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const UpdatePlanExerciseSchema = z
  .object({
    sets: z.number().int().min(1).max(10).optional(),
    repsMin: z.number().int().min(1).max(50).optional(),
    repsMax: z.number().int().min(1).max(50).optional(),
    restSeconds: z.number().int().min(0).max(600).optional(),
    notes: z.string().max(200).nullable().optional(),
    exerciseId: z.string().min(1).optional(),
    // Solo se usa para reordenar dentro de la misma fase (ver handleMove en
    // plan/[id]/page.tsx) — el cliente calcula el swap entre dos vecinos y
    // manda dos PATCH, uno por cada uno con su nuevo valor de order.
    order: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.repsMin === undefined || data.repsMax === undefined || data.repsMin <= data.repsMax,
    { message: 'repsMin debe ser menor o igual a repsMax', path: ['repsMin'] }
  );

const EXERCISE_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  gifUrl: true,
  target: true,
  equipment: true,
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string; exerciseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planExercise = await prisma.planExercise.findFirst({
      where: {
        id: params.exerciseId,
        planDay: { planId: params.planId, plan: { userId: session.user.id } },
      },
    });

    if (!planExercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdatePlanExerciseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { exerciseId, ...rest } = parsed.data;

    if (exerciseId) {
      const exerciseExists = await prisma.exercise.findUnique({ where: { id: exerciseId } });
      if (!exerciseExists) {
        return NextResponse.json({ error: 'El ejercicio elegido no existe' }, { status: 400 });
      }
    }

    const updated = await prisma.planExercise.update({
      where: { id: planExercise.id },
      data: { ...rest, ...(exerciseId ? { exerciseId } : {}) },
      include: { exercise: { select: EXERCISE_SELECT } },
    });

    return NextResponse.json({ exercise: updated });
  } catch (error) {
    console.error('Error en PATCH /api/plans/[planId]/exercises/[exerciseId]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string; exerciseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planExercise = await prisma.planExercise.findFirst({
      where: {
        id: params.exerciseId,
        planDay: { planId: params.planId, plan: { userId: session.user.id } },
      },
    });

    if (!planExercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    await prisma.planExercise.delete({ where: { id: planExercise.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/plans/[planId]/exercises/[exerciseId]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
