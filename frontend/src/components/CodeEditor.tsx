import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  disabled?: boolean;
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'java',
  disabled = false,
  height = '100%',
}) => {
  const langLower = language?.toLowerCase().trim() || 'java';
  let normalizedLanguage = 'java';
  if (langLower === 'python' || langLower === 'py') {
    normalizedLanguage = 'python';
  } else if (langLower === 'markdown' || langLower === 'md') {
    normalizedLanguage = 'markdown';
  } else if (langLower === 'json') {
    normalizedLanguage = 'json';
  } else if (langLower === 'yaml' || langLower === 'yml') {
    normalizedLanguage = 'yaml';
  }

  return (
    <div
      data-language={normalizedLanguage}
      style={{
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid #334155',
        backgroundColor: '#1e1e1e',
        height: height,
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      <Editor
        height={height}
        language={normalizedLanguage}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange(val ?? '')}
        loading={
          <div
            style={{
              height: '100%',
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1e1e1e',
              color: '#94a3b8',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.875rem',
            }}
          >
            Cargando editor ({normalizedLanguage.toUpperCase()})...
          </div>
        }
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          padding: { top: 12, bottom: 12 },
          lineNumbersMinChars: 3,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
};
