/**
 * Utilidades para colores y etiquetas de ejercicios
 */

// Etiquetas en español
const BODY_PART_LABELS: Record<string, string> = {
  'upper arms': 'Brazos',
  'lower arms': 'Antebrazos',
  'upper legs': 'Piernas',
  'lower legs': 'Pantorrillas',
  back: 'Espalda',
  chest: 'Pecho',
  shoulders: 'Hombros',
  waist: 'Core',
  cardio: 'Cardio',
  neck: 'Cuello',
};

export function getBodyPartLabel(bodyPart: string): string {
  return BODY_PART_LABELS[bodyPart.toLowerCase()] || bodyPart;
}

// Etiquetas de equipamiento en español
const EQUIPMENT_LABELS: Record<string, string> = {
  'body weight': 'Peso corporal',
  dumbbell: 'Mancuernas',
  barbell: 'Barra',
  cable: 'Cable',
  'leverage machine': 'Máquina',
  band: 'Banda',
  'smith machine': 'Smith',
  kettlebell: 'Kettlebell',
  weighted: 'Lastrado',
  'stability ball': 'Pelota',
  'ez barbell': 'Barra EZ',
  'olympic barbell': 'Barra olímpica',
  'medicine ball': 'Balón medicinal',
  bosu: 'Bosu',
  roller: 'Roller',
  rope: 'Cuerda',
  'resistance band': 'Banda',
  tire: 'Neumático',
  trap_bar: 'Trap bar',
};

export function getEquipmentLabel(equipment: string): string {
  return EQUIPMENT_LABELS[equipment.toLowerCase()] || equipment;
}

// Ejercicios de "body weight" no llevan peso adicional, solo repeticiones
// (a diferencia de "weighted", que es la variante lastrada de un movimiento bodyweight)
export function isBodyweightExercise(equipment: string): boolean {
  return equipment.toLowerCase() === 'body weight';
}

// Opciones de filtro para el UI
export const BODY_PART_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'brazos', label: 'Brazos' },
  { value: 'piernas', label: 'Piernas' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'pecho', label: 'Pecho' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
];

export const EQUIPMENT_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'peso corporal', label: 'Peso corporal' },
  { value: 'mancuernas', label: 'Mancuernas' },
  { value: 'barra', label: 'Barra' },
  { value: 'cable', label: 'Cable' },
  { value: 'máquina', label: 'Máquina' },
  { value: 'banda', label: 'Banda' },
  { value: 'smith', label: 'Smith' },
  { value: 'kettlebell', label: 'Kettlebell' },
];
