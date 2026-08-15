'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Frown } from 'lucide-react';
import { ExerciseDetailHeader } from '@/components/exercises/exercise-detail-header';
import { getBodyPartLabel, getEquipmentLabel } from '@/lib/exercise-utils';

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  muscleGroup: string | null;
  secondaryMuscles: string[];
  instructionsEs: string | null;
  imageUrl: string | null;
  gifUrl: string | null;
}

interface HistoryEntry {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  completedAt: string | null;
  session: {
    startedAt: string;
    planDay: { name: string } | null;
  };
}

interface SimilarExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  imageUrl: string | null;
}

export default function ExerciseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [similar, setSimilar] = useState<SimilarExercise[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/exercises/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setExercise(data.exercise);
        setSimilar(data.similar);
        setHistory(data.history);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <div className="aspect-square animate-pulse bg-secondary" />
        <div className="p-4 space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-secondary" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-secondary" />
          </div>
          <div className="space-y-2">
            <div className="h-4 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <div className="text-center">
          <Frown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Ejercicio no encontrado</p>
          <Link href="/exercises" className="mt-4 inline-block font-medium text-accent-text">
            ← Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  // Parsear instrucciones (separadas por \n o numeradas)
  const instructions = exercise.instructionsEs
    ? exercise.instructionsEs
        .split(/\n|(?=\d+\.\s)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // Agrupar historial por sesión
  const sessionGroups = history.reduce((acc, entry) => {
    const date = entry.session.startedAt;
    if (!acc[date]) {
      acc[date] = {
        date,
        dayName: entry.session.planDay?.name || 'Sesión',
        sets: [],
      };
    }
    acc[date].sets.push(entry);
    return acc;
  }, {} as Record<string, { date: string; dayName: string; sets: HistoryEntry[] }>);

  const sessions = Object.values(sessionGroups).slice(0, 5);

  return (
    <div className="min-h-screen pb-20">
      {/* Header con GIF */}
      <ExerciseDetailHeader name={exercise.name} gifUrl={exercise.gifUrl} imageUrl={exercise.imageUrl} />

      {/* Contenido */}
      <div className="px-4 pt-4 space-y-6">
        {/* Nombre */}
        <h1 className="font-display text-2xl font-bold text-foreground">{exercise.name}</h1>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
            {getBodyPartLabel(exercise.bodyPart)}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
            {getEquipmentLabel(exercise.equipment)}
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-text">
            {exercise.target}
          </span>
          {exercise.secondaryMuscles?.map((muscle) => (
            <span
              key={muscle}
              className="rounded-full bg-secondary/60 px-3 py-1 text-sm font-medium text-muted-foreground"
            >
              {muscle}
            </span>
          ))}
        </div>

        {/* Instrucciones */}
        {instructions.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">Instrucciones</h2>
            <ol className="space-y-3">
              {instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-text">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-base leading-relaxed text-foreground/80">
                    {step.replace(/^\d+\.\s*/, '')}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Historial */}
        {sessions.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">Historial</h2>
            <div className="space-y-3">
              {sessions.map((session, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{session.dayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.sets.map((set, j) => (
                      <span
                        key={j}
                        className="rounded bg-secondary px-2 py-1 font-mono text-sm text-foreground"
                      >
                        {set.weight != null ? `${set.weight}kg × ${set.reps}` : `${set.reps} reps`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ejercicios similares */}
        {similar.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">Ejercicios similares</h2>
            <div className="grid grid-cols-2 gap-3">
              {similar.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/exercises/${ex.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors duration-150 ease-out-quint hover:border-muted-foreground"
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                    {ex.imageUrl ? (
                      <Image
                        src={ex.imageUrl}
                        alt={ex.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg">🏋️</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">
                      {ex.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getEquipmentLabel(ex.equipment)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
