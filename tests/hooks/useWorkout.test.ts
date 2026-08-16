// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkout, type PlanExerciseData, type WorkoutSetData } from '@/hooks/useWorkout';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const PENDING_KEY = 'gymapp:pendingSets:session-1';

function planExercise(exerciseId: string, sets: number, order: number): PlanExerciseData {
  return {
    id: `pe-${exerciseId}`,
    exerciseId,
    order,
    phase: 'MAIN',
    sets,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 90,
    notes: null,
    exercise: {
      id: exerciseId,
      name: `Ejercicio ${exerciseId}`,
      bodyPart: 'chest',
      equipment: 'barbell',
      target: 'pectorals',
      muscleGroup: null,
      imageUrl: null,
      gifUrl: null,
      instructionsEs: null,
    },
  };
}

const exercises = [planExercise('ex-1', 2, 1), planExercise('ex-2', 1, 2)];

function render(overrides: Partial<Parameters<typeof useWorkout>[0]> = {}) {
  // Los parámetros se construyen UNA vez, fuera del callback de render: el
  // efecto de inicialización del hook depende de la identidad de estos arrays
  // (como las props estables que recibe del server component en la app real);
  // recrearlos en cada render provoca un loop infinito de renders.
  const params = {
    sessionId: 'session-1',
    exercises,
    existingSets: [],
    previousSets: [],
    ...overrides,
  };
  return renderHook(() => useWorkout(params));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWorkout — inicialización', () => {
  it('arma la lista de series por ejercicio según lo prescripto', () => {
    const { result } = render();

    expect(result.current.sets.get('ex-1')).toHaveLength(2);
    expect(result.current.sets.get('ex-2')).toHaveLength(1);
    expect(result.current.totalSetsPlanned).toBe(3);
    expect(result.current.totalSetsCompleted).toBe(0);
    expect(result.current.isWorkoutComplete).toBe(false);
  });

  it('pre-popula el peso de la sesión anterior en cada serie', () => {
    const previousSets: WorkoutSetData[] = [
      { exerciseId: 'ex-1', setNumber: 1, reps: 10, weight: 40, completed: true, rpe: null, completedAt: null },
    ];
    const { result } = render({ previousSets });

    expect(result.current.sets.get('ex-1')![0].weight).toBe(40);
    expect(result.current.sets.get('ex-1')![1].weight).toBeNull();
    expect(result.current.getPreviousWeight('ex-1', 1)).toBe(40);
    expect(result.current.getPreviousReps('ex-1', 1)).toBe(10);
  });

  it('al resumir una sesión arranca en el primer ejercicio incompleto', () => {
    const existingSets: WorkoutSetData[] = [
      { exerciseId: 'ex-1', setNumber: 1, reps: 10, weight: 50, completed: true, rpe: null, completedAt: null },
      { exerciseId: 'ex-1', setNumber: 2, reps: 10, weight: 50, completed: true, rpe: null, completedAt: null },
    ];
    const { result } = render({ existingSets });

    expect(result.current.currentExerciseIndex).toBe(1); // ex-1 ya está completo
    expect(result.current.totalSetsCompleted).toBe(2);
    expect(result.current.getExerciseProgress('ex-1')).toEqual({ completed: 2, total: 2 });
  });
});

describe('useWorkout — completar series', () => {
  it('actualiza optimista y persiste la serie por POST', async () => {
    const { result } = render();

    await act(async () => {
      await result.current.completeSet('ex-1', 1, 10, 60);
    });

    expect(result.current.totalSetsCompleted).toBe(1);
    expect(result.current.totalVolume).toBe(600);
    expect(result.current.isSetFailed('ex-1', 1)).toBe(false);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workouts/session-1/sets',
      expect.objectContaining({ method: 'POST' })
    );
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody).toMatchObject({ exerciseId: 'ex-1', setNumber: 1, reps: 10, weight: 60, completed: true });

    // confirmado por el servidor: el espejo local queda vacío
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('el workout queda completo al terminar todas las series', async () => {
    const { result } = render();

    await act(async () => {
      await result.current.completeSet('ex-1', 1, 10, 60);
      await result.current.completeSet('ex-1', 2, 10, 60);
      await result.current.completeSet('ex-2', 1, 12, null);
    });

    expect(result.current.isWorkoutComplete).toBe(true);
    expect(result.current.totalSetsCompleted).toBe(3);
  });

  it('si el guardado falla, marca la serie como fallida y la retiene en el espejo local', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const { result } = render();

    await act(async () => {
      await result.current.completeSet('ex-1', 1, 10, 60);
    });

    // la UI conserva la serie completada (optimista) pero avisa del fallo
    expect(result.current.totalSetsCompleted).toBe(1);
    expect(result.current.isSetFailed('ex-1', 1)).toBe(true);
    expect(JSON.parse(localStorage.getItem(PENDING_KEY)!)).toHaveLength(1);
  });

  it('retrySet reenvía con los valores en pantalla y limpia el estado de fallo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = render();

    await act(async () => {
      await result.current.completeSet('ex-1', 1, 10, 60);
    });
    expect(result.current.isSetFailed('ex-1', 1)).toBe(true);

    await act(async () => {
      await result.current.retrySet('ex-1', 1);
    });

    expect(result.current.isSetFailed('ex-1', 1)).toBe(false);
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retryBody).toMatchObject({ exerciseId: 'ex-1', setNumber: 1, reps: 10, weight: 60 });
  });

  it('undoSet desmarca la serie y limpia fallo y espejo local', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const { result } = render();

    await act(async () => {
      await result.current.completeSet('ex-1', 1, 10, 60);
    });

    act(() => {
      result.current.undoSet('ex-1', 1);
    });

    expect(result.current.totalSetsCompleted).toBe(0);
    expect(result.current.isSetFailed('ex-1', 1)).toBe(false);
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });
});

describe('useWorkout — recuperación tras un refresh', () => {
  it('restaura series pendientes del espejo local y las reenvía al montar', async () => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify([{ exerciseId: 'ex-1', setNumber: 1, reps: 10, weight: 60, rpe: null }])
    );

    const { result } = render();

    // la serie vuelve completada a la UI aunque nunca llegó al servidor
    expect(result.current.totalSetsCompleted).toBe(1);
    expect(result.current.sets.get('ex-1')![0]).toMatchObject({ completed: true, reps: 10, weight: 60 });

    // y se reenvía sola (el endpoint es upsert: reenviar es inocuo)
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const resent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(resent).toMatchObject({ exerciseId: 'ex-1', setNumber: 1, completed: true });
  });
});

describe('useWorkout — navegación y tiempo', () => {
  it('navega entre ejercicios con topes en ambos extremos', () => {
    const { result } = render();

    act(() => result.current.prevExercise());
    expect(result.current.currentExerciseIndex).toBe(0); // no baja de 0

    act(() => result.current.nextExercise());
    act(() => result.current.nextExercise());
    act(() => result.current.nextExercise());
    expect(result.current.currentExerciseIndex).toBe(1); // no pasa del último

    expect(result.current.currentExercise?.exerciseId).toBe('ex-2');
  });

  it('el reloj arranca del startedAt del servidor: un refresh no lo reinicia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T10:01:00Z'));

    const { result } = render({ startedAt: '2026-08-12T10:00:00Z' }); // arrancó hace 60s

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedTime).toBe(65);
    expect(result.current.formattedElapsedTime).toBe('1:05');
  });
});
