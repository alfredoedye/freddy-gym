import { prisma } from './prisma';

// Tipos para los datos de progreso
export interface WeeklyVolume {
  week: string; // "2024-W01"
  weekLabel: string; // "Sem 1"
  volume: number; // kg totales
  startDate: string;
}

export interface WeeklyFrequency {
  week: string;
  weekLabel: string;
  sessions: number;
}

export interface TotalStats {
  totalSessions: number;
  totalVolume: number; // kg
  avgSessionDuration: number; // minutos
  totalSets: number;
  totalExercises: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  bodyPart: string;
}

export interface BodyPartVolume {
  bodyPart: string;
  bodyPartLabel: string;
  volume: number;
  percentage: number;
  color: string;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  sessionCount: number;
  bestWeight: number;
  lastWeight: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ExerciseHistory {
  date: string;
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  sets: number;
}

// Mapeo de body parts a español y colores
const BODY_PART_MAP: Record<string, { label: string; color: string }> = {
  'upper arms': { label: 'Brazos', color: '#3b82f6' },
  'lower arms': { label: 'Antebrazos', color: '#60a5fa' },
  'upper legs': { label: 'Piernas', color: '#22c55e' },
  'lower legs': { label: 'Pantorrillas', color: '#4ade80' },
  'back': { label: 'Espalda', color: '#f97316' },
  'chest': { label: 'Pecho', color: '#ef4444' },
  'shoulders': { label: 'Hombros', color: '#a855f7' },
  'waist': { label: 'Core', color: '#eab308' },
  'cardio': { label: 'Cardio', color: '#ec4899' },
  'neck': { label: 'Cuello', color: '#6b7280' },
};

/**
 * Calcula el volumen semanal (kg levantados por semana)
 */
export async function calculateWeeklyVolume(
  userId: string,
  weeks: number | null // null = all
): Promise<WeeklyVolume[]> {
  const whereClause: any = {
    userId,
    completedAt: { not: null },
  };

  if (weeks) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    whereClause.startedAt = { gte: startDate };
  }

