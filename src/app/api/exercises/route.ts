import { NextRequest, NextResponse } from 'next/server';
import { searchExercises } from '@/lib/exercises';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const bodyPart = searchParams.get('bodyPart') || undefined;
    const equipment = searchParams.get('equipment') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validar parámetros
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit));

    const result = await searchExercises({
      search,
      bodyPart,
      equipment,
      page: validPage,
      limit: validLimit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error buscando ejercicios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
