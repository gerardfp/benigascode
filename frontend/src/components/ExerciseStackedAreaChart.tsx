import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { ExerciseTimelineItem } from '../types';

export type TimeRangeOption = '30d' | '90d' | 'all';

export interface ExerciseStackedAreaChartProps {
  timeline: ExerciseTimelineItem[];
  memberSince?: string;
  defaultRange?: TimeRangeOption;
}

export const ExerciseStackedAreaChart: React.FC<ExerciseStackedAreaChartProps> = ({
  timeline,
  memberSince,
  defaultRange = '30d',
}) => {
  const [range, setRange] = useState<TimeRangeOption>(defaultRange);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleTimeline = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];

    if (range === '30d') {
      return timeline.slice(-30);
    }
    if (range === '90d') {
      return timeline.slice(-90);
    }

    // range === 'all'
    let startIdx = 0;
    if (memberSince) {
      const idx = timeline.findIndex(d => d.date >= memberSince);
      if (idx !== -1) {
        startIdx = Math.max(0, idx - 1);
      }
    } else {
      const firstActiveIdx = timeline.findIndex(
        d => d.resolved + d.attemptedWithPassed + d.attemptedWithoutPassed > 0
      );
      if (firstActiveIdx > 0) {
        startIdx = Math.max(0, firstActiveIdx - 1);
      }
    }

    const sliced = timeline.slice(startIdx);
    if (sliced.length < 2 && timeline.length >= 2) {
      return timeline.slice(-2);
    }
    return sliced.length > 0 ? sliced : timeline;
  }, [timeline, range, memberSince]);

  const N = visibleTimeline.length;

  if (N === 0) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.0625rem',
              fontWeight: 600,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
            Evolución de Ejercicios
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
          Sin actividad registrada
        </div>
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...visibleTimeline.map(d => d.resolved + d.attemptedWithPassed + d.attemptedWithoutPassed)
  );
  const yMax = maxVal <= 5 ? Math.max(5, maxVal) : Math.ceil(maxVal * 1.15);

  const W = 500;
  const H = 160;
  const padLeft = 28;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 24;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const getX = (idx: number) => padLeft + (idx / Math.max(1, N - 1)) * chartW;
  const getY = (val: number) => padTop + chartH - (val / yMax) * chartH;

  // Curvas acumuladas:
  // Capa 1: Resueltos (Verde, abajo) -> [0, d.resolved]
  const greenTop = visibleTimeline.map(
    (d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.resolved).toFixed(1)}`
  );
  const greenArea = [
    ...greenTop,
    `L ${getX(N - 1).toFixed(1)} ${getY(0).toFixed(1)}`,
    `L ${getX(0).toFixed(1)} ${getY(0).toFixed(1)}`,
    'Z',
  ].join(' ');

  // Capa 2: Intentados con algún caso de prueba resuelto (Amarillo, enmedio) -> [d.resolved, d.resolved + d.attemptedWithPassed]
  const yellowTop = visibleTimeline.map(
    (d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.resolved + d.attemptedWithPassed).toFixed(1)}`
  );
  const greenReverse = [...visibleTimeline].reverse().map((d, idx) => {
    const origIdx = N - 1 - idx;
    return `L ${getX(origIdx).toFixed(1)} ${getY(d.resolved).toFixed(1)}`;
  });
  const yellowArea = [...yellowTop, ...greenReverse, 'Z'].join(' ');

  // Capa 3: Intentados sin ningún caso de prueba resuelto (Rojo, arriba) -> [d.resolved + d.attemptedWithPassed, total]
  const redTop = visibleTimeline.map(
    (d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(
        d.resolved + d.attemptedWithPassed + d.attemptedWithoutPassed
      ).toFixed(1)}`
  );
  const yellowReverse = [...visibleTimeline].reverse().map((d, idx) => {
    const origIdx = N - 1 - idx;
    return `L ${getX(origIdx).toFixed(1)} ${getY(d.resolved + d.attemptedWithPassed).toFixed(1)}`;
  });
  const redArea = [...redTop, ...yellowReverse, 'Z'].join(' ');

  // Líneas superiores
  const greenLine = greenTop.join(' ');
  const yellowLine = yellowTop.join(' ');
  const redLine = redTop.join(' ');

  const activeIndex = hoverIndex !== null && hoverIndex < N ? hoverIndex : N - 1;
  const activeItem = visibleTimeline[activeIndex] || {
    date: '',
    resolved: 0,
    attemptedWithPassed: 0,
    attemptedWithoutPassed: 0,
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const ratio = (xPos - padLeft * (rect.width / W)) / (chartW * (rect.width / W));
    const rawIdx = Math.round(ratio * (N - 1));
    const clamped = Math.max(0, Math.min(N - 1, rawIdx));
    setHoverIndex(clamped);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const formatShortDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const isMultiYear =
        visibleTimeline[0]?.date?.slice(0, 4) !== visibleTimeline[N - 1]?.date?.slice(0, 4);
      return isMultiYear ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : `${parts[2]}/${parts[1]}`;
    }
    return dStr;
  };

  const midVal = Math.round(yMax / 2);
  const midIdx = Math.floor((N - 1) / 2);

  return (
    <div>
      {/* Cabecera con Título y Selector de Rango */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <TrendingUp size={18} style={{ color: '#2563eb' }} />
          Evolución de Ejercicios
        </h3>

        {/* Selector de periodo */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRange('30d');
              setHoverIndex(null);
            }}
            style={{
              padding: '0.2rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: range === '30d' ? 600 : 500,
              color: range === '30d' ? '#1e293b' : '#64748b',
              backgroundColor: range === '30d' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: range === '30d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            onClick={() => {
              setRange('90d');
              setHoverIndex(null);
            }}
            style={{
              padding: '0.2rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: range === '90d' ? 600 : 500,
              color: range === '90d' ? '#1e293b' : '#64748b',
              backgroundColor: range === '90d' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: range === '90d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Últimos 90 días
          </button>
          <button
            type="button"
            onClick={() => {
              setRange('all');
              setHoverIndex(null);
            }}
            style={{
              padding: '0.2rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: range === 'all' ? 600 : 500,
              color: range === 'all' ? '#1e293b' : '#64748b',
              backgroundColor: range === 'all' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: range === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Todo el tiempo
          </button>
        </div>
      </div>

      {/* Leyenda y Datos Dinámicos */}
      <div
        style={{
          display: 'flex',
          gap: '0.85rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '0.65rem',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#166534', fontWeight: 500 }}>Resueltos:</span>
          <strong style={{ color: '#065f46' }}>{activeItem.resolved}</strong>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#92400e', fontWeight: 500 }}>Con tests superados:</span>
          <strong style={{ color: '#78350f' }}>{activeItem.attemptedWithPassed}</strong>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#991b1b', fontWeight: 500 }}>Sin tests superados:</span>
          <strong style={{ color: '#7f1d1d' }}>{activeItem.attemptedWithoutPassed}</strong>
        </div>

        <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.75rem' }}>
          {hoverIndex !== null ? activeItem.date : 'Estado actual'}
        </div>
      </div>

      {/* Gráfico SVG */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
            cursor: 'crosshair',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Líneas de rejilla horizontales y etiquetas de eje Y */}
          <line
            x1={padLeft}
            y1={getY(yMax)}
            x2={W - padRight}
            y2={getY(yMax)}
            stroke="#f1f5f9"
            strokeDasharray="3 3"
          />
          <text x={padLeft - 6} y={getY(yMax) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {yMax}
          </text>

          <line
            x1={padLeft}
            y1={getY(midVal)}
            x2={W - padRight}
            y2={getY(midVal)}
            stroke="#f1f5f9"
            strokeDasharray="3 3"
          />
          <text x={padLeft - 6} y={getY(midVal) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {midVal}
          </text>

          <line
            x1={padLeft}
            y1={getY(0)}
            x2={W - padRight}
            y2={getY(0)}
            stroke="#e2e8f0"
          />
          <text x={padLeft - 6} y={getY(0) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            0
          </text>

          {/* Áreas apiladas */}
          {/* 1. Verde: Resueltos (abajo) */}
          <path d={greenArea} fill="url(#greenGrad)" />
          <path d={greenLine} fill="none" stroke="#10b981" strokeWidth="1.5" />

          {/* 2. Amarillo: Intentados con algún caso superado (enmedio) */}
          <path d={yellowArea} fill="url(#yellowGrad)" />
          <path d={yellowLine} fill="none" stroke="#f59e0b" strokeWidth="1.5" />

          {/* 3. Rojo: Intentados sin ningún caso superado (arriba) */}
          <path d={redArea} fill="url(#redGrad)" />
          <path d={redLine} fill="none" stroke="#ef4444" strokeWidth="1.5" />

          {/* Cursor vertical en hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(activeIndex)}
                y1={padTop}
                x2={getX(activeIndex)}
                y2={getY(0)}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Punto Rojo */}
              <circle
                cx={getX(activeIndex)}
                cy={getY(
                  activeItem.resolved +
                    activeItem.attemptedWithPassed +
                    activeItem.attemptedWithoutPassed
                )}
                r="3.5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Punto Amarillo */}
              <circle
                cx={getX(activeIndex)}
                cy={getY(activeItem.resolved + activeItem.attemptedWithPassed)}
                r="3.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Punto Verde */}
              <circle
                cx={getX(activeIndex)}
                cy={getY(activeItem.resolved)}
                r="3.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Etiquetas Eje X */}
          <text x={padLeft} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="start">
            {formatShortDate(visibleTimeline[0]?.date)}
          </text>
          {N > 10 && midIdx > 0 && midIdx < N - 1 && (
            <text x={getX(midIdx)} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="middle">
              {formatShortDate(visibleTimeline[midIdx]?.date)}
            </text>
          )}
          <text x={W - padRight} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="end">
            {formatShortDate(visibleTimeline[N - 1]?.date)}
          </text>
        </svg>
      </div>
    </div>
  );
};
