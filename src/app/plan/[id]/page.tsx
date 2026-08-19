'use client';

/**
 * Página de vista del plan generado.
 * Muestra todos los días con sus ejercicios, permite activar el plan,
 * editar la prescripción (series/reps/descanso) o reemplazar un
 * ejercicio, y eliminar/cancelar el plan.
 */

import { useCallback, useEffect, useState } from 'react';
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
  Repeat,
  Plus,
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

// Botón circular de acción compartido por mover/cambiar/quitar en
// EditableExerciseRow — mismo tamaño y estilo para las cuatro acciones sobre
// el ejercicio en sí, todas separadas de los campos numéricos de abajo.
const ACTION_BUTTON =
  'flex-shrink-0 flex items-center justify-center min-h-touch min-w-touch rounded-full border border-border bg-secondary text-foreground transition-colors duration-150 active:bg-muted disabled:opacity-40 disabled:pointer-events-none';

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
  // Ejercicios con cambios sin guardar (por id de PlanExercise), para poder
  // avisar antes de perderlos al salir del modo edición.
  const [dirtyExerciseIds, setDirtyExerciseIds] = useState<Set<string>>(new Set());

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

  const handleDirtyChange = useCallback((exerciseId: string, isDirty: boolean) => {
    setDirtyExerciseIds((prev) => {
      if (isDirty === prev.has(exerciseId)) return prev;
      const next = new Set(prev);
      if (isDirty) next.add(exerciseId);
      else next.delete(exerciseId);
      return next;
    });
  }, []);

  const handleToggleEditing = () => {
    if (isEditing && dirtyExerciseIds.size > 0) {
      if (!window.confirm('Tenés cambios sin guardar en algunos ejercicios. ¿Salir sin guardarlos?')) {
        return;
      }
    }
    setIsEditing((v) => !v);
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

  const handleExerciseDeleted = (planDayId: string, exerciseId: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        planDays: prev.planDays.map((day) =>
          day.id !== planDayId
            ? day
            : { ...day, exercises: day.exercises.filter((ex) => ex.id !== exerciseId) }
        ),
      };
    });
  };

  const handleExerciseAdded = (planDayId: string, created: PlanExerciseView) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        planDays: prev.planDays.map((day) =>
          day.id !== planDayId ? day : { ...day, exercises: [...day.exercises, created] }
        ),
      };
    });
  };

  // Reordena moviendo un ejercicio contra su vecino dentro de la MISMA fase
  // (intercambia sus valores de "order" con dos PATCH) y refresca el plan.
  // A diferencia de guardar/agregar/borrar (que patchean el estado local a
  // mano), acá es más simple releer el plan completo que reconstruir el
  // array ordenado a mano — el reorder no es una acción frecuente.
  const handleReorder = async (planDayId: string, exerciseId: string, direction: 'up' | 'down') => {
    const day = plan?.planDays.find((d) => d.id === planDayId);
    const current = day?.exercises.find((e) => e.id === exerciseId);
    if (!day || !current) return;

    const siblings = day.exercises
      .filter((e) => e.phase === current.phase)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((e) => e.id === exerciseId);
    const neighbor = siblings[direction === 'up' ? index - 1 : index + 1];
    if (!neighbor) return;

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/plans/${planId}/exercises/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: neighbor.order }),
        }),
        fetch(`/api/plans/${planId}/exercises/${neighbor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: current.order }),
        }),
      ]);
      if (!resA.ok || !resB.ok) {
        toast.error('No se pudo reordenar');
        return;
      }
      await fetchPlan();
    } catch (err) {
      console.error('Error al reordenar:', err);
      toast.error('Error de conexión');
    }
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
            onClick={handleToggleEditing}
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
                onExerciseDeleted={(exerciseId) => handleExerciseDeleted(day.id, exerciseId)}
                onExerciseAdded={(created) => handleExerciseAdded(day.id, created)}
                onMove={(exerciseId, direction) => handleReorder(day.id, exerciseId, direction)}
                onDirtyChange={handleDirtyChange}
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
  onExerciseDeleted,
  onExerciseAdded,
  onMove,
  onDirtyChange,
}: {
  day: PlanDayView;
  dayLabel: string;
  expanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  planId: string;
  onExerciseSaved: (updated: PlanExerciseView) => void;
  onExerciseDeleted: (exerciseId: string) => void;
  onExerciseAdded: (created: PlanExerciseView) => void;
  onMove: (exerciseId: string, direction: 'up' | 'down') => void;
  onDirtyChange: (exerciseId: string, isDirty: boolean) => void;
}) {
  const [addingPhase, setAddingPhase] = useState<ExercisePhase | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAddExercise = async (selected: { id: string }) => {
    if (!addingPhase) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/plans/${planId}/days/${day.id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: selected.id, phase: addingPhase }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo agregar el ejercicio');
        return;
      }
      onExerciseAdded(data.exercise);
      toast.success('Ejercicio agregado');
      setAddingPhase(null);
    } catch (err) {
      console.error('Error al agregar ejercicio:', err);
      toast.error('Error de conexión');
    } finally {
      setAdding(false);
    }
  };

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
            const exercisesInPhase = day.exercises
              .filter((ex) => ex.phase === phase)
              .sort((a, b) => a.order - b.order);
            // En modo edición mostramos igual la sección aunque esté vacía —
            // si no, no había forma de agregar el primer ejercicio de esa fase.
            if (exercisesInPhase.length === 0 && !isEditing) return null;

            return (
              <div key={phase} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {phaseLabels[phase]}
                </p>
                <div className="space-y-3">
                  {exercisesInPhase.map((ex, index) =>
                    isEditing ? (
                      <EditableExerciseRow
                        key={ex.id}
                        exercise={ex}
                        dayExercises={day.exercises}
                        phase={phase}
                        planId={planId}
                        isFirst={index === 0}
                        isLast={index === exercisesInPhase.length - 1}
                        onSaved={onExerciseSaved}
                        onDeleted={onExerciseDeleted}
                        onMove={onMove}
                        onDirtyChange={onDirtyChange}
                      />
                    ) : (
                      <ExerciseRow key={ex.id} exercise={ex} phase={phase} />
                    )
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={() => setAddingPhase(phase)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors duration-150 active:bg-secondary"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar ejercicio
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ExercisePickerDialog
        open={addingPhase !== null}
        onOpenChange={(open) => !open && !adding && setAddingPhase(null)}
        excludeIds={day.exercises.map((e) => e.exercise.id)}
        onSelect={handleAddExercise}
      />
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
  dayExercises,
  phase,
  planId,
  isFirst,
  isLast,
  onSaved,
  onDeleted,
  onMove,
  onDirtyChange,
}: {
  exercise: PlanExerciseView;
  dayExercises: PlanExerciseView[];
  phase: ExercisePhase;
  planId: string;
  isFirst: boolean;
  isLast: boolean;
  onSaved: (updated: PlanExerciseView) => void;
  onDeleted: (exerciseId: string) => void;
  onMove: (exerciseId: string, direction: 'up' | 'down') => void;
  onDirtyChange: (exerciseId: string, isDirty: boolean) => void;
}) {
  const [sets, setSets] = useState(ex.sets);
  const [repsMin, setRepsMin] = useState(ex.repsMin);
  const [repsMax, setRepsMax] = useState(ex.repsMax);
  const [restSeconds, setRestSeconds] = useState(ex.restSeconds);
  const [pendingExercise, setPendingExercise] = useState(ex.exercise);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    sets !== ex.sets ||
    repsMin !== ex.repsMin ||
    repsMax !== ex.repsMax ||
    restSeconds !== ex.restSeconds ||
    pendingExercise.id !== ex.exercise.id;

  // Avisar al padre para que pueda confirmar antes de descartar cambios al
  // salir del modo edición (ver handleToggleEditing en PlanViewPage).
  useEffect(() => {
    onDirtyChange(ex.id, dirty);
    return () => onDirtyChange(ex.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, ex.id]);

  // Otros ejercicios del mismo día — para no dejar elegir uno que ya está
  // usado (creaba duplicados silenciosos sin ningún aviso).
  const otherExerciseIds = dayExercises
    .filter((other) => other.id !== ex.id)
    .map((other) => other.exercise.id);

  const resetToSaved = () => {
    setSets(ex.sets);
    setRepsMin(ex.repsMin);
    setRepsMax(ex.repsMax);
    setRestSeconds(ex.restSeconds);
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

  const handleDelete = async () => {
    if (!window.confirm(`¿Quitar "${pendingExercise.name}" de este día?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${planId}/exercises/${ex.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo quitar el ejercicio');
        return;
      }
      onDeleted(ex.id);
      toast.success('Ejercicio quitado');
    } catch (err) {
      console.error('Error al quitar ejercicio:', err);
      toast.error('Error de conexión');
    } finally {
      setDeleting(false);
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
          <p className="font-medium text-base leading-tight line-clamp-2">{pendingExercise.name}</p>
          {ex.notes && <p className="text-xs text-foreground/80 mt-0.5">💡 {ex.notes}</p>}
        </div>
      </div>

      {/* Acciones sobre el ejercicio en sí — deliberadamente en su propia fila,
          separada de los campos de series/reps/descanso de abajo. Mover, cambiar
          y quitar operan sobre QUÉ ejercicio es, no sobre la prescripción actual. */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onMove(ex.id, 'up')}
          disabled={isFirst}
          className={ACTION_BUTTON}
          aria-label="Subir"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onMove(ex.id, 'down')}
          disabled={isLast}
          className={ACTION_BUTTON}
          aria-label="Bajar"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          className={ACTION_BUTTON}
          aria-label="Cambiar ejercicio"
        >
          <Repeat className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={ACTION_BUTTON}
          aria-label="Quitar ejercicio"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-destructive" />
          )}
        </button>
      </div>

      {/* Dos filas de 2 columnas en vez de 4 columnas iguales: con la escala
          de fuente grande (Perfil > Accesibilidad), "Reps min"/"Reps max" no
          entraban en una columna de 4 y envolvían a dos líneas mientras
          "Series"/"Descanso" quedaban en una — los inputs de abajo terminaban
          a distinta altura entre sí. Con solo 2 columnas cada label tiene el
          doble de ancho y no rompe línea incluso en el escalón más grande. */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Series" value={sets} onChange={setSets} min={1} max={10} />
        <NumberField label="Descanso" value={restSeconds} onChange={setRestSeconds} min={0} max={600} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Reps min" value={repsMin} onChange={setRepsMin} min={1} max={50} />
        <NumberField label="Reps max" value={repsMax} onChange={setRepsMax} min={1} max={50} />
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
        excludeIds={otherExerciseIds}
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
