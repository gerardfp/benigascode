import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface SortableHeaderProps<T extends string> {
  label: string;
  sortKey: T;
  currentSortKey: T;
  currentSortDir: 'asc' | 'desc';
  onSort: (key: T) => void;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
  className?: string;
}

export function SortableHeader<T extends string>({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  align = 'left',
  style,
  className,
}: SortableHeaderProps<T>) {
  const isActive = currentSortKey === sortKey;
  const justifyContent =
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        ...style,
      }}
      className={className}
      title={`Ordenar por ${label}`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          justifyContent,
          color: isActive ? '#0f172a' : 'inherit',
          transition: 'color 0.15s ease',
        }}
      >
        <span>{label}</span>
        {isActive ? (
          currentSortDir === 'asc' ? (
            <ArrowUp size={14} color="#2563eb" style={{ flexShrink: 0 }} />
          ) : (
            <ArrowDown size={14} color="#2563eb" style={{ flexShrink: 0 }} />
          )
        ) : (
          <ArrowUpDown size={13} color="#94a3b8" style={{ flexShrink: 0, opacity: 0.6 }} />
        )}
      </div>
    </th>
  );
}

