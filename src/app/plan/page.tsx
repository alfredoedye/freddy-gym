'use client';

/**
 * Página de listado de planes.
 * Muestra el plan activo (si existe) y el historial de planes pasados.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, ArrowLeft, Calendar, Dumbbell, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { goalLabels, splitLabels, statusLabels } from '@/lib/plan-labels';

interface PlanSummaryView {
  id: string;
  name: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  status: string;
  startDate: string;
  progress: number;
}

const statusBadgeClass: Record<string, string> = {
  ACTIVE: 'bg-primary text-primary-foreground',
  PAUSED: 'bg-secondary text-secondary-foreground',
  COMPLETED: 'bg-accent text-accent-text',
  CANCELLED: 'bg-secondary text-muted-foreground',
};

export default function PlanListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummaryView[] | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error al cargar planes:', err);
    }
  };

  const handleArchive = async (plan: PlanSummaryView) => {
    if (!window.confirm(`¿Archivar "${plan.name}"? Va a desaparecer de esta lista, pero se conserva su historial de entrenamientos.`)) {
      return;
    }

    setArchivingId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/archive`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'No se pudo archivar el plan');
        return;
      }

      toast.success('Plan archivado');
      setPlans((prev) => (prev ? prev.filter((p) => p.id !== plan.id) : prev));
    } catch (err) {
      console.error('Error al archivar plan:', err);
      toast.error('Error de conexión');
    } finally {
      setArchivingId(null);
    }
  };

  const activePlan = plans?.find((p) => p.status === 'ACTIVE');
  const history = plans?.filter((p) => p.status !== 'ACTIVE') || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-md hover:bg-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold flex-1">Mis Planes</h1>
          <Link
            href="/plan/create"
            className="p-2 -mr-2 rounded-md hover:bg-secondary transition-colors duration-150"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {plans === null && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {plans !== null && plans.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="font-display text-lg font-bold mb-2">Todavía no tenés planes</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Creá tu primer plan de entrenamiento con IA
            </p>
            <Button asChild>
              <Link href="/plan/create">Crear plan</Link>
            </Button>
          </div>
        )}

        {activePlan && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">Plan activo</h2>
            <PlanCard
              plan={activePlan}
              onArchive={handleArchive}
              archiving={archivingId === activePlan.id}
            />
          </section>
        )}

        {history.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">Historial</h2>
            <div className="space-y-3">
              {history.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onArchive={handleArchive}
                  archiving={archivingId === plan.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onArchive,
  archiving,
}: {
  plan: PlanSummaryView;
  onArchive: (plan: PlanSummaryView) => void;
  archiving: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/plan/${plan.id}`} className="min-w-0 flex-1">
          <p className="font-semibold text-lg truncate">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {goalLabels[plan.goal] || plan.goal} · {splitLabels[plan.split] || plan.split}
          </p>
        </Link>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[plan.status] || 'bg-secondary text-muted-foreground'}`}
        >
          {statusLabels[plan.status] || plan.status}
        </span>
      </div>

      <Link href={`/plan/${plan.id}`} className="block">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(plan.startDate).toLocaleDateString('es-AR')} · {plan.durationWeeks} semanas ·{' '}
          {plan.daysPerWeek} días/sem
        </div>

        {(plan.status === 'ACTIVE' || plan.status === 'PAUSED') && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out-quint"
              style={{ width: `${plan.progress}%` }}
            />
          </div>
        )}
      </Link>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onArchive(plan)}
          disabled={archiving}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-50"
        >
          {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          Archivar
        </button>
      </div>
    </div>
  );
}
