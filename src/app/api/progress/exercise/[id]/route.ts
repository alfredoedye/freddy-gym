import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getExerciseHistory, getPersonalRecords } from '@/lib/progress';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const exerciseId = params.id;
    const userId = session.user.id;

    // Obtener datos del ejercicio
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        name: true,
        bodyPart: true,
        equipment: true,
        target: true,
        gifUrl: true,
        imageUrl: true,
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    // Obtener historial y PRs en paralelo
    const [history, personalRecords] = await Promise.all([
      getExerciseHistory(userId, exerciseId),
      getPersonalRecords(userId, exerciseId),
    ]);

    // Calcular tendencia
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 4) {
      const quarter = Math.floor(history.length / 4);
      const firstAvg =
        history.slice(0, quarter).reduce((a, b) => a + b.bestWeight, 0) / quarter;
      const lastAvg =
        history.slice(-quarter).reduce((a, b) => a + b.bestWeight, 0) / quarter;
      if (lastAvg > firstAvg * 1.05) trend = 'up';
      else if (lastAvg < firstAvg * 0.95) trend = 'down';
    }

    return NextResponse.json({
      exercise,
      history,
      personalRecords,
      trend,
      totalSessions: history.length,
    });
  } catch (error) {
    console.error('Error en /api/progress/exercise/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
