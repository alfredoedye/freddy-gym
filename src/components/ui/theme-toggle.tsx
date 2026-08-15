'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Botón de alternancia entre tema claro y oscuro.
 * Usa next-themes para persistir la preferencia del usuario. Oscuro es el
 * hogar natural de la marca (ver DESIGN.md), pero el toggle sigue disponible.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex min-h-touch min-w-touch items-center justify-center rounded-md bg-secondary transition-colors duration-150"
        aria-label="Cambiar tema"
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex min-h-touch min-w-touch items-center justify-center rounded-md bg-secondary text-foreground transition-colors duration-150 ease-out-quint hover:bg-muted"
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
