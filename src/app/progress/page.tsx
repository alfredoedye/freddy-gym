'use client';

import { useState, useEffect } from 'react';
import { VolumeChart, VolumeChartSkeleton } from '@/components/progress/volume-chart';
import { FrequencyChart, FrequencyChartSkeleton } from '@/components/progress/frequency-chart';
import { BodyMap, BodyMapSkeleton } from '@/components/progress/body-map';
import { StatsCard, StatsCardSkeleton } from '@/components/progress/stats-card';
import { PRBadge } from '@/components/progress/pr-badge';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type Tab = 'resumen' | 'ejercicios' | 'cuerpo';
type Period = '4w' | '8w' | '12w' | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'cuerpo', label: 'Cuerpo' },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: '4w', label: '4 sem' },
  { id: '8w', label: '8 sem' },
  { id: '12w', label: '12 sem' },
  { id: 'all', label: 'Todo' },
];

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [period, setPeriod] = useState<Period>('8w');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  async function fetchData() {
    setLoading(true);
    // Limpiar datos del tab anterior — evita pasarle a un tab la forma de datos de otro
    // mientras el fetch está en curso (ver useEffect de arriba, dispara en cada cambio de tab).
    setData(null);
    try {
      const res = await fetch(`/api/progress?tab=${activeTab}&period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Progreso</h1>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <div className="px-4 flex gap-1 bg-secondary mx-4 rounded-md p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-colors duration-150 ease-out-quint ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ease-out-quint whitespace-nowrap ${
                period === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-6">
        {activeTab === 'resumen' && <ResumenTab data={data} loading={loading} />}
        {activeTab === 'ejercicios' && <EjerciciosTab data={data} loading={loading} />}
        {activeTab === 'cuerpo' && <CuerpoTab data={data} loading={loading} />}
      </div>
    </div>
  );
}

// === Tab Resumen ===

function ResumenTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-secondary animate-pulse" />
          <VolumeChartSkeleton />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-secondary animate-pulse" />
          <FrequencyChartSkeleton />
        </div>
      </div>
    );
  }

  if (!data?.totalStats) return null;

  const { weeklyVolume, weeklyFrequency, streak, totalStats } = data;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          icon="🏋️"
          value={totalStats.totalVolume.toLocaleString('es-AR') + ' kg'}
          label="Volumen total"
        />
        <StatsCard icon="📅" value={totalStats.totalSessions.toString()} label="Sesiones" />
        <StatsCard
          icon="🔥"
          value={streak + (streak === 1 ? ' semana' : ' semanas')}
          label="Racha actual"
        />
        <StatsCard
          icon="⏱️"
          value={totalStats.avgSessionDuration + ' min'}
          label="Duración promedio"
        />
      </div>

      {/* Volume chart */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold text-foreground">Volumen semanal</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <VolumeChart
            data={weeklyVolume.map((w: any) => ({
              label: w.weekLabel,
              value: w.volume,
            }))}
          />
        </div>
      </div>

      {/* Frequency chart */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold text-foreground">Frecuencia semanal</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <FrequencyChart
            data={weeklyFrequency.map((w: any) => ({
              label: w.weekLabel,
              value: w.sessions,
            }))}
            target={5}
          />
        </div>
      </div>
    </div>
  );
}

// === Tab Ejercicios ===

function EjerciciosTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.exercises) return null;

  const { exercises, personalRecords } = data;

  return (
    <div className="space-y-6">
      {/* PRs recientes */}
      {personalRecords && personalRecords.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold text-foreground">🏆 Records personales</h2>
          <div className="space-y-2">
            {personalRecords.slice(0, 3).map((pr: any) => (
              <PRBadge
                key={pr.exerciseId}
                weight={pr.weight}
                reps={pr.reps}
                date={pr.date}
                exerciseName={pr.exerciseName}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lista de ejercicios */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold text-foreground">Ejercicios entrenados</h2>
        <div className="space-y-2">
          {exercises.map((ex: any) => (
            <Link
              key={ex.exerciseId}
              href={`/progress/exercise/${ex.exerciseId}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card active:scale-[0.98] transition-transform duration-150 ease-out-quint"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ex.exerciseName}</p>
                <div className="flex items-center gap-2 mt-0.5 font-mono">
                  <span className="text-xs text-muted-foreground">{ex.sessionCount} sesiones</span>
                  <span className="text-xs text-muted-foreground/70">•</span>
                  <span className="text-xs text-muted-foreground">Mejor: {ex.bestWeight} kg</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ex.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {ex.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {ex.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// === Tab Cuerpo ===

function CuerpoTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) {
    return <BodyMapSkeleton />;
  }

  if (!data?.bodyPartDistribution) return null;

  const { bodyPartDistribution } = data;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground">
        Distribución por grupo muscular
      </h2>
      <div className="rounded-lg border border-border bg-card p-4">
        <BodyMap data={bodyPartDistribution} />
      </div>
      <p className="text-xs text-muted-foreground/70 text-center">
        Los grupos marcados como "Sub-entrenado" tienen menos del 60% del volumen promedio
      </p>
    </div>
  );
}
