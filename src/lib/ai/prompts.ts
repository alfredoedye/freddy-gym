/**
 * Prompts para el agente IA que genera planes de entrenamiento.
 * El sistema actúa como un entrenador personal experto en musculación.
 */

import type { Profile, Exercise, PlanFeedback } from '@prisma/client';
import { calculateAge } from '@/lib/date-utils';

// === PROMPT DEL SISTEMA ===

export const SYSTEM_PROMPT = `Eres un entrenador personal experto en musculación con más de 15 años de experiencia.
Tu especialidad es diseñar planes de entrenamiento periodizados y personalizados.

REGLAS PARA LA SELECCIÓN DE EJERCICIOS:
1. Siempre empezar con ejercicios compuestos (multi-articulares) y terminar con aislamiento.
2. Priorizar movimientos fundamentales: sentadilla, peso muerto, press banca, press militar, dominadas, remo.
3. Incluir variedad para evitar adaptación — no repetir el mismo ejercicio en días consecutivos.
4. Para nivel avanzado: 16-22 series por grupo muscular por semana.
5. Respetar la proporción push/pull para salud articular.
6. Incluir trabajo de músculos estabilizadores y core cuando sea apropiado.
7. Los tiempos de descanso deben ser coherentes con el objetivo (fuerza: 2-5min, hipertrofia: 60-120s, resistencia: 30-60s).
8. Considerar la edad, el sexo y el nivel del usuario al calibrar intensidad y selección de ejercicios (ej: mayor énfasis en movilidad y control articular en usuarios de mayor edad o nivel principiante).
9. Cada día de entrenamiento debe incluir un bloque de CALENTAMIENTO al inicio (fase "WARMUP": movimiento dinámico o cardio suave relacionado a los grupos musculares del día) y un bloque de ENFRIAMIENTO/ELONGACIÓN al final (fase "COOLDOWN": estiramientos de los músculos trabajados), además de los ejercicios principales (fase "MAIN").

REGLAS PARA LA RESPUESTA:
- Responder ÚNICAMENTE en formato JSON válido.
- Usar SOLO los IDs de ejercicios proporcionados en el pool disponible.
- No inventar ejercicios ni IDs que no estén en la lista.
- Asignar rangos de repeticiones coherentes con el objetivo del usuario.
- Incluir "notes" SOLO en ejercicios "COOLDOWN" (duración del estiramiento) y en como máximo 2 ejercicios "MAIN" por día que realmente lo necesiten (una corrección técnica puntual, máximo 8 palabras). Omitir "notes" en el resto — no es obligatorio en cada ejercicio y una respuesta más corta reduce el riesgo de que se corte a mitad de generación en planes de varios días.`;

// === CONTEXTO DEL USUARIO ===

interface UserContext {
  profile: Profile;
  name?: string;
}

export function buildUserContext({ profile, name }: UserContext): string {
  const goalLabels: Record<string, string> = {
    HYPERTROPHY: 'Hipertrofia',
    STRENGTH: 'Fuerza máxima',
    ENDURANCE: 'Resistencia muscular',
    FAT_LOSS: 'Pérdida de grasa',
    RECOMPOSITION: 'Recomposición corporal',
  };

  const levelLabels: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  };

  const sexLabels: Record<string, string> = {
    MALE: 'Hombre',
    FEMALE: 'Mujer',
  };

  const age = profile.birthDate ? calculateAge(profile.birthDate) : null;

  return `PERFIL DEL USUARIO:
- Nombre: ${name || 'Usuario'}
- Nivel: ${levelLabels[profile.level] || profile.level}
- Objetivo principal: ${goalLabels[profile.goal] || profile.goal}
- Edad: ${age ? `${age} años` : 'No especificada'}
- Sexo: ${profile.sex ? sexLabels[profile.sex] || profile.sex : 'No especificado'}
- Altura: ${profile.height ? `${profile.height} cm` : 'No especificada'}
- Peso: ${profile.weight ? `${profile.weight} kg` : 'No especificado'}`;
}

// === SOLICITUD DE PLAN ===

interface PlanRequest {
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  timePerSession?: number; // minutos
}

