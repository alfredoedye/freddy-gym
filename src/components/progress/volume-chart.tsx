'use client';

import { useEffect, useRef, useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface VolumeChartProps {
  data: DataPoint[];
  height?: number;
  yLabel?: string;
  formatValue?: (value: number) => string;
}

const VOLT = '#D4FF3D';
const INK_950 = '#0E0F0C';

export function VolumeChart({
  data,
  height = 200,
  yLabel = 'kg',
  formatValue = (v) => v.toLocaleString('es-AR'),
}: VolumeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [activePoint, setActivePoint] = useState<number | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
      setWidth(containerRef.current.offsetWidth);
    }

    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-lg">
        Sin datos todavía
      </div>
    );
  }

  // Dimensiones del SVG
  const padding = { top: 20, right: 16, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Escala
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.1 || 100;
  const minValue = 0;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
  const yScale = (v: number) =>
    padding.top + chartHeight - ((v - minValue) / (maxValue - minValue)) * chartHeight;

  // Generar path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`)
    .join(' ');

  // Área con gradiente
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${
    padding.top + chartHeight
  } L ${xScale(0)} ${padding.top + chartHeight} Z`;

  // Grid lines (Y axis)
  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => {
    const value = minValue + ((maxValue - minValue) * i) / gridLines;
    return { value, y: yScale(value) };
  });

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width}
        height={height}
        className="touch-none"
        onTouchStart={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.touches[0].clientX - rect.left;
          const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
          if (index >= 0 && index < data.length) setActivePoint(index);
        }}
        onTouchEnd={() => setActivePoint(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
          if (index >= 0 && index < data.length) setActivePoint(index);
        }}
        onMouseLeave={() => setActivePoint(null)}
      >
        {/* Definir gradiente */}
        <defs>
          <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={VOLT} stopOpacity="0.3" />
            <stop offset="100%" stopColor={VOLT} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(Math.round(tick.value))}
            </text>
          </g>
        ))}

        {/* Área con gradiente */}
        <path d={areaPath} fill="url(#volumeGradient)" />

        {/* Línea principal */}
        <path
          d={linePath}
          fill="none"
          stroke={VOLT}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r={activePoint === i ? 6 : 3}
            fill={activePoint === i ? VOLT : undefined}
            className={activePoint === i ? '' : 'fill-card'}
            stroke={VOLT}
            strokeWidth={2}
            style={{ transition: 'r 150ms ease-out, fill 150ms ease-out' }}
          />
        ))}

        {/* Labels X axis */}
        {data.map((d, i) => {
          // Mostrar cada N labels para no saturar
          const showEvery = Math.max(1, Math.floor(data.length / 6));
          if (i % showEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={xScale(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {d.label}
            </text>
          );
        })}

        {/* Tooltip activo — texto ink-950 sobre relleno volt (The Fill, Not Ink Rule) */}
        {activePoint !== null && (
          <g>
            <line
              x1={xScale(activePoint)}
              y1={padding.top}
              x2={xScale(activePoint)}
              y2={padding.top + chartHeight}
              stroke={VOLT}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
            />
            <rect
              x={xScale(activePoint) - 40}
              y={yScale(data[activePoint].value) - 28}
              width={80}
              height={22}
              rx={6}
              fill={VOLT}
            />
            <text
              x={xScale(activePoint)}
              y={yScale(data[activePoint].value) - 13}
              textAnchor="middle"
              className="text-[11px] font-medium font-mono"
              fill={INK_950}
            >
              {formatValue(data[activePoint].value)} {yLabel}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function VolumeChartSkeleton() {
  return <div className="w-full h-[200px] rounded-lg bg-secondary animate-pulse" />;
}
