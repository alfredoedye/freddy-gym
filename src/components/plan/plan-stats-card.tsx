'use client';

interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
}

export function PlanStatsCard({ icon, value, label, sublabel }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString('es-AR') : value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground/70">{sublabel}</p>}
      </div>
    </div>
  );
}

interface PlanStatsGridProps {
  stats: {
    totalSessions: number;
    totalExpectedSessions: number;
    completionRate: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    totalDurationMinutes: number;
    weeksCompleted: number;
    durationWeeks: number;
  };
}

export function PlanStatsGrid({ stats }: PlanStatsGridProps) {
  const hours = Math.floor(stats.totalDurationMinutes / 60);
  const minutes = stats.totalDurationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <PlanStatsCard
        icon="📅"
        value={stats.totalSessions}
        label="Sesiones completadas"
        sublabel={`de ${stats.totalExpectedSessions} planificadas`}
      />
      <PlanStatsCard icon="📊" value={`${stats.completionRate}%`} label="Tasa de cumplimiento" />
      <PlanStatsCard
        icon="🏋️"
        value={stats.totalVolume.toLocaleString('es-AR')}
        label="Volumen total (kg)"
      />
      <PlanStatsCard icon="⏱️" value={durationStr} label="Tiempo total" />
      <PlanStatsCard icon="🔁" value={stats.totalSets} label="Series totales" />
      <PlanStatsCard
        icon="📈"
        value={`${stats.weeksCompleted}/${stats.durationWeeks}`}
        label="Semanas completadas"
      />
    </div>
  );
}
