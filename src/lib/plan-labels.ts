/**
 * Etiquetas en español compartidas entre las vistas de plan (listado, detalle).
 */

export const goalLabels: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Fuerza',
  ENDURANCE: 'Resistencia',
  FAT_LOSS: 'Pérdida de grasa',
  RECOMPOSITION: 'Recomposición',
};

export const splitLabels: Record<string, string> = {
  push_pull_legs: 'Push / Pull / Legs',
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  bro_split: 'Bro Split',
};

export const statusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};
