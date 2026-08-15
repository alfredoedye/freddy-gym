'use client';

import { Check } from 'lucide-react';

type Difficulty = 'TOO_EASY' | 'EASY' | 'JUST_RIGHT' | 'HARD' | 'TOO_HARD';

interface DifficultySelectorProps {
  value?: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

const options: {
  value: Difficulty;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    value: 'TOO_EASY',
    emoji: '😴',
    label: 'Muy fácil',
    description: 'Me sobró mucha energía',
  },
  {
    value: 'EASY',
    emoji: '😊',
    label: 'Fácil',
    description: 'Podría haber hecho más',
  },
  {
    value: 'JUST_RIGHT',
    emoji: '💪',
    label: 'Adecuado',
    description: 'Justo lo que necesitaba',
  },
  {
    value: 'HARD',
    emoji: '🥵',
    label: 'Difícil',
    description: 'Me costó completar las rutinas',
  },
  {
    value: 'TOO_HARD',
    emoji: '🥴',
    label: 'Muy difícil',
    description: 'No pude completar varias rutinas',
  },
];

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={`flex min-h-[72px] items-center gap-4 rounded-lg border p-5 text-left transition-colors duration-150 ease-out-quint ${
              isSelected ? 'border-primary bg-accent' : 'border-border bg-card hover:border-muted-foreground'
            }`}
          >
            <span className="text-3xl">{option.emoji}</span>
            <div className="flex-1">
              <p className={`text-lg font-semibold ${isSelected ? 'text-accent-text' : 'text-foreground'}`}>
                {option.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
            </div>
            {isSelected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
