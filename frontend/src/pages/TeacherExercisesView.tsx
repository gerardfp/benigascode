import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Exercise, AssetDTO, TeacherCollectionDetail } from '../types';
import { renderMarkdown } from '../utils/markdown';
import { SortableHeader } from '../components/SortableHeader';
import { TagBadge } from '../components/TagBadge';
import { 
  Plus, Search, ArrowLeft, Save, Trash2, Download, Image as ImageIcon, 
  Eye, Columns, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, X, Info,
  Upload, FileText, Archive, Tag as TagIcon, Check, Edit3
} from 'lucide-react';
import { parseExerciseMarkdown, serializeExerciseToMarkdown, CANONICAL_EXERCISE_EXAMPLE } from '../utils/exerciseMarkdown';
import { parseTagExpression } from '../utils/tagExpression';
import { CodeEditor } from '../components/CodeEditor';

export const TeacherExercisesView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const exerciseIdParam = searchParams.get('exerciseId');
  const collectionIdParam = searchParams.get('collectionId');

  // Navigation & List State
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 500;

  // Selected exercises for batch operations & tag management
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [bulkNewTag, setBulkNewTag] = useState('');
  const tagPanelRef = useRef<HTMLDivElement>(null);

  // Tag expression search & selection
  const [tagExpression, setTagExpression] = useState('');
  const lastAppliedTagExprRef = useRef<string | null>(null);

  const parsedTagExpr = useMemo(() => {
    return parseTagExpression(tagExpression);
  }, [tagExpression]);

  const isTagExprActive = !parsedTagExpr.isEmpty && parsedTagExpr.isValid && !!parsedTagExpr.evaluate;

  // Sorting state
  type ExerciseSortKey = 'title' | 'slug' | 'tags' | 'collections' | 'createdAt';
  const [sortKey, setSortKey] = useState<ExerciseSortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: ExerciseSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Collection context for navigation
  const [activeCollection, setActiveCollection] = useState<TeacherCollectionDetail | null>(null);

  // Selected / Editing Exercise State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [assets, setAssets] = useState<AssetDTO[]>([]);

  // Draft & Version State
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'published' | 'error'>('idle');
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const originalPublishedMarkdownRef = useRef<string>('');
  const lastSavedDraftMarkdownRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Markdown Editor State
  const [markdownText, setMarkdownText] = useState<string>('');
  const [markdownPreview, setMarkdownPreview] = useState<boolean>(true);
  const [showAssetsDrawer, setShowAssetsDrawer] = useState<boolean>(false);
  const [isDragOverEditor, setIsDragOverEditor] = useState<boolean>(false);

  // Split ratio with LocalStorage persistence
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('benigascode_teacher_markdown_split_ratio');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 80) return val;
      }
    } catch {}
    return 50; // Default 50% / 50%
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false);

  // Refs for Monaco & inputs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;
  const markdownTextRef = useRef<string>(markdownText);
  markdownTextRef.current = markdownText;
  const handleUploadAndInsertImageRef = useRef<(file: File) => Promise<void>>(async () => {});
  const markdownFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Saving & Uploading status
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto-dismiss status messages (except errors) after 4 seconds
  useEffect(() => {
    if (statusMsg && statusMsg.type !== 'error') {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Window resize handler
  useEffect(() => {
    const handleWindowResize = () => {
      setIsSmallScreen(window.innerWidth < 992);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Splitter drag event listeners
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, newRatio));
      setSplitRatio(clamped);
      try {
        localStorage.setItem('benigascode_teacher_markdown_split_ratio', clamped.toFixed(1));
      } catch {}
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!splitContainerRef.current || !e.touches[0]) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newRatio = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, newRatio));
      setSplitRatio(clamped);
    };

    const handleTouchEnd = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingSplitter]);

  // Real-time parsed markdown for live preview
  const liveParsedMarkdown = useMemo(() => {
    return parseExerciseMarkdown(markdownText);
  }, [markdownText]);

  // Whether current markdown has modifications compared to the latest published baseline
  const isModifiedFromPublished = useMemo(() => {
    if (!selectedId) {
      return Boolean(liveParsedMarkdown.exercise.title?.trim() && liveParsedMarkdown.exercise.slug?.trim());
    }
    return markdownText !== originalPublishedMarkdownRef.current;
  }, [selectedId, markdownText, liveParsedMarkdown]);

  const canPublish = isModifiedFromPublished && !saving && !detailLoading;

  // Unsaved changes check (for warnings when navigating away)
  const isUnsaved = useMemo(() => {
    if (mode !== 'editor') return false;
    if (saving) return true;
    if (draftStatus === 'saving') return true;
    if (!selectedId) {
      return markdownText.trim().length > 0 && markdownText !== CANONICAL_EXERCISE_EXAMPLE;
    }
    const savedBaseline = lastSavedDraftMarkdownRef.current ?? originalPublishedMarkdownRef.current;
    return markdownText !== savedBaseline;
  }, [mode, saving, draftStatus, selectedId, markdownText]);

  // Load exercises list
  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await api.teacherGetExercises();
      setExercises(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al cargar ejercicios' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  // Todas las etiquetas existentes en el catálogo de ejercicios
  const allExerciseTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const ex of exercises) {
      if (!ex.tags) continue;
      for (const t of ex.tags) {
        if (t && t.trim()) {
          tagSet.add(t.trim());
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  // Ejercicios seleccionados
  const selectedExercises = useMemo(() => {
    return exercises.filter(e => selectedExerciseIds.has(e.id));
  }, [exercises, selectedExerciseIds]);

  // Mapa de etiquetas en los ejercicios seleccionados
  const tagsInSelectedExercises = useMemo(() => {
    if (selectedExercises.length === 0) return [];

    const tagMap = new Map<string, {
      tag: string;
      exerciseIdsWithTag: string[];
    }>();

    for (const ex of selectedExercises) {
      if (!ex.tags || ex.tags.length === 0) continue;
      for (const t of ex.tags) {
        if (!t || !t.trim()) continue;
        const cleanTag = t.trim();
        const key = cleanTag.toLowerCase();

        if (!tagMap.has(key)) {
          tagMap.set(key, {
            tag: cleanTag,
            exerciseIdsWithTag: [ex.id],
          });
        } else {
          const item = tagMap.get(key)!;
          if (!item.exerciseIdsWithTag.includes(ex.id)) {
            item.exerciseIdsWithTag.push(ex.id);
          }
        }
      }
    }

    return Array.from(tagMap.values()).sort((a, b) => a.tag.localeCompare(b.tag));
  }, [selectedExercises]);

  // Etiquetas del catálogo que no tenga NINGUNO de los ejercicios seleccionados
  const unassignedAvailableTags = useMemo(() => {
    if (selectedExercises.length === 0) return [];
    const assignedKeys = new Set(tagsInSelectedExercises.map(t => t.tag.toLowerCase()));
    let tags = allExerciseTags.filter(t => !assignedKeys.has(t.toLowerCase()));
    if (unassignedSearch.trim()) {
      const q = unassignedSearch.toLowerCase();
      tags = tags.filter(t => t.toLowerCase().includes(q));
    }
    return tags;
  }, [selectedExercises, tagsInSelectedExercises, allExerciseTags, unassignedSearch]);

  const handleToggleExercise = (id: string) => {
    setSelectedExerciseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisible = currentExercises.map(e => e.id);
    const allSelected = allVisible.length > 0 && allVisible.every(id => selectedExerciseIds.has(id));
    if (allSelected) {
      setSelectedExerciseIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedExerciseIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedExerciseIds(new Set());
  };

  const handleBatchAssignTag = async (tagStr: string, targetExerciseIds?: string[]) => {
    const ids = targetExerciseIds && targetExerciseIds.length > 0
      ? targetExerciseIds
      : Array.from(selectedExerciseIds);
    if (ids.length === 0 || !tagStr.trim()) return;

    setBatchSubmitting(true);
    try {
      await api.batchAssignExerciseTag(ids, tagStr.trim());
      await loadExercises();
    } catch (err: any) {
      alert(err.message || 'Error al asignar la etiqueta en lote');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchRevokeTag = async (tagStr: string, targetExerciseIds?: string[]) => {
    const ids = targetExerciseIds && targetExerciseIds.length > 0
      ? targetExerciseIds
      : Array.from(selectedExerciseIds);
    if (ids.length === 0 || !tagStr.trim()) return;

    setBatchSubmitting(true);
    try {
      await api.batchRevokeExerciseTag(ids, tagStr.trim());
      await loadExercises();
    } catch (err: any) {
      alert(err.message || 'Error al revocar la etiqueta en lote');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBulkCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = bulkNewTag.trim();
    if (!tag || selectedExerciseIds.size === 0) return;

    setBatchSubmitting(true);
    try {
      await api.batchAssignExerciseTag(Array.from(selectedExerciseIds), tag);
      setBulkNewTag('');
      await loadExercises();
    } catch (err: any) {
      alert(err.message || 'Error al añadir la etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Load collection details if collectionIdParam is present
  useEffect(() => {
    if (collectionIdParam) {
      api.teacherGetCollection(collectionIdParam)
        .then((col) => setActiveCollection(col))
        .catch(() => setActiveCollection(null));
    } else {
      setActiveCollection(null);
    }
  }, [collectionIdParam]);

  // Sync mode with URL param
  useEffect(() => {
    if (exerciseIdParam) {
      if (selectedId !== exerciseIdParam) {
        handleOpenEdit(exerciseIdParam);
      }
    } else if (mode === 'editor' && !selectedId) {
      // creating new exercise
    } else if (!exerciseIdParam && mode === 'editor') {
      setMode('list');
      setSelectedId(null);
    }
  }, [exerciseIdParam]);

  // Filter and sort exercises
  const filteredExercises = useMemo(() => {
    let result = exercises;

    // 1. Búsqueda textual (título, identificador / slug)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q)
      );
    }

    // 2. Selección / filtrado por expresión booleana de etiquetas
    if (isTagExprActive && parsedTagExpr.evaluate) {
      result = result.filter((e) => parsedTagExpr.evaluate!(e.tags || []));
    }

    return [...result].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (sortKey === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortKey === 'slug') {
        valA = a.slug.toLowerCase();
        valB = b.slug.toLowerCase();
      } else if (sortKey === 'tags') {
        valA = (a.tags || []).join(', ').toLowerCase();
        valB = (b.tags || []).join(', ').toLowerCase();
      } else if (sortKey === 'collections') {
        valA = (a.collections || []).join(', ').toLowerCase();
        valB = (b.collections || []).join(', ').toLowerCase();
      } else if (sortKey === 'createdAt') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [exercises, searchTerm, isTagExprActive, parsedTagExpr, sortKey, sortDir]);

  // Cantidad de ejercicios que coinciden con los criterios actuales
  const matchingCount = useMemo(() => {
    if (!isTagExprActive || !parsedTagExpr.evaluate) return 0;
    return exercises.filter((e) => {
      if (!parsedTagExpr.evaluate!(e.tags || [])) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q);
      }
      return true;
    }).length;
  }, [exercises, isTagExprActive, parsedTagExpr, searchTerm]);

  // Selección automática cuando la expresión de etiquetas es válida
  useEffect(() => {
    if (isTagExprActive && parsedTagExpr.evaluate) {
      const matchingIds = new Set<string>();
      for (const e of exercises) {
        if (!parsedTagExpr.evaluate(e.tags || [])) continue;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          if (!e.title.toLowerCase().includes(q) && !e.slug.toLowerCase().includes(q)) {
            continue;
          }
        }
        matchingIds.add(e.id);
      }
      lastAppliedTagExprRef.current = tagExpression;
      setSelectedExerciseIds(matchingIds);
    } else if (parsedTagExpr.isEmpty) {
      if (lastAppliedTagExprRef.current !== null) {
        lastAppliedTagExprRef.current = null;
        setSelectedExerciseIds(new Set());
      }
    }
  }, [tagExpression, isTagExprActive, parsedTagExpr, exercises, searchTerm]);

  // Exercises list for navigation
  const navigationExercises = useMemo(() => {
    if (activeCollection && activeCollection.exercises && activeCollection.exercises.length > 0) {
      return activeCollection.exercises.map((item) => ({
        id: item.exerciseId,
        title: item.exerciseTitle,
        slug: item.exerciseSlug
      }));
    }
    return filteredExercises;
  }, [activeCollection, filteredExercises]);

  const currentExerciseIndex = useMemo(() => {
    if (!selectedId) return -1;
    return navigationExercises.findIndex((e) => e.id === selectedId);
  }, [navigationExercises, selectedId]);

  const hasPrevExercise = currentExerciseIndex > 0;
  const hasNextExercise = currentExerciseIndex >= 0 && currentExerciseIndex < navigationExercises.length - 1;

  const handleNavigateExercise = (direction: 'prev' | 'next') => {
    if (isUnsaved) {
      if (!confirm('Tienes cambios pendientes de guardar en el borrador. Si cambias de ejercicio, se perderán las últimas modificaciones no guardadas. ¿Deseas continuar de todos modos?')) {
        return;
      }
    }
    const targetIndex = direction === 'prev' ? currentExerciseIndex - 1 : currentExerciseIndex + 1;
    if (targetIndex < 0 || targetIndex >= navigationExercises.length) return;
    const target = navigationExercises[targetIndex];
    handleOpenEdit(target.id);
  };

  const handleBack = () => {
    if (isUnsaved) {
      if (!confirm('Tienes cambios pendientes de guardar en el borrador. Si sales ahora, se perderán las últimas modificaciones no guardadas. ¿Deseas salir de todos modos?')) {
        return;
      }
    }
    if (collectionIdParam) {
      navigate(`/teacher/collections?collectionId=${collectionIdParam}`);
    } else {
      setMode('list');
      setSelectedId(null);
      setSearchParams({});
    }
    setStatusMsg(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredExercises.length / pageSize));
  const currentExercises = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExercises.slice(start, start + pageSize);
  }, [filteredExercises, page, pageSize]);

  // Open Editor for an existing exercise
  const handleOpenEdit = async (id: string, colId?: string) => {
    try {
      setDetailLoading(true);
      setStatusMsg(null);
      const effectiveCol = colId !== undefined ? colId : collectionIdParam;
      if (effectiveCol) {
        setSearchParams({ exerciseId: id, collectionId: effectiveCol });
      } else {
        setSearchParams({ exerciseId: id });
      }
      const detail = await api.teacherGetExercise(id);
      setSelectedId(detail.id);

      // Load templates
      const initialTemplates: Record<string, string> = { java: '', python: '' };
      if (detail.templates) {
        Object.entries(detail.templates).forEach(([k, v]) => {
          if (v && v.trim()) {
            const rawKey = k.toLowerCase().trim();
            const normKey = (rawKey.startsWith('python') || rawKey === 'py') ? 'python' : ((rawKey.startsWith('java') || rawKey === 'java-26') ? 'java' : rawKey);
            if (!initialTemplates[normKey]) {
              initialTemplates[normKey] = v;
            }
          }
        });
      }
      const hasAny = Object.values(initialTemplates).some((v) => Boolean(v?.trim()));
      if (!hasAny && detail.starterCode && detail.starterCode.trim()) {
        const rawLang = (detail.language || '').toLowerCase().trim();
        const normLang = (rawLang.startsWith('python') || rawLang === 'py') ? 'python' : 'java';
        initialTemplates[normLang] = detail.starterCode;
      }

      // Convert DB representation into markdown block
      const serialized = serializeExerciseToMarkdown({
        title: detail.title || '',
        slug: detail.slug || '',
        tags: detail.tags || [],
        statement: detail.statement || '',
        templates: initialTemplates,
        testCases: detail.testCases || []
      });

      setMarkdownText(serialized);
      originalPublishedMarkdownRef.current = serialized;

      if (detail.hasDraft && detail.draftMarkdown) {
        setMarkdownText(detail.draftMarkdown);
        markdownTextRef.current = detail.draftMarkdown;
        lastSavedDraftMarkdownRef.current = detail.draftMarkdown;
        setHasDraft(true);
        setDraftStatus('saved');
        setDraftSavedAt(detail.draftUpdatedAt ? new Date(detail.draftUpdatedAt) : null);
      } else {
        setMarkdownText(serialized);
        markdownTextRef.current = serialized;
        lastSavedDraftMarkdownRef.current = null;
        setHasDraft(false);
        setDraftStatus('idle');
        setDraftSavedAt(null);
      }

      setAssets(detail.assets || []);
      setVersionNumber(detail.versionNumber || 1);
      setMode('editor');
    } catch (err: any) {
      alert('Error cargando ejercicio: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Editor for a new exercise
  const handleOpenCreate = () => {
    setSelectedId(null);
    setSearchParams(collectionIdParam ? { collectionId: collectionIdParam } : {});
    setAssets([]);
    setVersionNumber(1);
    setMarkdownText(CANONICAL_EXERCISE_EXAMPLE);
    markdownTextRef.current = CANONICAL_EXERCISE_EXAMPLE;
    originalPublishedMarkdownRef.current = '';
    lastSavedDraftMarkdownRef.current = null;
    setHasDraft(false);
    setDraftStatus('idle');
    setDraftSavedAt(null);
    setStatusMsg(null);
    setMode('editor');
  };

  // Load canonical example into editor
  const handleLoadMarkdownExample = () => {
    if (markdownText.trim().length > 0 && !confirm('¿Deseas reemplazar el contenido actual con la plantilla de ejemplo?')) {
      return;
    }
    setMarkdownText(CANONICAL_EXERCISE_EXAMPLE);
    setStatusMsg({ type: 'info', text: 'Plantilla canónica cargada en el editor.' });
  };

  // Export current markdown as .md file
  const handleExportMarkdownFile = () => {
    const parsed = parseExerciseMarkdown(markdownText);
    const filename = `${parsed.exercise.slug || 'ejercicio'}.md`;
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import .md file into current editor
  const handleImportMarkdownFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMarkdownText(content);
        setStatusMsg({ type: 'success', text: `Archivo "${file.name}" importado correctamente.` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // Helper to ensure exercise is saved before attaching assets
  const ensureExerciseSaved = async (): Promise<string | null> => {
    if (selectedIdRef.current) return selectedIdRef.current;

    const currentMarkdown = editorRef.current ? editorRef.current.getValue() : markdownTextRef.current;
    const parsed = parseExerciseMarkdown(currentMarkdown);
    const exTitle = parsed.exercise.title?.trim();
    if (!exTitle || exTitle === 'Ejercicio sin título') {
      alert('Por favor, indica primero un título (# Título) para el ejercicio antes de subir o pegar imágenes.');
      return null;
    }

    try {
      setSaving(true);
      const cleanTemplates: Record<string, string> = {};
      Object.entries(parsed.exercise.templates || {}).forEach(([k, v]) => {
        if (v && v.trim()) cleanTemplates[k] = v;
      });
      const primaryStarter = cleanTemplates['java'] || Object.values(cleanTemplates)[0] || '';

      const saved = await api.teacherSaveExercise({
        title: exTitle,
        slug: parsed.exercise.slug?.trim() || 'ejercicio-' + Date.now(),
        statement: parsed.exercise.statement || '',
        starterCode: primaryStarter,
        templates: cleanTemplates,
        language: cleanTemplates['java'] ? 'java' : (Object.keys(cleanTemplates)[0] || 'java'),
        runtimeId: cleanTemplates['java'] ? 'java-26' : (cleanTemplates['python'] ? 'python-314' : 'java-26'),
        tags: parsed.exercise.tags || [],
        testCases: parsed.exercise.testCases || []
      });

      selectedIdRef.current = saved.id;
      setSelectedId(saved.id);
      setVersionNumber(saved.versionNumber || 1);
      setSearchParams(collectionIdParam ? { exerciseId: saved.id, collectionId: collectionIdParam } : { exerciseId: saved.id });
      return saved.id;
    } catch (err: any) {
      alert('Error al guardar el ejercicio inicial para asociar la imagen: ' + (err.message || 'Error desconocido'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Insert markdown snippet at current cursor in Monaco Editor
  const insertMarkdownAtCursor = (snippet: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (editor && monaco) {
      const selection = editor.getSelection();
      const position = editor.getPosition();
      const range = selection && !selection.isEmpty()
        ? selection
        : position
        ? new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
        : new monaco.Range(1, 1, 1, 1);

      editor.executeEdits('insert-image', [
        {
          range,
          text: snippet,
          forceMoveMarkers: true,
        },
      ]);
      editor.pushUndoStop();
      editor.focus();

      const updatedVal = editor.getValue();
      setMarkdownText(updatedVal);
      markdownTextRef.current = updatedVal;
    } else {
      setMarkdownText((prev) => {
        const next = prev + snippet;
        markdownTextRef.current = next;
        return next;
      });
    }
  };

  // Upload and insert an asset image into the active exercise & editor
  const handleUploadAndInsertImage = async (file: File) => {
    const currentExId = await ensureExerciseSaved();
    if (!currentExId) return;

    try {
      setUploadingAsset(true);
      let fileToUpload = file;
      if (!file.name || file.name === 'image.png' || file.name.startsWith('blob')) {
        const ext = file.type ? (file.type.split('/')[1] || 'png') : 'png';
        const cleanExt = ext === 'jpeg' ? 'jpg' : ext.replace(/[^a-z0-9]/gi, '');
        const uniqueName = `img_${Date.now()}.${cleanExt || 'png'}`;
        fileToUpload = new File([file], uniqueName, { type: file.type || 'image/png' });
      }

      const newAsset = await api.teacherUploadAsset(currentExId, fileToUpload);
      setAssets((prev) => [...prev.filter((a) => a.filename !== newAsset.filename), newAsset]);

      const imgMarkdown = `\n![${newAsset.filename}](${newAsset.filename})\n`;
      insertMarkdownAtCursor(imgMarkdown);

      setStatusMsg({ type: 'success', text: `Imagen "${newAsset.filename}" subida e insertada.` });
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      alert('Error subiendo imagen: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingAsset(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };
  handleUploadAndInsertImageRef.current = handleUploadAndInsertImage;

  // Delete an asset from the exercise
  const handleDeleteAsset = async (filename: string) => {
    const exId = selectedIdRef.current || selectedId;
    if (!exId) return;
    if (!confirm(`¿Seguro que deseas eliminar la imagen "${filename}" del servidor?`)) return;
    try {
      await api.teacherDeleteAsset(exId, filename);
      setAssets((prev) => prev.filter((a) => a.filename !== filename));
      setStatusMsg({ type: 'success', text: `Imagen "${filename}" eliminada.` });
    } catch (err: any) {
      alert('Error eliminando imagen: ' + (err.message || 'Error desconocido'));
    }
  };

  // Helper to extract image file from DataTransfer (used by drop & paste)
  const extractImageFile = (dataTransfer: DataTransfer | null): File | null => {
    if (!dataTransfer) return null;

    // 1. Check DataTransferItemList (standard clipboard image items)
    const items = dataTransfer.items;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/') || item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) return file;
        }
      }
    }

    // 2. Check FileList (e.g. dragging/pasting file from OS explorer)
    const files = dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name)) {
          return file;
        }
      }
    }

    return null;
  };

  // Monaco Editor onMount handler: attach paste & drop listeners
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const domNode = editor.getDomNode();
    if (!domNode) return;

    // Paste event listener (intercept clipboard images with capture phase)
    const onPaste = async (e: ClipboardEvent) => {
      const imgFile = extractImageFile(e.clipboardData);
      if (imgFile) {
        e.preventDefault();
        e.stopPropagation();
        await handleUploadAndInsertImageRef.current(imgFile);
      }
    };

    // Drag & drop event listeners on editor DOM
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOverEditor(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOverEditor(false);
    };

    const onDrop = async (e: DragEvent) => {
      setIsDragOverEditor(false);
      const imgFile = extractImageFile(e.dataTransfer);
      if (imgFile) {
        e.preventDefault();
        e.stopPropagation();

        const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
        if (target?.position) {
          editor.setPosition(target.position);
        }

        await handleUploadAndInsertImageRef.current(imgFile);
      }
    };

    domNode.addEventListener('paste', onPaste, true);
    domNode.addEventListener('dragover', onDragOver, true);
    domNode.addEventListener('dragleave', onDragLeave, true);
    domNode.addEventListener('drop', onDrop, true);

    // KeyDown interceptor for Ctrl+V / Cmd+V with navigator.clipboard as fallback
    editor.onKeyDown(async (e: any) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
        if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
          try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
              const imageType = item.types.find((t: string) => t.startsWith('image/'));
              if (imageType) {
                e.preventDefault();
                e.stopPropagation();
                const blob = await item.getType(imageType);
                const ext = imageType.split('/')[1] || 'png';
                const file = new File([blob], `pasted_img_${Date.now()}.${ext}`, { type: imageType });
                await handleUploadAndInsertImageRef.current(file);
                return;
              }
            }
          } catch (clipErr) {
            // Silently allow default / paste event capture to proceed
          }
        }
      }
    });
  };

  // Additional container-level paste listener as extra safety net
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const onContainerPaste = async (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const imgFile = extractImageFile(e.clipboardData);
      if (imgFile) {
        e.preventDefault();
        e.stopPropagation();
        await handleUploadAndInsertImageRef.current(imgFile);
      }
    };

    container.addEventListener('paste', onContainerPaste, true);
    return () => {
      container.removeEventListener('paste', onContainerPaste, true);
    };
  }, [mode]);

  // Save exercise directly from Markdown text
  // Warning when closing or reloading the tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUnsaved]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (mode === 'editor') {
          e.preventDefault();
          if (selectedId) {
            handleSaveDraft();
          } else if (canPublish) {
            handleSave();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedId, markdownText, canPublish]);

  // Auto-save draft effect with 1500ms debounce
  useEffect(() => {
    if (mode !== 'editor' || !selectedId || detailLoading || saving) {
      return;
    }

    const baseline = lastSavedDraftMarkdownRef.current ?? originalPublishedMarkdownRef.current;
    if (markdownText === baseline) {
      return;
    }

    setDraftStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const saved = await api.teacherSaveExerciseDraft(selectedId, markdownText);
        lastSavedDraftMarkdownRef.current = markdownText;
        setHasDraft(true);
        setDraftStatus('saved');
        setDraftSavedAt(new Date(saved.updatedAt));
      } catch (err) {
        console.error('Error auto-saving draft:', err);
        setDraftStatus('error');
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [markdownText, mode, selectedId, detailLoading, saving]);

  // Manual save draft
  const handleSaveDraft = async () => {
    if (!selectedId) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setDraftStatus('saving');
    try {
      const saved = await api.teacherSaveExerciseDraft(selectedId, markdownText);
      lastSavedDraftMarkdownRef.current = markdownText;
      setHasDraft(true);
      setDraftStatus('saved');
      setDraftSavedAt(new Date(saved.updatedAt));
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setDraftStatus('error');
      setStatusMsg({ type: 'error', text: 'Error al guardar el borrador: ' + (err.message || 'Error de red') });
    }
  };

  // Discard draft and revert to latest published version
  const handleDiscardDraft = async () => {
    if (!selectedId || !hasDraft) return;
    if (!confirm(`¿Deseas descartar el borrador y volver a la última versión publicada (v${versionNumber})? Se perderán las modificaciones no publicadas.`)) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    try {
      await api.teacherDeleteExerciseDraft(selectedId);
      setMarkdownText(originalPublishedMarkdownRef.current);
      markdownTextRef.current = originalPublishedMarkdownRef.current;
      lastSavedDraftMarkdownRef.current = null;
      setHasDraft(false);
      setDraftStatus('idle');
      setDraftSavedAt(null);
      setStatusMsg({ type: 'info', text: 'Borrador descartado. Se ha restaurado la versión publicada.' });
    } catch (err: any) {
      alert('Error descartando borrador: ' + err.message);
    }
  };

  // Save exercise directly from Markdown text (Publicar nueva versión)
  const handleSave = async () => {
    const parsed = parseExerciseMarkdown(markdownText);
    if (!parsed.exercise.title || !parsed.exercise.title.trim()) {
      setStatusMsg({ type: 'error', text: 'El documento Markdown debe contener al menos un título (# Título del Ejercicio).' });
      return;
    }
    if (!parsed.exercise.slug || !parsed.exercise.slug.trim()) {
      setStatusMsg({ type: 'error', text: 'El identificador (slug) es obligatorio.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const cleanTemplates: Record<string, string> = {};
      Object.entries(parsed.exercise.templates || {}).forEach(([k, v]) => {
        if (v && v.trim()) cleanTemplates[k] = v;
      });
      const primaryStarter = cleanTemplates['java'] || Object.values(cleanTemplates)[0] || '';

      const payload = {
        title: parsed.exercise.title.trim(),
        slug: parsed.exercise.slug.trim(),
        statement: parsed.exercise.statement,
        starterCode: primaryStarter,
        templates: cleanTemplates,
        language: cleanTemplates['java'] ? 'java' : (Object.keys(cleanTemplates)[0] || 'java'),
        runtimeId: cleanTemplates['java'] ? 'java-26' : (cleanTemplates['python'] ? 'python-314' : 'java-26'),
        tags: parsed.exercise.tags || [],
        testCases: parsed.exercise.testCases || []
      };

      const result = await api.teacherSaveExercise(payload, selectedId || undefined);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (!selectedId) {
        setSelectedId(result.id);
        setSearchParams(collectionIdParam ? { exerciseId: result.id, collectionId: collectionIdParam } : { exerciseId: result.id });
      }

      originalPublishedMarkdownRef.current = markdownText;
      lastSavedDraftMarkdownRef.current = null;
      setHasDraft(false);
      setDraftStatus('published');
      setDraftSavedAt(null);

      setVersionNumber(result.versionNumber || 1);
      setAssets(result.assets || []);
      setStatusMsg({ type: 'success', text: `Ejercicio "${result.title}" guardado correctamente (v${result.versionNumber || 1}).` });
      setStatusMsg({ type: 'success', text: `Ejercicio "${result.title}" publicado correctamente (v${result.versionNumber || 1}).` });

      loadExercises();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al guardar el ejercicio.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (id: string, exTitle: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el ejercicio "${exTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api.teacherDeleteExercise(id);
      setExercises((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) {
        setMode('list');
      }
    } catch (err: any) {
      alert('Error eliminando ejercicio: ' + err.message);
    }
  };

  // RENDER: LIST VIEW
  if (mode === 'list') {
    return (
      <div className="app-container">
        {/* MARCO DE ASIGNACIÓN DE ETIQUETAS (Visible al seleccionar 1 o más ejercicios) */}
        {selectedExerciseIds.size > 0 && (
          <div
            ref={tagPanelRef}
            className="card"
            style={{
              marginBottom: '1.5rem',
              border: '2px solid #2563eb',
              borderRadius: '0.75rem',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.15)',
              background: '#ffffff',
            }}
          >
            {/* Cabecera del Marco */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                background: '#eff6ff',
                borderBottom: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ background: '#2563eb', color: '#fff', borderRadius: '0.375rem', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TagIcon size={16} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Asignación de etiquetas
                  </h2>
                  <div style={{ fontSize: '0.8125rem', color: '#1d4ed8' }}>
                    {selectedExercises.length === 1 ? (
                      <span><strong>{selectedExercises[0].title}</strong> ({selectedExercises[0].slug})</span>
                    ) : (
                      <strong>{selectedExerciseIds.size} ejercicios seleccionados</strong>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearSelection}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: '#ffffff' }}
              >
                Deseleccionar todos
              </button>
            </div>

            {/* Contenido: 2 Columnas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '1.5rem',
                padding: '1.25rem',
              }}
            >
              {/* LADO IZQUIERDO: Etiquetas en ejercicios seleccionados */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Etiquetas en ejercicios seleccionados ({tagsInSelectedExercises.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                  {tagsInSelectedExercises.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      Ninguno de los ejercicios seleccionados tiene etiquetas activas.
                    </div>
                  ) : (
                    tagsInSelectedExercises.map(tagInfo => {
                      const count = tagInfo.exerciseIdsWithTag.length;
                      const total = selectedExercises.length;
                      const isAll = count === total;
                      const unassignedExercises = selectedExercises.filter(e => !tagInfo.exerciseIdsWithTag.includes(e.id)).map(e => e.id);

                      return (
                        <div
                          key={tagInfo.tag}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.375rem',
                            padding: '0.4rem 0.625rem',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                            <TagBadge value={tagInfo.tag} />

                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.375rem',
                                borderRadius: '9999px',
                                background: isAll ? '#dcfce7' : '#fef3c7',
                                color: isAll ? '#166534' : '#92400e',
                                border: `1px solid ${isAll ? '#bbf7d0' : '#fde68a'}`,
                                whiteSpace: 'nowrap',
                              }}
                              title={isAll ? 'Todos los ejercicios seleccionados tienen esta etiqueta' : `${count} de ${total} ejercicios seleccionados tienen esta etiqueta`}
                            >
                              {count}/{total} {count === 1 ? 'ejercicio' : 'ejercicios'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {/* Botón '+' para asignarla a todos los seleccionados que no la tengan */}
                            <button
                              type="button"
                              disabled={batchSubmitting || isAll}
                              onClick={() => handleBatchAssignTag(tagInfo.tag, unassignedExercises)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '0.25rem',
                                border: isAll ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                background: isAll ? '#f1f5f9' : '#eff6ff',
                                color: isAll ? '#94a3b8' : '#1d4ed8',
                                cursor: isAll ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                              }}
                              title={isAll ? 'Ya asignada a todos los ejercicios seleccionados' : `Asignar a los ${unassignedExercises.length} ejercicios restantes`}
                            >
                              {isAll ? <Check size={14} /> : <Plus size={14} />}
                            </button>

                            {/* Botón 'x' para eliminarla de todos los seleccionados que la tengan */}
                            <button
                              type="button"
                              disabled={batchSubmitting}
                              onClick={() => handleBatchRevokeTag(tagInfo.tag, tagInfo.exerciseIdsWithTag)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '0.25rem',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              title={`Quitar de los ${count} ejercicios que la tienen`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* LADO DERECHO: Todas las etiquetas existentes en el catálogo que no tenga ninguno de los ejercicios seleccionados */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Etiquetas no asignadas ({unassignedAvailableTags.length})
                  </h3>
                </div>

                {/* Buscador de etiquetas no asignadas */}
                {allExerciseTags.length > 5 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Buscar etiqueta no asignada..."
                      value={unassignedSearch}
                      onChange={e => setUnassignedSearch(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto' }}>
                  {unassignedAvailableTags.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      {unassignedSearch ? 'No se encontraron etiquetas con ese término.' : 'No hay más etiquetas existentes en otros ejercicios.'}
                    </div>
                  ) : (
                    unassignedAvailableTags.map(tag => (
                      <div
                        key={tag}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          padding: '0.4rem 0.625rem',
                          gap: '0.5rem',
                        }}
                      >
                        <TagBadge value={tag} />

                        <button
                          type="button"
                          disabled={batchSubmitting}
                          onClick={() => handleBatchAssignTag(tag, Array.from(selectedExerciseIds))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '0.25rem',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          title="Asignar a todos los ejercicios seleccionados"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* PARTE INFERIOR: Espacio para crear etiqueta y asignarla a todos los seleccionados */}
            <div
              style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '0.875rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem' }}>
                Añadir nueva etiqueta a todos los ejercicios seleccionados
              </div>
              <form
                onSubmit={handleBulkCreateAndAssign}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 240, flex: 1 }}>
                  <input
                    type="text"
                    required
                    placeholder="Nueva etiqueta (ej. strings, bucles, recursividad)..."
                    value={bulkNewTag}
                    onChange={e => setBulkNewTag(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={batchSubmitting || !bulkNewTag.trim()}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} /> Añadir a seleccionados
                </button>
              </form>
            </div>
          </div>
        )}

        {/* List Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Toolbar de búsqueda, selección por etiquetas y acciones pegado a la tabla */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: '1rem', flex: '1 1 500px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* 1. Búsqueda Textual */}
              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por título o identificador (slug)..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', paddingRight: searchTerm ? '2rem' : '0.75rem', width: '100%', fontSize: '0.875rem' }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setPage(1); }}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                    title="Limpiar búsqueda textual"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 2. Selección por Etiquetas */}
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <TagIcon size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: tagExpression.trim() ? (parsedTagExpr.isValid ? '#2563eb' : '#dc2626') : '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Selección por etiquetas: ej. (strings && arrays) || !variables"
                  value={tagExpression}
                  onChange={(e) => { setTagExpression(e.target.value); setPage(1); }}
                  className="input-field"
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: tagExpression ? '2rem' : '0.75rem',
                    width: '100%',
                    fontSize: '0.875rem',
                    borderColor: tagExpression.trim() ? (parsedTagExpr.isValid ? '#86efac' : '#fca5a5') : undefined,
                    backgroundColor: tagExpression.trim() ? (parsedTagExpr.isValid ? '#f0fdf4' : '#fff5f5') : undefined,
                  }}
                  title={tagExpression.trim() ? (parsedTagExpr.isValid ? `Expresión válida (${matchingCount} seleccionados)` : (parsedTagExpr.error || 'Expresión incompleta')) : undefined}
                />
                {tagExpression && (
                  <button
                    type="button"
                    onClick={() => { setTagExpression(''); setPage(1); }}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                    title="Limpiar expresión de etiquetas"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Botón Crear Ejercicio */}
            <button
              onClick={handleOpenCreate}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} /> Crear Ejercicio
            </button>
          </div>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando ejercicios...</div>
          ) : filteredExercises.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No se encontraron ejercicios con ese criterio.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem 1rem', width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={currentExercises.length > 0 && currentExercises.every(e => selectedExerciseIds.has(e.id))}
                        ref={input => {
                          if (input) {
                            const someSelected = currentExercises.some(e => selectedExerciseIds.has(e.id));
                            const allSelected = currentExercises.length > 0 && currentExercises.every(e => selectedExerciseIds.has(e.id));
                            input.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onChange={handleSelectAllVisible}
                        title="Seleccionar todos los ejercicios visibles"
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                    <SortableHeader
                      label="Título"
                      sortKey="title"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                    />
                    <SortableHeader
                      label="Etiquetas"
                      sortKey="tags"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                    />
                    <SortableHeader
                      label="Slug"
                      sortKey="slug"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                    />
                    <SortableHeader
                      label="Colecciones"
                      sortKey="collections"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                    />
                    <SortableHeader
                      label="Creado"
                      sortKey="createdAt"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                    />
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExercises.map((ex) => {
                    const isSelected = selectedExerciseIds.has(ex.id);
                    return (
                      <tr
                        key={ex.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : undefined,
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        <td style={{ padding: '1rem', width: 44, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleExercise(ex.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td
                          onClick={() => handleOpenEdit(ex.id)}
                          style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                          title="Editar ejercicio"
                        >
                          <div style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}>{ex.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}>
                              {ex.title}
                            </span>
                            {ex.hasDraft && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.35rem',
                                  fontWeight: 600,
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  borderRadius: '0.25rem',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap'
                                }}
                                title="Este ejercicio tiene cambios en borrador no publicados"
                              >
                                Borrador
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          {ex.tags && ex.tags.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {ex.tags.map((t, idx) => (
                                <TagBadge
                                  key={idx}
                                  value={t}
                                />
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>Sin etiquetas</span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'monospace', color: '#64748b' }}>
                          {ex.slug}
                        </td>
                        <td style={{ padding: '0.875rem 1.25rem', color: '#64748b' }}>
                          {ex.collections && ex.collections.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {ex.collections.map((col, idx) => (
                                <span
                                  key={idx}
                                  className="badge badge-secondary"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  📚 {col}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>Ninguna</span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1.25rem', color: '#64748b', fontSize: '0.8125rem' }}>
                          {ex.createdAt ? new Date(ex.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(ex.id)}
                            className="btn-table-action"
                            title="Editar ejercicio"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(ex.id, ex.title)}
                            className="btn-table-action-danger"
                            title="Eliminar ejercicio"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Mostrando {filteredExercises.length > 0 ? (page - 1) * pageSize + 1 : 0} a {Math.min(page * pageSize, filteredExercises.length)} de {filteredExercises.length} ejercicios
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem', opacity: page === 1 ? 0.5 : 1 }}
                  >
                    Anterior
                  </button>
                  <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', alignSelf: 'center', fontWeight: 500 }}>
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem', opacity: page === totalPages ? 0.5 : 1 }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: '#64748b' }}>Cargando ejercicio...</p>
      </div>
    );
  }

  // RENDER: SINGLE-SHEET EDITOR VIEW
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
      {/* Toast Notification */}
      {statusMsg && (
        <div
          style={{
            position: 'fixed',
            top: '75px',
            right: '20px',
            zIndex: 9999,
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            maxWidth: '480px',
            backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : (statusMsg.type === 'info' ? '#eff6ff' : '#fef2f2'),
            color: statusMsg.type === 'success' ? '#166534' : (statusMsg.type === 'info' ? '#1e40af' : '#991b1b'),
            border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : (statusMsg.type === 'info' ? '#bfdbfe' : '#fecaca')}`
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : (statusMsg.type === 'info' ? <Info size={18} /> : <AlertCircle size={18} />)}
          <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
              opacity: 0.7
            }}
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hidden file input for importing markdown into the active exercise */}
      <input
        type="file"
        ref={markdownFileInputRef}
        accept=".md,.markdown,text/markdown"
        style={{ display: 'none' }}
        onChange={handleImportMarkdownFile}
      />

      {/* Hidden file input for uploading images */}
      <input
        type="file"
        ref={imageFileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await handleUploadAndInsertImage(file);
          }
        }}
      />

      <div
        ref={splitContainerRef}
        style={{
          display: 'flex',
          flexDirection: isSmallScreen ? 'column' : 'row',
          gap: isSmallScreen ? '0.75rem' : 0,
          alignItems: 'stretch',
          width: '100%',
          userSelect: isDraggingSplitter ? 'none' : 'auto',
          flex: isSmallScreen ? 'none' : 1,
          minHeight: 0,
          height: isSmallScreen ? 'auto' : '100%',
          overflow: isSmallScreen ? 'visible' : 'hidden',
        }}
      >
        {/* Panel Izquierdo: Editor Markdown con Cabecera */}
        <div
          style={{
            width: isSmallScreen || !markdownPreview ? '100%' : `calc(${splitRatio}% - 4px)`,
            minWidth: isSmallScreen ? undefined : '280px',
            maxWidth: isSmallScreen || !markdownPreview ? undefined : '80%',
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
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              height: isSmallScreen ? '560px' : '100%',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
              outline: isDragOverEditor ? '2px dashed #3b82f6' : 'none',
              outlineOffset: '-2px',
            }}
            onDragOver={(e) => {
              if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setIsDragOverEditor(true);
              }
            }}
            onDragLeave={() => setIsDragOverEditor(false)}
            onDrop={async (e) => {
              setIsDragOverEditor(false);
              const files = e.dataTransfer?.files;
              if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                  if (files[i].type.startsWith('image/')) {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleUploadAndInsertImage(files[i]);
                    return;
                  }
                }
              }
            }}
          >
            {/* Cabecera del Panel Editor */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.35rem 0.5rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0,
                minHeight: '40px',
                boxSizing: 'border-box',
                gap: '0.375rem',
                flexWrap: 'wrap'
              }}
            >
              {/* Izquierda: Volver, Anterior, Siguiente, Versión corta, Colección */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title={collectionIdParam ? 'Volver a la colección' : 'Volver a la lista'}
                >
                  <ArrowLeft size={16} />
                </button>

                {navigationExercises.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavigateExercise('prev')}
                      disabled={!hasPrevExercise}
                      className="btn-secondary"
                      style={{
                        padding: '0.3rem 0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: !hasPrevExercise ? 0.35 : 1,
                        cursor: !hasPrevExercise ? 'not-allowed' : 'pointer'
                      }}
                      title={hasPrevExercise ? `Anterior: ${navigationExercises[currentExerciseIndex - 1]?.title}` : 'No hay ejercicio anterior'}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigateExercise('next')}
                      disabled={!hasNextExercise}
                      className="btn-secondary"
                      style={{
                        padding: '0.3rem 0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: !hasNextExercise ? 0.35 : 1,
                        cursor: !hasNextExercise ? 'not-allowed' : 'pointer'
                      }}
                      title={hasNextExercise ? `Siguiente: ${navigationExercises[currentExerciseIndex + 1]?.title}` : 'No hay ejercicio siguiente'}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                {selectedId && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.4rem',
                      fontWeight: 600,
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      borderRadius: '0.25rem'
                    }}
                    title={`Versión actual: v${versionNumber}`}
                  >
                    v{versionNumber}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.4rem',
                        fontWeight: 600,
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        borderRadius: '0.25rem'
                      }}
                      title={`Versión actual publicada: v${versionNumber}`}
                    >
                      v{versionNumber}
                    </span>
                    {hasDraft && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          fontWeight: 600,
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '0.25rem'
                        }}
                        title="Modificaciones en borrador no publicadas"
                      >
                        Borrador
                      </span>
                    )}
                  </div>
                )}

                {activeCollection && (
                  <span
                    className="badge badge-info"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                    title={`Colección: ${activeCollection.title}`}
                  >
                    📚 {activeCollection.title}
                  </span>
                )}
              </div>

              {/* Derecha: Subir imagen, Plantilla ejemplo, Cargar, Descargar, Exportar ZIP, Vista previa, Guardar */}
              {/* Derecha: Estado borrador, Descartar borrador, Subir imagen, Plantilla ejemplo, Cargar, Descargar, Exportar ZIP, Vista previa, Guardar Borrador, Publicar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                {/* Indicador de estado de guardado de borrador / publicación */}
                {draftStatus === 'saving' && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    💾 Guardando borrador...
                  </span>
                )}
                {draftStatus === 'saved' && (
                  <span style={{ fontSize: '0.8rem', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✓ Borrador guardado {draftSavedAt ? `(${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})` : ''}
                  </span>
                )}
                {draftStatus === 'published' && (
                  <span style={{ fontSize: '0.8rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✓ Publicado v{versionNumber}
                  </span>
                )}
                {draftStatus === 'error' && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⚠️ Error al guardar borrador
                  </span>
                )}

                {/* Descartar borrador si existe */}
                {selectedId && hasDraft && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="btn-secondary"
                    style={{
                      padding: '0.3rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      backgroundColor: '#fef2f2'
                    }}
                    title="Descartar borrador y volver a la versión publicada"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={uploadingAsset}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title={uploadingAsset ? 'Subiendo imagen...' : 'Subir e insertar imagen (o arrastrar / pegar)'}
                >
                  <ImageIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleLoadMarkdownExample}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Cargar plantilla de ejemplo para ver la sintaxis"
                >
                  <FileText size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => markdownFileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Cargar archivo .md desde tu ordenador"
                >
                  <Upload size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdownFile}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Descargar este ejercicio como archivo .md"
                >
                  <Download size={16} />
                </button>
                {selectedId && (
                  <a
                    href={api.teacherExportExerciseZipUrl(selectedId)}
                    download
                    className="btn-secondary"
                    style={{
                      padding: '0.3rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                    title="Exportar ejercicio completo (paquete ZIP)"
                  >
                    <Archive size={16} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setMarkdownPreview(!markdownPreview)}
                  className={markdownPreview ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title={markdownPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
                >
                  <Columns size={16} />
                </button>

                {/* Guardar borrador manual */}
                {selectedId && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={draftStatus === 'saving' || !isModifiedFromPublished}
                    className="btn-secondary"
                    style={{
                      padding: '0.3rem 0.55rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.8rem',
                      opacity: (draftStatus === 'saving' || !isModifiedFromPublished) ? 0.45 : 1,
                      cursor: (draftStatus === 'saving' || !isModifiedFromPublished) ? 'not-allowed' : 'pointer'
                    }}
                    title="Guardar borrador manualmente (Ctrl+S)"
                  >
                    <Save size={15} />
                    <span>Borrador</span>
                  </button>
                )}

                {/* Publicar nueva versión */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  disabled={!canPublish}
                  className="btn-primary"
                  style={{
                    padding: '0.3rem 0.5rem',
                    padding: '0.3rem 0.65rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    opacity: !canPublish ? 0.45 : 1,
                    cursor: !canPublish ? 'not-allowed' : 'pointer'
                  }}
                  title={saving ? 'Guardando ejercicio...' : 'Guardar ejercicio'}
                  title={
                    !canPublish
                      ? (selectedId ? 'No hay modificaciones pendientes de publicar' : 'Introduce título y slug para publicar')
                      : (saving ? 'Publicando nueva versión...' : 'Publicar nueva versión')
                  }
                >
                  <Save size={16} />
                  <Check size={16} />
                  <span>{saving ? 'Publicando...' : 'Publicar'}</span>
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div
              ref={editorContainerRef}
              style={{ flex: 1, minHeight: 0 }}
            >
              <CodeEditor
                value={markdownText}
                onChange={(val) => {
                  setMarkdownText(val);
                  markdownTextRef.current = val;
                }}
                language="markdown"
                height="100%"
                onMount={handleEditorDidMount}
              />
            </div>
          </div>
        </div>

        {/* Separador de 8px (Splitter redimensionable estilo VS Code / ExerciseView) */}
        {markdownPreview && !isSmallScreen && (
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

        {/* Panel Derecho: Vista Previa con estilo idéntico al Alumno */}
        {markdownPreview && (
          <div
            style={{
              width: isSmallScreen ? '100%' : `calc(${100 - splitRatio}% - 4px)`,
              minWidth: isSmallScreen ? undefined : '280px',
              maxWidth: isSmallScreen ? undefined : '80%',
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
                padding: 0,
                height: isSmallScreen ? 'auto' : '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Cabecera del Panel Vista Previa */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0,
                  minHeight: '40px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={17} color="#059669" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    Vista Previa
                  </span>
                </div>

                {assets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAssetsDrawer(!showAssetsDrawer)}
                    className="btn-secondary"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderRadius: '0.375rem'
                    }}
                    title="Ver y gestionar imágenes vinculadas al ejercicio"
                  >
                    <ImageIcon size={13} color="#2563eb" />
                    <span>{assets.length} {assets.length === 1 ? 'imagen' : 'imágenes'}</span>
                  </button>
                )}
              </div>

              {/* Drawer de imágenes adjuntas si está abierto */}
              {showAssetsDrawer && assets.length > 0 && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    borderBottom: '1px solid #bfdbfe',
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1e40af' }}>Imágenes vinculadas:</span>
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        padding: '0.15rem 0.4rem',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{asset.filename}</span>
                      <span style={{ color: '#94a3b8' }}>({(asset.sizeBytes / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => insertMarkdownAtCursor(`\n![${asset.filename}](${asset.filename})\n`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '0 2px', fontWeight: 500 }}
                        title="Insertar etiqueta Markdown en el cursor"
                      >
                        Insertar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.filename)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px' }}
                        title="Eliminar imagen del servidor"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Contenido scrolleable de la vista previa: EXACTAMENTE COMO LO VE UN ALUMNO */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.25rem' }}>
                {/* Warnings / Errors si los hay */}
                {liveParsedMarkdown?.errors && liveParsedMarkdown.errors.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#991b1b' }}>
                    <strong>Atención:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                      {liveParsedMarkdown.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {liveParsedMarkdown?.warnings && liveParsedMarkdown.warnings.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.5rem 0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#92400e' }}>
                    <strong>Aviso:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                      {liveParsedMarkdown.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Título del ejercicio (tal como lo ve el alumno) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    margin: 0,
                    color: liveParsedMarkdown?.exercise.title?.trim() ? '#0f172a' : '#94a3b8',
                    fontStyle: liveParsedMarkdown?.exercise.title?.trim() ? 'normal' : 'italic'
                  }}>
                    {liveParsedMarkdown?.exercise.title?.trim() || 'Ejercicio sin título (# Título)'}
                  </h1>
                </div>

                {/* Etiquetas (tags) si están presentes */}
                {liveParsedMarkdown?.exercise.tags && liveParsedMarkdown.exercise.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                    {liveParsedMarkdown.exercise.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-secondary"
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          fontWeight: 500
                        }}
                      >
                        🏷️ {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Enunciado del Ejercicio (sin rótulo ENUNCIADO, exactamente como el alumno) */}
                {liveParsedMarkdown?.exercise.statement ? (
                  <div
                    className="markdown-statement"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(liveParsedMarkdown.exercise.statement, selectedId) }}
                  />
                ) : (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    Sin enunciado redactado. Escribe un título (# Título) y la descripción del problema en el editor.
                  </div>
                )}

                {/* Casos de prueba (sin rótulo CASOS DE PRUEBA, exactamente como el alumno) */}
                {liveParsedMarkdown?.exercise.testCases && liveParsedMarkdown.exercise.testCases.length > 0 && (
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem', color: '#0f172a' }}>
                      Casos de prueba
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {liveParsedMarkdown.exercise.testCases.map((tc, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                            paddingTop: idx > 0 ? '1.25rem' : 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#14532d' }}>
                              Test {idx + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                              <span
                                className={tc.isPublic ? 'badge badge-success' : 'badge badge-warning'}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {tc.isPublic ? 'Público' : 'Privado'}
                              </span>
                              {tc.weight !== undefined && tc.weight !== 1 && (
                                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                                  Peso: {tc.weight}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>Entrada:</span>
                              <pre style={{ margin: '0.25rem 0 0', padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                                {tc.input || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}
                              </pre>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>Salida esperada:</span>
                              <pre style={{ margin: '0.25rem 0 0', padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                                {tc.expectedOutput || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&lt;vacío&gt;</span>}
                              </pre>
                            </div>
                          </div>
                          {tc.explanation && (
                            <div style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: 500, color: '#334155' }}>Explicación: </span>
                              <div
                                className="markdown-statement"
                                style={{ marginTop: '0.25rem' }}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(tc.explanation, selectedId) }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plantillas de código inicial: debajo al final */}
                {liveParsedMarkdown?.exercise.templates && Object.keys(liveParsedMarkdown.exercise.templates).length > 0 && (
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem', color: '#0f172a' }}>
                      Plantillas de código inicial
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {Object.entries(liveParsedMarkdown.exercise.templates).map(([lang, code]) => (
                        <div key={lang} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: '0.375rem 0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                              {lang.toLowerCase() === 'python' ? '🐍 Python' : lang.toLowerCase() === 'java' ? '☕ Java' : lang}
                            </span>
                          </div>
                          <pre style={{ margin: 0, padding: '0.75rem 1rem', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '0.8125rem', fontFamily: 'Consolas, Monaco, monospace', overflowX: 'auto', lineHeight: 1.5 }}>
                            <code>{code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
