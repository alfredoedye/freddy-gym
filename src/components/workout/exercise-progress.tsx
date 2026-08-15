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
    <div className="px-4 py-3 bg-secondary/50">
      {/* Texto de progreso */}
      <p className="text-sm text-muted-foreground mb-2 text-center font-medium font-mono">
        Ejercicio {currentIndex + 1} de {exercises.length}
      </p>

      {/* Dots de progreso */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {exercises.map((exercise, index) => {
          const { completed, total } = getProgress(exercise.exerciseId);
          const isComplete = completed >= total;
          const isCurrent = index === currentIndex;

          return (
            <button
              key={exercise.exerciseId}
              onClick={() => onJumpTo(index)}
              className={`min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 ease-out-quint active:scale-95 ${
                isCurrent
                  ? 'bg-primary text-primary-foreground scale-110 shadow-volt-glow'
                  : isComplete
                    ? 'bg-primary/60 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
              }`}
              aria-label={`${exercise.name} - ${completed}/${total} series`}
            >
              {isComplete ? '✓' : index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
