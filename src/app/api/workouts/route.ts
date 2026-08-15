import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación
const CreateWorkoutSchema = z.object({
  planDayId: z.string().min(1),
  weekNumber: z.number().int().min(1),
});

// POST /api/workouts — Crear nueva sesión de entrenamiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateWorkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planDayId, weekNumber } = parsed.data;

    // Verificar que el planDay pertenece al usuario
    const planDay = await prisma.planDay.findUnique({
      where: { id: planDayId },
      include: { plan: { select: { userId: true } } },
    });

    if (!planDay || planDay.plan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Buscar sesión existente no completada
    const existing = await prisma.workoutSession.findFirst({
      where: {
        userId: session.user.id,
        planDayId,
        weekNumber,
        completedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json({ session: existing });
    }

    // Crear nueva sesión
    const workoutSession = await prisma.workoutSession.create({
      data: {
        userId: session.user.id,
        planDayId,
        weekNumber,
      },
    });

    return NextResponse.json({ session: workoutSession }, { status: 201 });
  } catch (error) {
    console.error('Error creando workout session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
