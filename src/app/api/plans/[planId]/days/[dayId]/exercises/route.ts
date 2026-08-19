/**
 * API Route: POST /api/plans/[planId]/days/[dayId]/exercises
 * Agrega un ejercicio nuevo a un día del plan (no reemplaza ninguno existente
 * — para eso está el PATCH con exerciseId en .../exercises/[exerciseId]).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const AddPlanExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  phase: z.enum(['WARMUP', 'MAIN', 'COOLDOWN']),
});

// Punto de partida razonable por fase al agregar un ejercicio nuevo — mismos
// valores que usa el prompt de generación con IA (ver RESPONSE_FORMAT en
// src/lib/ai/prompts.ts), el usuario los ajusta después desde la fila editable.
const PHASE_DEFAULTS: Record<
  'WARMUP' | 'MAIN' | 'COOLDOWN',
  { sets: number; repsMin: number; repsMax: number; restSeconds: number }
> = {
  WARMUP: { sets: 1, repsMin: 10, repsMax: 15, restSeconds: 30 },
  MAIN: { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
  COOLDOWN: { sets: 1, repsMin: 1, repsMax: 1, restSeconds: 30 },
};

const EXERCISE_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  gifUrl: true,
  target: true,
  equipment: true,
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string; dayId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planDay = await prisma.planDay.findFirst({
      where: {
        id: params.dayId,
        planId: params.planId,
        plan: { userId: session.user.id },
      },
      include: { exercises: { select: { order: true } } },
    });

    if (!planDay) {
      return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
    }

    if (planDay.isRest) {
      return NextResponse.json(
        { error: 'No se pueden agregar ejercicios a un día de descanso' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = AddPlanExerciseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { exerciseId, phase } = parsed.data;

    const exerciseExists = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exerciseExists) {
      return NextResponse.json({ error: 'El ejercicio elegido no existe' }, { status: 400 });
    }

    // Va al final del día (mayor order) — la UI agrupa y filtra por fase antes
    // de mostrar, así que un ejercicio nuevo siempre aparece al final de SU
    // fase sin importar el order absoluto de las otras fases.
    const maxOrder = planDay.exercises.reduce((max, e) => Math.max(max, e.order), 0);

    const created = await prisma.planExercise.create({
      data: {
        planDayId: planDay.id,
        exerciseId,
        phase,
        order: maxOrder + 1,
        ...PHASE_DEFAULTS[phase],
      },
      include: { exercise: { select: EXERCISE_SELECT } },
    });

    return NextResponse.json({ exercise: created }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/plans/[planId]/days/[dayId]/exercises:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
