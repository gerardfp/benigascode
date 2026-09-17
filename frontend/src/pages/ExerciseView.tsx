import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, FileText, History, Clock } from 'lucide-react';
import { renderMarkdown } from '../utils/markdown';
import { api } from '../services/api';
import { Exercise, PublicTest, PreviewRunResult, Submission, Evaluation, StudentProgress } from '../types';
import { CodeEditor } from '../components/CodeEditor';
import { TagBadge } from '../components/TagBadge';
import { detectLanguage } from '../utils/languageDetector';

export const ExerciseView: React.FC = () => {
  const { activityId, collectionId, exerciseId } = useParams<{
    activityId?: string;
    collectionId?: string;
    exerciseId: string;
  }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [publicTests, setPublicTests] = useState<PublicTest[]>([]);
  const [code, setCode] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('java');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Estados de control de código guardado, probado y entregado
  const [lastSavedCode, setLastSavedCode] = useState<string | null>(null);
  const [lastTestedCode, setLastTestedCode] = useState<string | null>(null);
  const [lastSubmittedCode, setLastSubmittedCode] = useState<string | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null);

  const [previewResult, setPreviewResult] = useState<PreviewRunResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submissionsHistory, setSubmissionsHistory] = useState<Submission[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pestaña activa en el panel izquierdo: 'statement' (enunciado) o 'submissions' (entregas)
  const [leftTab, setLeftTab] = useState<'statement' | 'submissions'>('statement');

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

  // Cargar ejercicio, workspace del alumno, entregas previas y progreso
  useEffect(() => {
    if (!exerciseId) return;

    const loadExerciseData = async () => {
      try {
        const [ex, wsRes, subsRes, progRes] = await Promise.all([
          api.getExercise(exerciseId, collectionId),
          api.getWorkspace(exerciseId).catch(() => null),
          api.getExerciseSubmissions(exerciseId).catch(() => [] as Submission[]),
          api.getExerciseProgress(exerciseId).catch(() => null),
        ]);

        setExercise(ex);
        if (progRes) {
          setStudentProgress(progRes);
        }

        const defLang = (ex.defaultLanguage || 'java').toLowerCase();
        const hasCustomTemplates = ex.starterTemplates && Object.keys(ex.starterTemplates).length > 0;

        const isOldPhantomSkeleton = (codeText?: string) => {
          if (!codeText) return false;
          const trimmed = codeText.trim();
          return (
            trimmed === "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Escribe tu solución aquí\n    }\n}".trim() ||
            trimmed === "// Escribe tu solución aquí\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}".trim()
          );
        };

        const ws = wsRes;
        const subs = subsRes || [];
        setSubmissionsHistory(subs);

        const hasValidWs = ws && !ws.isStarter && ws.sourceCode && (!isOldPhantomSkeleton(ws.sourceCode) || hasCustomTemplates);
        const wsTime = hasValidWs && ws.updatedAt ? new Date(ws.updatedAt).getTime() : 0;
        const latestSub = subs.length > 0 ? subs[0] : null;
        const subTime = latestSub && latestSub.createdAt ? new Date(latestSub.createdAt).getTime() : 0;

        // Determinar si la acción más reciente fue una entrega o un guardado de borrador
        if (latestSub && subTime >= wsTime) {
          // Última acción fue una entrega oficial
          const subCode = latestSub.sourceCode || '';
          setCode(subCode);
          setLastSavedCode(subCode);
          setLastTestedCode(subCode);
          setLastSubmittedCode(subCode);
          if (latestSub.language) {
            setSelectedLang(latestSub.language.toLowerCase());
          } else {
            setSelectedLang(defLang);
          }
          setSubmission(latestSub);

          // Cargar evaluación de la entrega
          try {
            const evals = await api.getEvaluations(latestSub.id);
            if (evals && evals.length > 0) {
              setEvaluation(evals[0]);
            }
          } catch (e) {
            console.debug('Error recuperando evaluación previa', e);
          }
        } else if (hasValidWs && ws && ws.sourceCode) {
          // Última acción fue guardar borrador
          const wsCode = ws.sourceCode;
          setCode(wsCode);
          setLastSaved(ws.updatedAt);
          setLastSavedCode(wsCode);
          setLastTestedCode(null);
          setLastSubmittedCode(latestSub ? latestSub.sourceCode : null);
          if (ws.language) {
            setSelectedLang(ws.language.toLowerCase());
          } else {
            setSelectedLang(defLang);
          }
          // Si guardó el código, no debe aparecer ningún resultado de tests
          setEvaluation(null);
          setPreviewResult(null);
          setSubmission(null);
        } else {
          // Sin entregas ni borradores previos: inicializar con plantilla
          const initialCode = ex.starterTemplates?.[defLang] || ex.starterCode || '';
          setCode(initialCode);
          setLastSavedCode(initialCode);
          setLastTestedCode(null);
          setLastSubmittedCode(null);
          setSelectedLang(defLang);
          setEvaluation(null);
          setPreviewResult(null);
          setSubmission(null);
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    };

    loadExerciseData();

    // Obtener tests públicos
    api.getPublicTests(exerciseId)
      .then(setPublicTests)
      .catch(console.error);
  }, [exerciseId, collectionId]);

  // Detección automática del lenguaje según el código escrito y la selección
  const currentLang = useMemo(() => {
    return detectLanguage(code, selectedLang as 'java' | 'python');
  }, [code, selectedLang]);

  // Lista de plantillas disponibles en el ejercicio
  const availableTemplates = useMemo(() => {
    if (!exercise?.starterTemplates) return [];
    return Object.keys(exercise.starterTemplates);
  }, [exercise?.starterTemplates]);

  // Determinar si el código actual está intacto (es idéntico a alguna plantilla inicial o está vacío)
  const isUntouched = useMemo(() => {
    if (!code || !code.trim()) return true;
    if (exercise?.starterTemplates && Object.keys(exercise.starterTemplates).length > 0) {
      return Object.values(exercise.starterTemplates).some(
        (tpl) => (tpl || '').trim() === code.trim()
      );
    }
    if (exercise?.starterCode) {
      return exercise.starterCode.trim() === code.trim();
    }
    return false;
  }, [code, exercise?.starterTemplates, exercise?.starterCode]);

  // Cambio de lenguaje mediante las pestañas de plantilla
  const handleSelectLanguage = (lang: string) => {
    const normalized = lang.toLowerCase();
    setSelectedLang(normalized);
    const newCode = exercise?.starterTemplates?.[normalized] || exercise?.starterTemplates?.[lang] || '';
    setCode(newCode);
    setLastSavedCode(newCode);
    setLastTestedCode(null);
    setLastSubmittedCode(null);
    setPreviewResult(null);
    setSubmission(null);
    setEvaluation(null);
    if (collectionId) {
      api.setCollectionPreference(collectionId, normalized).catch(console.error);
    }
    if (exerciseId) {
      api.saveWorkspace(exerciseId, newCode, normalized).catch(console.error);
    }
  };

  // Restablecer plantilla
  const handleResetTemplate = () => {
    const targetTemplate = exercise?.starterTemplates?.[selectedLang] || exercise?.starterCode;
    if (targetTemplate !== undefined && targetTemplate !== null) {
      if (window.confirm('¿Deseas restablecer el código a la plantilla inicial? Se descartarán las modificaciones actuales.')) {
        setCode(targetTemplate);
        setLastSavedCode(targetTemplate);
        setLastTestedCode(null);
        setLastSubmittedCode(null);
        setPreviewResult(null);
        setSubmission(null);
        setEvaluation(null);
        api.saveWorkspace(exerciseId!, targetTemplate, selectedLang)
          .then((ws) => {
            setLastSaved(ws.updatedAt);
          })
          .catch(console.error);
      }
    }
  };

  // Cálculo del porcentaje y estado para el checkmark junto al título (coherente con CollectionDetailView)
  const scorePct = useMemo(() => {
    if (studentProgress && studentProgress.bestScore !== undefined && studentProgress.bestScore !== null) {
      return Math.round(studentProgress.bestScore);
    }
    if (evaluation && evaluation.score !== undefined && evaluation.score !== null) {
      return Math.round(evaluation.score);
    }
    return 0;
  }, [studentProgress, evaluation]);

  const isResolved = useMemo(() => {
    if (studentProgress && (studentProgress.status === 'PASSED' || studentProgress.status === 'MASTERED' || (studentProgress.bestScore !== undefined && studentProgress.bestScore >= 100))) {
      return true;
    }
    if (evaluation && (evaluation.status === 'CORRECT' || (evaluation.score !== undefined && evaluation.score >= 100))) {
      return true;
    }
    return false;
  }, [studentProgress, evaluation]);

  const isAttempted = useMemo(() => {
    if (isResolved) return false;
    if (studentProgress && (studentProgress.totalSubmissions > 0 || studentProgress.status === 'ATTEMPTED' || (studentProgress.bestScore !== undefined && studentProgress.bestScore > 0))) {
      return true;
    }
    if (submissionsHistory && submissionsHistory.length > 0) {
      return true;
    }
    return false;
  }, [isResolved, studentProgress, submissionsHistory]);

  const getScoreColorConfig = (pct: number) => {
    if (pct >= 100) return { bg: '#ecfdf5', border: '#a7f3d0', iconColor: '#059669' };
    if (pct >= 75) return { bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#15803d' };
    if (pct >= 50) return { bg: '#fefce8', border: '#fde047', iconColor: '#ca8a04' };
    if (pct >= 25) return { bg: '#fff7ed', border: '#fdba74', iconColor: '#ea580c' };
    return { bg: '#fef2f2', border: '#fecaca', iconColor: '#dc2626' };
  };

  // Control de habilitación de botones
  const isBusy = submitLoading || previewLoading || saveStatus === 'saving';
  const hasCode = Boolean(code && code.trim().length > 0);
  const isModifiedSinceSave = hasCode && code !== lastSavedCode;
  const isModifiedSinceTest = hasCode && code !== lastTestedCode && code !== lastSubmittedCode;
  const isModifiedSinceSubmit = hasCode && code !== lastSubmittedCode;

  const canSave = isModifiedSinceSave && !isBusy;
  const canPreview = isModifiedSinceTest && !isBusy;
  const canSubmit = isModifiedSinceSubmit && !isBusy;

  // Guardar borrador en el workspace
  const handleSaveWorkspace = useCallback(async () => {
    if (!exerciseId || !code || !canSave) return;
    setSaveStatus('saving');
    try {
      const ws = await api.saveWorkspace(exerciseId, code, currentLang);
      setSaveStatus('saved');
      setLastSaved(ws.updatedAt);
      setLastSavedCode(code);
      setPreviewResult(null);
      setSubmission(null);
      setEvaluation(null);
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    }
  }, [exerciseId, code, currentLang, canSave]);

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
    if (testName && !testName.startsWith('pub-') && !testName.startsWith('priv-')) {
      return testName;
    }
    const matchById = publicTests.find(p => p.id === testId);
    if (matchById && matchById.name && !matchById.name.startsWith('pub-')) {
      return matchById.name;
    }
    if (testId && testId.startsWith('pub-')) {
      const parsedNum = parseInt(testId.replace('pub-', ''), 10);
      if (!isNaN(parsedNum)) {
        if (publicTests[parsedNum] && publicTests[parsedNum].name && !publicTests[parsedNum].name.startsWith('pub-')) {
          return publicTests[parsedNum].name;
        }
        return `Test Público #${parsedNum + 1}`;
      }
    }
    if (index !== undefined) {
      if (publicTests[index] && publicTests[index].name && !publicTests[index].name.startsWith('pub-')) {
        return publicTests[index].name;
      }
      return `Test Público #${index + 1}`;
    }
    return testName || testId;
  }, [publicTests]);

  // Ejecución real de pruebas preliminares públicas
  const handlePreviewRun = async () => {
    if (!exerciseId || !canPreview) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    setSubmission(null);
    setEvaluation(null);
    setErrorMsg(null);

    // Auto-guardar borrador al probar
    api.saveWorkspace(exerciseId, code, currentLang)
      .then((ws) => {
        setLastSaved(ws.updatedAt);
        setLastSavedCode(code);
      })
      .catch(console.error);

    try {
      const res = await api.previewRun(exerciseId, code, currentLang);
      setPreviewResult(res);
      setLastTestedCode(code);
      setLastSavedCode(code);
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
          // Actualizar lista histórica y progreso del ejercicio
          if (exerciseId) {
            api.getExerciseSubmissions(exerciseId).then(setSubmissionsHistory).catch(console.error);
            api.getExerciseProgress(exerciseId).then(setStudentProgress).catch(console.error);
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
    if (!exerciseId || !canSubmit) return;
    const isActivity = Boolean(activityId && activityId !== 'practice');
    const langLabel = currentLang === 'python' ? 'Python 3' : 'Java 26';
    const confirmMsg = isActivity
      ? `¿Estás seguro de realizar la entrega oficial en ${langLabel}? Esto consumirá un intento formal de la actividad.`
      : `¿Deseas enviar tu solución en ${langLabel} para evaluación oficial?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSubmitLoading(true);
    setSubmission(null);
    setEvaluation(null);
    setPreviewResult(null);
    setPreviewLoading(false);
    setErrorMsg(null);

    // Auto-guardar borrador al entregar
    api.saveWorkspace(exerciseId, code, currentLang)
      .then((ws) => {
        setLastSaved(ws.updatedAt);
        setLastSavedCode(code);
      })
      .catch(console.error);

    try {
      const sub = isActivity
        ? await api.submitSolution(activityId!, exerciseId, code, currentLang)
        : await api.submitPracticeSolution(exerciseId, code, currentLang, { collectionId });

      setSubmission(sub);
      setLastSubmittedCode(code);
      setLastTestedCode(code);
      setLastSavedCode(code);
      pollEvaluation(sub.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar la solución');
      setSubmitLoading(false);
    }
  };

  // Seleccionar una entrega anterior del historial para inspeccionar su evaluación y código
  const handleSelectHistorySubmission = async (histSub: Submission) => {
    setPreviewResult(null);
    setPreviewLoading(false);
    setSubmitLoading(false);
    setErrorMsg(null);
    setEvaluation(null);
    setSubmission(histSub);

    const subCode = histSub.sourceCode || '';
    setCode(subCode);
    setLastSavedCode(subCode);
    setLastTestedCode(subCode);
    setLastSubmittedCode(subCode);

    if (histSub.language) {
      setSelectedLang(histSub.language.toLowerCase());
    }

    try {
      const evals = await api.getEvaluations(histSub.id);
      if (evals && evals.length > 0) {
        setEvaluation(evals[0]);
      } else {
        setEvaluation(null);
      }
    } catch (e) {
      console.error('Error recuperando evaluación previa', e);
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
      </div>

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
        {/* Panel Izquierdo: Enunciado y Casos Públicos / Historial de Entregas */}
        <div
          style={{
            width: isSmallScreen ? '100%' : `calc(${leftPanelRatio}% - 6px)`,
            minWidth: isSmallScreen ? undefined : '260px',
            maxWidth: isSmallScreen ? undefined : '75%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxSizing: 'border-box',
            height: isSmallScreen ? 'auto' : '100%',
            overflowY: isSmallScreen ? 'visible' : 'auto',
            paddingRight: isSmallScreen ? 0 : '6px',
            scrollbarWidth: 'thin',
          }}
        >
          {/* Pestañas del Panel Izquierdo: Enunciado vs Entregas */}
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.35rem',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setLeftTab('statement')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.375rem',
                border: leftTab === 'statement' ? '1px solid #93c5fd' : '1px solid transparent',
                backgroundColor: leftTab === 'statement' ? '#eff6ff' : 'transparent',
                color: leftTab === 'statement' ? '#1d4ed8' : '#64748b',
                fontWeight: leftTab === 'statement' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={16} />
              <span>Enunciado</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('submissions')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.375rem',
                border: leftTab === 'submissions' ? '1px solid #93c5fd' : '1px solid transparent',
                backgroundColor: leftTab === 'submissions' ? '#eff6ff' : 'transparent',
                color: leftTab === 'submissions' ? '#1d4ed8' : '#64748b',
                fontWeight: leftTab === 'submissions' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <History size={16} />
              <span>Entregas</span>
              {submissionsHistory.length > 0 && (
                <span
                  style={{
                    marginLeft: '0.25rem',
                    backgroundColor: leftTab === 'submissions' ? '#dbeafe' : '#f1f5f9',
                    color: leftTab === 'submissions' ? '#1e40af' : '#64748b',
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  {submissionsHistory.length}
                </span>
              )}
            </button>
          </div>

          {leftTab === 'statement' ? (
            <>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{exercise.title}</h1>
                  {isResolved ? (
                    <div
                      title="Ejercicio resuelto con éxito (100% de tests superados)"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: '#dcfce7',
                        border: '1.5px solid #86efac',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#15803d',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={18} />
                    </div>
                  ) : isAttempted ? (
                    <div
                      title={`Intentado (${scorePct}% superado)`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: getScoreColorConfig(scorePct).bg,
                        border: `1.5px solid ${getScoreColorConfig(scorePct).border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getScoreColorConfig(scorePct).iconColor,
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={18} />
                    </div>
                  ) : null}
                </div>

                {/* Etiquetas del ejercicio configuradas por el profesor */}
                {exercise.tags && exercise.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {exercise.tags.map((tag) => {
                      if (tag.includes(':')) {
                        const [cat, ...val] = tag.split(':');
                        return <TagBadge key={tag} category={cat} value={val.join(':')} />;
                      }
                      return <TagBadge key={tag} value={tag} />;
                    })}
                  </div>
                )}

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
            </>
          ) : (
            /* Lista de Envíos / Historial */
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {exercise.title}
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                    {submissionsHistory.length === 1
                      ? '1 entrega registrada'
                      : `${submissionsHistory.length} entregas registradas (más reciente primero)`}
                  </p>
                </div>
                {isResolved ? (
                  <div
                    title="Ejercicio resuelto con éxito (100% de tests superados)"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: '#dcfce7',
                      border: '1.5px solid #86efac',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#15803d',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                ) : isAttempted ? (
                  <div
                    title={`Intentado (${scorePct}% superado)`}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: getScoreColorConfig(scorePct).bg,
                      border: `1.5px solid ${getScoreColorConfig(scorePct).border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getScoreColorConfig(scorePct).iconColor,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                ) : null}
              </div>

              {submissionsHistory.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '0.5rem',
                    color: '#64748b',
                  }}
                >
                  <History size={36} style={{ margin: '0 auto 0.75rem', color: '#94a3b8', strokeWidth: 1.5 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#334155', margin: '0 0 0.35rem' }}>
                    Sin entregas todavía
                  </p>
                  <p style={{ fontSize: '0.8125rem', margin: '0 0 1rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                    Aún no has enviado ninguna solución oficial para este ejercicio. Cuando realices una entrega, aparecerá aquí en tu historial.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLeftTab('statement')}
                    className="btn-secondary"
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                  >
                    ← Ver Enunciado
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {submissionsHistory.map((s, idx) => {
                    const isSelected = submission?.id === s.id;
                    const score = s.score !== undefined && s.score !== null ? Math.round(s.score) : null;
                    const scoreColors = score !== null ? getScoreColorConfig(score) : null;

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectHistorySubmission(s)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.15)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                              Intento #{s.attemptNumber || (submissionsHistory.length - idx)}
                            </span>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '0.25rem',
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                  fontWeight: 600,
                                }}
                              >
                                ● Cargado en editor
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                fontWeight: 500,
                              }}
                            >
                              {s.language?.toLowerCase() === 'python' ? '🐍 Python' : '☕ Java'}
                            </span>

                            {score !== null ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  backgroundColor: scoreColors?.bg || '#f1f5f9',
                                  color: scoreColors?.iconColor || '#334155',
                                  border: `1px solid ${scoreColors?.border || '#cbd5e1'}`,
                                }}
                              >
                                {score} / 100
                              </span>
                            ) : (
                              <span className={`badge ${s.status === 'FINISHED' ? 'badge-neutral' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                                {s.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} />
                            <span>{new Date(s.createdAt).toLocaleString()}</span>
                          </div>

                          {s.totalTests !== undefined && s.totalTests > 0 && (
                            <span>
                              Tests: <strong>{s.testsPassed || 0} / {s.totalTests}</strong> superados
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Selector de plantilla si hay múltiples y el código no ha sido modificado aún */}
                {availableTemplates.length > 1 && isUntouched && (
                  <div style={{
                    display: 'inline-flex',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                    background: '#f8fafc',
                  }}>
                    {availableTemplates.map((lang) => {
                      const isSel = selectedLang.toLowerCase() === lang.toLowerCase();
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleSelectLanguage(lang)}
                          style={{
                            padding: '0.2rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            background: isSel ? '#2563eb' : 'transparent',
                            color: isSel ? '#ffffff' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {lang.toLowerCase() === 'python' ? '🐍 PYTHON' : '☕ JAVA'}
                        </button>
                      );
                    })}
                  </div>
                )}

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
                  disabled={!canSave}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    opacity: canSave ? 1 : 0.5,
                    cursor: canSave ? 'pointer' : 'not-allowed',
                  }}
                  title={canSave ? 'Guardar borrador de trabajo' : 'El código no ha sido modificado desde el último guardado o prueba'}
                >
                  💾 Guardar
                </button>
                {((exercise.starterCode && exercise.starterCode.trim().length > 0) || (exercise.starterTemplates && Object.keys(exercise.starterTemplates).length > 0)) && (
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

            <CodeEditor value={code} onChange={setCode} language={currentLang} disabled={submitLoading} />

            {/* Barra de botones de ejecución */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.875rem' }}>
              <button
                onClick={handlePreviewRun}
                disabled={!canPreview}
                className="btn-secondary"
                style={{
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  opacity: canPreview ? 1 : 0.5,
                  cursor: canPreview ? 'pointer' : 'not-allowed',
                }}
                title={canPreview ? 'Probar solución contra tests públicos' : 'Modifica el código para volver a probar'}
              >
                {previewLoading ? `⏳ Probando en ${currentLang === 'python' ? 'Python 3' : 'Java 26'}...` : '▶ Probar Tests Públicos'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="btn-primary"
                style={{
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  opacity: canSubmit ? 1 : 0.5,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
                title={canSubmit ? 'Entregar solución oficial' : 'Modifica el código para realizar una nueva entrega'}
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

          {/* Indicador de carga de prueba preliminar pública */}
          {previewLoading && (
            <div className="card" style={{ borderLeft: '4px solid #3b82f6', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1d4ed8' }}>
              <span style={{ fontSize: '1.25rem' }}>⏳</span>
              <span style={{ fontSize: '0.875rem' }}>
                Ejecutando pruebas preliminares públicas en el sandbox de {currentLang === 'python' ? 'Python 3' : 'Java 26'}...
              </span>
            </div>
          )}

          {/* Resultado de pruebas preliminares públicas */}
          {previewResult && !previewLoading && (
            <div className="card" style={{ borderLeft: previewResult.compileSuccess ? '4px solid #16a34a' : '4px solid #dc2626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                  Resultado de Pruebas Públicas ({previewResult.runtimeId?.includes('python') || currentLang === 'python' ? 'Python 3' : 'Java 26'})
                </h4>
                <span className={`badge ${previewResult.compileSuccess ? 'badge-success' : 'badge-danger'}`}>
                  {previewResult.compileSuccess ? 'Compilación/Sintaxis OK' : 'Error de Compilación/Sintaxis'}
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
          {(submission || submitLoading) && !previewResult && !previewLoading && (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    {submission
                      ? `Entrega Oficial ${submission.attemptNumber ? `(Intento #${submission.attemptNumber})` : ''}`
                      : 'Evaluando Entrega Oficial...'}
                  </h4>
                  {submission && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Registrada el {new Date(submission.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-neutral">
                    {submission?.runtimeId?.includes('python') || submission?.language?.toLowerCase() === 'python' || currentLang === 'python'
                      ? 'Python 3 Sandbox'
                      : 'Java 26 Sandbox'}
                  </span>
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
                    El sandbox de {currentLang === 'python' ? 'Python 3' : 'Java 26'} está ejecutando las pruebas públicas y privadas en un contenedor aislado...
                  </span>
                </div>
              )}

              {evaluation && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  {/* Puntuación y desglose general */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: evaluation.score >= 100 ? '#15803d' : evaluation.score > 0 ? '#d97706' : '#b91c1c' }}>
                        {evaluation.score}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ 100 pts</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.5rem 0.875rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                      <span>Tests superados: <strong style={{ color: '#0f172a' }}>{evaluation.passedTests || 0} / {evaluation.totalTests || 0}</strong></span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span>Públicos: <strong style={{ color: '#0f172a' }}>{evaluation.passedPublicTests || 0} / {evaluation.totalPublicTests || 0}</strong></span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span>Privados: <strong style={{ color: '#0f172a' }}>{evaluation.passedPrivateTests || 0} / {evaluation.totalPrivateTests || 0}</strong></span>
                    </div>
                  </div>

                  {/* Detalle de error de compilación si aplica */}
                  {evaluation.status === 'COMPILE_ERROR' && evaluation.compileStderr && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.35rem' }}>
                        Detalle del compilador / intérprete:
                      </div>
                      <pre style={{ background: '#1e293b', color: '#f87171', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', overflowX: 'auto', margin: 0 }}>
                        {evaluation.compileStderr}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
