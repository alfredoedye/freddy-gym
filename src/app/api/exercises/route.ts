import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchExercises } from '@/lib/exercises';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const bodyPart = searchParams.get('bodyPart') || undefined;
    const equipment = searchParams.get('equipment') || undefined;
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const favoritesFirst = searchParams.get('favoritesFirst') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validar parámetros
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit));

    // Sin sesión el catálogo sigue funcionando, solo sin datos de favoritos.
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const result = await searchExercises({
      search,
      bodyPart,
      equipment,
      page: validPage,
      limit: validLimit,
      userId,
      favoritesOnly: userId ? favoritesOnly : false,
      favoritesFirst: userId ? favoritesFirst : false,
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
