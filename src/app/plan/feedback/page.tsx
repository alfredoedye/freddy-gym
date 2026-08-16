'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DifficultySelector } from '@/components/plan/difficulty-selector';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type Difficulty = 'TOO_EASY' | 'EASY' | 'JUST_RIGHT' | 'HARD' | 'TOO_HARD';

const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Piernas',
  'Core',
  'Glúteos',
];

interface PlanSummary {
  planName: string;
  durationWeeks: number;
  weeksCompleted: number;
  totalSessions: number;
}

export default function PlanFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <PlanFeedbackContent />
    </Suspense>
  );
}

function PlanFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');

  const [difficulty, setDifficulty] = useState<Difficulty | undefined>();
  const [hardMuscles, setHardMuscles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (!planId) {
      router.push('/');
      return;
    }

    async function fetchSummary() {
      try {
        const res = await fetch(`/api/plans/${planId}/stats`);
        if (res.ok) {
          const data = await res.json();
          setPlanSummary({
            planName: data.planName,
            durationWeeks: data.durationWeeks,
            weeksCompleted: data.weeksCompleted,
            totalSessions: data.totalSessions,
          });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingSummary(false);
      }
    }

    fetchSummary();
  }, [planId, router]);

  const handleSubmit = async () => {
    if (!difficulty || !planId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/plans/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          difficulty,
          notes: notes.trim() || undefined,
          muscleGroupFeedback: hardMuscles.length > 0 ? hardMuscles : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Si el feedback ya estaba guardado (ej. un reintento tras un corte de
        // red), no es un dead-end: seguir al paso de generación igual.
        if (res.status !== 409) {
          throw new Error(data.error || 'Error al enviar feedback');
        }
      }

      // La generación del nuevo plan se hace en /plan/create (prefilled con
      // este plan como base), que tiene UI de espera y reintento propia.
      router.push(`/plan/create?previousPlanId=${planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  };

  if (loadingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-lg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Evaluar plan</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Plan summary */}
        {planSummary && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-lg font-semibold text-foreground">{planSummary.planName}</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {planSummary.weeksCompleted} de {planSummary.durationWeeks} semanas completadas ·{' '}
              {planSummary.totalSessions} entrenamientos
            </p>
          </div>
        )}

        {/* Difficulty question */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            ¿Cómo sentiste este plan?
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Muscle group feedback (optional) */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">
            ¿Algún grupo muscular te resultó especialmente difícil?
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Opcional — seleccioná los que apliquen
          </p>
          <ToggleGroup
            type="multiple"
            value={hardMuscles}
            onValueChange={setHardMuscles}
            className="flex-wrap"
          >
            {MUSCLE_GROUPS.map((muscle) => (
              <ToggleGroupItem key={muscle} value={muscle}>
                {muscle}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Notes (optional) */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">
            ¿Algo que quieras mencionar?
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Opcional — tu feedback ayuda a mejorar el próximo plan
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Los lunes me sentí con poca energía, me gustaría más ejercicios de espalda..."
            rows={3}
            className="w-full h-28 px-4 py-3 text-lg rounded-md border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground resize-none outline-none transition-colors duration-150 ease-out-quint focus-visible:border-primary focus-visible:shadow-volt-glow"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border safe-bottom">
        <Button onClick={handleSubmit} disabled={!difficulty || loading} size="lg" className="w-full">
          {loading ? 'Guardando...' : 'Enviar feedback y continuar'}
        </Button>
      </div>
    </div>
  );
}
