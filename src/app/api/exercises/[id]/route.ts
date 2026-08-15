import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getExerciseById, getSimilarExercises, getExerciseHistory } from '@/lib/exercises';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exercise = await getExerciseById(params.id);

    if (!exercise) {
      return NextResponse.json(
        { error: 'Ejercicio no encontrado' },
        { status: 404 }
      );
    }

    // Obtener ejercicios similares
    const similar = await getSimilarExercises(exercise.target, exercise.id, 4);

    // Obtener historial del usuario (si está autenticado)
    let history: any[] = [];
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      history = await getExerciseHistory(session.user.id, exercise.id);
    }

    return NextResponse.json({
      exercise,
      similar,
      history,
    });
  } catch (error) {
    console.error('Error obteniendo ejercicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
