'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para temporizador de cuenta regresiva.
 * Útil para descansos entre series.
 *
 * @param initialSeconds - Segundos iniciales del temporizador
 * @param onComplete - Callback al llegar a 0
 */
export function useTimer(initialSeconds: number = 90, onComplete?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Iniciar el temporizador
  const startTimer = useCallback((seconds?: number) => {
    // Si se proporcionan segundos, resetear a ese valor
    if (seconds !== undefined) {
      setTimeRemaining(seconds);
    }

    setIsRunning(true);

    // Limpiar intervalo previo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Temporizador completado
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onComplete]);

  // Pausar el temporizador
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Resetear el temporizador
  const resetTimer = useCallback((seconds?: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setTimeRemaining(seconds ?? initialSeconds);
  }, [initialSeconds]);

  // Formato legible mm:ss
  const formattedTime = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60)
    .toString()
    .padStart(2, '0')}`;

  return {
    timeRemaining,
    isRunning,
    formattedTime,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}
