'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getBodyPartLabel, getEquipmentLabel } from '@/lib/exercise-utils';

interface ExerciseGridCardProps {
  exercise: {
    id: string;
    name: string;
    bodyPart: string;
    equipment: string;
    target: string;
    imageUrl: string | null;
    isFavorite?: boolean;
  };
  /** Si viene, la card muestra el corazón para marcar/desmarcar favorito. */
  onToggleFavorite?: (exerciseId: string, isFavorite: boolean) => void;
}

export function ExerciseGridCard({ exercise, onToggleFavorite }: ExerciseGridCardProps) {
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 ease-out-quint active:scale-[0.98] hover:border-muted-foreground"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {exercise.imageUrl ? (
          <Image
            src={exercise.imageUrl}
            alt={exercise.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🏋️</span>
          </div>
        )}

        {/* Corazón de favorito — botón encima del Link: frena la navegación */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(exercise.id, !exercise.isFavorite);
            }}
            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-colors duration-150 active:bg-background"
            aria-label={exercise.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart
              className={`h-5 w-5 ${
                exercise.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
              }`}
            />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="min-h-[2.5rem] text-sm font-medium leading-tight text-foreground line-clamp-2">
          {exercise.name}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {getBodyPartLabel(exercise.bodyPart)}
          </span>
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {getEquipmentLabel(exercise.equipment)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Skeleton para loading
export function ExerciseGridCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-square animate-pulse bg-secondary" />
      <div className="space-y-2 p-3">
        <div className="h-4 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="flex gap-1">
          <div className="h-5 w-16 animate-pulse rounded-full bg-secondary" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  );
}
