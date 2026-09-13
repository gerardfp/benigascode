import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Exercise, TestCaseDTO, AssetDTO } from '../types';
import { Exercise, TestCaseDTO, AssetDTO, TeacherCollectionDetail } from '../types';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { 
  Plus, Search, ArrowLeft, Save, Trash2, Download, Image as ImageIcon, 
  ArrowUp, ArrowDown, Eye, Edit3, Columns, CheckCircle, AlertCircle, FileCode, Layers
  ArrowUp, ArrowDown, Eye, Edit3, Columns, CheckCircle, AlertCircle, FileCode, Layers,
  GripVertical, ChevronLeft, ChevronRight
} from 'lucide-react';

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
  const pageSize = 20;

  // Collection context for navigation
  const [activeCollection, setActiveCollection] = useState<TeacherCollectionDetail | null>(null);

  // Selected / Editing Exercise State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState('java');
  const [runtimeId, setRuntimeId] = useState('java-26');
  const [statement, setStatement] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState<TestCaseDTO[]>([]);
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [versionNumber, setVersionNumber] = useState<number>(1);

  // Editor UI State
  const [statementView, setStatementView] = useState<'split' | 'edit' | 'preview'>('split');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Split mode height tracking
  const [textareaHeight, setTextareaHeight] = useState<number | null>(null);

  // Drag & drop state for test cases
  const [draggedTestCaseIndex, setDraggedTestCaseIndex] = useState<number | null>(null);
  const [dragOverTestCaseIndex, setDragOverTestCaseIndex] = useState<number | null>(null);

  // ResizeObserver for Markdown textarea to synchronize preview height in split mode
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setTextareaHeight(textarea.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === textarea) {
          setTextareaHeight(textarea.offsetHeight);
        }
      }
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, [statementView, mode]);

  // Load exercises list
  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await api.teacherGetExercises();
      setExercises(data);
    } catch (err: any) {
      console.error('Error cargando ejercicios:', err);
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
        .then((col) => {
          setActiveCollection(col);
        })
        .catch((err) => {
          console.error('Error cargando colección para navegación:', err);
          setActiveCollection(null);
        });
    } else {
      setActiveCollection(null);
    }
  }, [collectionIdParam]);

  // Open exercise if exerciseIdParam is present
  useEffect(() => {
    if (exerciseIdParam && exerciseIdParam !== selectedId) {
      handleOpenEdit(exerciseIdParam);
    }
  }, [exerciseIdParam]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) return exercises;
    const term = searchTerm.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.title.toLowerCase().includes(term) ||
        ex.slug.toLowerCase().includes(term)
    );
  }, [exercises, searchTerm]);

  // Exercises sequence for navigation (either collection's exercises or catalog exercises)
  const navigationExercises = useMemo(() => {
    if (activeCollection && activeCollection.exercises && activeCollection.exercises.length > 0) {
      return activeCollection.exercises.map((e) => ({
        id: e.exerciseId,
        title: e.exerciseTitle,
        slug: e.exerciseSlug
      }));
    }
    return exercises.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug
    }));
  }, [activeCollection, exercises]);

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
  const handleOpenEdit = async (id: string) => {
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
      setTitle(detail.title || '');
      setSlug(detail.slug || '');
      setLanguage(detail.language || 'java');
      setRuntimeId(detail.runtimeId || 'java-26');
      setStatement(detail.statement || '');
      setStarterCode(detail.starterCode || (detail.templates && detail.templates['java']) || '');
      setTestCases(detail.testCases || []);
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
    setSearchParams({});
    setTitle('');
    setSlug('');
    setLanguage('java');
    setRuntimeId('java-26');
    setStatement('# Nuevo Ejercicio\n\nDescripción del problema...');
    setStarterCode('public class Solution {\n    public static void main(String[] args) {\n        // Tu código aquí\n    }\n}\n');
    setTestCases([
      { isPublic: true, orderIndex: 0, weight: 1, input: '', expectedOutput: '', explanation: '' },
      { isPublic: false, orderIndex: 1, weight: 1, input: '', expectedOutput: '', explanation: '' }
    ]);
    setAssets([]);
    setVersionNumber(1);
    setStatusMsg(null);
    setMode('editor');
  };

  // Slug generator helper
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!selectedId) {
      // Auto-generate slug if it's a new exercise
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  // Test Cases operations
  const handleAddTestCase = () => {
    const nextIndex = testCases.length;
    setTestCases([
      ...testCases,
      {
        isPublic: testCases.filter(t => t.isPublic).length === 0, // Public if no public yet
        orderIndex: nextIndex,
        weight: 1,
        input: '',
        expectedOutput: '',
        explanation: ''
      }
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    const updated = testCases.filter((_, i) => i !== index).map((tc, idx) => ({ ...tc, orderIndex: idx }));
    setTestCases(updated);
  };

  const handleUpdateTestCase = (index: number, fields: Partial<TestCaseDTO>) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], ...fields };
    setTestCases(updated);
  };

  const handleMoveTestCase = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testCases.length) return;
    const updated = [...testCases];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // Re-index
    const reindexed = updated.map((tc, idx) => ({ ...tc, orderIndex: idx }));
    setTestCases(reindexed);
  };

  const handleMoveTestCaseToPosition = (fromIndex: number, targetPosition: number) => {
    if (isNaN(targetPosition) || targetPosition < 1) return;
    const clampedTarget = Math.min(Math.max(1, targetPosition), testCases.length);
    const toIndex = clampedTarget - 1;
    if (fromIndex === toIndex) return;

    const updated = [...testCases];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setTestCases(updated.map((tc, idx) => ({ ...tc, orderIndex: idx })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedTestCaseIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTestCaseIndex !== index) {
      setDragOverTestCaseIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedTestCaseIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== dropIndex) {
      const updated = [...testCases];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(dropIndex, 0, movedItem);
      setTestCases(updated.map((tc, idx) => ({ ...tc, orderIndex: idx })));
    }
    setDraggedTestCaseIndex(null);
    setDragOverTestCaseIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTestCaseIndex(null);
    setDragOverTestCaseIndex(null);
  };

  // Markdown formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'texto') + suffix;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setStatement(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 5));
    }, 10);
  };

  // Handle image upload and insert markdown
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If exercise not saved yet, save first or notify
    let currentExId = selectedId;
    if (!currentExId) {
      if (!title.trim()) {
        alert('Por favor, indica primero un título para el ejercicio antes de subir imágenes.');
        return;
      }
      try {
        setSaving(true);
        const saved = await api.teacherSaveExercise({
          title,
          slug: slug || 'ejercicio-' + Date.now(),
          language,
          runtimeId,
          statement,
          starterCode,
          testCases
        });
        currentExId = saved.id;
        setSelectedId(saved.id);
        setSlug(saved.slug);
      } catch (err: any) {
        alert('Error al guardar el ejercicio inicial: ' + err.message);
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    try {
      setUploadingAsset(true);
      const newAsset = await api.teacherUploadAsset(currentExId, file);
      setAssets((prev) => [...prev.filter((a) => a.filename !== newAsset.filename), newAsset]);

      // Insert markdown at cursor
      const imgMarkdown = `\n![${newAsset.filename}](${newAsset.filename})\n`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + imgMarkdown + text.substring(end);
        setStatement(newText);
      } else {
        setStatement((prev) => prev + imgMarkdown);
      }

      setStatusMsg({ type: 'success', text: `Imagen "${newAsset.filename}" subida e insertada.` });
    } catch (err: any) {
      alert('Error subiendo imagen: ' + err.message);
    } finally {
      setUploadingAsset(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete an asset
  const handleDeleteAsset = async (filename: string) => {
    if (!selectedId) return;
    if (!confirm(`¿Eliminar la imagen "${filename}"?`)) return;
    try {
      await api.teacherDeleteAsset(selectedId, filename);
      setAssets((prev) => prev.filter((a) => a.filename !== filename));
      setStatusMsg({ type: 'success', text: `Imagen "${filename}" eliminada.` });
    } catch (err: any) {
      alert('Error eliminando imagen: ' + err.message);
    }
  };

  // Render markdown with images
  const renderedMarkdown = useMemo(() => {
    if (!statement) return '';
    const markedInstance = new Marked({ gfm: true, breaks: true });
    markedInstance.use({
      walkTokens(token) {
        if (token.type === 'image' && token.href) {
          const href = token.href;
          if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:') && !href.startsWith('/api/')) {
            const clean = href.replace(/^\/+/, '');
            if (selectedId) {
              token.href = `/api/v1/exercises/${selectedId}/assets/${clean}`;
            }
          }
        }
      }
    });

    let html = markedInstance.parse(statement, { async: false }) as string;
    if (selectedId) {
      html = html.replace(/<img\s+([^>]*?)src=["'](?!https?:\/\/|data:|\/api\/)([^"']+)["']([^>]*?)>/gi, (_match, before, src, after) => {
        const cleanHref = src.replace(/^\/+/, '');
        return `<img ${before}src="/api/v1/exercises/${selectedId}/assets/${cleanHref}"${after} loading="lazy">`;
      });
    }

    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['img'],
      ADD_ATTR: ['src', 'alt', 'title', 'class', 'loading']
    });
  }, [statement, selectedId]);

  // Save exercise
  const handleSave = async () => {
    if (!title.trim()) {
      setStatusMsg({ type: 'error', text: 'El título es obligatorio.' });
      return;
    }
    if (!slug.trim()) {
      setStatusMsg({ type: 'error', text: 'El identificador (slug) es obligatorio.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        language: language.trim() || 'java',
        runtimeId: runtimeId.trim() || 'java-26',
        statement: statement.trim(),
        starterCode: starterCode,
        testCases: testCases.map((tc, idx) => ({
          ...tc,
          orderIndex: idx,
          weight: Number(tc.weight) || 1
        }))
      };

      const result = await api.teacherSaveExercise(payload, selectedId || undefined);
      setSelectedId(result.id);
      setSlug(result.slug);
      setVersionNumber(result.versionNumber);
      setAssets(result.assets || []);
      setStatusMsg({ type: 'success', text: `Ejercicio "${result.title}" guardado correctamente (v${result.versionNumber}).` });
      // Refresh exercise list
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
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Gestión de Ejercicios</h1>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9375rem' }}>
              Crea, edita y organiza los ejercicios y casos de prueba almacenados en la base de datos.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
            <Plus size={18} /> Nuevo Ejercicio
          </button>
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
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>Título</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>Slug</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>Runtime</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>Versión</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExercises.map((ex) => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 500, color: '#1e293b' }}>
                        {ex.title}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {ex.slug}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span className="badge badge-info">{ex.runtimeId || 'java-26'}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span className="badge badge-neutral">v{ex.versionNumber || 1}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(ex.id)}
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                            title="Editar ejercicio"
                          >
                            <Edit3 size={14} /> Editar
                          </button>
                          <a
                            href={api.teacherExportExerciseZipUrl(ex.id)}
                            download
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem', textDecoration: 'none' }}
                            title="Exportar ZIP"
                          >
                            <Download size={14} /> ZIP
                          </a>
                          <button
                            onClick={() => handleDeleteExercise(ex.id, ex.title)}
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem', color: '#dc2626' }}
                            title="Eliminar ejercicio"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, filteredExercises.length)} de {filteredExercises.length} ejercicios
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

  // Render navigation buttons helper
  const renderNavigationButtons = (isTop: boolean) => {
    if (mode !== 'editor' || navigationExercises.length <= 1) return null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <button
          type="button"
          onClick={() => handleNavigateExercise('prev')}
          disabled={!hasPrevExercise}
          className="btn-secondary"
          style={{
            padding: isTop ? '0.375rem 0.625rem' : '0.5rem 0.875rem',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: !hasPrevExercise ? 0.35 : 1,
            cursor: !hasPrevExercise ? 'not-allowed' : 'pointer'
          }}
          title={hasPrevExercise ? `Anterior: ${navigationExercises[currentExerciseIndex - 1]?.title}` : 'No hay ejercicio anterior'}
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        <span
          style={{
            fontSize: '0.8125rem',
            color: '#475569',
            fontWeight: 600,
            padding: '0 0.375rem',
            whiteSpace: 'nowrap'
          }}
        >
          {currentExerciseIndex >= 0 ? `${currentExerciseIndex + 1} de ${navigationExercises.length}` : ''}
        </span>

        <button
          type="button"
          onClick={() => handleNavigateExercise('next')}
          disabled={!hasNextExercise}
          className="btn-secondary"
          style={{
            padding: isTop ? '0.375rem 0.625rem' : '0.5rem 0.875rem',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: !hasNextExercise ? 0.35 : 1,
            cursor: !hasNextExercise ? 'not-allowed' : 'pointer'
          }}
          title={hasNextExercise ? `Siguiente: ${navigationExercises[currentExerciseIndex + 1]?.title}` : 'No hay ejercicio siguiente'}
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  // RENDER: SINGLE-SHEET EDITOR VIEW
  return (
    <div className="app-container" style={{ maxWidth: 1300 }}>
      {/* Top Bar with Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => { setMode('list'); setStatusMsg(null); }} className="btn-secondary">
            <ArrowLeft size={16} /> Volver a la lista
          <button onClick={handleBack} className="btn-secondary">
            <ArrowLeft size={16} /> {collectionIdParam ? 'Volver a la colección' : 'Volver a la lista'}
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {selectedId ? `Editar: ${title || 'Sin título'}` : 'Nuevo Ejercicio'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                {selectedId ? `Editar: ${title || 'Sin título'}` : 'Nuevo Ejercicio'}
              </h1>
              {activeCollection && (
                <span className="badge badge-info" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  📚 Colección: {activeCollection.title}
                </span>
              )}
            </div>
            {selectedId && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Versión actual: v{versionNumber} • ID: {selectedId}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {renderNavigationButtons(true)}

          {selectedId && (
            <a
              href={api.teacherExportExerciseZipUrl(selectedId)}
              download
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Download size={16} /> Exportar ZIP
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ padding: '0.625rem 1.25rem' }}
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Ejercicio'}
          </button>
        </div>
      </div>

      {/* Status / Alert Banner */}
      {statusMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{statusMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: METADATA & PARAMETERS */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#2563eb" /> Parámetros del Ejercicio
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Título del Ejercicio *
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Suma de dos números"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Identificador (Slug) *
            </label>
            <input
              type="text"
              className="input-field"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ej: suma-dos-numeros"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Lenguaje
            </label>
            <input
              type="text"
              className="input-field"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="java"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Runtime Requerido
            </label>
            <input
              type="text"
              className="input-field"
              value={runtimeId}
              onChange={(e) => setRuntimeId(e.target.value)}
              placeholder="java-26"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: ENUNCIADO (STATEMENT) CON MARKDOWN, TOOLBAR E IMÁGENES */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={18} color="#2563eb" /> Enunciado del Ejercicio (Markdown)
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setStatementView('edit')}
                style={{
                  padding: '0.375rem 0.625rem',
                  border: 'none',
                  backgroundColor: statementView === 'edit' ? '#2563eb' : '#ffffff',
                  color: statementView === 'edit' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Edit3 size={14} /> Solo Editor
              </button>
              <button
                type="button"
                onClick={() => setStatementView('split')}
                style={{
                  padding: '0.375rem 0.625rem',
                  border: 'none',
                  borderLeft: '1px solid #e2e8f0',
                  borderRight: '1px solid #e2e8f0',
                  backgroundColor: statementView === 'split' ? '#2563eb' : '#ffffff',
                  color: statementView === 'split' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Columns size={14} /> Dividido
              </button>
              <button
                type="button"
                onClick={() => setStatementView('preview')}
                style={{
                  padding: '0.375rem 0.625rem',
                  border: 'none',
                  backgroundColor: statementView === 'preview' ? '#2563eb' : '#ffffff',
                  color: statementView === 'preview' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Eye size={14} /> Vista Previa
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem 0.375rem 0 0', borderBottom: 'none' }}>
          <button type="button" onClick={() => insertFormatting('**', '**')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
            B
          </button>
          <button type="button" onClick={() => insertFormatting('*', '*')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
            I
          </button>
          <button type="button" onClick={() => insertFormatting('# ')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            H1
          </button>
          <button type="button" onClick={() => insertFormatting('## ')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            H2
          </button>
          <button type="button" onClick={() => insertFormatting('`', '`')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            Código
          </button>
          <button type="button" onClick={() => insertFormatting('\n```java\n', '\n```\n')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            Bloque Java
          </button>
          <button type="button" onClick={() => insertFormatting('- ')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            Lista
          </button>
          <button type="button" onClick={() => insertFormatting('\n| Columna 1 | Columna 2 |\n|---|---|\n| Valor 1 | Valor 2 |\n')} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            Tabla
          </button>

          <div style={{ height: 18, width: 1, backgroundColor: '#cbd5e1', margin: '0 0.25rem' }} />

          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAsset}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}
          >
            <ImageIcon size={14} /> {uploadingAsset ? 'Subiendo imagen...' : 'Subir e Insertar Imagen'}
          </button>
        </div>

        {/* Editor Area (Edit, Split, or Preview) */}
        <div style={{ display: 'grid', gridTemplateColumns: statementView === 'split' ? '1fr 1fr' : '1fr', gap: statementView === 'split' ? '1rem' : 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: statementView === 'split' ? '1fr 1fr' : '1fr',
          gap: statementView === 'split' ? '1rem' : 0,
          alignItems: 'start'
        }}>
          {/* Edit Area */}
          {(statementView === 'edit' || statementView === 'split') && (
            <div>
              <textarea
                ref={textareaRef}
                className="input-field"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={18}
                style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  borderRadius: statementView === 'split' ? '0 0 0 0.375rem' : '0 0 0.375rem 0.375rem',
                  borderTop: 'none',
                  resize: 'vertical'
                  resize: 'vertical',
                  minHeight: '380px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                placeholder="Escribe el enunciado en Markdown aquí..."
              />
            </div>
          )}

          {/* Preview Area */}
          {(statementView === 'preview' || statementView === 'split') && (
            <div
              className="markdown-statement"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: statementView === 'split' ? '0 0 0.375rem 0' : '0 0 0.375rem 0.375rem',
                padding: '1rem 1.25rem',
                backgroundColor: '#ffffff',
                overflowY: 'auto',
                maxHeight: '480px',
                borderTop: statementView === 'split' ? '1px solid #e2e8f0' : 'none'
                height: statementView === 'split' && textareaHeight ? `${textareaHeight}px` : undefined,
                minHeight: '380px',
                maxHeight: statementView === 'split' && textareaHeight ? `${textareaHeight}px` : (statementView === 'preview' ? '700px' : undefined),
                borderTop: statementView === 'split' ? '1px solid #e2e8f0' : 'none',
                boxSizing: 'border-box'
              }}
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          )}
        </div>

        {/* Assets list drawer */}
        {assets.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
              Imágenes vinculadas a este ejercicio ({assets.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <ImageIcon size={12} color="#64748b" />
                  <span style={{ fontFamily: 'monospace' }}>{asset.filename}</span>
                  <span style={{ color: '#94a3b8' }}>({(asset.sizeBytes / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => insertFormatting(`![${asset.filename}](${asset.filename})`)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                    title="Insertar en el texto"
                  >
                    Insertar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(asset.filename)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
                    title="Eliminar imagen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: CÓDIGO INICIAL / TEMPLATES */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCode size={18} color="#2563eb" /> Código Inicial para el Alumno (Starter Code)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 0.75rem 0' }}>
          Código base con el que arrancará el editor del estudiante.
        </p>
        <textarea
          className="input-field"
          value={starterCode}
          onChange={(e) => setStarterCode(e.target.value)}
          rows={10}
          style={{
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '0.375rem'
          }}
          placeholder="public class Solution { ... }"
        />
      </div>

      {/* SECTION 4: CASOS DE PRUEBA (TEST CASES) EN LA MISMA PANTALLA */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} color="#2563eb" /> Casos de Prueba ({testCases.length})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {testCases.filter((t) => t.isPublic).length} públicos • {testCases.filter((t) => !t.isPublic).length} privados
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddTestCase}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Plus size={16} /> Añadir Caso de Prueba
          </button>
        </div>

        {testCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', color: '#64748b' }}>
            No hay casos de prueba definidos. Pulsa en "+ Añadir Caso de Prueba" para crear el primero.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {testCases.map((tc, index) => (
              <div
                key={tc.id || index}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  border: `1px solid ${tc.isPublic ? '#bae6fd' : '#e2e8f0'}`,
                  backgroundColor: tc.isPublic ? '#f0f9ff' : '#ffffff',
                  border: dragOverTestCaseIndex === index
                    ? '2px dashed #2563eb'
                    : `1px solid ${tc.isPublic ? '#bae6fd' : '#e2e8f0'}`,
                  backgroundColor: dragOverTestCaseIndex === index
                    ? '#eff6ff'
                    : (tc.isPublic ? '#f0f9ff' : '#ffffff'),
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                  opacity: draggedTestCaseIndex === index ? 0.4 : 1,
                  transition: 'background-color 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Header of Test Case */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Move Drag Handle */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        cursor: 'grab',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#475569',
                        userSelect: 'none'
                      }}
                      title="Arrastrar para mover este caso de prueba"
                    >
                      <GripVertical size={15} />
                      <span>Mover</span>
                    </div>

                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>
                      Test #{index + 1}
                    </span>

                    {/* Public / Private Toggle */}
                    <button
                      type="button"
                      onClick={() => handleUpdateTestCase(index, { isPublic: !tc.isPublic })}
                      className={`badge ${tc.isPublic ? 'badge-info' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Clic para alternar entre Público y Privado"
                    >
                      {tc.isPublic ? '🌐 Público (Visible)' : '🔒 Privado (Oculto)'}
                    </button>

                    {/* Weight Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Peso:</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={tc.weight}
                        onChange={(e) => handleUpdateTestCase(index, { weight: Number(e.target.value) || 0 })}
                        className="input-field"
                        style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.8125rem' }}
                      />
                    </div>

                    {/* Target Position Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Posición:</span>
                      <input
                        type="number"
                        min={1}
                        max={testCases.length}
                        value={index + 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            handleMoveTestCaseToPosition(index, val);
                          }
                        }}
                        className="input-field"
                        style={{ width: '55px', padding: '0.2rem 0.4rem', fontSize: '0.8125rem', textAlign: 'center' }}
                        title={`Cambiar de posición (1 a ${testCases.length})`}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>/ {testCases.length}</span>
                    </div>
                  </div>

                  {/* Actions: Move Up / Down / Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveTestCase(index, 'up')}
                      disabled={index === 0}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.4rem', opacity: index === 0 ? 0.3 : 1 }}
                      title="Subir posición"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTestCase(index, 'down')}
                      disabled={index === testCases.length - 1}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.4rem', opacity: index === testCases.length - 1 ? 0.3 : 1 }}
                      title="Bajar posición"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(index)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', color: '#dc2626' }}
                      title="Eliminar este caso de prueba"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Body: Input, Expected Output, Explanation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  <div>
                {/* Body: Input, Expected Output, Explanation (vertical stack, 100% width each) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Entrada (Input / stdin)
                    </label>
                    <textarea
                      className="input-field"
                      rows={4}
                      rows={3}
                      value={tc.input || ''}
                      onChange={(e) => handleUpdateTestCase(index, { input: e.target.value })}
                      placeholder="Ej: 5 10"
                      style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '0.8125rem' }}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div>
                  <div style={{ width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Salida Esperada (Expected stdout)
                    </label>
                    <textarea
                      className="input-field"
                      rows={4}
                      rows={3}
                      value={tc.expectedOutput || ''}
                      onChange={(e) => handleUpdateTestCase(index, { expectedOutput: e.target.value })}
                      placeholder="Ej: 15"
                      style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '0.8125rem' }}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div>
                  <div style={{ width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Explicación (Opcional)
                    </label>
                    <textarea
                      className="input-field"
                      rows={4}
                      rows={2}
                      value={tc.explanation || ''}
                      onChange={(e) => handleUpdateTestCase(index, { explanation: e.target.value })}
                      placeholder="Explicación mostrada al estudiante sobre este caso..."
                      style={{ fontSize: '0.8125rem' }}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8125rem' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 0' }}>
        <button onClick={() => { setMode('list'); setStatusMsg(null); }} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ padding: '0.625rem 1.5rem', fontSize: '0.9375rem' }}
        >
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Ejercicio'}
        </button>
      {/* Bottom Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.25rem 0 2rem 0',
        borderTop: '1px solid #e2e8f0',
        marginTop: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div>
          {renderNavigationButtons(false)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handleBack} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.9375rem' }}
          >
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Ejercicio'}
          </button>
        </div>
      </div>
    </div>
  );
};
