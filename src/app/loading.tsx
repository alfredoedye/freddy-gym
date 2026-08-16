/**
 * Skeleton del dashboard — el server component hace varias queries antes de
 * pintar nada; sin esto, en conexiones lentas la app parece congelada tras
 * el tap y el usuario re-toca.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 animate-pulse">
      {/* Saludo */}
      <div className="h-8 w-48 rounded-md bg-secondary mb-2" />
      <div className="h-4 w-32 rounded-md bg-secondary mb-8" />

      {/* Tarjeta principal ("Hoy toca") */}
      <div className="h-40 rounded-lg bg-secondary mb-4" />

      {/* Tarjetas secundarias */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-24 rounded-lg bg-secondary" />
        <div className="h-24 rounded-lg bg-secondary" />
      </div>

      <div className="h-32 rounded-lg bg-secondary" />
    </div>
  );
}
