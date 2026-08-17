'use client';

import { ArrowLeft, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface WorkoutHeaderProps {
  dayName: string;
  elapsedTime: string;
  progress: string; // e.g. "3/6"
  onBack: () => void;
  hasStarted: boolean;
}

export function WorkoutHeader({ dayName, elapsedTime, progress, onBack, hasStarted }: WorkoutHeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBack = () => {
    if (hasStarted) {
      setShowConfirm(true);
    } else {
      onBack();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Botón volver */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 min-w-[48px] min-h-[48px] justify-center rounded-md active:bg-secondary transition-colors duration-150"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Nombre del día — min-w-0 permite que el flex item encoja y el
              truncate actúe; sin esto un nombre largo empuja el timer fuera
              de la pantalla en mobile. */}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-display text-lg font-bold truncate">{dayName}</h1>
          </div>

          {/* Timer y progreso */}
          <div className="flex flex-shrink-0 items-center gap-2 text-sm text-muted-foreground font-mono">
            <Clock className="w-4 h-4" />
            <span>{elapsedTime}</span>
            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
              {progress}
            </span>
          </div>
        </div>
      </header>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full">
            <h2 className="font-display text-xl font-bold mb-2 text-foreground">
              ¿Salir del entrenamiento?
            </h2>
            <p className="text-muted-foreground mb-6">
              Tu progreso se ha guardado. Podés continuar después.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
                Continuar
              </Button>
              <Button variant="destructive" onClick={onBack} className="flex-1">
                Salir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
