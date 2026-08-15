'use client';

interface PRBadgeProps {
  weight: number;
  reps: number;
  date: string;
  exerciseName: string;
  isNew?: boolean;
}

// El badge de PR es uno de los momentos con Volt sólido — ver DESIGN.md § Overview
export function PRBadge({ weight, reps, date, exerciseName, isNew }: PRBadgeProps) {
  const formattedDate = new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-accent">
      <div className="flex-shrink-0">
        <span className="text-2xl">🏆</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{exerciseName}</p>
        <p className="font-mono text-lg font-bold text-foreground">
          {weight} kg × {reps} reps
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground font-mono">{formattedDate}</span>
        {isNew && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground animate-pulse">
            ¡Nuevo PR!
          </span>
        )}
      </div>
    </div>
  );
}

// Versión compacta para listas
export function PRBadgeCompact({
  weight,
  exerciseName,
}: {
  weight: number;
  exerciseName: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent border border-primary/30">
      <span className="text-sm">🏆</span>
      <span className="text-xs font-medium text-accent-text font-mono">
        {exerciseName}: {weight} kg
      </span>
    </div>
  );
}
