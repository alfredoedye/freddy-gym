'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, Clock, Dumbbell, Flame, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkoutStats {
  duration: string;
  totalVolume: number;
  totalSets: number;
  exercisesCompleted: number;
  bestSets: Array<{
    exerciseName: string;
    weight: number | null;
    reps: number;
  }>;
}

export default function WorkoutCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [completeError, setCompleteError] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Marcar workout como completado y obtener stats. Si este PATCH falla en
  // silencio, la sesión queda incompleta en el servidor (no cuenta para
  // progreso ni rachas) aunque la pantalla diga "¡Rutina completada!" — por
  // eso el error se muestra con reintento en vez de solo loguearse.
  const completeWorkout = async () => {
    if (!sessionId) return;
    setCompleteError(false);

    try {
      const res = await fetch(`/api/workouts/${sessionId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });

      if (!res.ok) {
        throw new Error('Error al completar workout');
      }

      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error completando workout:', err);
      setCompleteError(true);
    }
  };

  useEffect(() => {
    completeWorkout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Guardar notas
  const handleSaveNotes = async () => {
    if (!sessionId || !notes.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/workouts/${sessionId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
    } catch (err) {
      console.error('Error guardando notas:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Celebración */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Emoji grande */}
        <div className="text-7xl mb-4 animate-celebrate-in">🎉</div>

        <h1 className="font-display text-3xl font-bold text-center text-foreground mb-2">
          ¡Rutina completada!
        </h1>
        <p className="text-muted-foreground text-center text-lg mb-8">
          Excelente trabajo. Cada sesión cuenta.
        </p>

        {/* Aviso de guardado fallido — la sesión aún no cuenta en el servidor */}
        {completeError && (
          <div className="w-full max-w-sm mb-8 flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <span className="text-sm text-destructive">
              No se pudo registrar la rutina como completada.
            </span>
            <button
              onClick={completeWorkout}
              className="text-sm font-semibold text-destructive active:opacity-70 flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-8">
            <StatCard icon={<Clock className="w-5 h-5 text-accent-text" />} label="Duración" value={stats.duration} />
            <StatCard
              icon={<Flame className="w-5 h-5 text-accent-text" />}
              label="Volumen total"
              value={`${Math.round(stats.totalVolume).toLocaleString()} kg`}
            />
            <StatCard
              icon={<Dumbbell className="w-5 h-5 text-accent-text" />}
              label="Series"
              value={stats.totalSets.toString()}
            />
            <StatCard
              icon={<Trophy className="w-5 h-5 text-accent-text" />}
              label="Ejercicios"
              value={stats.exercisesCompleted.toString()}
            />
          </div>
        )}

        {/* Mejores series */}
        {stats?.bestSets && stats.bestSets.length > 0 && (
          <div className="w-full max-w-sm mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Mejores series
            </h3>
            <div className="space-y-2">
              {stats.bestSets.map((best, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-secondary rounded-lg"
                >
                  <span className="text-sm font-medium text-foreground">{best.exerciseName}</span>
                  <span className="text-sm font-bold text-accent-text font-mono">
                    {best.weight != null ? `${best.weight}kg × ${best.reps}` : `${best.reps} reps`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas opcionales */}
        <div className="w-full max-w-sm mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Cómo te sentiste? ¿Algo para recordar?"
            className="w-full h-24 p-3 text-base rounded-md border border-transparent bg-secondary text-foreground resize-none outline-none transition-colors duration-150 ease-out-quint focus-visible:border-primary focus-visible:shadow-volt-glow"
          />
          {notes.trim() && !saved && (
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 text-sm text-accent-text font-medium"
            >
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          )}
          {saved && <p className="mt-2 text-sm text-accent-text">✓ Nota guardada</p>}
        </div>
      </div>

      {/* Botón volver */}
      <div className="p-4 border-t border-border">
        <Button onClick={() => router.push('/')} size="lg" className="w-full">
          <Home className="w-5 h-5" />
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

// Componente auxiliar para stat cards
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg p-4 text-center border border-border">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="font-mono text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
