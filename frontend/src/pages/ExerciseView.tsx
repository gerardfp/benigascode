import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
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
  const [code, setCode] = useState<string>(
    'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Escribe tu solución aquí\n    }\n}\n'
  );

  const [previewResult, setPreviewResult] = useState<PreviewRunResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) return;

    api.getExercise(exerciseId, collectionId)
      .then((ex) => {
        setExercise(ex);
        if (ex.starterCode !== undefined && ex.starterCode !== null) {
          setCode(ex.starterCode);
        }
      })
      .catch((err) => setErrorMsg(err.message));

    api.getPublicTests(exerciseId)
      .then(setPublicTests)
      .catch(console.error);
  }, [exerciseId, collectionId]);

  const handleResetTemplate = () => {
    if (exercise && exercise.starterCode !== undefined && exercise.starterCode !== null) {
      if (window.confirm('¿Deseas restablecer el código a la plantilla inicial? Se descartarán las modificaciones actuales.')) {
        setCode(exercise.starterCode);
      }
    }
  };

  const renderedStatementHtml = useMemo(() => {
    if (!exercise?.statement) return '';

    let statementText = exercise.statement;
    // Evitar duplicar el título principal si el markdown empieza con # <mismo título>
    if (statementText.startsWith('# ')) {
      const firstLineEnd = statementText.indexOf('\n');
      const firstLine = firstLineEnd !== -1 ? statementText.slice(2, firstLineEnd).trim() : statementText.slice(2).trim();
      if (firstLine.toLowerCase() === (exercise.title || '').trim().toLowerCase()) {
        statementText = firstLineEnd !== -1 ? statementText.slice(firstLineEnd + 1).trim() : '';
      }
    }

    const markedInstance = new Marked({ gfm: true, breaks: true });
    markedInstance.use({
      walkTokens(token) {
        if (token.type === 'image' && token.href) {
          const href = token.href;
          if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:') && !href.startsWith('/api/')) {
            token.href = `/api/v1/exercises/${exercise.id}/assets/${href.replace(/^\/+/, '')}`;
          }
        }
      }
    });

    let html = markedInstance.parse(statementText, { async: false }) as string;

    // Reescribir también posibles etiquetas <img> HTML raw relativas
    html = html.replace(/<img\s+([^>]*?)src=["'](?!https?:\/\/|data:|\/api\/)([^"']+)["']([^>]*?)>/gi, (_match, before, src, after) => {
      const cleanHref = src.replace(/^\/+/, '');
      return `<img ${before}src="/api/v1/exercises/${exercise.id}/assets/${cleanHref}"${after} loading="lazy">`;
    });

    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['img'],
      ADD_ATTR: ['src', 'alt', 'title', 'class', 'loading']
    });
  }, [exercise?.statement, exercise?.id, exercise?.title]);

  // Ejecución de pruebas preliminares (no consume intentos)
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

  // Entrega oficial
  const handleSubmit = async () => {
    if (!activityId || !exerciseId) return;
    if (!window.confirm('¿Estás seguro de realizar la entrega oficial? Esto consumirá un intento si la actividad está configurada con límite.')) {
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    setSubmission(null);
    setEvaluation(null);

    try {
      const sub = await api.submitSolution(activityId, exerciseId, code, 'java');
      setSubmission(sub);
      pollEvaluation(sub.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar la solución');
      setSubmitLoading(false);
    }
  };

  // Sondeo periódico hasta que la evaluación termine en la cola
  const pollEvaluation = async (submissionId: string) => {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const evals = await api.getEvaluations(submissionId);
        if (evals && evals.length > 0) {
          setEvaluation(evals[0]);
          setSubmitLoading(false);
          return;
        }
      } catch {
        // Seguir esperando
      }
    }
    setSubmitLoading(false);
  };

  if (!exercise) {
    return (
      <div className="app-container">
        {errorMsg ? <div className="card" style={{ color: '#b91c1c' }}>{errorMsg}</div> : <p>Cargando ejercicio...</p>}
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: '1rem' }}>
        {collectionId ? (
          <Link to={`/collections/${collectionId}`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver a la Colección
          </Link>
        ) : (
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Dashboard
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Panel Izquierdo: Enunciado y Tests Públicos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{exercise.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="badge badge-info">{exercise.language}</span>
              <span className="badge badge-neutral">Versión {exercise.versionNumber}</span>
              {(!activityId || activityId === 'practice') && (
                <span className="badge badge-success">Práctica Libre</span>
              )}
            </div>

            <div
              className="markdown-statement"
              dangerouslySetInnerHTML={{ __html: renderedStatementHtml }}
            />
          </div>

          {/* Tests públicos para orientación */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Tests Públicos</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
              Estos casos de prueba sirven para comprobar tu lógica antes de la entrega oficial:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {publicTests.map((t) => (
                <div key={t.id} style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Entrada:</span>
                      <pre style={{ margin: '0.25rem 0 0', padding: '0.375rem', background: '#e2e8f0', borderRadius: '0.25rem' }}>{t.input}</pre>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Salida Esperada:</span>
                      <pre style={{ margin: '0.25rem 0 0', padding: '0.375rem', background: '#e2e8f0', borderRadius: '0.25rem' }}>{t.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Editor y Ejecución */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Solución Java (Main.java)</span>
                {exercise.starterCode !== undefined && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#64748b' }}
                    title="Restablecer código a la plantilla inicial"
                  >
                    ↺ Restablecer plantilla
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handlePreviewRun}
                  disabled={previewLoading || submitLoading}
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  {previewLoading ? 'Ejecutando...' : '▶ Probar Tests Públicos'}
                </button>
                {activityId && activityId !== 'practice' && (
                  <button
                    onClick={handleSubmit}
                    disabled={previewLoading || submitLoading}
                    className="btn-primary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {submitLoading ? 'Enviando a cola...' : 'Enviar Solución Oficial'}
                  </button>
                )}
              </div>
            </div>

            <CodeEditor value={code} onChange={setCode} language="java" disabled={submitLoading} />
          </div>

          {errorMsg && (
            <div className="card" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Resultado de pruebas preliminares */}
          {previewResult && (
            <div className="card">
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem' }}>Resultado de Pruebas Públicas</h4>
              {previewResult.compileSuccess ? (
                <div>
                  <div style={{ color: '#15803d', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    ✓ Compilación exitosa
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {previewResult.testResults.map((tr) => (
                      <div key={tr.testId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: tr.passed ? '#dcfce7' : '#fee2e2', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                        <span>{tr.testId} — {tr.status} ({tr.durationMs}ms)</span>
                        <span>{tr.passed ? '✓ Superado' : '✗ Fallido'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>
                  <div style={{ fontWeight: 600 }}>Error de Compilación:</div>
                  <pre style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '0.25rem', overflowX: 'auto' }}>
                    {previewResult.compileStderr || previewResult.compileStdout}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Estado y resultado de entrega oficial */}
          {submission && (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Entrega Oficial Registrada</h4>
                <span className={`badge ${evaluation ? (evaluation.status === 'CORRECT' ? 'badge-success' : 'badge-danger') : 'badge-warning'}`}>
                  {evaluation ? evaluation.status : 'EN COLA DE EVALUACIÓN...'}
                </span>
              </div>

              {submitLoading && (
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0' }}>
                  El runner agent está evaluando tu solución en el sandbox aislado. Por favor espera...
                </p>
              )}

              {evaluation && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: evaluation.score >= 50 ? '#15803d' : '#b91c1c' }}>
                      {evaluation.score} / 100
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      Puntuación oficial • Runtime: {evaluation.runtimeId}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {evaluation.testResults.map((tr) => (
                      <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: tr.status === 'PASSED' ? '#f0fdf4' : '#fef2f2', border: '1px solid #e2e8f0', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                        <span>
                          {tr.testId} ({tr.isPublic ? 'Público' : 'Privado'}) — {tr.status}
                        </span>
                        <span style={{ fontWeight: 600 }}>{tr.score} pts</span>
                      </div>
                    ))}
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

