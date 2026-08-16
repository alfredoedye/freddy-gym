'use client';

/**
 * Error boundary global — reemplaza la pantalla de error por default de Next
 * (en inglés, sin estilo) por una en español con reintento. Los server
 * components consultan la DB directamente, así que un blip de conexión de
 * Neon aterriza acá.
 */

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error de aplicación:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-4">⚡</p>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Algo salió mal
      </h1>
      <p className="text-base text-muted-foreground mb-8 max-w-sm">
        No pudimos cargar esta pantalla. Suele ser un problema momentáneo de
        conexión — probá de nuevo.
      </p>
      <button
        onClick={reset}
        className="h-14 px-8 rounded-md font-display font-bold text-lg text-primary-foreground bg-primary flex items-center gap-2 transition-colors duration-150 ease-out-quint active:bg-volt-bright"
      >
        <RotateCw className="w-5 h-5" />
        Reintentar
      </button>
    </div>
  );
}
