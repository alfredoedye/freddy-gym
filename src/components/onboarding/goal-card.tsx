'use client';

import { Check } from 'lucide-react';

interface GoalCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function GoalCard({ icon, title, description, selected, onClick }: GoalCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-touch-lg w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors duration-150 ease-out-quint ${
        selected
          ? 'border-primary bg-accent'
          : 'border-border bg-card hover:border-muted-foreground'
      }`}
    >
      <span className="flex-shrink-0 text-3xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`font-display text-lg font-bold ${selected ? 'text-accent-text' : 'text-foreground'}`}>
          {title}
        </p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {selected && (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
