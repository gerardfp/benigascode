import React from 'react';
import { Clock, X } from 'lucide-react';
import { getTagBadgeStyles, getDeterministicTagColor } from '../utils/tagColors';

export interface TagBadgeProps {
  category?: string;
  value: string;
  color?: string | null;
  validUntil?: string | null;
  title?: string;
  onRemove?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  category,
  value,
  color,
  validUntil,
  title,
  onRemove,
  style,
  className
}) => {
  const effectiveColor = color || getDeterministicTagColor(category, value);
  const styles = getTagBadgeStyles(effectiveColor);

  const defaultTitle = validUntil
    ? `Válida hasta: ${new Date(validUntil).toLocaleDateString()}`
    : 'Vigencia activa indefinida';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3125rem',
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        borderRadius: '9999px',
        padding: '0.125rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.25,
        userSelect: 'none',
        ...style
      }}
      title={title || defaultTitle}
    >
      {/* Indicador de Color (Dot) */}
      <span
        style={{
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '50%',
          backgroundColor: styles.dot,
          flexShrink: 0,
        }}
      />

      {category && (
        <span style={{ opacity: 0.7, marginRight: '0.1rem' }}>
          {category}:
        </span>
      )}

      <strong>{value || 'Sin valor'}</strong>

      {validUntil && (
        <Clock size={11} style={{ marginLeft: '0.125rem', opacity: 0.65 }} />
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            padding: '0 0.125rem',
            marginLeft: '0.25rem',
            color: '#64748b',
            cursor: 'pointer',
            borderRadius: '9999px',
          }}
          title="Eliminar etiqueta"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

