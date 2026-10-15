import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Exercise, AssetDTO, TeacherCollectionDetail, ValidateSolutionsResponse } from '../types';
import { MarkdownView } from '../components/MarkdownView';
import { SortableHeader } from '../components/SortableHeader';
import { TagBadge } from '../components/TagBadge';
import { DifficultyBar, getDifficultyLevel } from '../components/DifficultyBar';
import { 
  Plus, Search, ArrowLeft, Save, Trash2, Download, Image as ImageIcon, 
  Eye, Columns, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, X, Info,
  Upload, FileText, Archive, Tag as TagIcon, Check, Edit3,
  Play, Sparkles, Folder
} from 'lucide-react';
import { parseExerciseMarkdown, serializeExerciseToMarkdown, CANONICAL_EXERCISE_EXAMPLE } from '../utils/exerciseMarkdown';
import { parseTagExpression } from '../utils/tagExpression';
import { CodeEditor } from '../components/CodeEditor';

const SaveWithCheck: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
    <circle cx="17" cy="17" r="5.5" fill="#ffffff" stroke="#16a34a" strokeWidth="1.5" />
    <polyline points="14.2 17 16.5 19.3 20 14.8" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

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
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const tagPanelRef = useRef<HTMLDivElement>(null);

  // Collections state for batch operations
  const [allCollections, setAllCollections] = useState<TeacherCollectionDetail[]>([]);
  const [batchCollectionSubmitting, setBatchCollectionSubmitting] = useState(false);
  const [unassignedColSearch, setUnassignedColSearch] = useState('');

  // Tag expression search & selection
  const [tagExpression, setTagExpression] = useState('');
  const lastAppliedTagExprRef = useRef<string | null>(null);

  const parsedTagExpr = useMemo(() => {
    return parseTagExpression(tagExpression);
  }, [tagExpression]);

  const isTagExprActive = !parsedTagExpr.isEmpty && parsedTagExpr.isValid && !!parsedTagExpr.evaluate;

  // Sorting state
  type ExerciseSortKey = 'title' | 'difficulty' | 'slug' | 'tags' | 'collections' | 'createdAt';
  const [sortKey, setSortKey] = useState<ExerciseSortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

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
  const [publishedMarkdown, setPublishedMarkdown] = useState<string>('');
  const [lastSavedDraftMarkdown, setLastSavedDraftMarkdown] = useState<string | null>(null);
  const originalPublishedMarkdownRef = useRef<string>('');
  const lastSavedDraftMarkdownRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const setSavedDraft = (val: string | null) => {
    lastSavedDraftMarkdownRef.current = val;
    setLastSavedDraftMarkdown(val);
  };

  const setPublished = (val: string) => {
    originalPublishedMarkdownRef.current = val;
    setPublishedMarkdown(val);
  };

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

  // Solution Testing & Output Generation status
  const [isValidatingSolutions, setIsValidatingSolutions] = useState(false);
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateSolutionsResponse | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedValidationLang, setSelectedValidationLang] = useState<string>('');

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
    return hasDraft || markdownText !== publishedMarkdown;
  }, [selectedId, markdownText, liveParsedMarkdown, hasDraft, publishedMarkdown]);

  const canPublish = isModifiedFromPublished && !saving && !detailLoading;

  // Whether current draft is saved (matches saved draft or published version if no draft)
  const isDraftSaved = useMemo(() => {
    if (!selectedId) return false;
    const baseline = lastSavedDraftMarkdown ?? publishedMarkdown;
    return markdownText === baseline;
  }, [selectedId, markdownText, lastSavedDraftMarkdown, publishedMarkdown]);

  // Unsaved changes check (for warnings when navigating away)
  const isUnsaved = useMemo(() => {
    if (mode !== 'editor') return false;
    if (saving) return true;
    if (draftStatus === 'saving') return true;
    if (!selectedId) {
      return markdownText.trim().length > 0 && markdownText !== CANONICAL_EXERCISE_EXAMPLE;
    }
    const savedBaseline = lastSavedDraftMarkdown ?? publishedMarkdown;
    return markdownText !== savedBaseline;
  }, [mode, saving, draftStatus, selectedId, markdownText, lastSavedDraftMarkdown, publishedMarkdown]);

  // Load exercises list
  const loadExercises = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const data = await api.teacherGetExercises();
      setExercises(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al cargar ejercicios' });
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  // Load collections list
  const loadCollections = async () => {
    try {
      const data = await api.teacherGetCollections();
      setAllCollections(data);
    } catch (err: any) {
      console.error('Error al cargar colecciones:', err);
    }
  };

  useEffect(() => {
    loadExercises();
    loadCollections();
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

  // Helper para verificar si un ejercicio pertenece a una colección
  const normalizeId = (id: string | undefined | null) => (id || '').toLowerCase().trim();

  const isExerciseInCollection = (ex: Exercise, col: TeacherCollectionDetail): boolean => {
    const exIdNorm = normalizeId(ex.id);
    const exSlugNorm = (ex.slug || '').toLowerCase().trim();
    const items = col.exercises || (col as any).items || [];

    const inItems = items.some((item: any) => {
      const itemExId = normalizeId(item.exerciseId);
      if (itemExId && itemExId === exIdNorm) return true;
      const itemSlug = (item.exerciseSlug || '').toLowerCase().trim();
      if (itemSlug && itemSlug === exSlugNorm) return true;
      const itemId = normalizeId(item.id);
      if (itemId && (itemId === exIdNorm || itemId === exSlugNorm)) return true;
      return false;
    });

    if (inItems) return true;

    if (ex.collections && ex.collections.some(cTitle => cTitle.toLowerCase().trim() === col.title.toLowerCase().trim())) {
      return true;
    }

    return false;
  };

  // Colecciones ordenadas para selección masiva (asignadas primero, luego alfabético)
  const filteredCollections = useMemo(() => {
    let cols = [...allCollections];
    if (unassignedColSearch.trim()) {
      const q = unassignedColSearch.toLowerCase().trim();
      cols = cols.filter(c => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }

    return cols.sort((a, b) => {
      const countA = selectedExercises.filter(ex => isExerciseInCollection(ex, a)).length;
      const countB = selectedExercises.filter(ex => isExerciseInCollection(ex, b)).length;
      if ((countA > 0) !== (countB > 0)) {
        return countA > 0 ? -1 : 1;
      }
      if (countA !== countB) {
        return countB - countA;
      }
      return a.title.localeCompare(b.title);
    });
  }, [allCollections, unassignedColSearch, selectedExercises]);

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

  // ==================== ELIMINACIÓN MÚLTIPLE DE EJERCICIOS ====================
  const handleConfirmBatchDelete = async () => {
    if (selectedExerciseIds.size === 0) return;
    setDeletingBatch(true);
    const idsToDelete = Array.from(selectedExerciseIds);
    try {
      await api.teacherBulkDeleteExercises(idsToDelete);
      setExercises(prev => prev.filter(e => !selectedExerciseIds.has(e.id)));
      if (selectedId && selectedExerciseIds.has(selectedId)) {
        setMode('list');
      }
      setSelectedExerciseIds(new Set());
      setShowBatchDeleteModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar los ejercicios seleccionados');
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleBatchAssignTag = async (tagStr: string, targetExerciseIds?: string[]) => {
    const ids = targetExerciseIds && targetExerciseIds.length > 0
      ? targetExerciseIds
      : Array.from(selectedExerciseIds);
    if (ids.length === 0 || !tagStr.trim()) return;

    setBatchSubmitting(true);
    try {
      await api.batchAssignExerciseTag(ids, tagStr.trim());
      await loadExercises(true);
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
      await loadExercises(true);
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
      await loadExercises(true);
    } catch (err: any) {
      alert(err.message || 'Error al añadir la etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchAssignCollection = async (collection: TeacherCollectionDetail, targetExerciseIds: string[]) => {
    if (!collection || !targetExerciseIds || targetExerciseIds.length === 0) return;

    setBatchCollectionSubmitting(true);
    try {
      const existingItems = collection.exercises || (collection as any).items || [];
      const currentExerciseIds: string[] = [];

      for (const item of existingItems) {
        const itemAny = item as any;
        const itemSlug = (item.exerciseSlug || itemAny.id || '').toLowerCase().trim();

        if (item.exerciseId) {
          currentExerciseIds.push(item.exerciseId);
        } else if (itemSlug) {
          const found = exercises.find(e => e.slug.toLowerCase().trim() === itemSlug || normalizeId(e.id) === normalizeId(itemAny.id));
          if (found) {
            currentExerciseIds.push(found.id);
          }
        }
      }

      const currentNormSet = new Set(currentExerciseIds.map(normalizeId));
      const toAdd = targetExerciseIds.filter(id => !currentNormSet.has(normalizeId(id)));
      if (toAdd.length === 0) {
        setBatchCollectionSubmitting(false);
        return;
      }

      const updatedExerciseIds = Array.from(new Set([...currentExerciseIds, ...toAdd])).filter(Boolean);

      await api.teacherSaveCollection({
        title: collection.title.trim(),
        slug: collection.slug.trim(),
        description: collection.description ? collection.description.trim() : undefined,
        visibility: (collection.visibility || 'PUBLIC').toUpperCase() as 'PUBLIC' | 'PRIVATE',
        exerciseIds: updatedExerciseIds,
      }, collection.id);

      if (collectionIdParam && collectionIdParam === collection.id) {
        api.teacherGetCollection(collectionIdParam).then(col => setActiveCollection(col)).catch(() => {});
      }

      await Promise.all([loadCollections(), loadExercises(true)]);
    } catch (err: any) {
      alert(err.message || 'Error al añadir ejercicios a la colección');
    } finally {
      setBatchCollectionSubmitting(false);
    }
  };

  const handleBatchRevokeCollection = async (collection: TeacherCollectionDetail, targetExerciseIds: string[]) => {
    if (!collection || !targetExerciseIds || targetExerciseIds.length === 0) return;

    setBatchCollectionSubmitting(true);
    try {
      const existingItems = collection.exercises || (collection as any).items || [];
      const targetNormSet = new Set(targetExerciseIds.map(normalizeId));
      const targetSlugs = new Set(
        exercises.filter(e => targetNormSet.has(normalizeId(e.id))).map(e => e.slug.toLowerCase().trim())
      );

      const remainingExerciseIds: string[] = [];

      for (const item of existingItems) {
        const itemAny = item as any;
        const itemExId = normalizeId(item.exerciseId || itemAny.id);
        const itemSlug = (item.exerciseSlug || itemAny.id || '').toLowerCase().trim();

        if (itemExId && targetNormSet.has(itemExId)) continue;
        if (itemSlug && targetSlugs.has(itemSlug)) continue;

        if (item.exerciseId) {
          remainingExerciseIds.push(item.exerciseId);
        } else if (itemSlug) {
          const found = exercises.find(e => e.slug.toLowerCase().trim() === itemSlug || normalizeId(e.id) === normalizeId(itemAny.id));
          if (found && !targetNormSet.has(normalizeId(found.id))) {
            remainingExerciseIds.push(found.id);
          }
        }
      }

      const finalRemainingIds = Array.from(new Set(remainingExerciseIds)).filter(Boolean);

      await api.teacherSaveCollection({
        title: collection.title.trim(),
        slug: collection.slug.trim(),
        description: collection.description ? collection.description.trim() : undefined,
        visibility: (collection.visibility || 'PUBLIC').toUpperCase() as 'PUBLIC' | 'PRIVATE',
        exerciseIds: finalRemainingIds,
      }, collection.id);

      if (collectionIdParam && collectionIdParam === collection.id) {
        api.teacherGetCollection(collectionIdParam).then(col => setActiveCollection(col)).catch(() => {});
      }

      await Promise.all([loadCollections(), loadExercises(true)]);
    } catch (err: any) {
      alert(err.message || 'Error al quitar ejercicios de la colección');
    } finally {
      setBatchCollectionSubmitting(false);
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

    // 3. Filtrado por dificultad
    if (difficultyFilter !== 'ALL') {
      if (difficultyFilter === 'UNASSIGNED') {
        result = result.filter((e) => e.difficulty === null || e.difficulty === undefined);
      } else {
        const targetLevel = parseInt(difficultyFilter, 10);
        result = result.filter((e) => getDifficultyLevel(e.difficulty) === targetLevel);
      }
    }

    return [...result].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (sortKey === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortKey === 'difficulty') {
        valA = a.difficulty !== undefined && a.difficulty !== null ? a.difficulty : -1;
        valB = b.difficulty !== undefined && b.difficulty !== null ? b.difficulty : -1;
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
  }, [exercises, searchTerm, isTagExprActive, parsedTagExpr, difficultyFilter, sortKey, sortDir]);

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
        difficulty: detail.difficulty,
        tags: detail.tags || [],
        statement: detail.statement || '',
        templates: initialTemplates,
        solutions: detail.solutions || {},
        testCases: detail.testCases || []
      });

      setPublished(serialized);

      if (detail.hasDraft && detail.draftMarkdown) {
        setMarkdownText(detail.draftMarkdown);
        markdownTextRef.current = detail.draftMarkdown;
        setSavedDraft(detail.draftMarkdown);
        setHasDraft(true);
        setDraftStatus('saved');
      } else {
        setMarkdownText(serialized);
        markdownTextRef.current = serialized;
        setSavedDraft(null);
        setHasDraft(false);
        setDraftStatus('idle');
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
    setPublished('');
    setSavedDraft(null);
    setHasDraft(false);
    setDraftStatus('idle');
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

  // Validate test cases against solutions
  const handleValidateSolutions = async () => {
    const parsed = parseExerciseMarkdown(markdownText);
    const solutions = parsed.exercise.solutions || {};
    const solutionEntries = Object.entries(solutions).filter(([, code]) => code && code.trim());
    if (solutionEntries.length === 0) {
      setStatusMsg({ type: 'error', text: 'No se han detectado soluciones en la sección ## Solutions.' });
      return;
    }
    const testCases = parsed.exercise.testCases || [];
    if (testCases.length === 0) {
      setStatusMsg({ type: 'error', text: 'No se han detectado casos de prueba en la sección ## Tests.' });
      return;
    }

    setIsValidatingSolutions(true);
    setStatusMsg(null);
    try {
      const res = await api.teacherValidateSolutions({
        solutions,
        testCases
      });
      setValidationResult(res);
      const firstLang = Object.keys(res.results)[0] || '';
      setSelectedValidationLang(firstLang);
      setShowValidationModal(true);
      if (res.allPassed) {
        setStatusMsg({ type: 'success', text: `Todos los tests superados (${testCases.length}/${testCases.length}) contra las soluciones.` });
      } else {
        setStatusMsg({ type: 'error', text: 'Se encontraron fallos al ejecutar las soluciones contra los tests.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al validar soluciones contra los tests.' });
    } finally {
      setIsValidatingSolutions(false);
    }
  };

  // Generate test outputs using the solution
  const handleGenerateOutputs = async () => {
    const parsed = parseExerciseMarkdown(markdownText);
    const solutions = parsed.exercise.solutions || {};
    const solutionEntries = Object.entries(solutions).filter(([, code]) => code && code.trim());
    if (solutionEntries.length === 0) {
      setStatusMsg({ type: 'error', text: 'Define al menos una solución en ## Solutions para generar las salidas.' });
      return;
    }
    const testCases = parsed.exercise.testCases || [];
    if (testCases.length === 0) {
      setStatusMsg({ type: 'error', text: 'Define al menos un test con ```input en la sección ## Tests.' });
      return;
    }

    // Prefer Java or first available solution
    const [lang, code] = solutionEntries.find(([l]) => l.toLowerCase() === 'java') || solutionEntries[0];

    setIsGeneratingOutputs(true);
    setStatusMsg(null);
    try {
      const res = await api.teacherGenerateTestOutputs({
        sourceCode: code,
        language: lang,
        testCases
      });

      if (!res.success) {
        setStatusMsg({ type: 'error', text: res.error || 'Error al generar salidas esperadas.' });
        return;
      }

      const updatedTestCases = testCases.map((tc, idx) => {
        const gen = res.outputs.find((o) => o.orderIndex === idx);
        return gen && gen.success ? { ...tc, expectedOutput: gen.output } : tc;
      });

      const newMd = serializeExerciseToMarkdown({
        title: parsed.exercise.title,
        slug: parsed.exercise.slug,
        difficulty: parsed.exercise.difficulty,
        tags: parsed.exercise.tags,
        statement: parsed.exercise.statement,
        templates: parsed.exercise.templates,
        solutions: parsed.exercise.solutions,
        testCases: updatedTestCases
      });

      setMarkdownText(newMd);
      markdownTextRef.current = newMd;
      setStatusMsg({ type: 'success', text: `Salidas generadas correctamente para ${res.outputs.length} tests usando solución ${lang.toUpperCase()}.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al generar salidas esperadas.' });
    } finally {
      setIsGeneratingOutputs(false);
    }
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

      const cleanSolutions: Record<string, string> = {};
      Object.entries(parsed.exercise.solutions || {}).forEach(([k, v]) => {
        if (v && v.trim()) cleanSolutions[k] = v;
      });

      const saved = await api.teacherSaveExercise({
        title: exTitle,
        slug: parsed.exercise.slug?.trim() || 'ejercicio-' + Date.now(),
        statement: parsed.exercise.statement || '',
        difficulty: parsed.exercise.difficulty,
        starterCode: primaryStarter,
        templates: cleanTemplates,
        solutions: cleanSolutions,
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

      const imgMarkdown = `\n![${newAsset.filename}](assets/${newAsset.filename})\n`;
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

    if (draftStatus !== 'idle') {
      setDraftStatus('idle');
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setDraftStatus('saving');
        await api.teacherSaveExerciseDraft(selectedId, markdownText);
        setSavedDraft(markdownText);
        setHasDraft(true);
        setDraftStatus('saved');
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
      await api.teacherSaveExerciseDraft(selectedId, markdownText);
      setSavedDraft(markdownText);
      setHasDraft(true);
      setDraftStatus('saved');
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
      const pub = originalPublishedMarkdownRef.current;
      setMarkdownText(pub);
      markdownTextRef.current = pub;
      setSavedDraft(null);
      setHasDraft(false);
      setDraftStatus('idle');
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

      const cleanSolutions: Record<string, string> = {};
      Object.entries(parsed.exercise.solutions || {}).forEach(([k, v]) => {
        if (v && v.trim()) cleanSolutions[k] = v;
      });

      const payload = {
        title: parsed.exercise.title.trim(),
        slug: parsed.exercise.slug.trim(),
        statement: parsed.exercise.statement,
        difficulty: parsed.exercise.difficulty,
        starterCode: primaryStarter,
        templates: cleanTemplates,
        solutions: cleanSolutions,
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

      setPublished(markdownText);
      setSavedDraft(null);
      setHasDraft(false);
      setDraftStatus('published');

      setVersionNumber(result.versionNumber || 1);
      setAssets(result.assets || []);
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
        {/* PANEL DE SELECCIÓN */}
        {selectedExerciseIds.size > 0 && (
          <div
            ref={tagPanelRef}
            className="card"
            style={{
              marginBottom: '0.75rem',
              border: '2px solid #2563eb',
              borderRadius: '0.5rem',
              padding: 0,
              overflow: 'visible',
              background: '#ffffff',
            }}
          >
            {/* Header de Selección */}
            <div
              style={{
                padding: '0.5rem 0.85rem',
                background: '#eff6ff',
                borderBottom: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#2563eb', color: '#fff', borderRadius: '0.25rem', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={13} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Selección
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
                    ({selectedExercises.length === 1 ? (
                      <span><strong>{selectedExercises[0].title}</strong></span>
                    ) : (
                      <strong>{selectedExerciseIds.size} ejercicios seleccionados</strong>
                    )})
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Eliminar todos los ejercicios seleccionados"
                >
                  <Trash2 size={13} />
                  <span>Eliminar todos</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', background: '#ffffff' }}
                >
                  Deseleccionar todos
                </button>
              </div>
            </div>

            {/* APARTADO 1: ETIQUETAS */}
            <div
              style={{
                background: '#f8fafc',
                padding: '0.5rem 0.85rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <TagIcon size={13} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>
                Etiquetas
              </h3>
            </div>

            {/* Etiquetas no asignadas */}
            <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <TagIcon size={13} color="#2563eb" /> Etiquetas no asignadas ({unassignedAvailableTags.length})
                </div>
                {allExerciseTags.length > 5 && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={unassignedSearch}
                    onChange={e => setUnassignedSearch(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', width: 140 }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
                {unassignedAvailableTags.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {unassignedSearch ? 'No se encontraron etiquetas' : (allExerciseTags.length === 0 ? 'No hay etiquetas creadas' : 'Todas las etiquetas están asignadas')}
                  </span>
                ) : (
                  unassignedAvailableTags.map(tag => (
                    <div
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: '1.5px solid #d6daed',
                        borderRadius: '9999px',
                        gap: '0.45rem',
                        paddingInlineEnd: '0.25rem',
                      }}
                    >
                      <TagBadge value={tag} style={{ border: 'none' }} />
                      <button
                        type="button"
                        disabled={batchSubmitting}
                        onClick={() => handleBatchAssignTag(tag, Array.from(selectedExerciseIds))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '1px solid #bfdbfe',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="Asignar a todos los ejercicios seleccionados"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Formulario de creación rápida */}
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 0.85rem' }}>
              <form onSubmit={handleBulkCreateAndAssign} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Nueva etiqueta (ej. strings, bucles)..."
                  value={bulkNewTag}
                  onChange={e => setBulkNewTag(e.target.value)}
                  className="input-field"
                  style={{ flex: 1, minWidth: 160, maxWidth: 300, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                  required
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={batchSubmitting || !bulkNewTag.trim()}
                  style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Crear y asignar etiqueta"
                >
                  <Plus size={15} />
                </button>
              </form>
            </div>

            {/* Etiquetas en seleccionados */}
            <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TagIcon size={13} color="#2563eb" /> Etiquetas en seleccionados ({tagsInSelectedExercises.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
                {tagsInSelectedExercises.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Sin etiquetas activas
                  </span>
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#ffffff',
                          border: '1.5px solid #d6daed',
                          borderRadius: '9999px',
                          gap: '0.45rem',
                          paddingInlineEnd: '0.25rem',
                        }}
                      >
                        <TagBadge value={tagInfo.tag} style={{ border: 'none' }} />
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            padding: '0.05rem 0.3rem',
                            borderRadius: '9999px',
                            background: isAll ? '#dcfce7' : '#fef3c7',
                            color: isAll ? '#166534' : '#92400e',
                            border: `1px solid ${isAll ? '#bbf7d0' : '#fde68a'}`,
                          }}
                        >
                          {count}/{total}
                        </span>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button
                            type="button"
                            disabled={batchSubmitting || isAll}
                            onClick={() => handleBatchAssignTag(tagInfo.tag, unassignedExercises)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: isAll ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                              background: isAll ? '#f1f5f9' : '#eff6ff',
                              color: isAll ? '#94a3b8' : '#1d4ed8',
                              cursor: isAll ? 'not-allowed' : 'pointer',
                              padding: 0,
                            }}
                            title={isAll ? 'Ya asignada a todos' : `Asignar a los ${unassignedExercises.length} restantes`}
                          >
                            {isAll ? <Check size={11} /> : <Plus size={11} />}
                          </button>

                          <button
                            type="button"
                            disabled={batchSubmitting}
                            onClick={() => handleBatchRevokeTag(tagInfo.tag, tagInfo.exerciseIdsWithTag)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title={`Quitar de los ${count} ejercicios que la tienen`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* APARTADO 2: COLECCIONES */}
            <div
              style={{
                background: '#f8fafc',
                padding: '0.5rem 0.85rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Folder size={13} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>
                Colecciones
              </h3>
            </div>

            <div style={{ padding: '0.5rem 0.85rem', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Folder size={13} color="#2563eb" /> Colecciones ({filteredCollections.length})
                </div>
                {allCollections.length > 5 && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={unassignedColSearch}
                    onChange={e => setUnassignedColSearch(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', width: 140 }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
                {filteredCollections.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {unassignedColSearch ? 'No se encontraron colecciones' : 'No hay colecciones creadas'}
                  </span>
                ) : (
                  filteredCollections.map(col => {
                    const countWithCol = selectedExercises.filter(ex => isExerciseInCollection(ex, col)).length;
                    const total = selectedExercises.length;
                    const isAll = countWithCol === total && total > 0;
                    const isNone = countWithCol === 0;
                    const unassignedExerciseIds = selectedExercises.filter(ex => !isExerciseInCollection(ex, col)).map(ex => ex.id);
                    const assignedExerciseIds = selectedExercises.filter(ex => isExerciseInCollection(ex, col)).map(ex => ex.id);

                    return (
                      <div
                        key={col.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: isAll ? '#eff6ff' : '#f8fafc',
                          border: isAll ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                          borderRadius: '0.3rem',
                          padding: '0.2rem 0.45rem',
                          gap: '0.35rem',
                        }}
                      >
                        <Folder size={12} color={isAll ? '#2563eb' : '#64748b'} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAll ? '#1d4ed8' : '#1e3a8a' }}>
                          {col.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            padding: '0.05rem 0.3rem',
                            borderRadius: '9999px',
                            background: isAll ? '#dcfce7' : (isNone ? '#f1f5f9' : '#fef3c7'),
                            color: isAll ? '#166534' : (isNone ? '#64748b' : '#92400e'),
                            border: `1px solid ${isAll ? '#bbf7d0' : (isNone ? '#e2e8f0' : '#fde68a')}`,
                          }}
                        >
                          {countWithCol}/{total}
                        </span>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button
                            type="button"
                            disabled={batchCollectionSubmitting || batchSubmitting || isAll}
                            onClick={() => handleBatchAssignCollection(col, unassignedExerciseIds)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '0.2rem',
                              border: isAll ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                              background: isAll ? '#f1f5f9' : '#eff6ff',
                              color: isAll ? '#94a3b8' : '#1d4ed8',
                              cursor: isAll ? 'not-allowed' : 'pointer',
                              padding: 0,
                            }}
                            title={isAll ? 'Ya asignada a todos' : `Añadir a los ${unassignedExerciseIds.length} restantes`}
                          >
                            {isAll ? <Check size={11} /> : <Plus size={11} />}
                          </button>

                          {!isNone && (
                            <button
                              type="button"
                              disabled={batchCollectionSubmitting || batchSubmitting}
                              onClick={() => handleBatchRevokeCollection(col, assignedExerciseIds)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 20,
                                height: 20,
                                borderRadius: '0.2rem',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title={`Quitar de esta colección (${countWithCol} ${countWithCol === 1 ? 'ejercicio' : 'ejercicios'})`}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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

              {/* 3. Filtro de Dificultad */}
              <div style={{ flex: '0 0 auto' }}>
                <select
                  value={difficultyFilter}
                  onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
                  className="input-field"
                  style={{
                    height: '38px',
                    fontSize: '0.875rem',
                    minWidth: '150px',
                    cursor: 'pointer',
                    backgroundColor: difficultyFilter !== 'ALL' ? '#eff6ff' : '#ffffff',
                    borderColor: difficultyFilter !== 'ALL' ? '#3b82f6' : undefined,
                    fontWeight: difficultyFilter !== 'ALL' ? 600 : 400,
                    color: difficultyFilter !== 'ALL' ? '#1d4ed8' : '#334155',
                  }}
                  title="Filtrar por dificultad"
                >
                  <option value="ALL">Dificultad: Todas</option>
                  <option value="1">Nivel 1 (0 – 2)</option>
                  <option value="2">Nivel 2 (2.1 – 4)</option>
                  <option value="3">Nivel 3 (4.1 – 6)</option>
                  <option value="4">Nivel 4 (6.1 – 8)</option>
                  <option value="5">Nivel 5 (8.1 – 10)</option>
                  <option value="UNASSIGNED">Sin dificultad</option>
                </select>
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
                      label="Dificultad"
                      sortKey="difficulty"
                      currentSortKey={sortKey}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600, width: 110 }}
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
                        <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap' }}>
                          <DifficultyBar
                            difficulty={ex.difficulty}
                            onClick={() => {
                              const lvl = getDifficultyLevel(ex.difficulty);
                              if (lvl !== null) {
                                setDifficultyFilter((prev) => (prev === String(lvl) ? 'ALL' : String(lvl)));
                                setPage(1);
                              }
                            }}
                            style={{ cursor: ex.difficulty !== undefined && ex.difficulty !== null ? 'pointer' : 'default' }}
                          />
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

        {/* MODAL: CONFIRMAR ELIMINAR EJERCICIOS SELECCIONADOS */}
        {showBatchDeleteModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowBatchDeleteModal(false)}
          >
            <div
              className="card"
              style={{ width: '100%', maxWidth: 380, padding: '1.25rem', background: '#ffffff' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#b91c1c' }}>
                <AlertCircle size={20} />
                <strong style={{ fontSize: '1rem' }}>
                  ¿Eliminar {selectedExerciseIds.size} {selectedExerciseIds.size === 1 ? 'ejercicio' : 'ejercicios'}?
                </strong>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
                Se eliminarán los {selectedExerciseIds.size} {selectedExerciseIds.size === 1 ? 'ejercicio seleccionado' : 'ejercicios seleccionados'}. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deletingBatch}
                  onClick={handleConfirmBatchDelete}
                  className="btn-danger"
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', background: '#dc2626', color: '#ffffff' }}
                >
                  {deletingBatch ? 'Eliminando...' : `Eliminar ${selectedExerciseIds.size} ${selectedExerciseIds.size === 1 ? 'ejercicio' : 'ejercicios'}`}
                </button>
              </div>
            </div>
          </div>
        )}
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

              {/* Derecha: Descartar borrador, Subir imagen, Plantilla ejemplo, Cargar, Descargar, Exportar ZIP, Vista previa, Guardar Borrador, Publicar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>

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
                <button
                  type="button"
                  onClick={handleValidateSolutions}
                  disabled={isValidatingSolutions || isGeneratingOutputs}
                  className="btn-secondary"
                  style={{
                    padding: '0.3rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803d',
                    borderColor: '#bbf7d0',
                    backgroundColor: '#f0fdf4'
                  }}
                  title={isValidatingSolutions ? 'Probando soluciones...' : 'Probar casos de prueba contra las soluciones'}
                >
                  <Play size={16} fill="#15803d" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateOutputs}
                  disabled={isValidatingSolutions || isGeneratingOutputs}
                  className="btn-secondary"
                  style={{
                    padding: '0.3rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                    borderColor: '#ddd6fe',
                    backgroundColor: '#f5f3ff'
                  }}
                  title={isGeneratingOutputs ? 'Generando salidas...' : 'Autogenerar salidas esperadas usando la solución'}
                >
                  <Sparkles size={16} />
                </button>

                {/* Guardar borrador */}
                {selectedId && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isDraftSaved || draftStatus === 'saving'}
                    className="btn-secondary"
                    style={{
                      padding: '0.3rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (isDraftSaved || draftStatus === 'saving') ? 0.45 : 1,
                      cursor: (isDraftSaved || draftStatus === 'saving') ? 'not-allowed' : 'pointer'
                    }}
                    title={
                      draftStatus === 'saving'
                        ? 'Guardando borrador...'
                        : isDraftSaved
                          ? 'Borrador guardado'
                          : 'Guardar borrador (Ctrl+S)'
                    }
                  >
                    {isDraftSaved ? (
                      <SaveWithCheck size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                  </button>
                )}

                {/* Publicar nueva versión */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canPublish}
                  className="btn-primary"
                  style={{
                    padding: '0.3rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: !canPublish ? 0.45 : 1,
                    cursor: !canPublish ? 'not-allowed' : 'pointer'
                  }}
                  title={
                    !canPublish
                      ? (selectedId ? 'El borrador ya está publicado' : 'Introduce título y slug para publicar')
                      : (saving ? 'Publicando nueva versión...' : 'Publicar nueva versión')
                  }
                >
                  <Check size={16} />
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
                        onClick={() => insertMarkdownAtCursor(`\n![${asset.filename}](assets/${asset.filename})\n`)}
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

                {/* Metadatos (dificultad y tags) si están presentes */}
                {(liveParsedMarkdown?.exercise.difficulty !== undefined || (liveParsedMarkdown?.exercise.tags && liveParsedMarkdown.exercise.tags.length > 0)) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem', alignItems: 'center' }}>
                    {liveParsedMarkdown?.exercise.difficulty !== undefined && (
                      <span
                        className="badge badge-primary"
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          fontWeight: 600
                        }}
                      >
                        🎯 Dificultad: {liveParsedMarkdown.exercise.difficulty} / 10
                      </span>
                    )}
                    {liveParsedMarkdown?.exercise.tags?.map((tag) => (
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
                  <MarkdownView
                    className="markdown-statement"
                    content={liveParsedMarkdown.exercise.statement}
                    exerciseId={selectedId}
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
                              <MarkdownView
                                className="markdown-statement"
                                style={{ marginTop: '0.25rem' }}
                                content={tc.explanation}
                                exerciseId={selectedId}
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

                {/* Soluciones de referencia (## Solutions) */}
                {liveParsedMarkdown?.exercise.solutions && Object.keys(liveParsedMarkdown.exercise.solutions).length > 0 && (
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 1rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        Soluciones de referencia
                      </h2>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleValidateSolutions}
                          disabled={isValidatingSolutions || isGeneratingOutputs}
                          className="btn-secondary"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#15803d',
                            borderColor: '#bbf7d0',
                            backgroundColor: '#f0fdf4'
                          }}
                        >
                          <Play size={13} fill="#15803d" />
                          <span>Probar soluciones</span>
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {Object.entries(liveParsedMarkdown.exercise.solutions).map(([lang, code]) => (
                        <div key={lang} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: '0.375rem 0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Modal de validación de soluciones */}
      {showValidationModal && validationResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowValidationModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #cbd5e1'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  backgroundColor: validationResult.allPassed ? '#dcfce7' : '#fee2e2',
                  color: validationResult.allPassed ? '#166534' : '#991b1b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  {validationResult.allPassed ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {validationResult.allPassed ? 'Todos los tests superados' : 'Fallos detectados'}
                </span>

                {Object.keys(validationResult.results).length > 1 && (
                  <span style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    backgroundColor: validationResult.crossLanguageMatch ? '#e0e7ff' : '#fef3c7',
                    color: validationResult.crossLanguageMatch ? '#3730a3' : '#92400e'
                  }}>
                    {validationResult.crossLanguageMatch ? '✔ Consistencia políglota' : '⚠️ Discrepancia entre lenguajes'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de lenguaje si hay múltiples */}
            {Object.keys(validationResult.results).length > 1 && (
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1.25rem', gap: '0.5rem', backgroundColor: '#ffffff' }}>
                {Object.entries(validationResult.results).map(([lang, res]) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedValidationLang(lang)}
                    style={{
                      padding: '0.6rem 1rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: selectedValidationLang === lang ? '2px solid #2563eb' : '2px solid transparent',
                      fontWeight: selectedValidationLang === lang ? 600 : 400,
                      color: selectedValidationLang === lang ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{lang.toUpperCase()}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({res.passedCount}/{res.totalCount})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Contenido de resultados */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {/* Avisos de discrepancia entre lenguajes */}
              {validationResult.mismatches && validationResult.mismatches.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#92400e' }}>
                  {validationResult.mismatches.map((m, idx) => (
                    <div key={idx} style={{ marginBottom: idx < validationResult.mismatches.length - 1 ? '0.35rem' : 0 }}>
                      {m}
                    </div>
                  ))}
                </div>
              )}

              {(() => {
                const activeRes = validationResult.results[selectedValidationLang] || Object.values(validationResult.results)[0];
                if (!activeRes) return null;

                if (!activeRes.compileSuccess) {
                  return (
                    <div>
                      <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        Error de compilación ({activeRes.language})
                      </div>
                      <pre style={{ backgroundColor: '#0f172a', color: '#f87171', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {activeRes.compileError}
                      </pre>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeRes.testResults.map((t, idx) => (
                      <div
                        key={t.testId || idx}
                        style={{
                          border: `1px solid ${t.passed ? '#e2e8f0' : '#fecaca'}`,
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                          backgroundColor: t.passed ? '#ffffff' : '#fef2f2'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                            {t.testName} {t.isPublic ? '(Público)' : '(Privado)'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {t.durationMs !== undefined && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.durationMs} ms</span>
                            )}
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '0.25rem',
                              backgroundColor: t.passed ? '#dcfce7' : '#fee2e2',
                              color: t.passed ? '#15803d' : '#b91c1c'
                            }}>
                              {t.status}
                            </span>
                          </div>
                        </div>

                        {!t.passed && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {t.input && (
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Entrada:</span>
                                <pre style={{ margin: '0.15rem 0 0', padding: '0.4rem 0.6rem', backgroundColor: '#f1f5f9', borderRadius: '0.25rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                  {t.input}
                                </pre>
                              </div>
                            )}
                            <div>
                              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>Esperado:</span>
                              <pre style={{ margin: '0.15rem 0 0', padding: '0.4rem 0.6rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.25rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                {t.expectedOutput || '<vacío>'}
                              </pre>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>Obtenido:</span>
                              <pre style={{ margin: '0.15rem 0 0', padding: '0.4rem 0.6rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.25rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                {t.actualOutput || (t.error ? t.error : '<vacío>')}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
