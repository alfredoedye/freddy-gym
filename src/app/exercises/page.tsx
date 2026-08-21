'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Heart, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SearchBar } from '@/components/exercises/search-bar';
import { FilterChips } from '@/components/exercises/filter-chips';
import { ExerciseGridCard, ExerciseGridCardSkeleton } from '@/components/exercises/exercise-grid-card';
import { BODY_PART_FILTER_OPTIONS, EQUIPMENT_FILTER_OPTIONS } from '@/lib/exercise-utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  imageUrl: string | null;
  gifUrl: string | null;
  isFavorite?: boolean;
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState('todos');
  const [equipment, setEquipment] = useState('todos');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showEquipmentFilter, setShowEquipmentFilter] = useState(false);

  // Fetch ejercicios
  const fetchExercises = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (bodyPart !== 'todos') params.set('bodyPart', bodyPart);
      if (equipment !== 'todos') params.set('equipment', equipment);
      if (favoritesOnly) params.set('favorites', 'true');
      params.set('page', String(pageNum));
      params.set('limit', '20');

      const res = await fetch(`/api/exercises?${params.toString()}`);
      const data = await res.json();

      if (append) {
        setExercises((prev) => [...prev, ...data.exercises]);
      } else {
        setExercises(data.exercises);
      }
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, bodyPart, equipment, favoritesOnly]);

  // Marcar/desmarcar favorito con actualización optimista; si la API falla,
  // se revierte. Con el filtro de favoritos activo, desmarcar saca la card.
  const toggleFavorite = useCallback(
    async (exerciseId: string, makeFavorite: boolean) => {
      setExercises((prev) =>
        favoritesOnly && !makeFavorite
          ? prev.filter((ex) => ex.id !== exerciseId)
          : prev.map((ex) => (ex.id === exerciseId ? { ...ex, isFavorite: makeFavorite } : ex))
      );
      if (favoritesOnly && !makeFavorite) setTotal((prev) => Math.max(0, prev - 1));

      try {
        const res = await fetch(`/api/exercises/${exerciseId}/favorite`, {
          method: makeFavorite ? 'POST' : 'DELETE',
        });
        if (!res.ok) throw new Error('favorite toggle failed');
      } catch {
        toast.error('No se pudo actualizar el favorito');
        // Revertir: recargar la primera página con los filtros actuales
        fetchExercises(1, false);
      }
    },
    [favoritesOnly, fetchExercises]
  );

  // Refetch al cambiar filtros
  useEffect(() => {
    fetchExercises(1, false);
  }, [fetchExercises]);

  // Cargar más
  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchExercises(page + 1, true);
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4">
      {/* Título */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <h1 className="font-display text-2xl font-bold text-foreground">Ejercicios</h1>
        <ThemeToggle />
      </div>

      {/* Buscador */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Filtro de favoritos */}
      <div className="mb-3">
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`inline-flex min-h-touch items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ease-out-quint ${
            favoritesOnly
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-primary-foreground' : ''}`} />
          Favoritos
        </button>
      </div>

      {/* Filtros por parte del cuerpo */}
      <div className="mb-3">
        <FilterChips
          options={BODY_PART_FILTER_OPTIONS}
          selected={bodyPart}
          onChange={setBodyPart}
        />
      </div>

      {/* Filtro de equipamiento (colapsable) */}
      <div className="mb-4">
        <button
          onClick={() => setShowEquipmentFilter(!showEquipmentFilter)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Equipamiento: {equipment === 'todos' ? 'Todos' : equipment}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ease-out-quint ${showEquipmentFilter ? 'rotate-180' : ''}`}
          />
        </button>
        {showEquipmentFilter && (
          <div className="mt-2">
            <FilterChips
              options={EQUIPMENT_FILTER_OPTIONS}
              selected={equipment}
              onChange={(val) => {
                setEquipment(val);
                setShowEquipmentFilter(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      {!loading && (
        <p className="text-sm text-muted-foreground mb-3 font-mono">
          {total.toLocaleString('es-AR')} ejercicio{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid de ejercicios */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <ExerciseGridCardSkeleton key={i} />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-16">
          {favoritesOnly ? (
            <>
              <Heart className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Todavía no tenés favoritos</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Tocá el corazón de un ejercicio para marcarlo como favorito
              </p>
            </>
          ) : (
            <>
              <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No se encontraron ejercicios</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Probá con otros filtros o términos de búsqueda
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {exercises.map((exercise) => (
              <ExerciseGridCard
                key={exercise.id}
                exercise={exercise}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {/* Botón cargar más */}
          {page < totalPages && (
            <div className="mt-6 text-center">
              <Button onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  `Cargar más (${total - exercises.length} restantes)`
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
