'use client';

/**
 * Página de creación de plan de entrenamiento.
 * El usuario configura parámetros y la IA genera el plan.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  Calendar,
  Target,
  Clock,
  Zap,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const OPTION_BASE =
  'rounded-md border text-center font-medium transition-colors duration-150 ease-out-quint';
const OPTION_SELECTED = 'border-primary bg-accent text-accent-text';
const OPTION_UNSELECTED = 'border-border bg-card text-foreground hover:border-muted-foreground';

// Opciones de configuración
const GOALS = [
  { value: 'HYPERTROPHY', label: 'Hipertrofia', description: 'Ganar masa muscular' },
  { value: 'STRENGTH', label: 'Fuerza', description: 'Levantar más peso' },
  { value: 'ENDURANCE', label: 'Resistencia', description: 'Más repeticiones, menos descanso' },
  { value: 'FAT_LOSS', label: 'Pérdida de grasa', description: 'Quemar grasa, mantener músculo' },
  { value: 'RECOMPOSITION', label: 'Recomposición', description: 'Ganar músculo y perder grasa' },
];

const DURATIONS = [
  { value: 4, label: '4 semanas' },
  { value: 6, label: '6 semanas' },
  { value: 8, label: '8 semanas' },
  { value: 12, label: '12 semanas' },
];

const DAYS_PER_WEEK = [
  { value: 3, label: '3 días' },
  { value: 4, label: '4 días' },
  { value: 5, label: '5 días' },
  { value: 6, label: '6 días' },
];

const SPLITS: Record<number, { value: string; label: string }[]> = {
  3: [
    { value: 'full_body', label: 'Full Body' },
    { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
  ],
  4: [
    { value: 'upper_lower', label: 'Upper / Lower' },
    { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
  ],
  5: [
    { value: 'push_pull_legs', label: 'Push / Pull / Legs (2x)' },
    { value: 'upper_lower', label: 'Upper / Lower + día extra' },
    { value: 'bro_split', label: 'Bro Split' },
  ],
  6: [
    { value: 'push_pull_legs', label: 'Push / Pull / Legs (2x)' },
    { value: 'bro_split', label: 'Bro Split' },
  ],
};

const TIME_OPTIONS = [
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
];

// Mensajes motivacionales durante la carga
const LOADING_MESSAGES = [
  'Analizando tu perfil...',
  'Seleccionando los mejores ejercicios...',
  'Diseñando la periodización...',
  'Optimizando volumen e intensidad...',
  'Armando tu plan personalizado...',
];

export default function CreatePlanPage() {
  const router = useRouter();

  // Estado del formulario
  const [goal, setGoal] = useState('HYPERTROPHY');
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [split, setSplit] = useState('push_pull_legs');
  const [timePerSession, setTimePerSession] = useState(60);

  // Estado de la generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  // Actualizar split disponible cuando cambian los días
  const availableSplits = SPLITS[daysPerWeek] || SPLITS[4];

  const handleDaysChange = (newDays: number) => {
    setDaysPerWeek(newDays);
    // Reset split al primero disponible para esos días
    const splits = SPLITS[newDays] || SPLITS[4];
    setSplit(splits[0].value);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    // Rotar mensajes de carga
    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 3000);

    try {
      const response = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          durationWeeks,
          daysPerWeek,
          split,
          timePerSession,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el plan');
      }

      // Redirigir a la vista del plan generado
      router.push(`/plan/${data.plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-md p-2 transition-colors duration-150 hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Crear Plan</h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Objetivo */}
        <section>
          <label className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Target className="w-5 h-5 text-accent-text" />
            Objetivo
          </label>
          <div className="space-y-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`w-full text-left p-4 ${OPTION_BASE} ${goal === g.value ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                <span className="text-lg font-medium">{g.label}</span>
                <span className="block text-sm text-muted-foreground mt-0.5">{g.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Duración */}
        <section>
          <label className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Calendar className="w-5 h-5 text-accent-text" />
            Duración
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDurationWeeks(d.value)}
                className={`p-3 ${OPTION_BASE} ${durationWeeks === d.value ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Días por semana */}
        <section>
          <label className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Dumbbell className="w-5 h-5 text-accent-text" />
            Días por semana
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DAYS_PER_WEEK.map((d) => (
              <button
                key={d.value}
                onClick={() => handleDaysChange(d.value)}
                className={`p-3 ${OPTION_BASE} ${daysPerWeek === d.value ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Split */}
        <section>
          <label className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Zap className="w-5 h-5 text-accent-text" />
            Split
          </label>
          <div className="space-y-2">
            {availableSplits.map((s) => (
              <button
                key={s.value}
                onClick={() => setSplit(s.value)}
                className={`w-full text-left p-4 ${OPTION_BASE} ${split === s.value ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tiempo por sesión */}
        <section>
          <label className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Clock className="w-5 h-5 text-accent-text" />
            Tiempo por sesión
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTimePerSession(t.value)}
                className={`p-3 ${OPTION_BASE} ${timePerSession === t.value ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
            <p className="font-medium text-destructive">{error}</p>
            <button onClick={handleGenerate} className="mt-2 text-sm text-destructive underline">
              Reintentar
            </button>
          </div>
        )}

        {/* Botón generar */}
        <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingMessage}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generar Plan con IA
            </>
          )}
        </Button>

        {/* Nota informativa */}
        <p className="text-center text-sm text-muted-foreground">
          La IA seleccionará ejercicios óptimos para tu objetivo y nivel.
          <br />
          Podrás ajustar el plan después de generarlo.
        </p>
      </div>
    </div>
  );
}
