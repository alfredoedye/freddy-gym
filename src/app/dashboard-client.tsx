'use client';

import Link from 'next/link';
import { ChevronRight, Play, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DashboardClientProps {
  userName: string;
  feedbackStatus: {
    shouldPrompt: boolean;
    planId?: string;
    planName?: string;
  };
  activePlan: {
    id: string;
    name: string;
    durationWeeks: number;
    daysPerWeek: number;
    currentWeek: number;
  } | null;
  nextDay: {
    id: string;
    name: string;
    dayNumber: number;
    exerciseCount: number;
    exercises: { name: string; target: string }[];
  } | null;
  weekStats: {
    sessionsThisWeek: number;
    targetPerWeek: number;
    totalSessions: number;
  };
}

export function DashboardClient({
  userName,
  feedbackStatus,
  activePlan,
  nextDay,
  weekStats,
}: DashboardClientProps) {
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base text-muted-foreground">{greeting}</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {userName.split(' ')[0]} 💪
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Banner: Plan completado — momento de celebración, Volt sólido a propósito */}
      {feedbackStatus.shouldPrompt && feedbackStatus.planId && (
        <div className="px-4 mb-4">
          <Link href={`/plan/complete?planId=${feedbackStatus.planId}`}>
            <div className="rounded-lg bg-primary p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎉</span>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-primary-foreground">
                    ¡Plan completado!
                  </p>
                  <p className="text-sm text-primary-foreground/80">
                    Evalúa tu progreso y generá un nuevo plan
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats rápidos — todo número de entrenamiento en mono (The Measured Number Rule) */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold text-accent-text">
              {weekStats.sessionsThisWeek}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold text-foreground">{weekStats.targetPerWeek}</p>
            <p className="text-xs text-muted-foreground mt-1">Objetivo/sem</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold text-foreground">{weekStats.totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Plan activo */}
      {activePlan && (
        <div className="px-4 mb-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg font-bold text-foreground">{activePlan.name}</h2>
              <span className="font-mono text-sm font-medium text-accent-text">
                Semana {activePlan.currentWeek}/{activePlan.durationWeeks}
              </span>
            </div>
            {/* Barra de progreso */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out-quint"
                style={{
                  width: `${Math.min(
                    100,
                    (activePlan.currentWeek / activePlan.durationWeeks) * 100
                  )}%`,
                }}
              />
            </div>
            <Link
              href="/plan"
              className="mt-3 inline-block text-sm font-medium text-accent-text hover:underline"
            >
              Ver todos los planes →
            </Link>
          </div>
        </div>
      )}

      {/* Próximo entrenamiento */}
      {nextDay ? (
        <div className="px-4 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Hoy toca</h2>
          <Link href={`/workout/${nextDay.id}`}>
            <div className="rounded-lg border border-border bg-card p-5 transition-colors duration-150 ease-out-quint hover:border-muted-foreground">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{nextDay.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {nextDay.exerciseCount} ejercicios
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                  <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                </div>
              </div>
              {/* Preview ejercicios */}
              <div className="space-y-1.5">
                {nextDay.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <p className="text-sm text-foreground/80 truncate">{ex.name}</p>
                  </div>
                ))}
                {nextDay.exerciseCount > 3 && (
                  <p className="text-xs text-muted-foreground ml-3.5">
                    +{nextDay.exerciseCount - 3} más
                  </p>
                )}
              </div>
            </div>
          </Link>
        </div>
      ) : (
        <div className="px-4 mb-6">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="font-display text-lg font-bold text-foreground mb-2">
              No tenés un plan activo
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Creá tu primer plan de entrenamiento con IA
            </p>
            <Button asChild>
              <Link href="/plan/create">Crear plan</Link>
            </Button>
            <Link
              href="/plan"
              className="mt-3 block text-sm font-medium text-accent-text hover:underline"
            >
              Ver planes anteriores →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}
