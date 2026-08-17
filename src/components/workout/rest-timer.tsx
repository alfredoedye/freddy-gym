'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SkipForward, Plus, Minus } from 'lucide-react';

interface RestTimerProps {
  duration: number; // segundos configurados
  isActive: boolean;
  sessionId: string;
  onComplete: () => void;
  onSkip: () => void;
}

// Clave de sessionStorage donde vive el deadline del descanso en curso
// (workout-client lo reactiva tras un refresh vía readStoredRestTimer).
function restTimerStorageKey(sessionId: string) {
  return `gymapp:restTimer:${sessionId}`;
}

interface StoredTimer {
  deadline: number; // epoch ms
  adjustedDuration: number; // segundos, para el progreso del anillo
}

export function readStoredRestTimer(sessionId: string): StoredTimer | null {
  try {
    const raw = sessionStorage.getItem(restTimerStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTimer;
    if (typeof parsed.deadline !== 'number' || parsed.deadline <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeRestTimer(sessionId: string, timer: StoredTimer) {
  try {
    sessionStorage.setItem(restTimerStorageKey(sessionId), JSON.stringify(timer));
  } catch {
    // Storage lleno o bloqueado — el timer sigue funcionando, solo no sobrevive un refresh.
  }
}

function clearStoredRestTimer(sessionId: string) {
  try {
    sessionStorage.removeItem(restTimerStorageKey(sessionId));
  } catch {
    // Ignorar
  }
}

// Componente insignia — el anillo de descanso (ver DESIGN.md § Components → Rest Timer Ring).
// El tiempo restante se deriva de un deadline (epoch ms), no de un contador
// decremental: los browsers móviles suspenden los setInterval con la pantalla
// bloqueada — exactamente lo que hace la gente entre series — y un contador
// mostraría más descanso restante del real al volver. El deadline se persiste
// en sessionStorage para sobrevivir un refresh.
export function RestTimer({ duration, isActive, sessionId, onComplete, onSkip }: RestTimerProps) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [adjustedDuration, setAdjustedDuration] = useState(duration);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [justFinished, setJustFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Al activarse, traer el anillo a la vista: el timer se renderiza arriba de
  // la ficha del ejercicio, pero el usuario completa la serie desde la lista
  // de series (mucho más abajo) — sin este scroll el descanso corre invisible
  // fuera de pantalla y parece que nunca arrancó.
  useEffect(() => {
    if (!isActive) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  // Al activarse: retomar el deadline persistido (refresh a mitad de descanso)
  // o crear uno nuevo.
  useEffect(() => {
    if (!isActive) {
      setDeadline(null);
      return;
    }

    const stored = readStoredRestTimer(sessionId);
    if (stored) {
      setDeadline(stored.deadline);
      setAdjustedDuration(stored.adjustedDuration);
      setTimeRemaining(Math.ceil((stored.deadline - Date.now()) / 1000));
    } else {
      const newDeadline = Date.now() + duration * 1000;
      setDeadline(newDeadline);
      setAdjustedDuration(duration);
      setTimeRemaining(duration);
      storeRestTimer(sessionId, { deadline: newDeadline, adjustedDuration: duration });
    }
    setJustFinished(false);
  }, [isActive, duration, sessionId]);

  // Tick: derivar el restante del reloj de pared. También se recalcula al
  // volver del background (visibilitychange), donde el interval estuvo suspendido.
  useEffect(() => {
    if (!isActive || deadline === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setJustFinished(true);
        clearStoredRestTimer(sessionId);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        onComplete();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isActive, deadline, sessionId, onComplete]);

  // Ajustar tiempo moviendo el deadline
  const addTime = useCallback(() => {
    setDeadline((prev) => {
      if (prev === null) return prev;
      const next = prev + 15_000;
      setAdjustedDuration((d) => {
        storeRestTimer(sessionId, { deadline: next, adjustedDuration: d + 15 });
        return d + 15;
      });
      return next;
    });
  }, [sessionId]);

  const subtractTime = useCallback(() => {
    setDeadline((prev) => {
      if (prev === null) return prev;
      const next = Math.max(Date.now(), prev - 15_000);
      setAdjustedDuration((d) => {
        const nextDuration = Math.max(15, d - 15);
        storeRestTimer(sessionId, { deadline: next, adjustedDuration: nextDuration });
        return nextDuration;
      });
      return next;
    });
  }, [sessionId]);

  const handleSkip = useCallback(() => {
    clearStoredRestTimer(sessionId);
    onSkip();
  }, [sessionId, onSkip]);

  if (!isActive) return null;

  // Calcular progreso para el anillo SVG
  const progress = adjustedDuration > 0 ? timeRemaining / adjustedDuration : 0;
  const circumference = 2 * Math.PI * 54; // radio 54
  const strokeDashoffset = circumference * (1 - Math.min(1, progress));

  // Formatear tiempo
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Urgencia en los últimos 5 segundos (única excepción de color al Volt)
  const isUrgent = timeRemaining <= 5;
  const ringColorClass = isUrgent ? 'text-destructive' : 'text-primary';

  return (
    <div ref={containerRef} className="flex flex-col items-center py-6 px-4 bg-secondary/50 border-y border-border">
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
          onClick={handleSkip}
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
