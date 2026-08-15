'use client';

import { useEffect, useRef, useState } from 'react';

interface FrequencyDataPoint {
  label: string;
  value: number;
}

interface FrequencyChartProps {
  data: FrequencyDataPoint[];
  target?: number; // días objetivo por semana
  height?: number;
}

const VOLT = '#D4FF3D';
const VOLT_DIM = '#8FA82A'; // volt desaturado — barra que no alcanzó el objetivo

export function FrequencyChart({ data, target, height = 160 }: FrequencyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

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
      <div className="flex items-center justify-center h-[160px] text-muted-foreground text-lg">
        Sin datos todavía
      </div>
    );
  }

  const padding = { top: 16, right: 12, bottom: 36, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), target || 0) + 1;
  const barWidth = Math.min(32, (chartWidth / data.length) * 0.6);
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

  const yScale = (v: number) => padding.top + chartHeight - (v / maxValue) * chartHeight;
  const xScale = (i: number) => padding.left + barGap + i * (barWidth + barGap) + barWidth / 2;

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height}>
        {/* Línea de objetivo */}
        {target && (
          <g>
            <line
              x1={padding.left}
              y1={yScale(target)}
              x2={width - padding.right}
              y2={yScale(target)}
              stroke={VOLT}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.6}
            />
            <text
              x={width - padding.right}
              y={yScale(target) - 6}
              textAnchor="end"
              className="fill-accent-text text-[10px] font-medium"
            >
              Objetivo: {target}
            </text>
          </g>
        )}

        {/* Barras */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = xScale(i) - barWidth / 2;
          const y = yScale(d.value);
          const meetsTarget = target ? d.value >= target : true;

          return (
            <g key={i}>
              {/* Barra de fondo */}
              <rect
                x={x}
                y={padding.top}
                width={barWidth}
                height={chartHeight}
                rx={barWidth / 4}
                className="fill-secondary"
              />
              {/* Barra de valor */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={barWidth / 4}
                fill={meetsTarget ? VOLT : VOLT_DIM}
                className="transition-all duration-300 ease-out-quint"
              />
              {/* Valor encima */}
              <text
                x={xScale(i)}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground/80 text-[11px] font-medium font-mono"
              >
                {d.value}
              </text>
              {/* Label X */}
              <text
                x={xScale(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FrequencyChartSkeleton() {
  return <div className="w-full h-[160px] rounded-lg bg-secondary animate-pulse" />;
}