  const sessions = await prisma.workoutSession.findMany({
    where: whereClause,
    include: {
      sets: {
        where: { completed: true },
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  // Agrupar por semana
  const weekMap = new Map<string, { volume: number; startDate: string }>();

  sessions.forEach((session) => {
    const date = new Date(session.startedAt);
    const weekKey = getISOWeek(date);
    const existing = weekMap.get(weekKey) || {
      volume: 0,
      startDate: date.toISOString(),
    };

    const sessionVolume = session.sets.reduce((acc, set) => {
      return acc + (set.weight || 0) * (set.reps || 0);
    }, 0);

    existing.volume += sessionVolume;
    weekMap.set(weekKey, existing);
  });

  const result: WeeklyVolume[] = [];
  let weekNum = 1;
  weekMap.forEach((data, week) => {
    result.push({
      week,
      weekLabel: `Sem ${weekNum}`,
      volume: Math.round(data.volume),
      startDate: data.startDate,
    });
    weekNum++;
  });

  return result;
}

/**
 * Calcula la frecuencia semanal (sesiones por semana)
 */
export async function calculateWeeklyFrequency(
  userId: string,
  weeks: number | null
): Promise<WeeklyFrequency[]> {
  const whereClause: any = {
    userId,
    completedAt: { not: null },
  };

  if (weeks) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    whereClause.startedAt = { gte: startDate };
  }

  const sessions = await prisma.workoutSession.findMany({
    where: whereClause,
    orderBy: { startedAt: 'asc' },
  });

  const weekMap = new Map<string, number>();

  sessions.forEach((session) => {
    const date = new Date(session.startedAt);
    const weekKey = getISOWeek(date);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  });

  const result: WeeklyFrequency[] = [];
  let weekNum = 1;
  weekMap.forEach((sessions, week) => {
    result.push({
      week,
      weekLabel: `Sem ${weekNum}`,
      sessions,
    });
    weekNum++;
  });

  return result;
}

/**
 * Calcula la racha actual de entrenamiento (semanas consecutivas)
 */
export async function calculateStreak(userId: string): Promise<number> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  if (sessions.length === 0) return 0;

  // Obtener semanas únicas en orden descendente
  const weeks = new Set<string>();
  sessions.forEach((s) => {
    weeks.add(getISOWeek(new Date(s.startedAt)));
  });

  const sortedWeeks = Array.from(weeks).sort().reverse();

  // Verificar que la semana actual o la anterior están incluidas
  const currentWeek = getISOWeek(new Date());
  const lastWeek = getISOWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  if (sortedWeeks[0] !== currentWeek && sortedWeeks[0] !== lastWeek) {
    return 0;
  }

  // Contar semanas consecutivas
  let streak = 1;
  for (let i = 1; i < sortedWeeks.length; i++) {
    const current = parseISOWeek(sortedWeeks[i - 1]);
    const prev = parseISOWeek(sortedWeeks[i]);

    const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Obtiene estadísticas totales del usuario
 */
export async function getTotalStats(userId: string): Promise<TotalStats> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    include: {
      sets: {
        where: { completed: true },
      },
    },
  });

  let totalVolume = 0;
  let totalSets = 0;
  let totalDuration = 0;
  const exerciseIds = new Set<string>();

  sessions.forEach((session) => {
    // Duración en minutos
    if (session.completedAt && session.startedAt) {
      const duration =
        (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) /
        (1000 * 60);
      totalDuration += duration;
    }

    session.sets.forEach((set) => {
      totalVolume += (set.weight || 0) * (set.reps || 0);
      totalSets++;
      exerciseIds.add(set.exerciseId);
    });
  });

  return {
    totalSessions: sessions.length,
    totalVolume: Math.round(totalVolume),
    avgSessionDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
    totalSets,
    totalExercises: exerciseIds.size,
  };
}

/**
 * Obtiene records personales (mejor peso) por ejercicio
 */
export async function getPersonalRecords(
  userId: string,
  exerciseId?: string
): Promise<PersonalRecord[]> {
  const whereClause: any = {
    session: { userId },
    completed: true,
    weight: { not: null },
  };

  if (exerciseId) {
    whereClause.exerciseId = exerciseId;
  }

  const sets = await prisma.workoutSet.findMany({
    where: whereClause,
    include: {
      exercise: {
        select: { name: true, bodyPart: true },
      },
      session: {
        select: { startedAt: true },
      },
    },
    orderBy: { weight: 'desc' },
  });

  // Agrupar por ejercicio y tomar el mejor
  const prMap = new Map<string, PersonalRecord>();

  sets.forEach((set) => {
    if (!prMap.has(set.exerciseId)) {
      prMap.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseName: set.exercise.name,
        weight: set.weight!,
        reps: set.reps || 0,
        date: new Date(set.session.startedAt).toISOString(),
        bodyPart: set.exercise.bodyPart,
      });
    }
  });

  return Array.from(prMap.values()).sort((a, b) => b.weight - a.weight);
}

/**
 * Distribución de volumen por parte del cuerpo
 */
export async function getBodyPartDistribution(
  userId: string,
  weeks?: number | null
): Promise<BodyPartVolume[]> {
  const whereClause: any = {
    session: { userId, completedAt: { not: null } },
    completed: true,
  };

  if (weeks) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    whereClause.session.startedAt = { gte: startDate };
  }

  const sets = await prisma.workoutSet.findMany({
    where: whereClause,
    include: {
      exercise: {
        select: { bodyPart: true },
      },
    },
  });

  // Agrupar por body part
  const volumeMap = new Map<string, number>();
  let totalVolume = 0;

  sets.forEach((set) => {
    const vol = (set.weight || 0) * (set.reps || 0);
    const bp = set.exercise.bodyPart;
    volumeMap.set(bp, (volumeMap.get(bp) || 0) + vol);
    totalVolume += vol;
  });

  const result: BodyPartVolume[] = [];
  volumeMap.forEach((volume, bodyPart) => {
    const mapped = BODY_PART_MAP[bodyPart] || { label: bodyPart, color: '#6b7280' };
    result.push({
      bodyPart,
      bodyPartLabel: mapped.label,
      volume: Math.round(volume),
      percentage: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0,
      color: mapped.color,
    });
  });

  return result.sort((a, b) => b.volume - a.volume);
}

