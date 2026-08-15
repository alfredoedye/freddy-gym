'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface SetRowProps {
  setNumber: number;
  repsMin: number;
  repsMax: number;
  currentReps: number | null;
  currentWeight: number | null;
  previousWeight: number | null;
  completed: boolean;
  rpe: number | null;
  isBodyweight?: boolean;
  onComplete: (reps: number, weight: number | null, rpe?: number) => void;
  onUndo: () => void;
  autoFocus?: boolean;
}

export function SetRow({
  setNumber,
  repsMin,
  repsMax,
  currentReps,
  currentWeight,
  previousWeight,
  completed,
  rpe,
  isBodyweight = false,
  onComplete,
  onUndo,
  autoFocus = false,
}: SetRowProps) {
  const [reps, setReps] = useState<string>(currentReps?.toString() || '');
  const [weight, setWeight] = useState<string>(
    currentWeight?.toString() || previousWeight?.toString() || ''
  );
  const [showRpe, setShowRpe] = useState(false);
  const [selectedRpe, setSelectedRpe] = useState<number | null>(rpe);
  const repsRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  // Auto-focus en el primer input vacío
  useEffect(() => {
    if (autoFocus && !completed) {
      if (!isBodyweight && !weight) {
        weightRef.current?.focus();
      } else if (!reps) {
        repsRef.current?.focus();
      }
    }
  }, [autoFocus, completed, weight, reps, isBodyweight]);

  const handleComplete = () => {
    const repsNum = parseInt(reps) || 0;
    const weightNum = isBodyweight ? null : parseFloat(weight) || 0;

    if (repsNum <= 0) {
      repsRef.current?.focus();
      return;
    }

    onComplete(repsNum, weightNum, selectedRpe ?? undefined);
  };

  const handleRepsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isBodyweight || weight) {
        handleComplete();
      } else {
        weightRef.current?.focus();
      }
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (reps) {
        handleComplete();
      } else {
        repsRef.current?.focus();
      }
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors duration-150 ease-out-quint ${
        completed ? 'bg-accent border-primary/30' : 'bg-card border-border'
      }`}
    >
      {/* Número de serie */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className={`text-sm font-bold font-mono ${completed ? 'text-accent-text' : 'text-muted-foreground'}`}>
          S{setNumber}
        </span>
      </div>

      {/* Inputs */}
      <div className="flex-1 flex items-center gap-2">
        {/* Peso — no aplica en ejercicios de peso corporal */}
        {!isBodyweight && (
          <>
            <div className="flex-1 relative">
              <input
                ref={weightRef}
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder={previousWeight ? `${previousWeight}` : 'kg'}
                value={completed ? (currentWeight?.toString() || weight) : weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={handleWeightKeyDown}
                disabled={completed}
                className={`w-full h-12 text-lg font-semibold font-mono text-center rounded-md border transition-colors duration-150 ease-out-quint ${
                  completed
                    ? 'bg-transparent border-transparent text-accent-text'
                    : 'bg-secondary border-transparent focus-visible:border-primary focus-visible:shadow-volt-glow outline-none'
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                kg
              </span>
            </div>

            {/* Separador */}
            <span className="text-muted-foreground font-bold">×</span>
          </>
        )}

        {/* Reps */}
        <div className="flex-1">
          <input
            ref={repsRef}
            type="number"
            inputMode="numeric"
            placeholder={`${repsMin}-${repsMax}`}
            value={completed ? (currentReps?.toString() || reps) : reps}
            onChange={(e) => setReps(e.target.value)}
            onKeyDown={handleRepsKeyDown}
            disabled={completed}
            className={`w-full h-12 text-lg font-semibold font-mono text-center rounded-md border transition-colors duration-150 ease-out-quint ${
              completed
                ? 'bg-transparent border-transparent text-accent-text'
                : 'bg-secondary border-transparent focus-visible:border-primary focus-visible:shadow-volt-glow outline-none'
            }`}
          />
        </div>
      </div>

      {/* Botón completar/deshacer */}
      <div className="flex-shrink-0">
        {completed ? (
          <button
            onClick={onUndo}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground active:bg-volt-bright transition-colors duration-150"
            aria-label="Deshacer serie"
          >
            <Check className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-border text-muted-foreground active:border-primary active:text-primary transition-colors duration-150"
            aria-label="Completar serie"
          >
            <Check className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* RPE (selector opcional) */}
      {showRpe && !completed && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-border rounded-lg p-2 flex gap-1">
          {[6, 7, 8, 9, 10].map((val) => (
            <button
              key={val}
              onClick={() => {
                setSelectedRpe(val);
                setShowRpe(false);
              }}
              className={`w-8 h-8 rounded-full text-xs font-bold font-mono ${
                selectedRpe === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
