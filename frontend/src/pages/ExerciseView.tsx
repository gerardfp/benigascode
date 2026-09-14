import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { renderMarkdown } from '../utils/markdown';
import { api } from '../services/api';
import { Exercise, PublicTest, PreviewRunResult, Submission, Evaluation } from '../types';
import { CodeEditor } from '../components/CodeEditor';

export const ExerciseView: React.FC = () => {
  const { activityId, collectionId, exerciseId } = useParams<{
    activityId?: string;
    collectionId?: string;
    exerciseId: string;
  }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [publicTests, setPublicTests] = useState<PublicTest[]>([]);
  const [code, setCode] = useState<string>('');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [previewResult, setPreviewResult] = useState<PreviewRunResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submissionsHistory, setSubmissionsHistory] = useState<Submission[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Responsive layout & resizable splitter state
  const [leftPanelRatio, setLeftPanelRatio] = useState<number>(() => {
    const saved = localStorage.getItem('benigascode_exercise_split_ratio');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 25 && val <= 75) return val;
    }
    return 44; // Default 44% left, 56% right
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Detectar cambios en tamaño de ventana para modo responsive
  useEffect(() => {
    const handleWindowResize = () => {
      setIsSmallScreen(window.innerWidth < 992);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Control del arrastre horizontal de la línea divisoria (Splitter)
  useEffect(() => {
    if (!isDraggingSplitter) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawRatio = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedRatio = Math.min(75, Math.max(25, rawRatio));
      setLeftPanelRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      setLeftPanelRatio((currentRatio) => {
        try {
          localStorage.setItem('benigascode_exercise_split_ratio', currentRatio.toFixed(1));
        } catch {
          // Ignore localStorage errors
        }
        return currentRatio;
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!splitContainerRef.current || e.touches.length === 0) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawRatio = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      const clampedRatio = Math.min(75, Math.max(25, rawRatio));
      setLeftPanelRatio(clampedRatio);
    };

    const handleTouchEnd = () => {
      setIsDraggingSplitter(false);
      setLeftPanelRatio((currentRatio) => {
        try {
          localStorage.setItem('benigascode_exercise_split_ratio', currentRatio.toFixed(1));
        } catch {
          // Ignore localStorage errors
        }
        return currentRatio;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingSplitter]);

  // Cargar ejercicio, workspace del alumno e historial previo
  useEffect(() => {
    if (!exerciseId) return;

    // 1. Obtener detalles del ejercicio
    api.getExercise(exerciseId, collectionId)
      .then((ex) => {
        setExercise(ex);

        // 2. Obtener borrador guardado del alumno (workspace)
        api.getWorkspace(exerciseId)
          .then((ws) => {
            if (ws && ws.sourceCode) {
              setCode(ws.sourceCode);
              setLastSaved(ws.updatedAt);
            } else if (ex.starterCode) {
              setCode(ex.starterCode);
            }
          })
          .catch(() => {
            if (ex.starterCode) {
              setCode(ex.starterCode);
            }
          });
      })
      .catch((err) => setErrorMsg(err.message));

    // 3. Obtener tests públicos
    api.getPublicTests(exerciseId)
      .then(setPublicTests)
      .catch(console.error);

    // 4. Cargar entregas previas para restaurar el estado más reciente
    api.getExerciseSubmissions(exerciseId)
      .then(async (subs) => {
        setSubmissionsHistory(subs);
        if (subs && subs.length > 0) {
          const latest = subs[0];
          setSubmission(latest);
          try {
            const evals = await api.getEvaluations(latest.id);
            if (evals && evals.length > 0) {
              setEvaluation(evals[0]);
            }
          } catch (e) {
            console.debug('Error recuperando evaluación previa', e);
          }
        }
      })
      .catch(console.error);
  }, [exerciseId, collectionId]);

  // Guardar borrador en el workspace
  const handleSaveWorkspace = useCallback(async () => {
    if (!exerciseId || !code) return;
    setSaveStatus('saving');
    try {
      const ws = await api.saveWorkspace(exerciseId, code);
      setSaveStatus('saved');
      setLastSaved(ws.updatedAt);
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    }
  }, [exerciseId, code]);

  // Restablecer plantilla
  const handleResetTemplate = () => {
    if (exercise && exercise.starterCode !== undefined && exercise.starterCode !== null) {
      if (window.confirm('¿Deseas restablecer el código a la plantilla inicial? Se descartarán las modificaciones actuales.')) {
        setCode(exercise.starterCode);
        api.saveWorkspace(exerciseId!, exercise.starterCode).catch(console.error);
        setLastSaved(new Date().toISOString());
      }
    }
  };

  // Renderizado del enunciado Markdown
  const renderedStatementHtml = useMemo(() => {
    if (!exercise?.statement) return '';

    let statementText = exercise.statement;
    if (statementText.startsWith('# ')) {
      const firstLineEnd = statementText.indexOf('\n');
      const firstLine = firstLineEnd !== -1 ? statementText.slice(2, firstLineEnd).trim() : statementText.slice(2).trim();
      if (firstLine.toLowerCase() === (exercise.title || '').trim().toLowerCase()) {
        statementText = firstLineEnd !== -1 ? statementText.slice(firstLineEnd + 1).trim() : '';
      }
    }

    return renderMarkdown(statementText, exercise.id);
  }, [exercise?.statement, exercise?.id, exercise?.title]);

  const renderExplanationHtml = useCallback((explanationText: string) => {
    return renderMarkdown(explanationText, exercise?.id);
  }, [exercise?.id]);

  const getTestDisplayName = useCallback((testId: string, testName?: string, index?: number): string => {
    // 1. Si viene un nombre legible explícito que no sea un ID técnico
    if (testName && !testName.startsWith('pub-') && !testName.startsWith('priv-')) {
      return testName;
    }
    // 2. Buscar en los tests públicos cargados por ID exacto
    const matchById = publicTests.find(p => p.id === testId);
    if (matchById && matchById.name && !matchById.name.startsWith('pub-')) {
      return matchById.name;
    }
    // 3. Si tiene formato "pub-XX", extraer el número (0-indexado) y formatear a "Test Público #N"
    if (testId && testId.startsWith('pub-')) {
      const parsedNum = parseInt(testId.replace('pub-', ''), 10);
      if (!isNaN(parsedNum)) {
        if (publicTests[parsedNum] && publicTests[parsedNum].name && !publicTests[parsedNum].name.startsWith('pub-')) {
          return publicTests[parsedNum].name;
        }
        return `Test Público #${parsedNum + 1}`;
      }
    }
    // 4. Si se conoce el índice en la lista
    if (index !== undefined) {
      if (publicTests[index] && publicTests[index].name && !publicTests[index].name.startsWith('pub-')) {
        return publicTests[index].name;
      }
      return `Test Público #${index + 1}`;
    }
    return testName || testId;
  }, [publicTests]);

  // Ejecución real de pruebas preliminares públicas (Java 26 sandbox)
  const handlePreviewRun = async () => {
    if (!exerciseId) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    setErrorMsg(null);

    try {
      const res = await api.previewRun(exerciseId, code, 'java');
      setPreviewResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ejecutar pruebas públicas');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Sondeo de la cola hasta que el worker daemon finalice la evaluación
  const pollEvaluation = async (submissionId: string) => {
    const maxAttempts = 25;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const evals = await api.getEvaluations(submissionId);
        if (evals && evals.length > 0) {
          setEvaluation(evals[0]);
          setSubmitLoading(false);
          // Actualizar lista histórica
          if (exerciseId) {
            api.getExerciseSubmissions(exerciseId).then(setSubmissionsHistory).catch(console.error);
          }
          return;
        }
      } catch {
        // Seguir sondeando
      }
    }
    setSubmitLoading(false);
  };

  // Entrega oficial (consume intento si es actividad de curso)
  const handleSubmit = async () => {
    if (!exerciseId) return;
    const isActivity = Boolean(activityId && activityId !== 'practice');
    const confirmMsg = isActivity
      ? '¿Estás seguro de realizar la entrega oficial? Esto consumirá un intento formal de la actividad.'
      : '¿Deseas enviar tu solución para evaluación oficial en Java 26?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    setEvaluation(null);

    // Auto-guardar borrador
    api.saveWorkspace(exerciseId, code).catch(console.error);

    try {
      const sub = isActivity
        ? await api.submitSolution(activityId!, exerciseId, code, 'java')
        : await api.submitPracticeSolution(exerciseId, code, 'java', { collectionId });

      setSubmission(sub);
      pollEvaluation(sub.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar la solución');
      setSubmitLoading(false);
    }
  };

  // Seleccionar una entrega anterior del historial para inspeccionar su evaluación
  const handleSelectHistorySubmission = async (histSub: Submission) => {
    setSubmission(histSub);
    try {
      const evals = await api.getEvaluations(histSub.id);
      if (evals && evals.length > 0) {
        setEvaluation(evals[0]);
      } else {
        setEvaluation(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!exercise) {
    return (
      <div className="app-container">
        {errorMsg ? <div className="card" style={{ color: '#b91c1c' }}>{errorMsg}</div> : <p>Cargando ejercicio...</p>}
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        maxWidth: 1400,
        height: isSmallScreen ? 'auto' : 'calc(100vh - 65px)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingTop: '0.75rem',
        paddingBottom: isSmallScreen ? '2rem' : '0.5rem',
      }}
    >
      {/* Barra superior de navegación */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        {collectionId ? (
          <Link to={`/collections/${collectionId}`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver a la Colección
          </Link>
        ) : (
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Dashboard
          </Link>
        )}

        {submissionsHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.3rem 0.6rem' }}
          >
            📋 Historial de Entregas ({submissionsHistory.length})
          </button>
        )}
      </div>

      {/* Historial desplegable de entregas */}
      {showHistory && submissionsHistory.length > 0 && (
        <div className="card" style={{ marginBottom: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', flexShrink: 0 }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600 }}>Tus entregas anteriores en este ejercicio</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
            {submissionsHistory.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectHistorySubmission(s)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: submission?.id === s.id ? '#e0e7ff' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>Intento #{s.attemptNumber || 1}</span>
                  <span style={{ color: '#64748b', marginLeft: '0.75rem' }}>{new Date(s.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${s.status === 'FINISHED' ? 'badge-neutral' : 'badge-warning'}`}>{s.status}</span>
                  {submission?.id === s.id && <span style={{ color: '#4338ca', fontWeight: 600 }}>● Seleccionada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={splitContainerRef}
        style={{
          display: 'flex',
          flexDirection: isSmallScreen ? 'column' : 'row',
          gap: isSmallScreen ? '1.5rem' : 0,
          alignItems: 'stretch',
          userSelect: isDraggingSplitter ? 'none' : 'auto',
          flex: isSmallScreen ? 'none' : 1,
          minHeight: 0,
          height: isSmallScreen ? 'auto' : '100%',
          overflow: isSmallScreen ? 'visible' : 'hidden',
        }}
      >
        {/* Panel Izquierdo: Enunciado y Casos Públicos */}
        <div
          style={{
            width: isSmallScreen ? '100%' : `calc(${leftPanelRatio}% - 6px)`,
            minWidth: isSmallScreen ? undefined : '260px',
            maxWidth: isSmallScreen ? undefined : '75%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box',
            height: isSmallScreen ? 'auto' : '100%',
            overflowY: isSmallScreen ? 'visible' : 'auto',
            paddingRight: isSmallScreen ? 0 : '6px',
            scrollbarWidth: 'thin',
          }}
        >
          <div className="card">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{exercise.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">{exercise.language.toUpperCase()}</span>
              <span className="badge badge-neutral" title="Runtime de ejecución real de la plataforma">
                ⚡ Runtime: Java 26
              </span>
              <span className="badge badge-neutral">Versión {exercise.versionNumber}</span>
              {(!activityId || activityId === 'practice') ? (
                <span className="badge badge-success">Práctica Libre</span>
              ) : (
                <span className="badge badge-warning">Actividad de Curso</span>
              )}
            </div>

            <div
              className="markdown-statement"
              dangerouslySetInnerHTML={{ __html: renderedStatementHtml }}
            />
          </div>

          {/* Tests públicos informativos simplificados sin marcos individuales */}
          {publicTests.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {publicTests.map((t, idx) => (
                  <div key={t.id || idx} style={{ borderTop: idx > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: idx > 0 ? '1.25rem' : 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#14532d', marginBottom: '0.5rem' }}>
                      {getTestDisplayName(t.id, t.name, idx)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>Entrada:</span>
                        <pre style={{ margin: '0.25rem 0 0', padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{t.input || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>Salida esperada:</span>
                        <pre style={{ margin: '0.25rem 0 0', padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{t.expectedOutput || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                      </div>
                    </div>
                    {t.explanation && (
                      <div style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 500, color: '#334155' }}>Explicación: </span>
                        <div
                          className="markdown-statement"
                          style={{ marginTop: '0.25rem' }}
                          dangerouslySetInnerHTML={{ __html: renderExplanationHtml(t.explanation) }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Espacio entre bloques que actúa como manejador de redimensionado (estilo VS Code, sin línea extra) */}
        {!isSmallScreen && (
          <div
            onMouseDown={() => setIsDraggingSplitter(true)}
            onTouchStart={() => setIsDraggingSplitter(true)}
            style={{
              width: '12px',
              cursor: 'col-resize',
              flexShrink: 0,
              userSelect: 'none',
              background: 'transparent',
              zIndex: 10,
            }}
            title="Arrastra para redimensionar paneles"
          />
        )}

        {/* Panel Derecho: Editor y Resultados */}
        <div
          style={{
            width: isSmallScreen ? '100%' : `calc(${100 - leftPanelRatio}% - 6px)`,
            flex: isSmallScreen ? undefined : 1,
            minWidth: isSmallScreen ? undefined : '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box',
            height: isSmallScreen ? 'auto' : '100%',
            overflowY: isSmallScreen ? 'visible' : 'auto',
            paddingRight: isSmallScreen ? 0 : '6px',
            scrollbarWidth: 'thin',
          }}
        >
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#f1f5f9',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0'
                }}>
                  ☕ Main.java
                </span>
                {saveStatus === 'saving' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💾 Guardando borrador...</span>}
                {saveStatus === 'saved' && <span style={{ fontSize: '0.75rem', color: '#15803d' }}>✓ Guardado</span>}
                {lastSaved && saveStatus === 'idle' && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }} title={new Date(lastSaved).toLocaleString()}>
                    Borrador: {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleSaveWorkspace}
                  disabled={submitLoading || saveStatus === 'saving'}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  title="Guardar borrador de trabajo"
                >
                  💾 Guardar
                </button>
                {exercise.starterCode !== undefined && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    disabled={submitLoading}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#64748b' }}
                    title="Restablecer código a la plantilla inicial"
                  >
                    ↺ Plantilla
                  </button>
                )}
              </div>
            </div>

            <CodeEditor value={code} onChange={setCode} language="java" disabled={submitLoading} />

            {/* Barra de botones de ejecución */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.875rem' }}>
              <button
                onClick={handlePreviewRun}
                disabled={previewLoading || submitLoading}
                className="btn-secondary"
                style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {previewLoading ? '⏳ Probando en Java 26...' : '▶ Probar Tests Públicos'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={previewLoading || submitLoading}
                className="btn-primary"
                style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {submitLoading ? '⏳ Evaluando entrega...' : '✓ Entregar Solución Oficial'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="card" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Resultado de pruebas preliminares públicas */}
          {previewResult && (
            <div className="card" style={{ borderLeft: previewResult.compileSuccess ? '4px solid #16a34a' : '4px solid #dc2626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Resultado de Pruebas Públicas (Java 26)</h4>
                <span className={`badge ${previewResult.compileSuccess ? 'badge-success' : 'badge-danger'}`}>
                  {previewResult.compileSuccess ? 'Compilación OK' : 'Error de Compilación'}
                </span>
              </div>

              {previewResult.compileSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {previewResult.testResults.map((tr, idx) => (
                    <div
                      key={tr.testId || idx}
                      style={{
                        padding: '0.625rem 0.875rem',
                        background: tr.passed ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${tr.passed ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                        <span>{getTestDisplayName(tr.testId, tr.testName, idx)} — {tr.status} ({tr.durationMs}ms)</span>
                        <span style={{ color: tr.passed ? '#15803d' : '#b91c1c' }}>
                          {tr.passed ? '✓ Superado' : '✗ Fallido'}
                        </span>
                      </div>
                      {!tr.passed && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Esperado:</span>
                            <pre style={{ margin: '0.15rem 0 0', padding: '0.35rem', background: '#f1f5f9', borderRadius: '0.375rem', whiteSpace: 'pre-wrap' }}>{tr.expectedOutput || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Tu salida:</span>
                            <pre style={{ margin: '0.15rem 0 0', padding: '0.35rem', background: '#fee2e2', borderRadius: '0.375rem', whiteSpace: 'pre-wrap' }}>{tr.stdout || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>
                  <pre style={{ background: '#f8fafc', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.5rem', borderRadius: '0.25rem', overflowX: 'auto', margin: 0 }}>
                    {previewResult.compileStderr || previewResult.compileStdout}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Resultado de la evaluación oficial */}
          {submission && (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    Entrega Oficial {submission.attemptNumber ? `(Intento #${submission.attemptNumber})` : ''}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Registrada el {new Date(submission.createdAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-neutral">Java 26 Sandbox</span>
                  <span
                    className={`badge ${
                      evaluation
                        ? evaluation.status === 'CORRECT'
                          ? 'badge-success'
                          : evaluation.status === 'INCORRECT'
                          ? 'badge-warning'
                          : 'badge-danger'
                        : 'badge-info'
                    }`}
                  >
                    {evaluation ? evaluation.status : 'EVALUANDO EN COLA...'}
                  </span>
                </div>
              </div>

              {submitLoading && (
                <div style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#2563eb' }}>
                  <span style={{ fontSize: '1.25rem' }}>⏳</span>
                  <span style={{ fontSize: '0.875rem' }}>
                    El contenedor Java 26 está compilando y ejecutando las pruebas públicas y privadas en el sandbox...
                  </span>
                </div>
              )}

              {evaluation && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  {/* Puntuación y desglose general */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: evaluation.score >= 100 ? '#15803d' : evaluation.score > 0 ? '#d97706' : '#b91c1c' }}>
                        {evaluation.score}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ 100 pts</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: '#475569' }}>
                      <span>Tests superados: <strong>{evaluation.passedTests || 0} / {evaluation.totalTests || 0}</strong></span>
                      <span>•</span>
                      <span>Públicos: <strong>{evaluation.passedPublicTests || 0} / {evaluation.totalPublicTests || 0}</strong></span>
                      <span>•</span>
                      <span>Privados: <strong>{evaluation.passedPrivateTests || 0} / {evaluation.totalPrivateTests || 0}</strong></span>
                    </div>
                  </div>

                  {/* Detalle de error de compilación si aplica */}
                  {evaluation.status === 'COMPILE_ERROR' && evaluation.compileStderr && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.35rem' }}>
                        Detalle del compilador Java 26:
                      </div>
                      <pre style={{ background: '#1e293b', color: '#f87171', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', overflowX: 'auto', margin: 0 }}>
                        {evaluation.compileStderr}
                      </pre>
                    </div>
                  )}

                  {/* Desglose de resultados de tests */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Tests públicos */}
                    {evaluation.testResults
                      .filter((tr) => tr.isPublic)
                      .map((tr, idx) => (
                        <div
                          key={tr.id || idx}
                          style={{
                            padding: '0.625rem 0.875rem',
                            background: tr.status === 'PASSED' ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${tr.status === 'PASSED' ? '#bbf7d0' : '#fecaca'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.8125rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                            <span>{getTestDisplayName(tr.testId, tr.testName, idx)} — {tr.status} ({tr.durationMs}ms)</span>
                            <span style={{ color: tr.status === 'PASSED' ? '#15803d' : '#b91c1c' }}>
                              {tr.score} pts {tr.status === 'PASSED' ? '✓' : '✗'}
                            </span>
                          </div>
                          {tr.status !== 'PASSED' && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Esperado:</span>
                                <pre style={{ margin: '0.15rem 0 0', padding: '0.35rem', background: '#f1f5f9', borderRadius: '0.375rem', whiteSpace: 'pre-wrap' }}>{tr.expectedOutput || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                              </div>
                              <div>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Tu salida:</span>
                                <pre style={{ margin: '0.15rem 0 0', padding: '0.35rem', background: '#fee2e2', borderRadius: '0.375rem', whiteSpace: 'pre-wrap' }}>{(tr.actualOutput || tr.stdout) || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Resumen consolidado y protegido de tests privados */}
                    {(evaluation.totalPrivateTests ?? 0) > 0 && (
                      <div
                        style={{
                          padding: '0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            🛡️ Tests Privados Protegidos
                          </span>
                          <span style={{ color: (evaluation.passedPrivateTests === evaluation.totalPrivateTests) ? '#15803d' : '#475569' }}>
                            {evaluation.passedPrivateTests} de {evaluation.totalPrivateTests} superados
                          </span>
                        </div>
                        <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                          Los casos privados evalúan casos límite y robustez. Sus entradas y salidas esperadas están protegidas para salvaguardar la integridad de la evaluación académica.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
