import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Check, Sparkles, Palette } from 'lucide-react';
import {
  TAG_COLOR_PALETTE,
  getDeterministicTagColor,
  getUnusedPaletteColors
} from '../utils/tagColors';

export interface TagColorPickerProps {
  selectedColor: string | null; // null = automático
  onChange: (color: string | null) => void;
  category?: string;
  value?: string;
  usedColors?: (string | null | undefined)[];
  placement?: 'top' | 'bottom';
}

export const TagColorPicker: React.FC<TagColorPickerProps> = ({
  selectedColor,
  onChange,
  category = '',
  value = '',
  usedColors = [],
  placement = 'top'
}) => {
  const [showFullPalette, setShowFullPalette] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFullPalette) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowFullPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFullPalette]);

  // Colores libres sugeridos (8 colores)
  const suggestedColors = useMemo(() => {
    return getUnusedPaletteColors(usedColors, 8);
  }, [usedColors]);

  // Color que calculará el modo automático en tiempo real
  const autoColor = useMemo(() => {
    return getDeterministicTagColor(category, value);
  }, [category, value]);

  const isAuto = selectedColor === null || selectedColor === '' || selectedColor === 'auto';

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
        {/* Círculos de Colores No Utilizados */}
        {suggestedColors.map((color) => {
          const isSelected = !isAuto && selectedColor?.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              style={{
                width: '1.375rem',
                height: '1.375rem',
                borderRadius: '50%',
                backgroundColor: color,
                border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: isSelected ? `0 0 0 2px #2563eb` : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'transform 0.15s, box-shadow 0.15s',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
              }}
              title={`Color disponible: ${color}`}
            >
              {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </button>
          );
        })}

        {/* Botón Paleta completa (solo icono, entre último color y Automático) */}
        <button
          type="button"
          onClick={() => setShowFullPalette(!showFullPalette)}
          style={{
            width: '1.375rem',
            height: '1.375rem',
            borderRadius: '50%',
            border: showFullPalette ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
            backgroundColor: showFullPalette ? '#eff6ff' : '#ffffff',
            color: showFullPalette ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          title={showFullPalette ? 'Cerrar paleta' : 'Paleta completa (128 colores)'}
        >
          <Palette size={13} />
        </button>

        {/* Botón Automático (solo icono y círculo del tono) */}
        <button
          type="button"
          onClick={() => { onChange(null); setShowFullPalette(false); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0 0.375rem',
            height: '1.375rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: isAuto ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
            backgroundColor: isAuto ? '#eff6ff' : '#ffffff',
            color: isAuto ? '#2563eb' : '#64748b',
            boxShadow: isAuto ? '0 1px 2px rgba(37,99,235,0.1)' : 'none',
          }}
          title={`Automático: ${autoColor}`}
        >
          <Sparkles size={12} style={{ color: isAuto ? '#2563eb' : '#64748b' }} />
          <span
            style={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '50%',
              backgroundColor: autoColor,
              border: '1px solid rgba(0,0,0,0.15)',
            }}
          />
        </button>
      </div>

      {/* Paleta completa de 128 colores (flotante) */}
      {showFullPalette && (
        <div
          style={{
            position: 'absolute',
            ...(placement === 'top'
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            right: 0,
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
            width: 270,
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(16, 1fr)',
              gap: '0.25rem',
            }}
          >
            {TAG_COLOR_PALETTE.map((color) => {
              const isSelected = !isAuto && selectedColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => { onChange(color); setShowFullPalette(false); }}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '0.25rem',
                    backgroundColor: color,
                    border: isSelected ? '2px solid #1e293b' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    padding: 0,
                    outline: isSelected ? '2px solid #2563eb' : 'none',
                  }}
                  title={color}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

