'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Tipos para el hook
export interface PlanExerciseData {
  id: string;
  exerciseId: string;
  order: number;
  phase: 'WARMUP' | 'MAIN' | 'COOLDOWN';
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    bodyPart: string;
    equipment: string;
    target: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    gifUrl: string | null;
    instructionsEs: string | null;
  };
}

export interface WorkoutSetData {
  id?: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
  rpe: number | null;
  completedAt: string | null;
}

interface UseWorkoutParams {
  sessionId: string;
  startedAt?: string; // ISO — inicio real de la sesión según el servidor
  exercises: PlanExerciseData[];
  existingSets: WorkoutSetData[];
  previousSets?: WorkoutSetData[]; // Sets de la sesión anterior para pre-popular pesos
}

// === Espejo local de sets pendientes de guardar ===
// El estado optimista vive solo en memoria: si el usuario refresca (o iOS
// desaloja la pestaña en background) antes de que un guardado fallido se
// reintente, la serie desaparecería sin rastro. Cada serie completada se
// espeja acá antes del POST y se borra cuando el servidor confirma; al montar,
// las pendientes se restauran y se reenvían (el endpoint es un upsert, así
// que reenviar dos veces es inocuo).

interface PendingSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
}

function pendingKey(sessionId: string) {
  return `gymapp:pendingSets:${sessionId}`;
}

function readPendingSets(sessionId: string): PendingSet[] {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(sessionId)) || '[]');
  } catch {
    return [];
  }
}

function writePendingSets(sessionId: string, items: PendingSet[]) {
  try {
    if (items.length === 0) {
      localStorage.removeItem(pendingKey(sessionId));
    } else {
      localStorage.setItem(pendingKey(sessionId), JSON.stringify(items));
    }
  } catch {
    // Storage bloqueado — el retry en memoria sigue funcionando igual.
  }
}

function addPendingSet(sessionId: string, entry: PendingSet) {
  const items = readPendingSets(sessionId).filter(
    (p) => !(p.exerciseId === entry.exerciseId && p.setNumber === entry.setNumber)
  );
  items.push(entry);
  writePendingSets(sessionId, items);
}

function removePendingSet(sessionId: string, exerciseId: string, setNumber: number) {
  writePendingSets(
    sessionId,
    readPendingSets(sessionId).filter(
      (p) => !(p.exerciseId === exerciseId && p.setNumber === setNumber)
    )
  );
}

