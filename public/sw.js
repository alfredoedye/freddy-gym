// Service worker mínimo: solo existe para (a) cumplir el criterio de
// instalabilidad de Chrome/Android y (b) cachear los GIFs/imágenes de
// ejercicios (servidos desde un host externo) para que el detalle de un
// ejercicio ya visitado se pueda ver sin señal dentro del gym.
//
// Deliberadamente NO cachea HTML/API: esta app es autenticada y los datos
// (planes, progreso) cambian por sesión de entrenamiento, así que servir
// una respuesta vieja desde caché sería peor que dejar que falle la red.

const EXERCISE_MEDIA_CACHE = 'exercise-media-v1';
const EXERCISE_MEDIA_HOST = 'raw.githubusercontent.com';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== EXERCISE_MEDIA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.hostname !== EXERCISE_MEDIA_HOST) return;

  event.respondWith(
    caches.open(EXERCISE_MEDIA_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
