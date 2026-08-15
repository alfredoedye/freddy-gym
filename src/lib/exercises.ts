import { prisma } from './prisma';

// Tipos para los parámetros de búsqueda
interface SearchExercisesParams {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  page?: number;
  limit?: number;
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
  const { search, bodyPart, equipment, page = 1, limit = 20 } = params;

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

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        bodyPart: true,
        equipment: true,
        target: true,
        imageUrl: true,
        gifUrl: true,
      },
    }),
    prisma.exercise.count({ where }),
  ]);

  return {
    exercises,
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

/**
 * Obtener todas las partes del cuerpo disponibles
 */
export async function getBodyParts(): Promise<string[]> {
  const result = await prisma.exercise.findMany({
    distinct: ['bodyPart'],
    select: { bodyPart: true },
    orderBy: { bodyPart: 'asc' },
  });
  return result.map((r) => r.bodyPart);
}

/**
 * Obtener todos los tipos de equipamiento
 */
export async function getEquipmentTypes(): Promise<string[]> {
  const result = await prisma.exercise.findMany({
    distinct: ['equipment'],
    select: { equipment: true },
    orderBy: { equipment: 'asc' },
  });
  return result.map((r) => r.equipment);
}
