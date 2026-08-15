import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  calculateWeeklyVolume,
  calculateWeeklyFrequency,
  calculateStreak,
  getTotalStats,
  getBodyPartDistribution,
  getExerciseProgressList,
  getPersonalRecords,
} from '@/lib/progress';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '8w';
    const tab = searchParams.get('tab') || 'resumen';

    // Parsear período a semanas
    let weeks: number | null = null;
    if (period !== 'all') {
      weeks = parseInt(period.replace('w', ''));
      if (isNaN(weeks)) weeks = 8;
    }

    const userId = session.user.id;

    if (tab === 'resumen') {
      const [weeklyVolume, weeklyFrequency, streak, totalStats] = await Promise.all([
        calculateWeeklyVolume(userId, weeks),
        calculateWeeklyFrequency(userId, weeks),
        calculateStreak(userId),
        getTotalStats(userId),
      ]);

      return NextResponse.json({
        weeklyVolume,
        weeklyFrequency,
        streak,
        totalStats,
      });
    }

    if (tab === 'ejercicios') {
      const [exercises, personalRecords] = await Promise.all([
        getExerciseProgressList(userId),
        getPersonalRecords(userId),
      ]);

      return NextResponse.json({
        exercises,
        personalRecords,
      });
    }

    if (tab === 'cuerpo') {
      const bodyPartDistribution = await getBodyPartDistribution(userId, weeks);

      return NextResponse.json({
        bodyPartDistribution,
      });
    }

    return NextResponse.json({ error: 'Tab no válido' }, { status: 400 });
  } catch (error) {
    console.error('Error en /api/progress:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
