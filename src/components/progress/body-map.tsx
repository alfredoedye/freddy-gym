'use client';

interface BodyPartData {
  bodyPartLabel: string;
  volume: number;
  percentage: number;
  color: string;
}

interface BodyMapProps {
  data: BodyPartData[];
}

export function BodyMap({ data }: BodyMapProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-lg">
        Sin datos todavía
      </div>
    );
  }

  const maxPercentage = Math.max(...data.map((d) => d.percentage));
  // Calcular promedio para detectar músculos sub-entrenados
  const avgPercentage = 100 / data.length;

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const isUndertrained = item.percentage < avgPercentage * 0.6;
        return (
          <div key={item.bodyPartLabel} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-foreground">{item.bodyPartLabel}</span>
                {isUndertrained && (
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                    Sub-entrenado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm text-muted-foreground">
                  {item.volume.toLocaleString('es-AR')} kg
                </span>
                <span className="text-xs text-muted-foreground/70 w-8 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
            {/* Barra de progreso */}
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out-quint"
                style={{
                  width: `${(item.percentage / maxPercentage) * 100}%`,
                  backgroundColor: item.color,
                  opacity: isUndertrained ? 0.6 : 1,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BodyMapSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-secondary" />
            <div className="h-4 w-16 rounded bg-secondary" />
          </div>
          <div className="h-2.5 bg-secondary rounded-full" />
        </div>
      ))}
    </div>
  );
}
