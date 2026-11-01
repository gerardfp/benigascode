import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import hljs from 'highlight.js';
import { X, Check, Edit3 } from 'lucide-react';
import {
  simulateJavaCode,
  escapeHtml,
  TimelineStep,
  SimulationResult
} from '../utils/javaStepperSimulator';
import './debugStepper.css';

export interface PublicTestCase {
  id?: string;
  input: string;
  expectedOutput?: string;
}

interface DebugStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode: string;
  publicTests: PublicTestCase[];
  initialTestIndex?: number;
  onApplyCode?: (newCode: string) => void;
}

function highlightJavaFragment(text: string): string {
  if (!text) return '';
  try {
    return hljs.highlight(text, { language: 'java', ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(text);
  }
}

function renderCodeLineHtml(
  lineText: string,
  lineNum1Based: number,
  step: TimelineStep | undefined
): string {
  if (!lineText) return '&nbsp;';
  const isActiveLine = Boolean(step && step.lines.includes(lineNum1Based));

  if (isActiveLine && step) {
    let range = step.hlRange ?? null;
    // Validate range against current lineText
    if (
      range &&
      (range.start < 0 || range.end <= range.start || range.end > lineText.length)
    ) {
      range = null;
    }
    if (!range && step.hl && step.hl.trim().length > 0) {
      const idx = lineText.indexOf(step.hl);
      if (idx !== -1) {
        range = { start: idx, end: idx + step.hl.length };
      } else {
        const trimmedHl = step.hl.trim();
        const idxTrimmed = lineText.indexOf(trimmedHl);
        if (idxTrimmed !== -1) {
          range = { start: idxTrimmed, end: idxTrimmed + trimmedHl.length };
        }
      }
    }

    if (range) {
      const before = lineText.substring(0, range.start);
      const target = lineText.substring(range.start, range.end);
      const after = lineText.substring(range.end);
      const partClass = step.part ? `part-${step.part}` : 'part-body';
      return (
        highlightJavaFragment(before) +
        `<span class="hl-token ${partClass}">${escapeHtml(target)}</span>` +
        highlightJavaFragment(after)
      );
    }
  }

  return highlightJavaFragment(lineText);
}

export const DebugStepperModal: React.FC<DebugStepperModalProps> = ({
  isOpen,
  onClose,
  initialCode,
  publicTests,
  initialTestIndex = 0,
  onApplyCode
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pointerDownTargetRef = useRef<EventTarget | null>(null);
  const codePanelRef = useRef<HTMLDivElement | null>(null);

  const [selectedTestIdx, setSelectedTestIdx] = useState<number>(initialTestIndex);
  const [codeText, setCodeText] = useState<string>(initialCode);
  const [inputText, setInputText] = useState<string>('');
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [isEditingInput, setIsEditingInput] = useState<boolean>(false);
  const [needsReset, setNeedsReset] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // Sync modal open/close with native <dialog> showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Initialize state when opened
  useEffect(() => {
    if (!isOpen) return;
    const validIdx =
      publicTests.length > 0
        ? Math.max(0, Math.min(initialTestIndex, publicTests.length - 1))
        : 0;
    const startInput = publicTests[validIdx]?.input ?? '';
    setSelectedTestIdx(validIdx);
    setCodeText(initialCode);
    setInputText(startInput);
    setStepIdx(0);
    setIsEditingCode(false);
    setIsEditingInput(false);
    setNeedsReset(false);
    setAppliedFeedback(false);
  }, [isOpen, initialCode, initialTestIndex, publicTests]);

  const [simSource, setSimSource] = useState<{ code: string; input: string }>({
    code: initialCode,
    input: publicTests[initialTestIndex]?.input ?? ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const validIdx =
      publicTests.length > 0
        ? Math.max(0, Math.min(initialTestIndex, publicTests.length - 1))
        : 0;
    setSimSource({
      code: initialCode,
      input: publicTests[validIdx]?.input ?? ''
    });
  }, [isOpen, initialCode, initialTestIndex, publicTests]);

  const simulation: SimulationResult = useMemo(() => {
    return simulateJavaCode(simSource.code, simSource.input);
  }, [simSource.code, simSource.input]);

  const timeline = simulation.timeline;
  const maxStep = Math.max(0, timeline.length - 1);
  const safeStepIdx = Math.min(stepIdx, maxStep);
  const currentStep: TimelineStep | undefined = timeline[safeStepIdx];

  const runSimulation = useCallback(
    (nextCode: string, nextInput: string) => {
      setSimSource({ code: nextCode, input: nextInput });
      setStepIdx(0);
      setIsEditingCode(false);
      setIsEditingInput(false);
      setNeedsReset(false);
    },
    []
  );

  const handleSelectTest = (idx: number) => {
    const nextInput = publicTests[idx]?.input ?? '';
    setSelectedTestIdx(idx);
    setInputText(nextInput);
    runSimulation(codeText, nextInput);
  };

  const handleResetOrReload = () => {
    runSimulation(codeText, inputText);
  };

  const handlePrev = useCallback(() => {
    setStepIdx((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setStepIdx((prev) => Math.min(maxStep, prev + 1));
  }, [maxStep]);

  // Auto-scroll active line into view when step changes
  useEffect(() => {
    if (!isOpen || isEditingCode || !currentStep || currentStep.lines.length === 0) return;
    const panel = codePanelRef.current;
    if (!panel) return;
    const firstActiveLine = currentStep.lines[0];
    const rowEl = panel.querySelector(
      `.code-line-row[data-line="${firstActiveLine}"]`
    ) as HTMLElement | null;
    if (rowEl) {
      const panelRect = panel.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      const offsetTop = rowRect.top - panelRect.top + panel.scrollTop;
      const targetScroll = offsetTop - panel.clientHeight / 2 + rowRect.height / 2;
      panel.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [isOpen, isEditingCode, safeStepIdx, currentStep]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    const target = e.target as HTMLElement;
    const isInputTarget =
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'INPUT' ||
      target.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleResetOrReload();
      return;
    }

    if (isInputTarget && target.getAttribute('type') !== 'range') {
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setStepIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setStepIdx(maxStep);
    }
  };

  // Outside click light-dismiss fallback (modern-web-guidance dialog pattern)
  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    pointerDownTargetRef.current = e.target;
  };

  const handleDialogPointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (
      e.target === dialogRef.current &&
      pointerDownTargetRef.current === dialogRef.current
    ) {
      dialogRef.current.close();
    }
    pointerDownTargetRef.current = null;
  };

  const handleApplyToEditor = () => {
    if (onApplyCode) {
      onApplyCode(codeText);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 1800);
    }
  };

  const hasCodeChangedFromEditor = codeText !== initialCode;
  const activeLines = currentStep?.lines ?? [];
  const isMultiLineStep = activeLines.length > 1;

  return (
    <dialog
      ref={dialogRef}
      className="stepper-dialog"
      closedby="any"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
    >
      <div className="stepper-v2">
        {/* Top Controls Bar */}
        <div className="stepper-controls">
          <div className="stepper-btn-group">
            <button
              type="button"
              className={`btn-reset ${needsReset ? 'needs-reset' : ''}`}
              onClick={handleResetOrReload}
              title="Reiniciar / Recargar simulación (Ctrl+Enter)"
            >
              ↺
            </button>
            <button
              type="button"
              className="btn-prev"
              onClick={handlePrev}
              disabled={safeStepIdx <= 0}
              title="Paso anterior (←)"
            >
              ◀
            </button>
            <button
              type="button"
              className="btn-next"
              onClick={handleNext}
              disabled={safeStepIdx >= maxStep}
              title="Paso siguiente (→)"
            >
              ▶
            </button>
          </div>

          <input
            type="range"
            className="stepper-slider"
            min={0}
            max={maxStep}
            value={safeStepIdx}
            onChange={(e) => setStepIdx(parseInt(e.target.value, 10))}
          />

          <span className="step-counter">
            Paso {safeStepIdx} / {maxStep}
          </span>

          {publicTests.length > 0 && (
            <div className="stepper-test-pills">
              {publicTests.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn-test-pill ${selectedTestIdx === idx ? 'active' : ''}`}
                  onClick={() => handleSelectTest(idx)}
                >
                  Test #{idx + 1}
                </button>
              ))}
            </div>
          )}

          <div className="stepper-btn-group" style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => {
                if (isEditingCode) {
                  handleResetOrReload();
                } else {
                  setIsEditingCode(true);
                }
              }}
              title={isEditingCode ? 'Aplicar y simular (Ctrl+Enter)' : 'Editar código en el depurador'}
            >
              <Edit3 size={14} />
              {isEditingCode ? 'Simular' : 'Editar'}
            </button>

            {onApplyCode && hasCodeChangedFromEditor && (
              <button
                type="button"
                className="btn-apply-code"
                onClick={handleApplyToEditor}
              >
                <Check size={14} />
                {appliedFeedback ? 'Copiado' : 'Usar en editor'}
              </button>
            )}

            <button
              type="button"
              className="btn-close-modal"
              onClick={() => dialogRef.current?.close()}
              title="Cerrar (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Main Body: Code Panel (left) + State & Consoles (right) */}
        <div className="stepper-body">
          {/* Code Panel */}
          <div className="stepper-code-panel" ref={codePanelRef}>
            {isEditingCode ? (
              <textarea
                value={codeText}
                onChange={(e) => {
                  setCodeText(e.target.value);
                  setNeedsReset(true);
                }}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  color: '#f1f5f9',
                  fontFamily: 'var(--step-font-mono)',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  padding: '12px 16px',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  tabSize: 4
                }}
              />
            ) : (
              <>
                <div className="code-gutter" aria-hidden="true">
                  {simulation.normalizedLines.map((_, i) => {
                    const lineNum = i + 1;
                    const isLineActive = activeLines.includes(lineNum);
                    const cls = isLineActive
                      ? isMultiLineStep
                        ? 'code-line-num active-sub'
                        : 'code-line-num active'
                      : 'code-line-num';
                    return (
                      <div key={lineNum} className={cls}>
                        {lineNum}
                      </div>
                    );
                  })}
                </div>
                <pre className="code-pre">
                  <code className="language-java">
                    {simulation.normalizedLines.map((lineText, i) => {
                      const lineNum = i + 1;
                      const isLineActive = activeLines.includes(lineNum);
                      const rowCls = isLineActive
                        ? isMultiLineStep
                          ? 'code-line-row active-sub'
                          : 'code-line-row active'
                        : 'code-line-row';
                      const lineHtml = renderCodeLineHtml(lineText, lineNum, currentStep);
                      return (
                        <div key={lineNum} className={rowCls} data-line={lineNum}>
                          <span
                            className="code-line-content"
                            dangerouslySetInnerHTML={{ __html: lineHtml }}
                          />
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </>
            )}
          </div>

          {/* Right Panel: Variables + Consola (Entrada) + Consola (Salida) */}
          <div className="stepper-info-panel">
            {/* Variables */}
            <div className="stepper-mem">
              <div className="stepper-mem-header">Variables</div>
              <div className="stepper-mem-list">
                {!currentStep || currentStep.memEntries.length === 0 ? (
                  <div className="stepper-mem-empty">(sin variables)</div>
                ) : (
                  currentStep.memEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className={`mem-item ${entry.changed ? 'changed' : ''}`}
                    >
                      <span className="mem-name">{entry.key}</span>
                      <span className="mem-val">{entry.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Consola (Entrada) */}
            <div
              className="stepper-console stepper-console-in"
              onClick={() => {
                if (!isEditingInput) setIsEditingInput(true);
              }}
            >
              <div className="stepper-console-header">
                <span className="stepper-console-header-title">Consola (Entrada)</span>
                {isEditingInput && (
                  <button
                    type="button"
                    style={{ padding: '0.15em 0.5em', fontSize: '0.72rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetOrReload();
                    }}
                  >
                    Aplicar
                  </button>
                )}
              </div>
              {isEditingInput ? (
                <textarea
                  autoFocus
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setNeedsReset(true);
                  }}
                  onBlur={() => handleResetOrReload()}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    flex: 1,
                    background: 'transparent',
                    color: '#f8fafc',
                    fontFamily: 'var(--step-font-mono)',
                    fontSize: '0.88rem',
                    lineHeight: 1.45,
                    border: 'none',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              ) : currentStep && currentStep.inHtml ? (
                <div
                  className="stepper-console-content"
                  dangerouslySetInnerHTML={{ __html: currentStep.inHtml }}
                />
              ) : (
                <div className="stepper-console-empty">(sin datos de entrada)</div>
              )}
            </div>

            {/* Consola (Salida) */}
            <div className="stepper-console stepper-console-out">
              <div className="stepper-console-header">
                <span className="stepper-console-header-title">Consola (Salida)</span>
              </div>
              {currentStep && currentStep.outHtml ? (
                <div
                  className="stepper-console-content"
                  dangerouslySetInnerHTML={{ __html: currentStep.outHtml }}
                />
              ) : (
                <div className="stepper-console-empty">(sin salida por pantalla)</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Explanation & Phase Badge Bar */}
        <div
          className={`stepper-explanation ${currentStep?.isError ? 'is-error' : ''}`}
        >
          <div className="stepper-explanation-content">
            {simulation.error ? (
              <>
                <span className="stepper-phase-badge part-error">ERROR</span>
                <span>{simulation.error}</span>
              </>
            ) : currentStep ? (
              <>
                {currentStep.partName && (
                  <span
                    className={`stepper-phase-badge part-${currentStep.part || 'body'}`}
                  >
                    {currentStep.partName}
                  </span>
                )}
                <span
                  dangerouslySetInnerHTML={{ __html: currentStep.explanation }}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
};
