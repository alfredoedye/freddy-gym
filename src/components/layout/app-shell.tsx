'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';

// Rutas de pantalla completa / inmersivas: tienen su propio CTA fijo al pie
// (o no corresponde navegación de tabs), así que ocultan el BottomNav global.
const HIDE_BOTTOM_NAV_PREFIXES = ['/auth', '/onboarding', '/workout', '/plan/complete', '/plan/feedback'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = HIDE_BOTTOM_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      {children}
      {!hideBottomNav && <BottomNav />}
    </>
  );
}
