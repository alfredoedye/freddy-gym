'use client';

/**
 * Página de vista del plan generado.
 * Muestra todos los días con sus ejercicios, permite activar el plan,
 * editar la prescripción (series/reps/descanso/notas) o reemplazar un
 * ejercicio, y eliminar/cancelar el plan.
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
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExercisePickerDialog } from '@/components/plan/exercise-picker-dialog';
import { goalLabels, splitLabels } from '@/lib/plan-labels';

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

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function PlanViewPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [activating, setActivating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleExerciseSaved = (planDayId: string, updated: PlanExerciseView) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        planDays: prev.planDays.map((day) =>
          day.id !== planDayId
            ? day
            : {
                ...day,
                exercises: day.exercises.map((ex) => (ex.id === updated.id ? updated : ex)),
              }
        ),
      };
    });
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (
      !window.confirm(
        `¿Eliminar "${plan.name}"? Si ya tiene entrenamientos registrados, se cancelará en vez de borrarse.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'No se pudo eliminar el plan');
        return;
      }

      if (data.action === 'deleted') {
        toast.success('Plan eliminado');
        router.push('/plan');
      } else {
        toast.info('El plan tenía entrenamientos registrados, se canceló en su lugar');
        setPlan((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
      }
    } catch (err) {
      console.error('Error al eliminar plan:', err);
      toast.error('Error de conexión');
    } finally {
      setDeleting(false);
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
          <h1 className="font-display text-xl font-bold truncate flex-1">{plan.name}</h1>
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`p-2 rounded-md transition-colors duration-150 ${isEditing ? 'bg-accent text-accent-text' : 'hover:bg-secondary'}`}
            aria-label="Editar plan"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeletePlan}
            disabled={deleting}
            className="p-2 -mr-2 rounded-md hover:bg-secondary transition-colors duration-150 disabled:opacity-50"
            aria-label="Eliminar plan"
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 text-destructive" />
            )}
          </button>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Metadata del plan */}
        <div className="grid grid-cols-2 gap-3">
          <MetaCard
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
            label="Objetivo"
            value={goalLabels[plan.goal] || plan.goal}
          />
          <MetaCard
            icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
            label="Duración"
            value={`${plan.durationWeeks} semanas`}
          />
          <MetaCard
            icon={<Dumbbell className="w-4 h-4 text-muted-foreground" />}
            label="Frecuencia"
            value={`${plan.daysPerWeek} días/sem`}
          />
          <MetaCard
            icon={<Clock className="w-4 h-4 text-muted-foreground" />}
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
                isEditing={isEditing}
                planId={planId}
                onExerciseSaved={(updated) => handleExerciseSaved(day.id, updated)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Botón flotante — Empezar plan */}
      {plan.status !== 'ACTIVE' && (
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
      )}
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
  isEditing,
  planId,
  onExerciseSaved,
}: {
  day: PlanDayView;
  dayLabel: string;
  expanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  planId: string;
  onExerciseSaved: (updated: PlanExerciseView) => void;
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
                  {exercisesInPhase.map((ex) =>
                    isEditing ? (
                      <EditableExerciseRow
                        key={ex.id}
                        exercise={ex}
                        phase={phase}
                        planId={planId}
                        onSaved={onExerciseSaved}
                      />
                    ) : (
                      <ExerciseRow key={ex.id} exercise={ex} phase={phase} />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ exercise: ex, phase }: { exercise: PlanExerciseView; phase: ExercisePhase }) {
  return (
    <div className="flex items-center gap-3">
      {ex.exercise.imageUrl ? (
        <img
          src={ex.exercise.imageUrl}
          alt={ex.exercise.name}
          className="w-12 h-12 rounded-md object-cover bg-secondary flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-base truncate">{ex.exercise.name}</p>
        <p className="text-sm text-muted-foreground font-mono">
          {ex.sets} × {ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`}
          {phase === 'COOLDOWN' ? '' : ' reps'}
          {' · '}
          {ex.restSeconds}s descanso
        </p>
        {ex.notes && <p className="text-xs text-foreground/80 mt-0.5">💡 {ex.notes}</p>}
      </div>
    </div>
  );
}

function EditableExerciseRow({
  exercise: ex,
  phase,
  planId,
  onSaved,
}: {
  exercise: PlanExerciseView;
  phase: ExercisePhase;
  planId: string;
  onSaved: (updated: PlanExerciseView) => void;
}) {
  const [sets, setSets] = useState(ex.sets);
  const [repsMin, setRepsMin] = useState(ex.repsMin);
  const [repsMax, setRepsMax] = useState(ex.repsMax);
  const [restSeconds, setRestSeconds] = useState(ex.restSeconds);
  const [notes, setNotes] = useState(ex.notes || '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingExercise, setPendingExercise] = useState(ex.exercise);
  const [saving, setSaving] = useState(false);

  const dirty =
    sets !== ex.sets ||
    repsMin !== ex.repsMin ||
    repsMax !== ex.repsMax ||
    restSeconds !== ex.restSeconds ||
    notes !== (ex.notes || '') ||
    pendingExercise.id !== ex.exercise.id;

  const resetToSaved = () => {
    setSets(ex.sets);
    setRepsMin(ex.repsMin);
    setRepsMax(ex.repsMax);
    setRestSeconds(ex.restSeconds);
    setNotes(ex.notes || '');
    setPendingExercise(ex.exercise);
  };

  const handleSave = async () => {
    if (repsMin > repsMax) {
      toast.error('El mínimo de reps no puede ser mayor al máximo');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${planId}/exercises/${ex.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets,
          repsMin,
          repsMax,
          restSeconds,
          notes: notes.trim() || null,
          ...(pendingExercise.id !== ex.exercise.id ? { exerciseId: pendingExercise.id } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo guardar el cambio');
        return;
      }

      onSaved(data.exercise);
      toast.success('Ejercicio actualizado');
    } catch (err) {
      console.error('Error al guardar ejercicio:', err);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-3">
      <div className="flex items-center gap-3">
        {pendingExercise.imageUrl ? (
          <img
            src={pendingExercise.imageUrl}
            alt={pendingExercise.name}
            className="w-12 h-12 rounded-md object-cover bg-secondary flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base truncate">{pendingExercise.name}</p>
          <button
            onClick={() => setPickerOpen(true)}
            className="text-xs text-accent-text hover:underline"
          >
            Cambiar ejercicio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <NumberField label="Series" value={sets} onChange={setSets} min={1} max={10} />
        <NumberField label="Reps min" value={repsMin} onChange={setRepsMin} min={1} max={50} />
        <NumberField label="Reps max" value={repsMax} onChange={setRepsMax} min={1} max={50} />
        <NumberField label="Descanso" value={restSeconds} onChange={setRestSeconds} min={0} max={600} />
      </div>
      {/* Notas en su propia fila a ancho completo — dentro de la grilla de 2
          columnas junto a Descanso quedaba tan angosta que el texto se veía
          cortado a un puñado de caracteres, tanto en reposo como editando. */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-9 text-sm"
          placeholder="Opcional"
        />
      </div>

      {dirty && (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={resetToSaved} disabled={saving}>
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      )}

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(selected) => {
          setPendingExercise(selected);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  // Borrador en texto, independiente del número committeado: si el onChange
  // clampeaba/ignoraba en cada tecla, borrar el campo (o pasarse del rango a
  // mitad de tipeo) nunca disparaba un nuevo render y el input quedaba
  // mostrando lo que el usuario tipeó (vacío) mientras React seguía pensando
  // que el valor era el de antes — desincronizado, sin forma de arreglarlo
  // salvo recargando. Clampeamos recién al perder el foco.
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    const clamped = Number.isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className="h-9 text-sm"
      />
    </div>
  );
}
