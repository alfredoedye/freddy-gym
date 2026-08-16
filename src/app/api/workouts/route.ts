import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
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

    // Reusar la sesión de este día/semana si existe; el índice único
    // userId+planDayId+weekNumber protege contra creaciones simultáneas
    // (la que pierde la carrera recibe P2002 y relee la fila ganadora).
    const sessionKey = { userId: session.user.id, planDayId, weekNumber };

    const existing = await prisma.workoutSession.findUnique({
      where: { userId_planDayId_weekNumber: sessionKey },
    });

    if (existing) {
      return NextResponse.json({ session: existing });
    }

    try {
      const workoutSession = await prisma.workoutSession.create({ data: sessionKey });
      return NextResponse.json({ session: workoutSession }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await prisma.workoutSession.findUnique({
          where: { userId_planDayId_weekNumber: sessionKey },
        });
        if (winner) {
          return NextResponse.json({ session: winner });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creando workout session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
