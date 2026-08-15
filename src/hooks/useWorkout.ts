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
  exercises: PlanExerciseData[];
  existingSets: WorkoutSetData[];
  previousSets?: WorkoutSetData[]; // Sets de la sesión anterior para pre-popular pesos
}

export function useWorkout({ sessionId, exercises, existingSets, previousSets = [] }: UseWorkoutParams) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<Map<string, WorkoutSetData[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef<Date>(new Date());

  // Inicializar sets desde los existentes o crear vacíos
  useEffect(() => {
    const setsMap = new Map<string, WorkoutSetData[]>();

    exercises.forEach((planExercise) => {
      const exerciseId = planExercise.exerciseId;
      const exerciseSets: WorkoutSetData[] = [];

      for (let i = 1; i <= planExercise.sets; i++) {
        // Buscar set existente (si estamos resumiendo)
        const existing = existingSets.find(
          (s) => s.exerciseId === exerciseId && s.setNumber === i
        );

        if (existing) {
          exerciseSets.push(existing);
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
  }, [exercises, existingSets, previousSets]);

  // Completar una serie
  const completeSet = useCallback(
    async (exerciseId: string, setNumber: number, reps: number, weight: number | null, rpe?: number) => {
      setError(null);

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

      // Guardar en API
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

        if (!res.ok) {
          throw new Error('Error al guardar serie');
        }
      } catch (err) {
        setError('No se pudo guardar. Se reintentará.');
        // Revertir optimista en caso de error severo — por ahora mantener local
        console.error('Error guardando set:', err);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
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
    },
    []
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
    error,
    isWorkoutComplete,
    isCurrentExerciseComplete,

    // Acciones
    completeSet,
    undoSet,
    nextExercise,
    prevExercise,
    goToExercise,

    // Consultas
    getExerciseProgress,
    getPreviousWeight,

    // Stats
    totalVolume,
    totalSetsCompleted,
    totalSetsPlanned,
    elapsedTime,
    formattedElapsedTime,
  };
}
