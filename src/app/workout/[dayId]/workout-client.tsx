'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkout, type PlanExerciseData, type WorkoutSetData } from '@/hooks/useWorkout';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { WorkoutHeader } from '@/components/workout/workout-header';
import { ExerciseProgress } from '@/components/workout/exercise-progress';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetRow } from '@/components/workout/set-row';

interface WorkoutClientProps {
  planDay: {
    id: string;
    name: string;
    planId: string;
  };
  exercises: PlanExerciseData[];
  session: {
    id: string;
    weekNumber: number;
    startedAt: string;
  };
  existingSets: WorkoutSetData[];
  previousSets: WorkoutSetData[];
}

export function WorkoutClient({
  planDay,
  exercises,
  session,
  existingSets,
  previousSets,
}: WorkoutClientProps) {
  const router = useRouter();

  const {
    currentExerciseIndex,
    currentExercise,
    sets,
    saving,
    isWorkoutComplete,
    isCurrentExerciseComplete,
    completeSet,
    retrySet,
    undoSet,
    nextExercise,
    prevExercise,
    goToExercise,
    getExerciseProgress,
    getPreviousWeight,
    getPreviousReps,
    isSetFailed,
    totalSetsCompleted,
    totalSetsPlanned,
    formattedElapsedTime,
  } = useWorkout({
    sessionId: session.id,
    startedAt: session.startedAt,
    exercises,
    existingSets,
    previousSets,
  });

  // Al cambiar de ejercicio (siguiente o salto directo desde el progreso/preview),
  // volver arriba del todo. Sin esto la página queda donde estaba el usuario
  // dentro de la ficha anterior — normalmente scrolleada hasta las series — y
  // el nuevo ejercicio arranca a mitad de scroll en vez de mostrar su nombre/GIF.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentExerciseIndex]);

  // Navegación por swipe horizontal entre ejercicios. Solo dispara cuando el
  // gesto es claramente horizontal (umbral de distancia + dominancia sobre el
  // eje vertical) para no interferir con el scroll normal de la página.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start) return;

      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      if (dx < 0) {
        nextExercise();
      } else {
        prevExercise();
      }
    },
    [nextExercise, prevExercise]
  );

  // Manejar botón principal (CTA)
  const handleMainAction = useCallback(() => {
    if (isWorkoutComplete) {
      // Finalizar rutina
      router.push(`/workout/${planDay.id}/complete?sessionId=${session.id}`);
    } else if (isCurrentExerciseComplete) {
      // Siguiente ejercicio
      nextExercise();
    }
  }, [isWorkoutComplete, isCurrentExerciseComplete, nextExercise, router, planDay.id, session.id]);

  // Volver
  const handleBack = () => {
    router.push('/');
  };

  if (!currentExercise) return null;

  const currentSets = sets.get(currentExercise.exerciseId) || [];
  const { completed: completedSets, total: totalExSets } = getExerciseProgress(currentExercise.exerciseId);

  // Determinar texto del CTA
  const getCtaText = () => {
    if (isWorkoutComplete) return '🎉 FINALIZAR RUTINA';
    if (isCurrentExerciseComplete) return 'SIGUIENTE EJERCICIO →';
    return null; // No mostrar CTA fijo si no está completo el ejercicio
  };

  const ctaText = getCtaText();

  return (
    <div
      className="flex flex-col min-h-screen bg-background pb-20"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <WorkoutHeader
        dayName={planDay.name}
        elapsedTime={formattedElapsedTime}
        progress={`${totalSetsCompleted}/${totalSetsPlanned}`}
        onBack={handleBack}
        hasStarted={totalSetsCompleted > 0}
      />

      {/* Barra de progreso de ejercicios */}
      <ExerciseProgress
        exercises={exercises.map((pe) => ({
          exerciseId: pe.exerciseId,
          name: pe.exercise.name,
        }))}
        currentIndex={currentExerciseIndex}
        getProgress={getExerciseProgress}
        onJumpTo={goToExercise}
      />

      {/* Ejercicio actual */}
      <ExerciseCard
        exercise={currentExercise.exercise}
        phase={currentExercise.phase}
        setsInfo={`${currentExercise.sets} × ${currentExercise.repsMin}-${currentExercise.repsMax}`}
        notes={currentExercise.notes}
      />

      {/* Series */}
      <div className="flex-1 py-2 space-y-2">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-base font-semibold text-muted-foreground">
            Series (<span className="font-mono">{completedSets}/{totalExSets}</span>)
          </h3>
          {saving && (
            <span className="text-xs text-muted-foreground animate-pulse">Guardando...</span>
          )}
        </div>

        <div className="space-y-2">
          {currentSets.map((set, idx) => {
            // Auto-focus en la primera serie no completada
            const firstIncomplete = currentSets.findIndex((s) => !s.completed);
            const shouldFocus = idx === firstIncomplete;

            return (
              <SetRow
                key={`${currentExercise.exerciseId}-${set.setNumber}`}
                setNumber={set.setNumber}
                repsMin={currentExercise.repsMin}
                repsMax={currentExercise.repsMax}
                currentReps={set.reps}
                currentWeight={set.weight}
                previousWeight={getPreviousWeight(currentExercise.exerciseId, set.setNumber)}
                previousReps={getPreviousReps(currentExercise.exerciseId, set.setNumber)}
                completed={set.completed}
                isBodyweight={isBodyweightExercise(currentExercise.exercise.equipment)}
                isFailed={isSetFailed(currentExercise.exerciseId, set.setNumber)}
                onComplete={(reps, weight) =>
                  completeSet(currentExercise.exerciseId, set.setNumber, reps, weight)
                }
                onUndo={() => undoSet(currentExercise.exerciseId, set.setNumber)}
                onRetry={() => retrySet(currentExercise.exerciseId, set.setNumber)}
                autoFocus={shouldFocus}
              />
            );
          })}
        </div>
      </div>

      {/* CTA fijo inferior — siempre Volt, incluso al finalizar (momento de logro) */}
      {ctaText && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom">
          <button
            onClick={handleMainAction}
            className="w-full h-14 rounded-md font-display font-bold text-lg text-primary-foreground bg-primary transition-colors duration-150 ease-out-quint active:bg-volt-bright"
          >
            {ctaText}
          </button>
        </div>
      )}
    </div>
  );
}
