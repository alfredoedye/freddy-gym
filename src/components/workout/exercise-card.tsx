'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Target, X } from 'lucide-react';

const PHASE_LABELS: Record<'WARMUP' | 'MAIN' | 'COOLDOWN', string> = {
  WARMUP: '🔥 Calentamiento',
  MAIN: '💪 Principal',
  COOLDOWN: '🧘 Enfriamiento',
};

interface ExerciseCardProps {
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
  phase: 'WARMUP' | 'MAIN' | 'COOLDOWN';
  setsInfo: string; // e.g. "4 × 8-12"
  restSeconds: number;
  notes: string | null;
}

export function ExerciseCard({ exercise, phase, setsInfo, restSeconds, notes }: ExerciseCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const mediaUrl = exercise.gifUrl || exercise.imageUrl;

  return (
    <>
      <div className="px-4 py-4">
        {/* GIF grande y centrado */}
        {mediaUrl && (
          <button
            onClick={() => setShowGifModal(true)}
            className="mx-auto mb-4 block w-full max-w-[280px]"
            aria-label="Ver ejercicio en pantalla completa"
          >
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-secondary">
              <img
                src={mediaUrl}
                alt={exercise.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </button>
        )}

        {/* Nombre e info */}
        <div className="text-center mb-3">
          {phase !== 'MAIN' && (
            <span className="inline-block text-xs font-semibold text-muted-foreground mb-1">
              {PHASE_LABELS[phase]}
            </span>
          )}
          {/* Nombre del ejercicio */}
          <h2 className="font-display text-xl font-bold leading-tight mb-1">{exercise.name}</h2>

          {/* Series × Reps */}
          <p className="text-lg text-foreground font-semibold font-mono">
            {setsInfo} · {restSeconds}s descanso
          </p>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary text-muted-foreground px-2 py-1 rounded-full">
              <Target className="w-3 h-3" />
              {exercise.target}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary text-muted-foreground px-2 py-1 rounded-full">
              <Dumbbell className="w-3 h-3" />
              {exercise.equipment}
            </span>
          </div>
        </div>

        {/* Notas del plan */}
        {notes && (
          <div className="bg-secondary/50 rounded-lg p-3 mb-3">
            <p className="text-sm text-foreground/80">💡 {notes}</p>
          </div>
        )}

        {/* Toggle instrucciones */}
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 min-h-[40px]"
        >
          {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showInstructions ? 'Ocultar instrucciones' : 'Ver instrucciones'}
        </button>

        {/* Instrucciones expandidas */}
        {showInstructions && exercise.instructionsEs && (
          <div className="mt-2 bg-secondary/50 rounded-lg p-3">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {exercise.instructionsEs}
            </p>
          </div>
        )}
      </div>

      {/* Modal GIF ampliado */}
      {showGifModal && mediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowGifModal(false)}
        >
          <div className="relative max-w-sm w-full">
            <button
              onClick={() => setShowGifModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={mediaUrl} alt={exercise.name} className="w-full rounded-2xl" />
            <p className="text-center text-white mt-3 text-lg font-semibold">{exercise.name}</p>
          </div>
        </div>
      )}
    </>
  );
}
