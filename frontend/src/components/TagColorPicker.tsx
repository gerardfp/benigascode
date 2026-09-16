import React, { useMemo, useState } from 'react';
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
}

export const TagColorPicker: React.FC<TagColorPickerProps> = ({
  selectedColor,
  onChange,
  category = '',
  value = '',
  usedColors = []
}) => {
  const [showFullPalette, setShowFullPalette] = useState(false);

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
    <div style={{ margin: '0.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
          Color de la etiqueta
        </label>
        <button
          type="button"
          onClick={() => setShowFullPalette(!showFullPalette)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '0.6875rem',
            color: '#2563eb',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Palette size={12} />
          {showFullPalette ? 'Menos colores' : 'Paleta completa (128)'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* 8 Círculos de Colores No Utilizados */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
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
        </div>

        {/* Botón ✨ Automático */}
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: isAuto ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: isAuto ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
            backgroundColor: isAuto ? '#eff6ff' : '#ffffff',
            color: isAuto ? '#1d4ed8' : '#475569',
            boxShadow: isAuto ? '0 1px 2px rgba(37,99,235,0.1)' : 'none',
          }}
          title={`Color automático calculado a partir de la etiqueta: ${autoColor}`}
        >
          <Sparkles size={13} style={{ color: isAuto ? '#2563eb' : '#64748b' }} />
          <span>✨ Automático</span>
          {/* Muestra previa del color automático calculado */}
          <span
            style={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '50%',
              backgroundColor: autoColor,
              border: '1px solid rgba(0,0,0,0.15)',
              marginLeft: '0.125rem',
            }}
            title={`Tono resultante: ${autoColor}`}
          />
        </button>
      </div>

      {/* Paleta completa de 128 colores (desplegable opcional) */}
      {showFullPalette && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.625rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.375rem' }}>
            Selecciona cualquiera de los 128 colores de la paleta:
          </div>
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
                  onClick={() => onChange(color)}
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