export function buildPlanRequest(params: PlanRequest): string {
  const splitLabels: Record<string, string> = {
    push_pull_legs: 'Push / Pull / Legs',
    upper_lower: 'Upper / Lower (Tren superior / Tren inferior)',
    full_body: 'Full Body (Cuerpo completo)',
    bro_split: 'Bro Split (Un grupo muscular por día)',
    custom: 'Personalizado',
  };

  const goalLabels: Record<string, string> = {
    HYPERTROPHY: 'Hipertrofia (8-12 reps, volumen moderado-alto)',
    STRENGTH: 'Fuerza máxima (1-6 reps, alta intensidad, descansos largos)',
    ENDURANCE: 'Resistencia muscular (15-25 reps, poco descanso)',
    FAT_LOSS: 'Pérdida de grasa (circuitos, supersets, 10-15 reps)',
    RECOMPOSITION: 'Recomposición (mix de fuerza e hipertrofia)',
  };

  return `PARÁMETROS DEL PLAN:
- Objetivo: ${goalLabels[params.goal] || params.goal}
- Duración total: ${params.durationWeeks} semanas
- Frecuencia: ${params.daysPerWeek} días por semana
- Split: ${splitLabels[params.split] || params.split}
- Tiempo por sesión: ${params.timePerSession || 60} minutos aproximadamente

INSTRUCCIONES:
- Genera exactamente ${params.daysPerWeek} días de entrenamiento (los demás son descanso).
- Cada día de entrenamiento debe tener entre 4 y 6 ejercicios principales, más su calentamiento y enfriamiento correspondientes.
- Nombra cada día de forma descriptiva (ej: "Push A - Pecho énfasis", "Pull B - Espalda ancho").
- Asigna series, rango de repeticiones y descanso apropiados al objetivo.
- Notas técnicas SOLO donde de verdad hagan falta (ver REGLAS PARA LA RESPUESTA) — priorizá una respuesta compacta.`;
}

// === CONTEXTO DE PROGRESIÓN ===

interface ProgressionData {
  feedback: PlanFeedback;
  previousPlanName: string;
  previousSplit: string;
  averageWeights: { exerciseName: string; avgWeight: number }[];
  completionRate: number; // 0-100
  totalSessions: number;
}

export function buildProgressionContext(data: ProgressionData): string {
  const difficultyLabels: Record<string, string> = {
    TOO_EASY: 'Muy fácil — el usuario necesita bastante más estímulo',
    EASY: 'Fácil — el usuario necesita más estímulo',
    JUST_RIGHT: 'Adecuado — buen balance, mantener intensidad similar',
    HARD: 'Difícil — considerar reducir volumen ligeramente',
    TOO_HARD: 'Muy difícil — reducir volumen e intensidad notablemente',
  };

  const weightsSection = data.averageWeights.length > 0
    ? `\nPESOS PROMEDIO UTILIZADOS:\n${data.averageWeights
        .slice(0, 20) // limitar para no saturar el contexto
        .map((w) => `- ${w.exerciseName}: ${w.avgWeight} kg`)
        .join('\n')}`
    : '';

  return `PROGRESIÓN DESDE PLAN ANTERIOR:
- Plan anterior: "${data.previousPlanName}" (${data.previousSplit})
- Dificultad reportada: ${difficultyLabels[data.feedback.difficulty] || data.feedback.difficulty}
- Tasa de completitud: ${data.completionRate}% (${data.totalSessions} sesiones realizadas)
- Notas del usuario: ${data.feedback.notes || 'Sin notas adicionales'}
${weightsSection}

REGLAS DE PROGRESIÓN:
${['TOO_EASY', 'EASY'].includes(data.feedback.difficulty) ? `- AUMENTAR estímulo: +1 serie por ejercicio O reducir descanso 15s O aumentar rango de reps.
- Considerar ejercicios más desafiantes (ej: variantes con mayor ROM o inestabilidad).` : ''}
${data.feedback.difficulty === 'JUST_RIGHT' ? `- MANTENER volumen similar, variar ejercicios para nuevo estímulo.
- Cambiar al menos 30% de los ejercicios vs el plan anterior.
- Mantener los pesos como referencia base.` : ''}
${['HARD', 'TOO_HARD'].includes(data.feedback.difficulty) ? `- REDUCIR volumen ligeramente (-1 serie en ejercicios de aislamiento).
- Mantener intensidad en compuestos principales.
- Cambiar 1-2 ejercicios por variantes menos demandantes.
- Aumentar descansos en 15-30s si estaban por debajo de 90s.` : ''}
- SIEMPRE cambiar al menos 30% de los ejercicios respecto al plan anterior para evitar estancamiento.`;
}