/**
 * Lista de ejercicios entrenados con progreso
 */
export async function getExerciseProgressList(userId: string): Promise<ExerciseProgress[]> {
  const sets = await prisma.workoutSet.findMany({
    where: {
      session: { userId, completedAt: { not: null } },
      completed: true,
      weight: { not: null },
    },
    include: {
      exercise: {
        select: { name: true, bodyPart: true },
      },
      session: {
        select: { startedAt: true },
      },
    },
    orderBy: {
      session: { startedAt: 'asc' },
    },
  });

  // Agrupar por ejercicio
  const exerciseMap = new Map<
    string,
    {
      name: string;
      bodyPart: string;
      sessions: Set<string>;
      weights: number[];
    }
  >();

  sets.forEach((set) => {
    const existing = exerciseMap.get(set.exerciseId) || {
      name: set.exercise.name,
      bodyPart: set.exercise.bodyPart,
      sessions: new Set<string>(),
      weights: [],
    };

    existing.sessions.add(set.session.startedAt.toISOString().split('T')[0]);
    existing.weights.push(set.weight!);
    exerciseMap.set(set.exerciseId, existing);
  });

  const result: ExerciseProgress[] = [];
  exerciseMap.forEach((data, exerciseId) => {
    const weights = data.weights;
    const lastWeight = weights[weights.length - 1];
    const bestWeight = Math.max(...weights);

    // Tendencia: comparar último 25% con primer 25%
    const quarter = Math.max(1, Math.floor(weights.length / 4));
    const firstAvg = weights.slice(0, quarter).reduce((a, b) => a + b, 0) / quarter;
    const lastAvg =
      weights.slice(-quarter).reduce((a, b) => a + b, 0) / quarter;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (lastAvg > firstAvg * 1.05) trend = 'up';
    else if (lastAvg < firstAvg * 0.95) trend = 'down';

    result.push({
      exerciseId,
      exerciseName: data.name,
      bodyPart: data.bodyPart,
      sessionCount: data.sessions.size,
      bestWeight,
      lastWeight,
      trend,
    });
  });

  return result.sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Historial de un ejercicio específico
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<ExerciseHistory[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
      sets: {
        some: {
          exerciseId,
          completed: true,
        },
      },
    },
    include: {
      sets: {
        where: {
          exerciseId,
          completed: true,
        },
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  return sessions.map((session) => {
    let bestWeight = 0;
    let bestReps = 0;
    let totalVolume = 0;

    session.sets.forEach((set) => {
      const w = set.weight || 0;
      const r = set.reps || 0;
      // A igual peso (incluido 0, típico de ejercicios de peso corporal), gana la mayor cantidad de reps
      if (w > bestWeight || (w === bestWeight && r > bestReps)) {
        bestWeight = w;
        bestReps = r;
      }
      totalVolume += w * r;
    });

    return {
      date: new Date(session.startedAt).toISOString().split('T')[0],
      bestWeight,
      bestReps,
      totalVolume: Math.round(totalVolume),
      sets: session.sets.length,
    };
  });
}

// === Utilidades ===

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function parseISOWeek(weekStr: string): Date {
  const [year, week] = weekStr.split('-W').map(Number);
  const date = new Date(year, 0, 1 + (week - 1) * 7);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}
