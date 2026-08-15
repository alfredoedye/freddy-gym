'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VolumeChart, VolumeChartSkeleton } from '@/components/progress/volume-chart';
import { PRBadge } from '@/components/progress/pr-badge';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Image from 'next/image';

interface ExerciseData {
  exercise: {
    id: string;
    name: string;
    bodyPart: string;
    equipment: string;
    target: string;
    gifUrl: string | null;
    imageUrl: string | null;
  };
  history: {
    date: string;
    bestWeight: number;
    bestReps: number;
    totalVolume: number;
    sets: number;
  }[];
  personalRecords: {
    exerciseId: string;
    exerciseName: string;
    weight: number;
    reps: number;
    date: string;
    bodyPart: string;
  }[];
  trend: 'up' | 'down' | 'stable';
  totalSessions: number;
}

export default function ExerciseProgressPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'weight' | 'volume'>('weight');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/progress/exercise/${params.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="h-8 w-48 rounded bg-secondary animate-pulse" />
        <div className="h-48 rounded-lg bg-secondary animate-pulse" />
        <VolumeChartSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ejercicio no encontrado</p>
      </div>
    );
  }

  const { exercise, history, personalRecords, trend, totalSessions } = data;

  const chartData =
    chartMode === 'weight'
      ? history.map((h) => ({
          label: new Date(h.date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
          }),
          value: h.bestWeight,
        }))
      : history.map((h) => ({
          label: new Date(h.date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
          }),
          value: h.totalVolume,
        }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-secondary"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-bold text-foreground truncate">
              {exercise.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {exercise.target} • {exercise.equipment}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* GIF + Stats rápidos */}
        <div className="flex items-start gap-4">
          {exercise.gifUrl && (
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              <Image
                src={exercise.gifUrl}
                alt={exercise.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-secondary">
              <p className="text-xs text-muted-foreground">Sesiones</p>
              <p className="font-mono text-lg font-bold text-foreground">{totalSessions}</p>
            </div>
            <div className="p-2 rounded-md bg-secondary">
              <p className="text-xs text-muted-foreground">Tendencia</p>
              <div className="flex items-center gap-1">
                {trend === 'up' && (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-lg font-bold text-green-500">↑</span>
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-lg font-bold text-red-500">↓</span>
                  </>
                )}
                {trend === 'stable' && (
                  <>
                    <Minus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-muted-foreground">→</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              {chartMode === 'weight' ? 'Progresión de peso' : 'Volumen por sesión'}
            </h2>
            <div className="flex gap-1 bg-secondary rounded-md p-0.5">
              <button
                onClick={() => setChartMode('weight')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ease-out-quint ${
                  chartMode === 'weight'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                Peso
              </button>
              <button
                onClick={() => setChartMode('volume')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ease-out-quint ${
                  chartMode === 'volume'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                Volumen
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <VolumeChart data={chartData} yLabel={chartMode === 'weight' ? 'kg' : 'kg'} />
          </div>
        </div>

        {/* Personal Records */}
        {personalRecords.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">🏆 Mejor marca</h2>
            {personalRecords.map((pr) => (
              <PRBadge
                key={pr.date}
                weight={pr.weight}
                reps={pr.reps}
                date={pr.date}
                exerciseName={pr.exerciseName}
              />
            ))}
          </div>
        )}

        {/* Historial reciente */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Sesiones recientes</h2>
          <div className="space-y-2">
            {history
              .slice(-10)
              .reverse()
              .map((session, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(session.date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">{session.sets} series</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-sm font-bold text-foreground">
                      {session.bestWeight > 0
                        ? `${session.bestWeight} kg × ${session.bestReps}`
                        : `${session.bestReps} reps`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vol: {session.totalVolume.toLocaleString('es-AR')} kg
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
