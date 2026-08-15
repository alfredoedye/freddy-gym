'use client';

import { useState, useEffect, useCallback } from 'react';
import { SkipForward, Plus, Minus } from 'lucide-react';

interface RestTimerProps {
  duration: number; // segundos configurados
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Componente insignia — el anillo de descanso (ver DESIGN.md § Components → Rest Timer Ring)
export function RestTimer({ duration, isActive, onComplete, onSkip }: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [adjustedDuration, setAdjustedDuration] = useState(duration);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  // Iniciar timer cuando se activa
  useEffect(() => {
    if (isActive) {
      setTimeRemaining(duration);
      setAdjustedDuration(duration);
      setRunning(true);
      setJustFinished(false);
    } else {
      setRunning(false);
    }
  }, [isActive, duration]);

  // Countdown
  useEffect(() => {
    if (!running || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setJustFinished(true);
          // Vibración al terminar
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, timeRemaining, onComplete]);

  // Ajustar tiempo
  const addTime = useCallback(() => {
    setTimeRemaining((prev) => prev + 15);
    setAdjustedDuration((prev) => prev + 15);
  }, []);

  const subtractTime = useCallback(() => {
    setTimeRemaining((prev) => Math.max(0, prev - 15));
    setAdjustedDuration((prev) => Math.max(15, prev - 15));
  }, []);

  if (!isActive) return null;

  // Calcular progreso para el anillo SVG
  const progress = adjustedDuration > 0 ? timeRemaining / adjustedDuration : 0;
  const circumference = 2 * Math.PI * 54; // radio 54
  const strokeDashoffset = circumference * (1 - progress);

  // Formatear tiempo
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Urgencia en los últimos 5 segundos (única excepción de color al Volt)
  const isUrgent = timeRemaining <= 5;
  const ringColorClass = isUrgent ? 'text-destructive' : 'text-primary';

  return (
    <div className="flex flex-col items-center py-6 px-4 bg-secondary/50 border-y border-border">
      {/* Etiqueta */}
      <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        Descanso
      </p>

      {/* Ring timer */}
      <div className="relative w-36 h-36 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Fondo */}
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="6" />
          {/* Progreso — Volt Focus Glow */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            className={`${ringColorClass} transition-all duration-1000 ease-linear`}
            style={{
              filter: isUrgent
                ? undefined
                : 'drop-shadow(0 0 6px rgba(212, 255, 61, 0.5))',
            }}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Tiempo en el centro */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-mono text-4xl font-bold ${ringColorClass} ${justFinished ? 'animate-pulse-once' : ''}`}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4">
        {/* -15s */}
        <button
          onClick={subtractTime}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center active:bg-muted transition-colors duration-150"
          aria-label="Restar 15 segundos"
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Saltar */}
        <button
          onClick={onSkip}
          className="h-12 px-6 rounded-md bg-card border border-border flex items-center gap-2 font-semibold text-base active:bg-secondary transition-colors duration-150"
        >
          <SkipForward className="w-5 h-5" />
          Saltar
        </button>

        {/* +15s */}
        <button
          onClick={addTime}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center active:bg-muted transition-colors duration-150"
          aria-label="Agregar 15 segundos"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
