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

// Etiquetas de equipamiento en español — las claves son los 28 valores
// distintos que existen hoy en prisma/data/exercises.json (equipment).
const EQUIPMENT_LABELS: Record<string, string> = {
  assisted: 'Asistido',
  band: 'Banda',
  barbell: 'Barra',
  'body weight': 'Peso corporal',
  'bosu ball': 'Bosu',
  cable: 'Cable',
  dumbbell: 'Mancuernas',
  'elliptical machine': 'Elíptica',
  'ez barbell': 'Barra EZ',
  hammer: 'Barra Hammer',
  kettlebell: 'Kettlebell',
  'leverage machine': 'Máquina',
  'medicine ball': 'Balón medicinal',
  'olympic barbell': 'Barra olímpica',
  'resistance band': 'Banda',
  roller: 'Roller',
  rope: 'Cuerda',
  'skierg machine': 'Máquina de esquí',
  'sled machine': 'Trineo',
  'smith machine': 'Smith',
  'stability ball': 'Pelota',
  'stationary bike': 'Bicicleta fija',
  'stepmill machine': 'Escaladora',
  tire: 'Neumático',
  'trap bar': 'Trap bar',
  'upper body ergometer': 'Ergómetro de brazos',
  weighted: 'Lastrado',
  'wheel roller': 'Rueda abdominal',
};

export function getEquipmentLabel(equipment: string): string {
  return EQUIPMENT_LABELS[equipment.toLowerCase()] || equipment;
}

// Etiquetas de músculo en español — cubre tanto los valores de `target`
// (músculo principal) como los de `secondaryMuscles`, dos vocabularios del
// dataset que no siempre coinciden entre sí (ej. "delts" vs "deltoids",
// "quads" vs "quadriceps") para el mismo músculo.
const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  abs: 'Abdominales',
  adductors: 'Aductores',
  'ankle stabilizers': 'Estabilizadores del tobillo',
  ankles: 'Tobillos',
  back: 'Espalda',
  biceps: 'Bíceps',
  brachialis: 'Braquial',
  calves: 'Pantorrillas',
  'cardiovascular system': 'Sistema cardiovascular',
  chest: 'Pecho',
  core: 'Core',
  deltoids: 'Deltoides',
  delts: 'Deltoides',
  feet: 'Pies',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  'grip muscles': 'Músculos de agarre',
  groin: 'Ingle',
  hamstrings: 'Isquiotibiales',
  hands: 'Manos',
  'hip flexors': 'Flexores de cadera',
  'inner thighs': 'Muslo interno',
  'latissimus dorsi': 'Dorsal ancho',
  lats: 'Dorsales',
  'levator scapulae': 'Elevador de la escápula',
  'lower abs': 'Abdominales bajos',
  'lower back': 'Zona lumbar',
  obliques: 'Oblicuos',
  pectorals: 'Pectorales',
  quadriceps: 'Cuádriceps',
  quads: 'Cuádriceps',
  'rear deltoids': 'Deltoides posterior',
  rhomboids: 'Romboides',
  'rotator cuff': 'Manguito rotador',
  'serratus anterior': 'Serrato anterior',
  shins: 'Espinillas',
  shoulders: 'Hombros',
  soleus: 'Sóleo',
  spine: 'Columna',
  sternocleidomastoid: 'Esternocleidomastoideo',
  trapezius: 'Trapecio',
  traps: 'Trapecios',
  triceps: 'Tríceps',
  'upper back': 'Espalda alta',
  'upper chest': 'Pecho superior',
  'wrist extensors': 'Extensores de muñeca',
  'wrist flexors': 'Flexores de muñeca',
  wrists: 'Muñecas',
};

export function getMuscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle.toLowerCase()] || muscle;
}

// Equipamiento sin una carga que tenga sentido registrar en kg: "body weight"
// (solo repeticiones, a diferencia de "weighted", la variante lastrada de un
// movimiento bodyweight) y los ergómetros de cardio, donde el esfuerzo se
// regula por resistencia/velocidad de la máquina, no por un peso que el
// usuario cargue o sostenga.
const NO_WEIGHT_EQUIPMENT = new Set([
  'body weight',
  'elliptical machine',
  'stationary bike',
  'stepmill machine',
  'skierg machine',
  'upper body ergometer',
]);

export function isBodyweightExercise(equipment: string): boolean {
  return NO_WEIGHT_EQUIPMENT.has(equipment.toLowerCase());
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
