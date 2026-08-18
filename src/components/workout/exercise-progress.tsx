'use client';

interface ExerciseProgressProps {
  exercises: Array<{
    exerciseId: string;
    name: string;
  }>;
  currentIndex: number;
  getProgress: (exerciseId: string) => { completed: number; total: number };
  onJumpTo: (index: number) => void;
}

export function ExerciseProgress({ exercises, currentIndex, getProgress, onJumpTo }: ExerciseProgressProps) {
  return (
    <div className="px-4 py-2 bg-secondary/50">
      {/* Texto de progreso */}
      <p className="text-xs text-muted-foreground mb-1.5 text-center font-medium font-mono">
        Ejercicio {currentIndex + 1} de {exercises.length}
      </p>

      {/* Barra segmentada — una sola fila sin importar cuántos ejercicios tenga
          el día (a diferencia de los dots anteriores, que con 8+ ejercicios
          envolvían a una segunda fila y comían espacio vertical). */}
      <div className="flex items-center gap-1">
        {exercises.map((exercise, index) => {
          const { completed, total } = getProgress(exercise.exerciseId);
          const isComplete = completed >= total;
          const isCurrent = index === currentIndex;

          return (
            <button
              key={exercise.exerciseId}
              onClick={() => onJumpTo(index)}
              className="flex-1 min-h-touch flex items-center justify-center"
              aria-label={`${exercise.name} - ${completed}/${total} series`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={`block w-full rounded-full transition-all duration-200 ease-out-quint ${
                  isCurrent
                    ? 'h-2 bg-primary shadow-volt-glow'
                    : isComplete
                      ? 'h-1.5 bg-foreground/40'
                      : 'h-1.5 bg-foreground/15'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
