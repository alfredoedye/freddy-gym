'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Dumbbell } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

/**
 * Header superior con título de la app y toggle de tema.
 */
export function Header({ title = 'GymApp' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-accent-text" />
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
