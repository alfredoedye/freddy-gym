/**
 * Tipos compartidos de TypeScript para GymApp.
 * Complementan los tipos generados por Prisma.
 */

// ============================================
// Enums (espejo de Prisma para uso en cliente)
// ============================================

export enum Goal {
  HYPERTROPHY = 'HYPERTROPHY',
  STRENGTH = 'STRENGTH',
  ENDURANCE = 'ENDURANCE',
  FAT_LOSS = 'FAT_LOSS',
  RECOMPOSITION = 'RECOMPOSITION',
}

export enum Level {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum Difficulty {
  TOO_EASY = 'TOO_EASY',
  EASY = 'EASY',
  JUST_RIGHT = 'JUST_RIGHT',
  HARD = 'HARD',
  TOO_HARD = 'TOO_HARD',
}

// ============================================
// Tipos de UI
// ============================================

/** Elemento de navegación inferior */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Opciones del temporizador */
export interface TimerState {
  timeRemaining: number;
  isRunning: boolean;
  formattedTime: string;
}

// ============================================
// Tipos de datos del entrenamiento
// ============================================

/** Set individual durante ejecución */
export interface WorkoutSetInput {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
  rpe?: number | null;
}

/** Ejercicio durante ejecución del workout */
export interface WorkoutExerciseState {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  sets: WorkoutSetInput[];
  notes?: string;
}

/** Sesión activa de entrenamiento */
export interface ActiveWorkoutState {
  sessionId: string;
  planDayId: string;
  dayName: string;
  exercises: WorkoutExerciseState[];
  startedAt: Date;
  currentExerciseIndex: number;
}

// ============================================
// Tipos de API
// ============================================

/** Respuesta genérica de API */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Credenciales para login */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Datos para registro */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// ============================================
// Tipos del catálogo de ejercicios
// ============================================

/** Ejercicio del catálogo (vista simplificada) */
export interface ExerciseCatalogItem {
  id: string;
  name: string;
  category: string;
  bodyPart: string;
  equipment: string;
  target: string;
  muscleGroup: string;
  imageUrl: string | null;
  gifUrl: string | null;
}

/** Filtros del catálogo de ejercicios */
export interface ExerciseFilters {
  search: string;
  bodyPart: string | null;
  equipment: string | null;
  muscleGroup: string | null;
}

// ============================================
// Tipos del perfil
// ============================================

export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/** Datos del perfil del usuario */
export interface UserProfile {
  birthDate: string | null;
  sex: Sex | null;
  height: number | null;
  weight: number | null;
  goal: Goal;
  level: Level;
}

// ============================================
// Tipos del plan
// ============================================

/** Resumen del plan para cards */
export interface PlanSummary {
  id: string;
  name: string;
  goal: Goal;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  status: PlanStatus;
  startDate: Date;
  progress: number; // Porcentaje 0-100
}

/** Día del plan con ejercicios */
export interface PlanDayWithExercises {
  id: string;
  dayNumber: number;
  name: string;
  isRest: boolean;
  exercises: {
    id: string;
    order: number;
    exerciseName: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    restSeconds: number;
  }[];
}
