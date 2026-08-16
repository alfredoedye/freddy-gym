/**
 * Skeleton de la pantalla de entrenamiento — la ruta hace auth + queries +
 * posible creación de sesión antes de renderizar; en el Wi-Fi del gimnasio
 * eso son segundos en los que el usuario necesita ver que algo está pasando.
 */
export default function WorkoutLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="h-6 w-32 rounded-md bg-secondary" />
        <div className="h-6 w-16 rounded-md bg-secondary" />
      </div>

      {/* Dots de progreso */}
      <div className="px-4 py-3 flex items-center justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-12 h-12 rounded-full bg-secondary" />
        ))}
      </div>

      {/* Imagen del ejercicio */}
      <div className="px-4 py-4">
        <div className="mx-auto aspect-square w-full max-w-[min(88vw,340px)] rounded-lg bg-secondary mb-4" />
        <div className="h-6 w-3/4 mx-auto rounded-md bg-secondary mb-2" />
        <div className="h-4 w-1/2 mx-auto rounded-md bg-secondary" />
      </div>

      {/* Filas de series */}
      <div className="px-4 py-2 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[72px] rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  );
}
