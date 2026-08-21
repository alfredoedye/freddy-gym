import { prisma } from './prisma';

// Tipos para los parámetros de búsqueda
interface SearchExercisesParams {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  page?: number;
  limit?: number;
  /** Si viene, cada resultado incluye `isFavorite` para ese usuario. */
  userId?: string;
  /** Devolver solo los favoritos del usuario (requiere userId). */
  favoritesOnly?: boolean;
  /** Ordenar con los favoritos del usuario primero (requiere userId). */
  favoritesFirst?: boolean;
}

interface SearchResult {
  exercises: any[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Buscar ejercicios con filtros y paginación
 */
export async function searchExercises(params: SearchExercisesParams): Promise<SearchResult> {
  const { search, bodyPart, equipment, page = 1, limit = 20, userId, favoritesOnly, favoritesFirst } = params;

  const where: any = {};

  // Búsqueda por nombre (case insensitive)
  if (search && search.trim()) {
    where.name = {
      contains: search.trim(),
      mode: 'insensitive',
    };
  }

  // Filtro por parte del cuerpo
  if (bodyPart && bodyPart !== 'todos') {
    // Mapear categorías en español a valores del dataset
    const bodyPartMap: Record<string, string[]> = {
      brazos: ['upper arms', 'lower arms'],
      piernas: ['upper legs', 'lower legs'],
      espalda: ['back'],
      pecho: ['chest'],
      hombros: ['shoulders'],
      core: ['waist'],
      cardio: ['cardio'],
      cuello: ['neck'],
    };

    const mapped = bodyPartMap[bodyPart.toLowerCase()];
    if (mapped) {
      where.bodyPart = { in: mapped };
    }
  }

  // Filtro por equipamiento
  if (equipment && equipment !== 'todos') {
    const equipmentMap: Record<string, string> = {
      'peso corporal': 'body weight',
      mancuernas: 'dumbbell',
      barra: 'barbell',
      cable: 'cable',
      máquina: 'leverage machine',
      banda: 'band',
      smith: 'smith machine',
      kettlebell: 'kettlebell',
      'barra ez': 'ez barbell',
      'pelota estabilidad': 'stability ball',
    };

    const mapped = equipmentMap[equipment.toLowerCase()];
    if (mapped) {
      where.equipment = mapped;
    } else {
      where.equipment = {
        contains: equipment,
        mode: 'insensitive',
      };
    }
  }

  const select = {
    id: true,
    name: true,
    bodyPart: true,
    equipment: true,
    target: true,
    imageUrl: true,
    gifUrl: true,
  };

  // Favoritos del usuario (si hay sesión) — sirven para filtrar, ordenar
  // primero y marcar cada resultado con `isFavorite`.
  const favoriteIds = userId
    ? (
        await prisma.favoriteExercise.findMany({
          where: { userId },
          select: { exerciseId: true },
        })
      ).map((f) => f.exerciseId)
    : [];
  const favoriteSet = new Set(favoriteIds);

  if (userId && favoritesOnly) {
    where.id = { in: favoriteIds };
  }

  const withFavoriteFlag = (items: any[]) =>
    items.map((ex) => ({ ...ex, isFavorite: favoriteSet.has(ex.id) }));

  // Favoritos primero: dos consultas (favoritos que matchean los filtros, y
  // después el resto), respetando la paginación como si fuera una sola lista.
  if (userId && favoritesFirst && !favoritesOnly && favoriteIds.length > 0) {
    const favWhere = { ...where, id: { in: favoriteIds } };
    const restWhere = { ...where, id: { notIn: favoriteIds } };

    const [favTotal, restTotal] = await Promise.all([
      prisma.exercise.count({ where: favWhere }),
      prisma.exercise.count({ where: restWhere }),
    ]);

    const offset = (page - 1) * limit;
    const favs =
      offset < favTotal
        ? await prisma.exercise.findMany({
            where: favWhere,
            skip: offset,
            take: limit,
            orderBy: { name: 'asc' },
            select,
          })
        : [];

    const remaining = limit - favs.length;
    const rest =
      remaining > 0
        ? await prisma.exercise.findMany({
            where: restWhere,
            skip: Math.max(0, offset - favTotal),
            take: remaining,
            orderBy: { name: 'asc' },
            select,
          })
        : [];

    const total = favTotal + restTotal;
    return {
      exercises: withFavoriteFlag([...favs, ...rest]),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
      select,
    }),
    prisma.exercise.count({ where }),
  ]);

  return {
    exercises: userId ? withFavoriteFlag(exercises) : exercises,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Obtener ejercicio por ID con todos los detalles
 */
export async function getExerciseById(id: string) {
  return prisma.exercise.findUnique({
    where: { id },
  });
}

/**
 * Obtener ejercicios similares (mismo músculo objetivo)
 */
export async function getSimilarExercises(target: string, excludeId: string, limit = 4) {
  return prisma.exercise.findMany({
    where: {
      target,
      id: { not: excludeId },
    },
    take: limit,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      bodyPart: true,
      equipment: true,
      target: true,
      imageUrl: true,
    },
  });
}

/**
 * Obtener historial de un ejercicio para un usuario
 */
export async function getExerciseHistory(userId: string, exerciseId: string) {
  return prisma.workoutSet.findMany({
    where: {
      exerciseId,
      session: { userId },
      completed: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 20,
    select: {
      setNumber: true,
      reps: true,
      weight: true,
      rpe: true,
      completedAt: true,
      session: {
        select: {
          startedAt: true,
          planDay: {
            select: { name: true },
          },
        },
      },
    },
  });
}
