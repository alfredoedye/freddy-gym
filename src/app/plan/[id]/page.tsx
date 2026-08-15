'use client';

/**
 * Página de vista del plan generado.
 * Muestra todos los días con sus ejercicios y permite activar el plan.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  Clock,
  Target,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tipos locales (espejo del response de la API)
type ExercisePhase = 'WARMUP' | 'MAIN' | 'COOLDOWN';

interface PlanExerciseView {
  id: string;
  exerciseId: string;
  order: number;
  phase: ExercisePhase;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    imageUrl: string | null;
    gifUrl: string | null;
    target: string;
    equipment: string;
  };
}

const phaseLabels: Record<ExercisePhase, string> = {
  WARMUP: '🔥 Calentamiento',
  MAIN: '💪 Entrenamiento principal',
  COOLDOWN: '🧘 Enfriamiento',
};

interface PlanDayView {
  id: string;
  dayNumber: number;
  name: string;
  isRest: boolean;
  exercises: PlanExerciseView[];
}

interface PlanView {
  id: string;
  name: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  status: string;
  planDays: PlanDayView[];
}

const goalLabels: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Fuerza',
  ENDURANCE: 'Resistencia',
  FAT_LOSS: 'Pérdida de grasa',
  RECOMPOSITION: 'Recomposición',
};

const splitLabels: Record<string, string> = {
  push_pull_legs: 'Push / Pull / Legs',
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  bro_split: 'Bro Split',
};

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function PlanViewPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      }
    } catch (err) {
      console.error('Error al cargar plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  };

  const handleStartPlan = async () => {
    setActivating(true);
    try {
      const res = await fetch(`/api/plans/${planId}/activate`, { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Error al activar plan:', err);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-xl font-medium text-muted-foreground">Plan no encontrado</p>
          <button onClick={() => router.push('/')} className="mt-4 font-medium text-accent-text">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-md hover:bg-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold truncate">{plan.name}</h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Metadata del plan */}
        <div className="grid grid-cols-2 gap-3">
          <MetaCard
            icon={<Target className="w-4 h-4 text-accent-text" />}
            label="Objetivo"
            value={goalLabels[plan.goal] || plan.goal}
          />
          <MetaCard
            icon={<Calendar className="w-4 h-4 text-accent-text" />}
            label="Duración"
            value={`${plan.durationWeeks} semanas`}
          />
          <MetaCard
            icon={<Dumbbell className="w-4 h-4 text-accent-text" />}
            label="Frecuencia"
            value={`${plan.daysPerWeek} días/sem`}
          />
          <MetaCard
            icon={<Clock className="w-4 h-4 text-accent-text" />}
            label="Split"
            value={splitLabels[plan.split] || plan.split}
          />
        </div>

        {/* Días del plan */}
        <section>
          <h2 className="font-display text-lg font-bold mb-3">Días de la semana</h2>
          <div className="space-y-3">
            {plan.planDays.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                dayLabel={dayNames[day.dayNumber - 1]}
                expanded={expandedDays.has(day.dayNumber)}
                onToggle={() => toggleDay(day.dayNumber)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Botón flotante — Empezar plan */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4">
        <div className="max-w-lg mx-auto">
          <Button onClick={handleStartPlan} disabled={activating} size="lg" className="w-full">
            {activating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 fill-primary-foreground" />
                Empezar Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// === COMPONENTES AUXILIARES ===

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="font-semibold text-base">{value}</p>
    </div>
  );
}

function DayCard({
  day,
  dayLabel,
  expanded,
  onToggle,
}: {
  day: PlanDayView;
  dayLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (day.isRest) {
    return (
      <div className="p-4 rounded-lg border border-border bg-secondary/50 opacity-60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">{dayLabel}</span>
            <p className="font-medium text-muted-foreground">🛌 Descanso</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header del día (clickable) */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors duration-150"
      >
        <div>
          <span className="text-sm text-muted-foreground">{dayLabel}</span>
          <p className="font-semibold text-lg">{day.name}</p>
          <p className="text-sm text-muted-foreground">
            {day.exercises.filter((ex) => ex.phase === 'MAIN').length} ejercicios
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Lista de ejercicios (expandible, agrupada por fase) */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {(['WARMUP', 'MAIN', 'COOLDOWN'] as const).map((phase) => {
            const exercisesInPhase = day.exercises.filter((ex) => ex.phase === phase);
            if (exercisesInPhase.length === 0) return null;

            return (
              <div key={phase} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {phaseLabels[phase]}
                </p>
                <div className="space-y-3">
                  {exercisesInPhase.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3">
                      {/* Thumbnail */}
                      {ex.exercise.imageUrl && (
                        <img
                          src={ex.exercise.imageUrl}
                          alt={ex.exercise.name}
                          className="w-12 h-12 rounded-md object-cover bg-secondary flex-shrink-0"
                        />
                      )}
                      {!ex.exercise.imageUrl && (
                        <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base truncate">{ex.exercise.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {ex.sets} × {ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`}
                          {phase === 'COOLDOWN' ? '' : ' reps'}
                          {' · '}
                          {ex.restSeconds}s descanso
                        </p>
                        {ex.notes && (
                          <p className="text-xs text-accent-text mt-0.5">💡 {ex.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