// === HISTORIAL GENERAL (récords personales) ===

interface PersonalRecordSummary {
  exerciseName: string;
  weight: number;
  reps: number;
}

/**
 * Construye un resumen de récords personales del usuario, independientemente
 * de si se está regenerando un plan puntual. Se usa para calibrar pesos
 * iniciales incluso en la creación de un plan totalmente nuevo.
 */
export function buildPersonalRecordsContext(records: PersonalRecordSummary[]): string {
  if (records.length === 0) return '';

  return `RÉCORDS PERSONALES DEL USUARIO (de entrenamientos anteriores — usar como referencia para calibrar pesos e intensidad inicial):
${records
  .slice(0, 15) // limitar para no saturar el contexto
  .map((r) => `- ${r.exerciseName}: ${r.weight} kg x ${r.reps} reps`)
  .join('\n')}`;
}

// === POOL DE EJERCICIOS ===

interface ExerciseForPool {
  id: string;
  name: string;
  target: string;
  equipment: string;
  bodyPart: string;
}

export function buildExercisePool(exercises: ExerciseForPool[]): string {
  // Agrupar por bodyPart para mejor organización
  const grouped: Record<string, ExerciseForPool[]> = {};

  for (const ex of exercises) {
    const key = ex.bodyPart;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  }

  let pool = 'EJERCICIOS DISPONIBLES (usar SOLO estos IDs):\n\n';

  for (const [bodyPart, exs] of Object.entries(grouped)) {
    pool += `## ${bodyPart.toUpperCase()}\n`;
    for (const ex of exs) {
      pool += `- ID: "${ex.id}" | ${ex.name} | Target: ${ex.target} | Equipo: ${ex.equipment}\n`;
    }
    pool += '\n';
  }

  return pool;
}

// === FORMATO DE RESPUESTA ===

export const RESPONSE_FORMAT = `FORMATO DE RESPUESTA (JSON estricto):
{
  "planName": "Nombre descriptivo del plan",
  "description": "Breve descripción del enfoque del plan (1-2 oraciones)",
  "days": [
    {
      "dayNumber": 1,
      "name": "Nombre del día (ej: Push A - Pecho énfasis)",
      "isRest": false,
      "exercises": [
        {
          "exerciseId": "0512",
          "phase": "WARMUP",
          "sets": 1,
          "repsMin": 10,
          "repsMax": 15,
          "restSeconds": 30
        },
        {
          "exerciseId": "0045",
          "phase": "MAIN",
          "sets": 4,
          "repsMin": 8,
          "repsMax": 12,
          "restSeconds": 90
        },
        {
          "exerciseId": "1512",
          "phase": "COOLDOWN",
          "sets": 1,
          "repsMin": 1,
          "repsMax": 1,
          "restSeconds": 30,
          "notes": "Mantener el estiramiento 30 segundos por lado"
        }
      ]
    },
    {
      "dayNumber": 7,
      "name": "Descanso",
      "isRest": true,
      "exercises": []
    }
  ]
}

IMPORTANTE:
- "days" debe tener exactamente 7 elementos (lunes a domingo).
- Los días de descanso tienen isRest: true y exercises: [].
- Cada día de entrenamiento debe tener, EN ESTE ORDEN dentro del array "exercises":
  1. Entre 1 y 3 ejercicios de fase "WARMUP" (calentamiento dinámico o cardio suave, relacionados a los grupos musculares del día).
  2. Entre 3 y 7 ejercicios de fase "MAIN" (el trabajo principal).
  3. Entre 1 y 3 ejercicios de fase "COOLDOWN" (estiramientos de los músculos trabajados ese día — buscar ejercicios cuyo nombre incluya "stretch" en el pool).
- Para "WARMUP" y "COOLDOWN": sets = 1. Para "COOLDOWN", usar repsMin = repsMax = 1 y describir la duración del estiramiento en "notes" (ej: "Mantener 30 segundos por lado") — es el único caso donde "notes" es obligatorio.
- Los exerciseId deben ser strings exactos del pool proporcionado.
- repsMin debe ser <= repsMax.
- restSeconds entre 30 y 300.
- sets entre 2 y 6 para ejercicios "MAIN"; sets = 1 para "WARMUP" y "COOLDOWN".`;
