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

// Rangos físicos — deben coincidir con los min/max del schema de /api/profile
// (ver route.ts). Onboarding y edición de perfil solo mostraban estos números
// como atributos min/max del <input>, sin chequearlos antes de habilitar
// "Siguiente"/"Guardar" — un valor fuera de rango viajaba intacto hasta que el
// servidor lo rechazaba con 400.
export const HEIGHT_RANGE = { min: 100, max: 230 };
export const WEIGHT_RANGE = { min: 30, max: 200 };

export function isHeightValid(height: string): boolean {
  const n = parseFloat(height);
  return height !== '' && !Number.isNaN(n) && n >= HEIGHT_RANGE.min && n <= HEIGHT_RANGE.max;
}

export function isWeightValid(weight: string): boolean {
  const n = parseFloat(weight);
  return weight !== '' && !Number.isNaN(n) && n >= WEIGHT_RANGE.min && n <= WEIGHT_RANGE.max;
}
