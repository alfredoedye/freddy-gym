'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, BookOpen, TrendingUp, User } from 'lucide-react';

/** Elementos de navegación inferior */
const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/workout', label: 'Entrenar', icon: Dumbbell },
  { href: '/exercises', label: 'Ejercicios', icon: BookOpen },
  { href: '/progress', label: 'Progreso', icon: TrendingUp },
  { href: '/profile', label: 'Perfil', icon: User },
];

/**
 * Barra de navegación inferior fija para móvil.
 * 5 items con iconos y etiquetas en español.
 * El estado activo se comunica solo con color (sin pill de fondo) — DESIGN.md § Components → Navigation.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-touch min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-md px-2 transition-colors duration-150 ease-out-quint ${
                isActive ? 'text-accent-text' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
