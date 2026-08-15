'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getBodyPartLabel, getEquipmentLabel } from '@/lib/exercise-utils';

interface PickerExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  imageUrl: string | null;
  gifUrl: string | null;
}

interface ExercisePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: PickerExercise) => void;
}

export function ExercisePickerDialog({ open, onOpenChange, onSelect }: ExercisePickerDialogProps) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<PickerExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/exercises?search=${encodeURIComponent(search)}&limit=20`)
        .then((res) => res.json())
        .then((data) => setExercises(data.exercises || []))
        .catch(() => setExercises([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, search]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegí un ejercicio</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="pl-11"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron ejercicios
            </p>
          )}

          {!loading &&
            exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors duration-150 hover:bg-secondary"
              >
                {ex.imageUrl ? (
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="h-11 w-11 flex-shrink-0 rounded-md bg-secondary object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{ex.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getBodyPartLabel(ex.bodyPart)} · {getEquipmentLabel(ex.equipment)}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
