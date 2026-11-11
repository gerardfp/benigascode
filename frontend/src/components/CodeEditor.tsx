import React from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/internal/common/workers.js';
import 'monaco-editor/features/find/register.js';
import 'monaco-editor/languages/definitions/java/register.js';
import 'monaco-editor/languages/definitions/python/register.js';
import 'monaco-editor/languages/definitions/markdown/register.js';
import 'monaco-editor/languages/definitions/yaml/register.js';
import 'monaco-editor/languages/definitions/sql/register.js';
import 'monaco-editor/languages/definitions/shell/register.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/definitions/typescript/register.js';
import 'monaco-editor/languages/definitions/cpp/register.js';
import 'monaco-editor/languages/definitions/csharp/register.js';
import 'monaco-editor/languages/definitions/html/register.js';
import 'monaco-editor/languages/definitions/css/register.js';
import 'monaco-editor/languages/definitions/xml/register.js';
import 'monaco-editor/languages/features/json/register.js';

self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/languages/features/json/json.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    return new Worker(
      new URL('monaco-editor/editor/editor.worker.js', import.meta.url),
      { type: 'module' }
    );
  },
};

loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  disabled?: boolean;
  height?: string;
  onMount?: OnMount;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'java',
  disabled = false,
  height = '100%',
  onMount,
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
        onMount={onMount}
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
