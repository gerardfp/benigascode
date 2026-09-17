import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, FileText, History, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowLeft, Copy, Clipboard, Check, Code2, Terminal } from 'lucide-react';
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
  const [collectionExercises, setCollectionExercises] = useState<Exercise[]>([]);

  // Cargar lista de ejercicios de la colección para navegación Anterior / Siguiente
  useEffect(() => {
    if (!collectionId) {
      setCollectionExercises([]);
      return;
    }
    api.getCollectionExercises(collectionId)
      .then((exercises) => {
        setCollectionExercises(exercises || []);
      })
      .catch((err) => {
        console.debug('No se pudieron cargar ejercicios de la colección', err);
        setCollectionExercises([]);
      });
  }, [collectionId]);

  // Ejercicios anterior y siguiente dentro de la colección
  const { prevExercise, nextExercise } = useMemo(() => {
    if (!collectionExercises || collectionExercises.length === 0 || !exerciseId) {
      return { prevExercise: null, nextExercise: null };
    }
    const idx = collectionExercises.findIndex(
      (e) => e.id === exerciseId || e.exerciseId === exerciseId || e.slug === exerciseId
    );
    if (idx === -1) {
      return { prevExercise: null, nextExercise: null };
    }
    return {
      prevExercise: idx > 0 ? collectionExercises[idx - 1] : null,
      nextExercise: idx < collectionExercises.length - 1 ? collectionExercises[idx + 1] : null,
    };
  }, [collectionExercises, exerciseId]);

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

  // Vertical splitter state for Right Column (Top: Editor, Bottom: Test Results)
  const [rightTopPanelRatio, setRightTopPanelRatio] = useState<number>(() => {
    const saved = localStorage.getItem('benigascode_exercise_right_split_ratio');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 20 && val <= 80) return val;
    }
    return 58; // Default 58% top editor, 42% bottom tests
  });
  const [isDraggingRightSplitter, setIsDraggingRightSplitter] = useState(false);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Altura fija de la cabecera del panel de Test cuando está colapsado (en px)
  const TEST_PANEL_HEADER_HEIGHT = 44;
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState<boolean>(false);
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

  // Control del arrastre vertical de la línea divisoria en la columna derecha
  useEffect(() => {
    if (!isDraggingRightSplitter) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!rightContainerRef.current) return;
      const rect = rightContainerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const cursorY = e.clientY - rect.top;
      const maxEditorHeight = totalHeight - 8 - TEST_PANEL_HEADER_HEIGHT;
      const minEditorHeight = 100;

      if (cursorY >= maxEditorHeight - 12) {
        setIsTestPanelCollapsed(true);
      } else if (cursorY <= minEditorHeight) {
        setIsTestPanelCollapsed(false);
        setRightTopPanelRatio((minEditorHeight / totalHeight) * 100);
      } else {
        setIsTestPanelCollapsed(false);
        const rawRatio = (cursorY / totalHeight) * 100;
        setRightTopPanelRatio(rawRatio);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRightSplitter(false);
      setRightTopPanelRatio((currentRatio) => {
        try {
          localStorage.setItem('benigascode_exercise_right_split_ratio', currentRatio.toFixed(1));
        } catch {
          // Ignore localStorage errors
        }
        return currentRatio;
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!rightContainerRef.current || e.touches.length === 0) return;
      const rect = rightContainerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const cursorY = e.touches[0].clientY - rect.top;
      const maxEditorHeight = totalHeight - 8 - TEST_PANEL_HEADER_HEIGHT;
      const minEditorHeight = 100;

      if (cursorY >= maxEditorHeight - 12) {
        setIsTestPanelCollapsed(true);
      } else if (cursorY <= minEditorHeight) {
        setIsTestPanelCollapsed(false);
        setRightTopPanelRatio((minEditorHeight / totalHeight) * 100);
      } else {
        setIsTestPanelCollapsed(false);
        const rawRatio = (cursorY / totalHeight) * 100;
        setRightTopPanelRatio(rawRatio);
      }
    };

    const handleTouchEnd = () => {
      setIsDraggingRightSplitter(false);
      setRightTopPanelRatio((currentRatio) => {
        try {
          localStorage.setItem('benigascode_exercise_right_split_ratio', currentRatio.toFixed(1));
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
  }, [isDraggingRightSplitter]);

  // Expandir panel de tests automáticamente al 50% de la columna
  const expandTestPanelToHalf = useCallback(() => {
    setIsTestPanelCollapsed(false);
    setRightTopPanelRatio(50);
    try {
      localStorage.setItem('benigascode_exercise_right_split_ratio', '50.0');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Copiar todo el código al portapapeles
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  // Pegar del portapapeles borrando todo el contenido actual
  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text !== undefined && text !== null) {
        setCode(text);
      }
    } catch (err) {
      console.error('Error al pegar desde el portapapeles:', err);
    }
  };

  // Cargar ejercicio, workspace del alumno, entregas previas y progreso
  useEffect(() => {
    if (!exerciseId) return;
    setLeftTab('statement');

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

  // Resumen y estado para la barra superior del panel de Tests
  const testSummary = useMemo(() => {
    if (previewLoading) {
      return {
        counterText: 'Ejecutando...',
        statusText: 'EJECUTANDO...',
        badgeClass: 'badge-info',
      };
    }
    if (submitLoading) {
      return {
        counterText: 'Evaluando...',
        statusText: 'EVALUANDO...',
        badgeClass: 'badge-info',
      };
    }
    if (previewResult) {
      if (!previewResult.compileSuccess) {
        return {
          counterText: `0 / ${previewResult.testResults?.length || publicTests.length || 0} superados`,
          statusText: 'COMPILATION_ERROR',
          badgeClass: 'badge-danger',
        };
      }
      const total = previewResult.testResults.length;
      const passed = previewResult.testResults.filter((t) => t.passed).length;
      if (passed === total && total > 0) {
        return {
          counterText: `${passed} / ${total} superados`,
          statusText: 'CORRECTA',
          badgeClass: 'badge-success',
        };
      }
      const hasRuntimeErr = previewResult.testResults.some((t) => t.status === 'RUNTIME_ERROR');
      const hasTle = previewResult.testResults.some((t) => t.status === 'TIMEOUT');
      let statusText: string = 'INCORRECTA';
      if (hasRuntimeErr) statusText = 'RUNTIME_ERROR';
      else if (hasTle) statusText = 'TIME_LIMIT_EXCEEDED';
      return {
        counterText: `${passed} / ${total} superados`,
        statusText,
        badgeClass: 'badge-danger',
      };
    }
    if (evaluation) {
      if (evaluation.status === 'COMPILE_ERROR') {
        return {
          counterText: `0 / ${evaluation.totalTests || 0} superados`,
          statusText: 'COMPILATION_ERROR',
          badgeClass: 'badge-danger',
        };
      }
      const total = evaluation.totalTests || 0;
      const passed = evaluation.passedTests || 0;
      let statusText: string = evaluation.status;
      let badgeClass = 'badge-danger';
      if (evaluation.status === 'CORRECT') {
        statusText = 'CORRECTA';
        badgeClass = 'badge-success';
      } else if (evaluation.status === 'INCORRECT') {
        statusText = 'INCORRECTA';
        badgeClass = 'badge-warning';
      } else if (evaluation.status === 'RUNTIME_ERROR') {
        statusText = 'RUNTIME_ERROR';
        badgeClass = 'badge-danger';
      } else if (evaluation.status === 'TIMEOUT') {
        statusText = 'TIME_LIMIT_EXCEEDED';
        badgeClass = 'badge-danger';
      }
      return {
        counterText: `${passed} / ${total} superados`,
        statusText,
        badgeClass,
      };
    }
    return {
      counterText: publicTests.length > 0 ? `0 / ${publicTests.length} superados` : 'Sin ejecuciones aún',
      statusText: 'PENDIENTE',
      badgeClass: 'badge-neutral',
    };
  }, [previewLoading, submitLoading, previewResult, evaluation, publicTests.length]);

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
    if (isTestPanelCollapsed) {
      expandTestPanelToHalf();
    }
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

    if (isTestPanelCollapsed) {
      expandTestPanelToHalf();
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
      style={{
        width: '100%',
        maxWidth: '100%',
        height: isSmallScreen ? 'auto' : 'calc(100vh - 65px)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '6px',
      }}
    >
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
        {/* Panel Izquierdo: Tarjeta única con navegación, selector, enunciado/entregas y tests */}
        <div
          style={{
            width: isSmallScreen ? '100%' : `calc(${leftPanelRatio}% - 4px)`,
            minWidth: isSmallScreen ? undefined : '260px',
            maxWidth: isSmallScreen ? undefined : '75%',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            height: isSmallScreen ? 'auto' : '100%',
            overflow: isSmallScreen ? 'visible' : 'hidden',
          }}
        >
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: isSmallScreen ? 'auto' : '100%',
              boxSizing: 'border-box',
              padding: '1.25rem',
              overflow: 'hidden',
            }}
          >
            {/* Barra superior de navegación y selector de vista */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.875rem',
                marginBottom: '1rem',
                flexShrink: 0,
              }}
            >
              {/* Sección Izquierda: Navegación (Volver, Anterior, Siguiente) */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {collectionId ? (
                  <Link
                    to={`/collections/${collectionId}`}
                    className="btn-secondary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      padding: '0.35rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      borderRadius: '0.375rem',
                    }}
                    title="Volver a la Colección"
                  >
                    <ArrowLeft size={16} />
                  </Link>
                ) : activityId ? (
                  <Link
                    to={`/activity/${activityId}`}
                    className="btn-secondary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      padding: '0.35rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      borderRadius: '0.375rem',
                    }}
                    title="Volver a la Actividad"
                  >
                    <ArrowLeft size={16} />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="btn-secondary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      padding: '0.35rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      borderRadius: '0.375rem',
                    }}
                    title="Volver al Dashboard"
                  >
                    <ArrowLeft size={16} />
                  </Link>
                )}

                {collectionId && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      overflow: 'hidden',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    {prevExercise ? (
                      <Link
                        to={`/collections/${collectionId}/exercise/${prevExercise.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          color: '#334155',
                          textDecoration: 'none',
                          borderRight: '1px solid #cbd5e1',
                        }}
                        title={`Anterior: ${prevExercise.title}`}
                      >
                        <ChevronLeft size={16} />
                      </Link>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          color: '#94a3b8',
                          borderRight: '1px solid #cbd5e1',
                          cursor: 'not-allowed',
                          opacity: 0.6,
                        }}
                        title="No hay ejercicio anterior"
                      >
                        <ChevronLeft size={16} />
                      </span>
                    )}

                    {nextExercise ? (
                      <Link
                        to={`/collections/${collectionId}/exercise/${nextExercise.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          color: '#334155',
                          textDecoration: 'none',
                        }}
                        title={`Siguiente: ${nextExercise.title}`}
                      >
                        <ChevronRight size={16} />
                      </Link>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          color: '#94a3b8',
                          cursor: 'not-allowed',
                          opacity: 0.6,
                        }}
                        title="No hay siguiente ejercicio"
                      >
                        <ChevronRight size={16} />
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sección Derecha: Selector de contenido (Enunciado / Entregas) con diseño tipo segmented-control diferenciado */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setLeftTab('statement')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: leftTab === 'statement' ? '#ffffff' : 'transparent',
                    color: leftTab === 'statement' ? '#1e293b' : '#64748b',
                    fontWeight: leftTab === 'statement' ? 700 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    boxShadow: leftTab === 'statement' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText size={15} style={{ color: leftTab === 'statement' ? '#2563eb' : '#64748b' }} />
                  <span>Enunciado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeftTab('submissions')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: leftTab === 'submissions' ? '#ffffff' : 'transparent',
                    color: leftTab === 'submissions' ? '#1e293b' : '#64748b',
                    fontWeight: leftTab === 'submissions' ? 700 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    boxShadow: leftTab === 'submissions' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <History size={15} style={{ color: leftTab === 'submissions' ? '#2563eb' : '#64748b' }} />
                  <span>Entregas</span>
                  {submissionsHistory.length > 0 && (
                    <span
                      style={{
                        marginLeft: '0.15rem',
                        backgroundColor: leftTab === 'submissions' ? '#dbeafe' : '#e2e8f0',
                        color: leftTab === 'submissions' ? '#1e40af' : '#475569',
                        fontSize: '0.7rem',
                        padding: '0.05rem 0.4rem',
                        borderRadius: '9999px',
                        fontWeight: 700,
                      }}
                    >
                      {submissionsHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Contenedor scrolleable del contenido (la cabecera superior permanece fija) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: isSmallScreen ? 'visible' : 'auto',
              }}
            >
              {leftTab === 'statement' ? (
              <>
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

                {/* Tests públicos informativos dentro de la misma tarjeta con su <h2> */}
                {publicTests.length > 0 && (
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem', color: '#0f172a' }}>
                      Tests públicos
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {publicTests.map((t, idx) => (
                        <div key={t.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', paddingTop: idx > 0 ? '1.25rem' : 0 }}>
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
              /* Lista de Envíos / Historial dentro de la misma tarjeta */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          </div>
        </div>

        {/* Espacio entre bloques que actúa como manejador de redimensionado (estilo VS Code, 8px) */}
        {!isSmallScreen && (
          <div
            onMouseDown={() => setIsDraggingSplitter(true)}
            onTouchStart={() => setIsDraggingSplitter(true)}
            style={{
              width: '8px',
              cursor: 'col-resize',
              flexShrink: 0,
              userSelect: 'none',
              background: isDraggingSplitter ? '#3b82f6' : 'transparent',
              borderRadius: '4px',
              transition: 'background-color 0.15s ease',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Arrastra para redimensionar paneles"
          >
            <div
              style={{
                width: '3px',
                height: '36px',
                borderRadius: '2px',
                backgroundColor: isDraggingSplitter ? '#ffffff' : '#cbd5e1',
              }}
            />
          </div>
        )}

        {/* Panel Derecho: Editor (arriba) y Resultados de Tests (abajo) con divisor vertical */}
        <div
          ref={rightContainerRef}
          style={{
            width: isSmallScreen ? '100%' : `calc(${100 - leftPanelRatio}% - 4px)`,
            flex: isSmallScreen ? undefined : 1,
            minWidth: isSmallScreen ? undefined : '320px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            height: isSmallScreen ? 'auto' : '100%',
            overflow: isSmallScreen ? 'visible' : 'hidden',
            gap: 0,
          }}
        >
          {/* Tarjeta Superior: Editor de Código */}
          <div
            className="card"
            style={{
              height: isSmallScreen
                ? 'auto'
                : isTestPanelCollapsed
                ? `calc(100% - ${TEST_PANEL_HEADER_HEIGHT + 8}px)`
                : `calc(${rightTopPanelRatio}% - 4px)`,
              minHeight: isSmallScreen ? '320px' : '160px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              padding: '0.75rem 1rem',
              overflow: 'hidden',
              marginBottom: 0,
              transition: isDraggingRightSplitter ? 'none' : 'height 0.2s ease',
            }}
          >
            {/* Barra superior del Editor: 3 bloques (Izquierda, Centro, Derecha) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
                flexShrink: 0,
              }}
            >
              {/* Bloque 1 (Izquierda): Código, Java / Python */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 'fit-content' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  <Code2 size={16} style={{ color: '#2563eb' }} />
                  <span>Código</span>
                </div>

                {/* Selector de plantilla si hay múltiples y el código no ha sido modificado aún */}
                {availableTemplates.length > 1 && isUntouched ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: '0.375rem',
                      border: '1px solid #cbd5e1',
                      overflow: 'hidden',
                      background: '#f8fafc',
                    }}
                  >
                    {availableTemplates.map((lang) => {
                      const isSel = selectedLang.toLowerCase() === lang.toLowerCase();
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleSelectLanguage(lang)}
                          style={{
                            padding: '0.15rem 0.55rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            background: isSel ? '#2563eb' : 'transparent',
                            color: isSel ? '#ffffff' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {lang.toLowerCase() === 'python' ? '🐍 PYTHON' : '☕ JAVA'}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                    {currentLang === 'python' ? '🐍 Python' : '☕ Java'}
                  </span>
                )}

                {saveStatus === 'saving' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💾 Guardando...</span>}
                {saveStatus === 'saved' && <span style={{ fontSize: '0.75rem', color: '#15803d' }}>✓ Guardado</span>}
              </div>

              {/* Bloque 2 (Centro): Copiar, Pegar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.55rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Copiar todo el código al portapapeles"
                >
                  {copiedFeedback ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                  <span>{copiedFeedback ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.55rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Pegar del portapapeles borrando todo el contenido actual"
                >
                  <Clipboard size={13} />
                  <span>Pegar</span>
                </button>
              </div>

              {/* Bloque 3 (Derecha): Guardar, Plantilla, Probar, Enviar */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', minWidth: 'fit-content' }}>
                <button
                  type="button"
                  onClick={handleSaveWorkspace}
                  disabled={!canSave}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.55rem',
                    opacity: canSave ? 1 : 0.5,
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title={canSave ? 'Guardar borrador de trabajo' : lastSaved ? `Guardado a las ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'El código no ha sido modificado'}
                >
                  💾 Guardar
                </button>

                {((exercise.starterCode && exercise.starterCode.trim().length > 0) || (exercise.starterTemplates && Object.keys(exercise.starterTemplates).length > 0)) && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    disabled={submitLoading}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.55rem',
                      color: '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Restablecer código a la plantilla inicial"
                  >
                    ↺ Plantilla
                  </button>
                )}

                <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', margin: '0 0.15rem' }} />

                <button
                  type="button"
                  onClick={handlePreviewRun}
                  disabled={!canPreview}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.65rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    opacity: canPreview ? 1 : 0.5,
                    cursor: canPreview ? 'pointer' : 'not-allowed',
                    backgroundColor: '#f1f5f9',
                  }}
                  title={canPreview ? 'Probar solución contra tests públicos' : 'Modifica el código para volver a probar'}
                >
                  {previewLoading ? '⏳ Probando...' : '▶ Probar'}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="btn-primary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.75rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    opacity: canSubmit ? 1 : 0.5,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                  }}
                  title={canSubmit ? 'Enviar solución oficial' : 'Modifica el código para realizar una nueva entrega'}
                >
                  {submitLoading ? '⏳ Evaluando...' : '✓ Enviar'}
                </button>
              </div>
            </div>

            {/* Monaco Editor ocupando el 100% de la altura disponible */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <CodeEditor value={code} onChange={setCode} language={currentLang} disabled={submitLoading} height="100%" />
            </div>
          </div>

          {/* Divisor Vertical (Splitter) entre Editor y Resultados */}
          {!isSmallScreen && (
            <div
              onMouseDown={() => setIsDraggingRightSplitter(true)}
              onTouchStart={() => setIsDraggingRightSplitter(true)}
              style={{
                height: '8px',
                cursor: 'row-resize',
                flexShrink: 0,
                userSelect: 'none',
                background: isDraggingRightSplitter ? '#3b82f6' : 'transparent',
                borderRadius: '4px',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
              title="Arrastra para redimensionar Editor y Tests"
            >
              <div
                style={{
                  width: '36px',
                  height: '3px',
                  borderRadius: '2px',
                  backgroundColor: isDraggingRightSplitter ? '#ffffff' : '#cbd5e1',
                }}
              />
            </div>
          )}

          {/* Tarjeta Inferior: Casos de Prueba y Resultados */}
          <div
            className="card"
            style={{
              height: isSmallScreen
                ? 'auto'
                : isTestPanelCollapsed
                ? `${TEST_PANEL_HEADER_HEIGHT}px`
                : `calc(${100 - rightTopPanelRatio}% - 4px)`,
              minHeight: isSmallScreen ? 'auto' : `${TEST_PANEL_HEADER_HEIGHT}px`,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              padding: isTestPanelCollapsed ? '0.375rem 1rem' : '0.75rem 1rem',
              overflow: 'hidden',
              marginTop: 0,
              transition: isDraggingRightSplitter ? 'none' : 'height 0.2s ease, padding 0.2s ease',
            }}
          >
            {/* Barra superior de Testcase / Test Result */}
            <div
              onClick={isTestPanelCollapsed ? expandTestPanelToHalf : undefined}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isTestPanelCollapsed ? 'none' : '1px solid #e2e8f0',
                paddingBottom: isTestPanelCollapsed ? 0 : '0.625rem',
                marginBottom: isTestPanelCollapsed ? 0 : '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
                flexShrink: 0,
                cursor: isTestPanelCollapsed ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              title={isTestPanelCollapsed ? 'Clic en la cabecera para expandir al 50%' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  <Terminal size={15} style={{ color: '#64748b' }} />
                  <span>Test Result</span>
                </div>

                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                    backgroundColor: '#f1f5f9',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {testSummary.counterText}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  className={`badge ${testSummary.badgeClass}`}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    padding: '0.25rem 0.65rem',
                  }}
                >
                  {testSummary.statusText}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTestPanelCollapsed) {
                      expandTestPanelToHalf();
                    } else {
                      setIsTestPanelCollapsed(true);
                    }
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title={isTestPanelCollapsed ? 'Expandir panel de tests' : 'Colapsar panel de tests'}
                >
                  {isTestPanelCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* Contenedor scrolleable del resultado de pruebas (la cabecera superior permanece fija) */}
            {!isTestPanelCollapsed && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: isSmallScreen ? 'visible' : 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  paddingRight: isSmallScreen ? 0 : '2px',
                }}
              >

            {/* Contenido detallado del resultado de pruebas */}
            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Indicador de ejecución de pruebas públicas */}
            {previewLoading && (
              <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1d4ed8', backgroundColor: '#eff6ff', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '1.25rem' }}>⏳</span>
                <span style={{ fontSize: '0.875rem' }}>
                  Ejecutando pruebas preliminares públicas en el sandbox de {currentLang === 'python' ? 'Python 3' : 'Java 26'}...
                </span>
              </div>
            )}

            {/* Resultado de pruebas preliminares públicas */}
            {previewResult && !previewLoading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Sandbox: {previewResult.runtimeId?.includes('python') || currentLang === 'python' ? 'Python 3' : 'Java 26'}
                  </span>
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
                          fontSize: '0.8125rem',
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>
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

                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                    {submission?.runtimeId?.includes('python') || submission?.language?.toLowerCase() === 'python' || currentLang === 'python'
                      ? 'Python 3 Sandbox'
                      : 'Java 26 Sandbox'}
                  </span>
                </div>

                {submitLoading && (
                  <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#2563eb' }}>
                    <span style={{ fontSize: '1.25rem' }}>⏳</span>
                    <span style={{ fontSize: '0.875rem' }}>
                      El sandbox de {currentLang === 'python' ? 'Python 3' : 'Java 26'} está ejecutando las pruebas públicas y privadas en un contenedor aislado...
                    </span>
                  </div>
                )}

                {evaluation && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: evaluation.score >= 100 ? '#15803d' : evaluation.score > 0 ? '#d97706' : '#b91c1c' }}>
                          {evaluation.score}
                        </span>
                        <span style={{ fontSize: '0.9375rem', color: '#64748b', fontWeight: 600 }}>/ 100 pts</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                        <span>Tests superados: <strong style={{ color: '#0f172a' }}>{evaluation.passedTests || 0} / {evaluation.totalTests || 0}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span>Públicos: <strong style={{ color: '#0f172a' }}>{evaluation.passedPublicTests || 0} / {evaluation.totalPublicTests || 0}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span>Privados: <strong style={{ color: '#0f172a' }}>{evaluation.passedPrivateTests || 0} / {evaluation.totalPrivateTests || 0}</strong></span>
                      </div>
                    </div>

                    {evaluation.status === 'COMPILE_ERROR' && evaluation.compileStderr && (
                      <div style={{ marginTop: '0.75rem' }}>
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

            {/* Estado inicial sin ejecuciones */}
            {!previewLoading && !submitLoading && !previewResult && !evaluation && !errorMsg && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  minHeight: '100px',
                  color: '#94a3b8',
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  Pulsa <strong>▶ Probar</strong> para verificar tu código con los tests públicos o <strong>✓ Entregar</strong> para la evaluación oficial.
                </p>
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
