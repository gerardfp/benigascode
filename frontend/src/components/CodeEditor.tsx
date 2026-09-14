import React, { useRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  disabled?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'java',
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);

      // Reubicar cursor después de la tabulación
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const lines = value.split('\n');

  return (
    <div
      data-language={language}
      style={{
        display: 'flex',
        backgroundColor: '#1e293b',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid #334155',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '0.875rem',
        minHeight: '380px',
      }}
    >
      {/* Columna de números de línea */}
      <div style={{
        padding: '0.75rem 0.5rem',
        backgroundColor: '#0f172a',
        color: '#64748b',
        textAlign: 'right',
        userSelect: 'none',
        minWidth: '2.5rem',
        borderRight: '1px solid #334155',
        lineHeight: '1.5rem',
      }}>
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Área de edición */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        spellCheck={false}
        aria-label={`Editor de código (${language})`}
        style={{
          flex: 1,
          padding: '0.75rem',
          backgroundColor: 'transparent',
          color: '#f8fafc',
          border: 'none',
          outline: 'none',
          resize: 'none',
          lineHeight: '1.5rem',
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          overflowX: 'auto',
          minHeight: '380px',
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      />
    </div>
  );
};

