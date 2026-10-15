import React, { useState } from 'react';

export const DIFFICULTY_LEVEL_COLORS: Record<number, string> = {
  1: '#10b981', // Verde esmeralda
  2: '#84cc16', // Verde lima
  3: '#f59e0b', // Ámbar dorado
  4: '#f97316', // Naranja vivo
  5: '#ef4444', // Rojo intenso
};

export const DIFFICULTY_LEVEL_LABELS: Record<number, string> = {
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Intermedio',
  4: 'Difícil',
  5: 'Muy difícil',
};

export const DIFFICULTY_LEVEL_CONFIG: Record<number, {
  gradient: string;
  border: string;
  shadow: string;
}> = {
  1: {
    gradient: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
    border: '#047857',
    shadow: '0 1px 2px rgba(5, 150, 105, 0.28)',
  },
  2: {
    gradient: 'linear-gradient(180deg, #a3e635 0%, #65a30d 100%)',
    border: '#4d7c0f',
    shadow: '0 1px 2px rgba(101, 163, 13, 0.28)',
  },
  3: {
    gradient: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
    border: '#b45309',
    shadow: '0 1px 2px rgba(217, 119, 6, 0.28)',
  },
  4: {
    gradient: 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)',
    border: '#c2410c',
    shadow: '0 1px 2px rgba(234, 88, 12, 0.28)',
  },
  5: {
    gradient: 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)',
    border: '#b91c1c',
    shadow: '0 1px 2px rgba(220, 38, 38, 0.3)',
  },
};

/**
 * Escala una dificultad numérica de 0 a 10 a 5 niveles discretos (1 a 5).
 * Si es null o undefined, devuelve null.
 */
export function getDifficultyLevel(difficulty: number | null | undefined): number | null {
  if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
    return null;
  }
  const val = Math.max(0, Math.min(10, difficulty));
  if (val <= 2) return 1;
  if (val <= 4) return 2;
  if (val <= 6) return 3;
  if (val <= 8) return 4;
  return 5;
}

export interface DifficultyBarProps {
  difficulty?: number | null;
  level?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  tooltipText?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DifficultyBar: React.FC<DifficultyBarProps> = ({
  difficulty,
  level: directLevel,
  size = 'md',
  showTooltip = true,
  tooltipText,
  onClick,
  className,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const effectiveLevel = directLevel !== undefined && directLevel !== null
    ? directLevel
    : getDifficultyLevel(difficulty);

  const hasDifficulty = effectiveLevel !== null && effectiveLevel >= 1 && effectiveLevel <= 5;
  const config = hasDifficulty ? DIFFICULTY_LEVEL_CONFIG[effectiveLevel] : undefined;

  let computedTitle: string | undefined = undefined;
  if (showTooltip) {
    if (tooltipText) {
      computedTitle = tooltipText;
    } else if (hasDifficulty) {
      const label = DIFFICULTY_LEVEL_LABELS[effectiveLevel];
      computedTitle = difficulty !== null && difficulty !== undefined
        ? `Dificultad: ${difficulty}/10 (Nivel ${effectiveLevel} - ${label})`
        : `Dificultad: Nivel ${effectiveLevel} - ${label}`;
    } else {
      computedTitle = 'Sin dificultad asignada';
    }
  }

  // Dimensiones según el tamaño
  const sizeConfig = {
    sm: { width: 5, height: 12, radius: 1.5, gap: 2.5 },
    md: { width: 6.5, height: 14.5, radius: 2, gap: 3 },
    lg: { width: 8, height: 18, radius: 2.5, gap: 3.5 },
  }[size];

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={computedTitle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${sizeConfig.gap}px`,
        padding: '1px 3px',
        verticalAlign: 'middle',
        cursor: onClick ? 'pointer' : 'default',
        opacity: hasDifficulty ? 1 : 0.65,
        userSelect: 'none',
        transform: onClick && isHovered ? 'scale(1.05)' : undefined,
        transition: 'transform 0.15s ease, opacity 0.15s ease',
        ...style,
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const isActive = hasDifficulty && i < effectiveLevel;

        let background = 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)';
        let border = '1px solid #cbd5e1';
        let shadow = 'inset 0 1px 1px rgba(0, 0, 0, 0.04)';

        if (isActive && config) {
          background = config.gradient;
          border = `1px solid ${config.border}`;
          shadow = config.shadow;
        } else if (!hasDifficulty) {
          background = '#f1f5f9';
          border = '1px solid #e2e8f0';
          shadow = 'none';
        }

        return (
          <span
            key={i}
            style={{
              width: `${sizeConfig.width}px`,
              height: `${sizeConfig.height}px`,
              borderRadius: `${sizeConfig.radius}px`,
              transform: 'skewX(-13deg)',
              background,
              border,
              boxShadow: shadow,
              boxSizing: 'border-box',
              display: 'inline-block',
              flexShrink: 0,
              transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
};
