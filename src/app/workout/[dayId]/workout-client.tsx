'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkout, type PlanExerciseData, type WorkoutSetData } from '@/hooks/useWorkout';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { WorkoutHeader } from '@/components/workout/workout-header';
import { ExerciseProgress } from '@/components/workout/exercise-progress';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetRow } from '@/components/workout/set-row';
import { RestTimer } from '@/components/workout/rest-timer';
import { ChevronRight } from 'lucide-react';

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
  const [timerActive, setTimerActive] = useState(false);

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
    exercises,
    existingSets,
    previousSets,
  });

  // Manejar completar serie
  const handleCompleteSet = useCallback(
    (exerciseId: string, setNumber: number, reps: number, weight: number | null) => {
      completeSet(exerciseId, setNumber, reps, weight);
      // Activar timer de descanso
      setTimerActive(true);
    },
    [completeSet]
  );

  // Manejar timer completado o skip
  const handleTimerDone = useCallback(() => {
    setTimerActive(false);
  }, []);

  // Manejar botón principal (CTA)
  const handleMainAction = useCallback(() => {
    if (isWorkoutComplete) {
      // Finalizar rutina
      router.push(`/workout/${planDay.id}/complete?sessionId=${session.id}`);
    } else if (isCurrentExerciseComplete) {
      // Siguiente ejercicio
      setTimerActive(false);
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
    <div className="flex flex-col min-h-screen bg-background pb-20">
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

      {/* Timer de descanso — se renderiza antes que la ficha del ejercicio para que,
          cuando está activo, sus controles (saltar, ±15s) queden arriba del fold en
          vez de debajo de la ficha completa (GIF + info + notas). Cuando no está
          activo, RestTimer no renderiza nada, así que esto no afecta el layout normal. */}
      <RestTimer
        duration={currentExercise.restSeconds}
        isActive={timerActive}
        onComplete={handleTimerDone}
        onSkip={handleTimerDone}
      />

      {/* Ejercicio actual */}
      <ExerciseCard
        exercise={currentExercise.exercise}
        phase={currentExercise.phase}
        setsInfo={`${currentExercise.sets} × ${currentExercise.repsMin}-${currentExercise.repsMax}`}
        restSeconds={currentExercise.restSeconds}
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
                  handleCompleteSet(currentExercise.exerciseId, set.setNumber, reps, weight)
                }
                onUndo={() => undoSet(currentExercise.exerciseId, set.setNumber)}
                onRetry={() => retrySet(currentExercise.exerciseId, set.setNumber)}
                autoFocus={shouldFocus}
              />
            );
          })}
        </div>
      </div>

      {/* Próximos ejercicios (preview) — clickeables, saltan directo a ese ejercicio */}
      {currentExerciseIndex < exercises.length - 1 && (
        <div className="px-4 py-3 border-t border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Siguiente
          </p>
          {exercises.slice(currentExerciseIndex + 1, currentExerciseIndex + 3).map((pe, i) => (
            <button
              key={pe.exerciseId}
              onClick={() => goToExercise(currentExerciseIndex + 1 + i)}
              className="flex w-full min-h-touch items-center justify-between gap-2 rounded-md px-2 -mx-2 py-2 text-left transition-colors duration-150 ease-out-quint hover:bg-secondary active:bg-secondary"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-sm text-foreground/80 truncate">{pe.exercise.name}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                {pe.sets} × {pe.repsMin}-{pe.repsMax}
              </span>
            </button>
          ))}
        </div>
      )}

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
