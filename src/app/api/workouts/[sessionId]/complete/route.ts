import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { sessionId: string };
}

// PATCH /api/workouts/[sessionId]/complete — Completar workout
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { sessionId } = params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Verificar que la sesión pertenece al usuario
    const workoutSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        sets: {
          where: { completed: true },
          include: {
            exercise: { select: { name: true } },
          },
        },
      },
    });

    if (!workoutSession || workoutSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Actualizar completedAt y notas
    const updatedSession = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        completedAt: workoutSession.completedAt || new Date(),
        notes: notes || workoutSession.notes,
      },
    });

    // Calcular estadísticas
    const completedSets = workoutSession.sets;
    const startTime = workoutSession.startedAt;
    const endTime = updatedSession.completedAt || new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Volumen total (peso × reps)
    let totalVolume = 0;
    completedSets.forEach((set) => {
      if (set.reps && set.weight) {
        totalVolume += set.reps * set.weight;
      }
    });

    // Ejercicios únicos completados
    const uniqueExercises = new Set(completedSets.map((s) => s.exerciseId));

    // Mejores series por ejercicio (mayor peso; a igual peso, mayor cantidad de reps)
    const bestSetsMap = new Map<string, { exerciseName: string; weight: number | null; reps: number }>();
    completedSets.forEach((set) => {
      const existing = bestSetsMap.get(set.exerciseId);
      const weight = set.weight;
      const reps = set.reps || 0;
      const weightForCompare = weight || 0;
      const existingWeightForCompare = existing?.weight || 0;

      if (
        !existing ||
        weightForCompare > existingWeightForCompare ||
        (weightForCompare === existingWeightForCompare && reps > existing.reps)
      ) {
        bestSetsMap.set(set.exerciseId, {
          exerciseName: set.exercise.name,
          weight,
          reps,
        });
      }
    });

    const bestSets = Array.from(bestSetsMap.values())
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 5);

    // Formatear duración
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const duration = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

    return NextResponse.json({
      success: true,
      stats: {
        duration,
        totalVolume,
        totalSets: completedSets.length,
        exercisesCompleted: uniqueExercises.size,
        bestSets,
      },
    });
  } catch (error) {
    console.error('Error completando workout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
