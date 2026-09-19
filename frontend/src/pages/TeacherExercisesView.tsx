import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Exercise, AssetDTO, TeacherCollectionDetail } from '../types';
import { renderMarkdown } from '../utils/markdown';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Plus, Search, ArrowLeft, Save, Trash2, Download, Image as ImageIcon, 
  Eye, Columns, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, X, Info,
  Upload, FileText, Archive
} from 'lucide-react';
import { parseExerciseMarkdown, serializeExerciseToMarkdown, CANONICAL_EXERCISE_EXAMPLE } from '../utils/exerciseMarkdown';
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

  // Sorting state
  type ExerciseSortKey = 'title' | 'slug' | 'collections' | 'createdAt';
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
  const listImportFileInputRef = useRef<HTMLInputElement>(null);
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
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
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
  }, [exercises, searchTerm, sortKey, sortDir]);

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
    const targetIndex = direction === 'prev' ? currentExerciseIndex - 1 : currentExerciseIndex + 1;
    if (targetIndex < 0 || targetIndex >= navigationExercises.length) return;
    const target = navigationExercises[targetIndex];
    handleOpenEdit(target.id);
  };

  const handleBack = () => {
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

  // Import .md file directly from List view
  const handleListImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSelectedId(null);
        setSearchParams(collectionIdParam ? { collectionId: collectionIdParam } : {});
        setMarkdownText(content);
        setAssets([]);
        setVersionNumber(1);
        setMode('editor');
        setStatusMsg({ type: 'success', text: `Ejercicio cargado desde "${file.name}". Revisa el contenido y pulsa Guardar.` });
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
      if (!selectedId) {
        setSelectedId(result.id);
        setSearchParams(collectionIdParam ? { exerciseId: result.id, collectionId: collectionIdParam } : { exerciseId: result.id });
      }

      setVersionNumber(result.versionNumber || 1);
      setAssets(result.assets || []);
      setStatusMsg({ type: 'success', text: `Ejercicio "${result.title}" guardado correctamente (v${result.versionNumber || 1}).` });

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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Ejercicios</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="file"
              ref={listImportFileInputRef}
              accept=".md,.markdown,text/markdown"
              style={{ display: 'none' }}
              onChange={handleListImportMarkdown}
            />
            <button
              onClick={() => listImportFileInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '0.625rem 1.25rem' }}
              title="Importar ejercicio desde archivo .md"
            >
              <Upload size={18} /> Cargar .md
            </button>
            <button
              onClick={handleOpenCreate}
              className="btn-primary"
              style={{ padding: '0.625rem 1.25rem' }}
            >
              <Plus size={18} /> Nuevo Ejercicio
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar ejercicio por título o identificador (slug)..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {/* List Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <SortableHeader
                      label="Título"
                      sortKey="title"
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
                  {currentExercises.map((ex) => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                      <td
                        onClick={() => handleOpenEdit(ex.id)}
                        style={{ padding: '0.875rem 1.25rem', fontWeight: 500, color: '#1e293b', cursor: 'pointer' }}
                        title="Editar ejercicio"
                      >
                        <div style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}>{ex.title}</div>
                        {ex.tags && ex.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            {ex.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="badge badge-neutral"
                                style={{ fontSize: '0.6875rem', padding: '0.1rem 0.35rem', backgroundColor: '#f1f5f9', color: '#475569' }}
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
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
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                            title="Editar ejercicio"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(ex.id, ex.title)}
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.5rem', color: '#ef4444', borderColor: '#fecaca' }}
                            title="Eliminar ejercicio"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
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
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    padding: '0.3rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                  title={saving ? 'Guardando ejercicio...' : 'Guardar ejercicio'}
                >
                  <Save size={16} />
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
