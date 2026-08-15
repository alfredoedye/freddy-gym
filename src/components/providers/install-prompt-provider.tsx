'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptContextValue {
  // true solo en navegadores que soportan el prompt nativo (Chrome/Edge en
  // Android/desktop) y que todavía no dispararon o consumieron el evento.
  canInstall: boolean;
  // true si la app ya corre instalada (standalone) — no tiene sentido
  // ofrecer instalarla de nuevo.
  isInstalled: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

/**
 * Captura `beforeinstallprompt` apenas carga la app (Chrome/Android descarta
 * el evento si nadie lo escucha a tiempo) para poder ofrecer instalar la PWA
 * más tarde desde Perfil, por si el usuario cerró el banner automático.
 */
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    setIsInstalled(standaloneQuery.matches || iosStandalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return 'unavailable' as const;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return outcome;
  }, [deferredEvent]);

  return (
    <InstallPromptContext.Provider
      value={{ canInstall: deferredEvent !== null, isInstalled, promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error('useInstallPrompt debe usarse dentro de InstallPromptProvider');
  }
  return ctx;
}
