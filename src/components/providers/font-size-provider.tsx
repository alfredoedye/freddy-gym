'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { FontSize } from '@/lib/profile-options';

interface FontSizeContextValue {
  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

/**
 * Aplica la preferencia de tamaño de letra (accesibilidad) como atributo
 * data-font-size en <html>, consumido por globals.css vía --font-scale.
 * El valor inicial se renderiza server-side en layout.tsx para evitar
 * parpadeo; este provider solo mantiene el DOM en sync cuando cambia
 * en tiempo real desde el perfil.
 */
export function FontSizeProvider({
  initialFontSize,
  children,
}: {
  initialFontSize: FontSize;
  children: React.ReactNode;
}) {
  const [fontSize, setFontSize] = useState<FontSize>(initialFontSize);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    throw new Error('useFontSize debe usarse dentro de FontSizeProvider');
  }
  return ctx;
}
