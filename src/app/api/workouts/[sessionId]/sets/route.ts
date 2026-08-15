import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para un set
const SetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).nullable(),
  weight: z.number().min(0).nullable(),
  completed: z.boolean(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
});

interface RouteParams {
  params: { sessionId: string };
}

// POST /api/workouts/[sessionId]/sets — Guardar/actualizar un set
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { sessionId } = params;

    // Verificar que la sesión de workout pertenece al usuario
    const workoutSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!workoutSession || workoutSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Si ya está completada, no permitir cambios
    if (workoutSession.completedAt) {
      return NextResponse.json(
        { error: 'La sesión ya fue completada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = SetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { exerciseId, setNumber, reps, weight, completed, rpe } = parsed.data;

    // Upsert: crear o actualizar el set
    const workoutSet = await prisma.workoutSet.upsert({
      where: {
        // Necesitamos un índice compuesto único en el schema
        // Por ahora usamos findFirst + create/update
        sessionId_exerciseId_setNumber: {
          sessionId,
          exerciseId,
          setNumber,
        },
      },
      create: {
        sessionId,
        exerciseId,
        setNumber,
        reps,
        weight,
        completed,
        rpe: rpe ?? null,
        completedAt: completed ? new Date() : null,
      },
      update: {
        reps,
        weight,
        completed,
        rpe: rpe ?? null,
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ set: workoutSet });
  } catch (error) {
    console.error('Error guardando set:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
