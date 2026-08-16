import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import {
  searchExercises,
  getExerciseById,
  getSimilarExercises,
  getExerciseHistory,
} from '@/lib/exercises';
import { GET as searchRoute } from '@/app/api/exercises/route';
import { GET as detailRoute } from '@/app/api/exercises/[id]/route';
import { jsonRequest, authedSession } from '../helpers/api';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/exercises', () => ({
  searchExercises: vi.fn(),
  getExerciseById: vi.fn(),
  getSimilarExercises: vi.fn(),
  getExerciseHistory: vi.fn(),
}));

const getServerSessionMock = vi.mocked(getServerSession);
const searchMock = vi.mocked(searchExercises);
const byIdMock = vi.mocked(getExerciseById);
const similarMock = vi.mocked(getSimilarExercises);
const historyMock = vi.mocked(getExerciseHistory);

beforeEach(() => {
  getServerSessionMock.mockReset();
  searchMock.mockReset();
  byIdMock.mockReset();
  similarMock.mockReset();
  historyMock.mockReset();
  searchMock.mockResolvedValue({ exercises: [], total: 0, page: 1, totalPages: 0 });
});

describe('GET /api/exercises', () => {
  it('usa página 1 y límite 20 por defecto', async () => {
    await searchRoute(jsonRequest('/api/exercises', undefined, 'GET'));

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });

  it('acota límites y páginas maliciosos o rotos (limit 999→50, limit 0→1, page -2→1)', async () => {
    await searchRoute(jsonRequest('/api/exercises?limit=999&page=-2', undefined, 'GET'));
    expect(searchMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 50 }));

    await searchRoute(jsonRequest('/api/exercises?limit=0', undefined, 'GET'));
    expect(searchMock).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 1 }));
  });

  it('pasa los filtros de búsqueda a la capa de dominio', async () => {
    await searchRoute(
      jsonRequest('/api/exercises?search=press&bodyPart=pecho&equipment=barra', undefined, 'GET')
    );

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'press', bodyPart: 'pecho', equipment: 'barra' })
    );
  });

  it('devuelve 500 controlado si la búsqueda falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    searchMock.mockRejectedValue(new Error('DB caída'));

    const response = await searchRoute(jsonRequest('/api/exercises', undefined, 'GET'));
    expect(response.status).toBe(500);
  });
});

describe('GET /api/exercises/[id]', () => {
  const routeParams = { params: { id: 'ex-1' } };
  const req = () => jsonRequest('/api/exercises/ex-1', undefined, 'GET');
  const exercise = { id: 'ex-1', name: 'Press banca', target: 'pectorals' };

  it('devuelve 404 si el ejercicio no existe en el catálogo', async () => {
    byIdMock.mockResolvedValue(null);

    expect((await detailRoute(req(), routeParams)).status).toBe(404);
  });

  it('devuelve ejercicio + similares + historial del usuario autenticado', async () => {
    byIdMock.mockResolvedValue(exercise as never);
    similarMock.mockResolvedValue([{ id: 'ex-2' }] as never);
    historyMock.mockResolvedValue([{ setNumber: 1, weight: 80 }] as never);
    getServerSessionMock.mockResolvedValue(authedSession() as never);

    const response = await detailRoute(req(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.exercise.id).toBe('ex-1');
    expect(body.similar).toHaveLength(1);
    expect(body.history).toHaveLength(1);
    // los similares se buscan por el mismo músculo objetivo, excluyendo el actual
    expect(similarMock).toHaveBeenCalledWith('pectorals', 'ex-1', 4);
    expect(historyMock).toHaveBeenCalledWith('user-1', 'ex-1');
  });

  it('sin sesión devuelve el ejercicio con historial vacío (la ficha es pública)', async () => {
    byIdMock.mockResolvedValue(exercise as never);
    similarMock.mockResolvedValue([] as never);
    getServerSessionMock.mockResolvedValue(null as never);

    const response = await detailRoute(req(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.history).toEqual([]);
    expect(historyMock).not.toHaveBeenCalled();
  });
});
