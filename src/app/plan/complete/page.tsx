'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanStatsGrid } from '@/components/plan/plan-stats-card';
import { Button } from '@/components/ui/button';

interface PlanStats {
  planName: string;
  goal: string;
  durationWeeks: number;
  weeksCompleted: number;
  totalSessions: number;
  totalExpectedSessions: number;
  completionRate: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  totalDurationMinutes: number;
  startDate: string | null;
  endDate: string | null;
}

export default function PlanCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <PlanCompleteContent />
    </Suspense>
  );
}

function PlanCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');

  const [stats, setStats] = useState<PlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!planId) {
      router.push('/');
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch(`/api/plans/${planId}/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setShowConfetti(true);
          // Parar confetti después de 3 segundos
          setTimeout(() => setShowConfetti(false), 3000);
        }
      } catch (err) {
        console.error('Error fetching plan stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [planId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No se encontraron datos del plan</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const goalLabels: Record<string, string> = {
    HYPERTROPHY: 'Hipertrofia',
    STRENGTH: 'Fuerza',
    ENDURANCE: 'Resistencia',
    FAT_LOSS: 'Pérdida de grasa',
    RECOMPOSITION: 'Recomposición',
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Confetti animación simple */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                fontSize: `${16 + Math.random() * 16}px`,
              }}
            >
              {['🎉', '🏆', '💪', '⭐', '🔥'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Header celebración — Volt sólido, momento de logro (Committed) */}
      <div className="bg-primary pt-12 pb-8 px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="font-display text-3xl font-bold text-primary-foreground mb-2">
          ¡Felicitaciones!
        </h1>
        <p className="text-primary-foreground/80 text-lg">Completaste tu plan de entrenamiento</p>
        <p className="text-primary-foreground/70 text-base mt-1">
          &ldquo;{stats.planName}&rdquo; — {goalLabels[stats.goal] || stats.goal}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Tu resumen</h2>
          <PlanStatsGrid stats={stats} />
        </div>
      </div>

      {/* Mensaje motivacional */}
      <div className="px-4 mt-6">
        <div className="rounded-lg border border-border bg-accent p-4">
          <p className="text-base text-accent-text">
            {stats.completionRate >= 90
              ? '¡Increíble dedicación! Completaste casi todo el plan. Estás listo para el siguiente nivel.'
              : stats.completionRate >= 70
              ? '¡Gran esfuerzo! Mantuviste una buena consistencia. Vamos por más.'
              : 'Cada sesión cuenta. Lo importante es seguir progresando.'}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
        <Button
          onClick={() => router.push(`/plan/feedback?planId=${planId}`)}
          size="lg"
          className="w-full"
        >
          Evaluar plan y continuar →
        </Button>
      </div>
    </div>
  );
}