export function useWorkout({
  sessionId,
  startedAt,
  exercises,
  existingSets,
  previousSets = [],
}: UseWorkoutParams) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<Map<string, WorkoutSetData[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [failedSets, setFailedSets] = useState<Set<string>>(new Set());
  // Inicio real de la sesión: el startedAt del servidor, no el mount del
  // componente — un refresh a mitad de rutina no reinicia el reloj a 0:00.
  const startTime = useRef<Date>(startedAt ? new Date(startedAt) : new Date());

  const setKey = (exerciseId: string, setNumber: number) => `${exerciseId}:${setNumber}`;

  // Inicializar sets desde los existentes o crear vacíos
  useEffect(() => {
    const setsMap = new Map<string, WorkoutSetData[]>();
    // Sets completados que no llegaron al servidor antes del último unload
    const pending = readPendingSets(sessionId);

    exercises.forEach((planExercise) => {
      const exerciseId = planExercise.exerciseId;
      const exerciseSets: WorkoutSetData[] = [];

      for (let i = 1; i <= planExercise.sets; i++) {
        // Buscar set existente (si estamos resumiendo)
        const existing = existingSets.find(
          (s) => s.exerciseId === exerciseId && s.setNumber === i
        );

        const pendingSet = pending.find(
          (p) => p.exerciseId === exerciseId && p.setNumber === i
        );

        if (existing) {
          exerciseSets.push(existing);
        } else if (pendingSet) {
          // Restaurar la serie completada localmente que nunca se guardó
          exerciseSets.push({
            exerciseId,
            setNumber: i,
            reps: pendingSet.reps,
            weight: pendingSet.weight,
            completed: true,
            rpe: pendingSet.rpe,
            completedAt: null,
          });
        } else {
          // Pre-popular peso de sesión anterior
          const prevSet = previousSets.find(
            (s) => s.exerciseId === exerciseId && s.setNumber === i
          );

          exerciseSets.push({
            exerciseId,
            setNumber: i,
            reps: null,
            weight: prevSet?.weight ?? null,
            completed: false,
            rpe: null,
            completedAt: null,
          });
        }
      }

      setsMap.set(exerciseId, exerciseSets);
    });

    setSets(setsMap);

    // Encontrar el primer ejercicio no completado
    const firstIncomplete = exercises.findIndex((pe) => {
      const eSets = existingSets.filter((s) => s.exerciseId === pe.exerciseId);
      const completedSets = eSets.filter((s) => s.completed).length;
      return completedSets < pe.sets;
    });

    if (firstIncomplete >= 0) {
      setCurrentExerciseIndex(firstIncomplete);
    }
  }, [sessionId, exercises, existingSets, previousSets]);

  // Envía una serie a la API. No toca el estado optimista — eso lo maneja el caller
  // (completeSet lo actualiza antes de llamar; retrySet ya lo tiene actualizado).
  // La serie se espeja en localStorage antes del POST y se borra al confirmar,
  // así un refresh con un guardado en vuelo (o fallido) no la pierde.
  const saveSet = useCallback(
    async (exerciseId: string, setNumber: number, reps: number, weight: number | null, rpe?: number | null) => {
      const key = setKey(exerciseId, setNumber);
      addPendingSet(sessionId, { exerciseId, setNumber, reps, weight, rpe: rpe ?? null });
      setSaving(true);
      try {
        const res = await fetch(`/api/workouts/${sessionId}/sets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseId,
            setNumber,
            reps,
            weight,
            completed: true,
            rpe: rpe ?? null,
          }),
        });

        if (res.status === 401) {
          // Sesión expirada a mitad del entrenamiento: el set queda espejado
          // en localStorage y se reenvía al volver del login.
          window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        if (!res.ok) {
          throw new Error('Error al guardar serie');
        }

        removePendingSet(sessionId, exerciseId, setNumber);
        setFailedSets((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } catch (err) {
        setFailedSets((prev) => new Set(prev).add(key));
        console.error('Error guardando set:', err);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  // Reenviar al montar las series que quedaron pendientes de un unload anterior.
  // El endpoint es un upsert por (sesión, ejercicio, serie), así que un reenvío
  // duplicado (ej. doble-invocación de efectos en dev) es inocuo.
  const pendingSyncDone = useRef(false);
  useEffect(() => {
    if (pendingSyncDone.current) return;
    pendingSyncDone.current = true;

    const pending = readPendingSets(sessionId);
    pending.forEach((p) => {
      saveSet(p.exerciseId, p.setNumber, p.reps, p.weight, p.rpe);
    });
  }, [sessionId, saveSet]);

  // Completar una serie
  const completeSet = useCallback(
    async (exerciseId: string, setNumber: number, reps: number, weight: number | null, rpe?: number) => {
      // Actualización optimista
      setSets((prev) => {
        const newMap = new Map(prev);
        const exerciseSets = [...(newMap.get(exerciseId) || [])];
        const idx = exerciseSets.findIndex((s) => s.setNumber === setNumber);

        if (idx >= 0) {
          exerciseSets[idx] = {
            ...exerciseSets[idx],
            reps,
            weight,
            rpe: rpe ?? null,
            completed: true,
            completedAt: new Date().toISOString(),
          };
        }

        newMap.set(exerciseId, exerciseSets);
        return newMap;
      });

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }

      await saveSet(exerciseId, setNumber, reps, weight, rpe ?? null);
    },
    [saveSet]
  );

  // Reintenta guardar una serie que falló, usando los valores que ya están en pantalla
  // (la actualización optimista ya los tiene — no se piden de nuevo).
  const retrySet = useCallback(
    async (exerciseId: string, setNumber: number) => {
      const exerciseSets = sets.get(exerciseId) || [];
      const set = exerciseSets.find((s) => s.setNumber === setNumber);
      if (!set) return;

      await saveSet(exerciseId, setNumber, set.reps ?? 0, set.weight, set.rpe);
    },
    [sets, saveSet]
  );

  const isSetFailed = useCallback(
    (exerciseId: string, setNumber: number) => failedSets.has(setKey(exerciseId, setNumber)),
    [failedSets]
  );

  // Deshacer una serie
  const undoSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      setSets((prev) => {
        const newMap = new Map(prev);
        const exerciseSets = [...(newMap.get(exerciseId) || [])];
        const idx = exerciseSets.findIndex((s) => s.setNumber === setNumber);

        if (idx >= 0) {
          exerciseSets[idx] = {
            ...exerciseSets[idx],
            completed: false,
            completedAt: null,
          };
        }

        newMap.set(exerciseId, exerciseSets);
        return newMap;
      });

      // Si la serie deshecha había fallado al guardar, limpiar ese aviso y su
      // espejo local — al completarla de nuevo se reintenta desde cero.
      removePendingSet(sessionId, exerciseId, setNumber);
      const key = setKey(exerciseId, setNumber);
      setFailedSets((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [sessionId]
  );

  // Navegación entre ejercicios
  const nextExercise = useCallback(() => {
    setCurrentExerciseIndex((prev) => Math.min(prev + 1, exercises.length - 1));
  }, [exercises.length]);

  const prevExercise = useCallback(() => {
    setCurrentExerciseIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToExercise = useCallback((index: number) => {
    setCurrentExerciseIndex(index);
  }, []);

  // Progreso por ejercicio
  const getExerciseProgress = useCallback(
    (exerciseId: string): { completed: number; total: number } => {
      const exerciseSets = sets.get(exerciseId) || [];
      const completed = exerciseSets.filter((s) => s.completed).length;
      const total = exerciseSets.length;
      return { completed, total };
    },
    [sets]
  );

  // Peso anterior para un ejercicio y serie
  const getPreviousWeight = useCallback(
    (exerciseId: string, setNumber: number): number | null => {
      const prevSet = previousSets.find(
        (s) => s.exerciseId === exerciseId && s.setNumber === setNumber
      );
      return prevSet?.weight ?? null;
    },
    [previousSets]
  );

  // Reps anteriores para un ejercicio y serie — mismo criterio que getPreviousWeight
  const getPreviousReps = useCallback(
    (exerciseId: string, setNumber: number): number | null => {
      const prevSet = previousSets.find(
        (s) => s.exerciseId === exerciseId && s.setNumber === setNumber
      );
      return prevSet?.reps ?? null;
    },
    [previousSets]
  );

  // ¿Está completo todo el workout?
  const isWorkoutComplete = exercises.every((pe) => {
    const { completed, total } = getExerciseProgress(pe.exerciseId);
    return completed >= total;
  });

  // ¿Está completo el ejercicio actual?
  const isCurrentExerciseComplete = (() => {
    const current = exercises[currentExerciseIndex];
    if (!current) return false;
    const { completed, total } = getExerciseProgress(current.exerciseId);
    return completed >= total;
  })();

  // Stats computados
  const totalVolume = (() => {
    let volume = 0;
    sets.forEach((exerciseSets) => {
      exerciseSets.forEach((s) => {
        if (s.completed && s.reps && s.weight) {
          volume += s.reps * s.weight;
        }
      });
    });
    return volume;
  })();

  const totalSetsCompleted = (() => {
    let count = 0;
    sets.forEach((exerciseSets) => {
      exerciseSets.forEach((s) => {
        if (s.completed) count++;
      });
    });
    return count;
  })();

  const totalSetsPlanned = exercises.reduce((acc, pe) => acc + pe.sets, 0);

  // Tiempo transcurrido
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedElapsedTime = (() => {
    const mins = Math.floor(elapsedTime / 60);
    const secs = elapsedTime % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  })();

  return {
    // Estado
    currentExerciseIndex,
    currentExercise: exercises[currentExerciseIndex] || null,
    sets,
    saving,
    isWorkoutComplete,
    isCurrentExerciseComplete,

    // Acciones
    completeSet,
    retrySet,
    undoSet,
    nextExercise,
    prevExercise,
    goToExercise,

    // Consultas
    getExerciseProgress,
    getPreviousWeight,
    getPreviousReps,
    isSetFailed,

    // Stats
    totalVolume,
    totalSetsCompleted,
    totalSetsPlanned,
    elapsedTime,
    formattedElapsedTime,
  };
}
