/**
 * Opciones compartidas de perfil — usadas en onboarding y en la edición de perfil.
 */

export type Goal = 'HYPERTROPHY' | 'STRENGTH' | 'FAT_LOSS' | 'ENDURANCE' | 'RECOMPOSITION';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type Sex = 'MALE' | 'FEMALE';
export type FontSize = 'NORMAL' | 'LARGE' | 'EXTRA_LARGE';

export const GOALS: { value: Goal; icon: string; title: string; description: string }[] = [
  { value: 'HYPERTROPHY', icon: '💪', title: 'Hipertrofia', description: 'Ganar masa muscular' },
  { value: 'STRENGTH', icon: '🏋️', title: 'Fuerza', description: 'Aumentar cargas máximas' },
  { value: 'FAT_LOSS', icon: '🔥', title: 'Pérdida de grasa', description: 'Reducir % graso manteniendo músculo' },
  { value: 'ENDURANCE', icon: '⚡', title: 'Resistencia', description: 'Mejorar capacidad cardiovascular' },
  { value: 'RECOMPOSITION', icon: '🔄', title: 'Recomposición', description: 'Ganar músculo y perder grasa simultáneamente' },
];

export const LEVELS: { value: Level; icon: string; title: string; description: string }[] = [
  { value: 'BEGINNER', icon: '🌱', title: 'Principiante', description: 'Menos de 1 año entrenando' },
  { value: 'INTERMEDIATE', icon: '📈', title: 'Intermedio', description: '1 a 3 años de experiencia' },
  { value: 'ADVANCED', icon: '🏆', title: 'Avanzado', description: 'Más de 3 años entrenando' },
];

export const SEXES: { value: Sex; icon: string; title: string; description: string }[] = [
  { value: 'MALE', icon: '♂️', title: 'Hombre', description: '' },
  { value: 'FEMALE', icon: '♀️', title: 'Mujer', description: '' },
];

export const FONT_SIZES: { value: FontSize; icon: string; title: string; description: string }[] = [
  { value: 'NORMAL', icon: 'A', title: 'Normal', description: 'Tamaño estándar' },
  { value: 'LARGE', icon: 'A', title: 'Grande', description: 'Más fácil de leer' },
  { value: 'EXTRA_LARGE', icon: 'A', title: 'Extra grande', description: 'Máxima legibilidad' },
];
