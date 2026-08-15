'use client';

interface StatsCardProps {
  icon: string;
  value: string;
  label: string;
  subtitle?: string;
}

export function StatsCard({ icon, value, label, subtitle }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-mono text-xl font-bold text-foreground">{value}</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
      {subtitle && <span className="text-xs text-muted-foreground/70">{subtitle}</span>}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-secondary" />
        <div className="h-6 w-20 rounded bg-secondary" />
      </div>
      <div className="h-4 w-24 rounded bg-secondary mt-2" />
    </div>
  );
}
