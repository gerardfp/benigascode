import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Collection, Exercise, CollectionItemDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Plus, Search, ArrowLeft, Save, Trash2, Download, 
  ArrowUp, ArrowDown, CheckCircle, AlertCircle, Folder, BookOpen, Layers, Edit3
} from 'lucide-react';

export const TeacherCollectionsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionIdParam = searchParams.get('collectionId');

  // Navigation & List State
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting state
  type CollectionSortKey = 'title' | 'slug' | 'visibility' | 'version';
  const [sortKey, setSortKey] = useState<CollectionSortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: CollectionSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Editor State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [versionNumber, setVersionNumber] = useState(1);

  // Exercises inside this collection
  const [collectionExercises, setCollectionExercises] = useState<CollectionItemDTO[]>([]);

  // Available catalog exercises to add
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exercisePickerSearch, setExercisePickerSearch] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load collections
  const loadCollections = async () => {
    try {
      setLoading(true);
      const data = await api.teacherGetCollections();
      setCollections(data);
    } catch (err: any) {
      console.error('Error al cargar colecciones:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error al cargar colecciones' });
    } finally {
      setLoading(false);
    }
  };

  // Load all available exercises for the picker
  const loadAllExercises = async () => {
    try {
      const data = await api.teacherGetExercises();
      setAllExercises(data);
    } catch (err) {
      console.error('Error cargando ejercicios disponibles:', err);
    }
  };

  useEffect(() => {
    loadCollections();
    loadAllExercises();
  }, []);

  useEffect(() => {
    if (collectionIdParam && collectionIdParam !== selectedId) {
      handleOpenEdit(collectionIdParam);
    }
  }, [collectionIdParam]);

  // Filtered and sorted collections
  const filteredCollections = useMemo(() => {
    let result = collections;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = collections.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.slug.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term))
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'slug') {
        cmp = a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'visibility') {
        cmp = a.visibility.localeCompare(b.visibility);
      } else if (sortKey === 'version') {
        cmp = (a.versionNumber || 1) - (b.versionNumber || 1);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [collections, searchTerm, sortKey, sortDir]);

  // Back to list helper
  const handleBackToList = () => {
    setMode('list');
    setSelectedId(null);
    setSearchParams({});
    setStatusMsg(null);
  };

  // Open Editor for an existing collection
  const handleOpenEdit = async (id: string) => {
    try {
      setLoading(true);
      setStatusMsg(null);
      setSearchParams({ collectionId: id });
      const detail = await api.teacherGetCollection(id);
      setSelectedId(detail.id);
      setTitle(detail.title || '');
      setSlug(detail.slug || '');
      setDescription(detail.description || '');
      setVisibility(detail.visibility || 'PUBLIC');
      setVersionNumber(detail.versionNumber || 1);
      setCollectionExercises(detail.exercises || []);
      setMode('editor');
    } catch (err: any) {
      alert('Error cargando la colección: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Editor for a new collection
  const handleOpenCreate = () => {
    setSelectedId(null);
    setSearchParams({});
    setTitle('');
    setSlug('');
    setDescription('');
    setVisibility('PUBLIC');
    setVersionNumber(1);
    setCollectionExercises([]);
    setStatusMsg(null);
    setMode('editor');
  };

  // Auto-generate slug when creating
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!selectedId) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  // Exercises reordering & removal
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= collectionExercises.length) return;
    const updated = [...collectionExercises];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setCollectionExercises(updated.map((ex, i) => ({ ...ex, orderIndex: i })));
  };

  const handleRemoveExercise = (index: number) => {
    const updated = collectionExercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, orderIndex: i }));
    setCollectionExercises(updated);
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (collectionExercises.some((e) => e.exerciseId === exercise.id)) {
      return; // Already in collection
    }
    const newItem: CollectionItemDTO = {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      exerciseSlug: exercise.slug,
      orderIndex: collectionExercises.length
    };
    setCollectionExercises([...collectionExercises, newItem]);
  };

  // Available exercises filtered for adding
  const availableExercisesToAdd = useMemo(() => {
    const currentIds = new Set(collectionExercises.map((e) => e.exerciseId));
    let available = allExercises.filter((e) => !currentIds.has(e.id));
    if (exercisePickerSearch.trim()) {
      const term = exercisePickerSearch.toLowerCase();
      available = available.filter(
        (e) => e.title.toLowerCase().includes(term) || e.slug.toLowerCase().includes(term)
      );
    }
    return available;
  }, [allExercises, collectionExercises, exercisePickerSearch]);

  // Save Collection
  const handleSave = async () => {
    if (!title.trim()) {
      setStatusMsg({ type: 'error', text: 'El título es obligatorio.' });
      return;
    }
    if (!slug.trim()) {
      setStatusMsg({ type: 'error', text: 'El slug es obligatorio.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        visibility,
        exerciseIds: collectionExercises.map((e) => e.exerciseId)
      };

      const result = await api.teacherSaveCollection(payload, selectedId || undefined);
      setSelectedId(result.id);
      setSlug(result.slug);
      setVersionNumber(result.versionNumber);
      setCollectionExercises(result.exercises || []);
      setStatusMsg({ type: 'success', text: `Colección "${result.title}" guardada correctamente (v${result.versionNumber}).` });
      loadCollections();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al guardar la colección.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Collection
  const handleDelete = async (id: string, cTitle: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la colección "${cTitle}"?`)) {
      return;
    }
    try {
      await api.teacherDeleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setMode('list');
      }
    } catch (err: any) {
      alert('Error al eliminar la colección: ' + err.message);
    }
  };

  // RENDER: LIST VIEW
  if (mode === 'list') {
    return (
      <div className="app-container">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Colecciones</h1>
          </div>
          <button onClick={handleOpenCreate} className="btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
            <Plus size={18} /> Nueva Colección
          </button>
        </div>

        {/* Search */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar colección por título o identificador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {/* Collections Table / Cards */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando colecciones...</div>
          ) : filteredCollections.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No se encontraron colecciones creadas.
            </div>
          ) : (
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
                    label="Visibilidad"
                    sortKey="visibility"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                  />
                  <SortableHeader
                    label="Versión"
                    sortKey="version"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}
                  />
                  <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((col) => (
                  <tr key={col.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td
                      onClick={() => handleOpenEdit(col.id)}
                      style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                      title="Editar colección"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Folder size={16} color="#2563eb" />
                        <span style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}>{col.title}</span>
                      </div>
                      {col.description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 400 }}>
                          {col.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'monospace', color: '#64748b', fontSize: '0.8125rem' }}>
                      {col.slug}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span className={`badge ${col.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`}>
                        {col.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span className="badge badge-neutral">v{col.versionNumber || 1}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(col.id)}
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                        >
                          Editar
                        </button>
                        <a
                          href={api.teacherExportCollectionZipUrl(col.id)}
                          download
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem', textDecoration: 'none' }}
                          title="Exportar ZIP"
                        >
                          <Download size={14} /> ZIP
                        </a>
                        <button
                          onClick={() => handleDelete(col.id, col.title)}
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem', color: '#dc2626' }}
                          title="Eliminar colección"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // RENDER: SINGLE-SHEET EDITOR VIEW (PARÁMETROS ARRIBA, EJERCICIOS ABAJO)
  return (
    <div className="app-container" style={{ maxWidth: 1100 }}>
    <div className="app-container">
      {/* Top Bar with Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleBackToList} className="btn-secondary">
            <ArrowLeft size={16} /> Volver a la lista
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {selectedId ? `Editar: ${title || 'Colección'}` : 'Nueva Colección'}
            </h1>
            {selectedId && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Versión actual: v{versionNumber} • ID: {selectedId}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectedId && (
            <a
              href={api.teacherExportCollectionZipUrl(selectedId)}
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
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Colección'}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
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

      {/* PARTE SUPERIOR: PARÁMETROS DE LA COLECCIÓN */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#2563eb" /> Parámetros de la Colección
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Título de la Colección *
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Programación Básica en Java"
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
              placeholder="Ej: programacion-basica-java"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Visibilidad
            </label>
            <select
              className="input-field"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="PUBLIC">Pública (Disponible para todos)</option>
              <option value="PRIVATE">Privada (Requiere clave de acceso)</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Descripción (Opcional)
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumen sobre los contenidos de esta colección..."
            />
          </div>
        </div>
      </div>

      {/* PARTE INFERIOR: LISTA DE EJERCICIOS DE LA COLECCIÓN */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="#2563eb" /> Ejercicios en esta Colección ({collectionExercises.length})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Organiza y reordena los ejercicios que componen esta colección.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPicker(!showAddPicker)}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Plus size={16} /> {showAddPicker ? 'Cerrar Buscador' : 'Añadir Ejercicio'}
          </button>
        </div>

        {/* Drawer / Selector de Ejercicios Disponibles */}
        {showAddPicker && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Selecciona ejercicios del catálogo para añadir:
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {availableExercisesToAdd.length} disponibles
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar ejercicio para añadir..."
                className="input-field"
                value={exercisePickerSearch}
                onChange={(e) => setExercisePickerSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem', backgroundColor: '#ffffff' }}>
              {availableExercisesToAdd.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  No hay más ejercicios disponibles con ese criterio.
                </div>
              ) : (
                availableExercisesToAdd.slice(0, 30).map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: '#1e293b' }}>{ex.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{ex.slug}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExercise(ex)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#2563eb' }}
                    >
                      <Plus size={12} /> Añadir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* List of exercises inside collection */}
        {collectionExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', color: '#64748b' }}>
            Esta colección aún no tiene ejercicios. Haz clic en "Añadir Ejercicio" para seleccionarlos.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {collectionExercises.map((item, index) => (
              <div
                key={item.exerciseId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', width: '24px' }}>
                    #{index + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {item.exerciseTitle}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {item.exerciseSlug}
                    </div>
                  </div>
                </div>

                {/* Reorder, Edit, and Delete Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedId 
                        ? `/teacher/exercises?exerciseId=${item.exerciseId}&collectionId=${selectedId}`
                        : `/teacher/exercises?exerciseId=${item.exerciseId}`;
                      navigate(url);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Editar este ejercicio en el editor completo"
                  >
                    <Edit3 size={13} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(index, 'up')}
                    disabled={index === 0}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.4rem', opacity: index === 0 ? 0.3 : 1 }}
                    title="Mover arriba"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(index, 'down')}
                    disabled={index === collectionExercises.length - 1}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.4rem', opacity: index === collectionExercises.length - 1 ? 0.3 : 1 }}
                    title="Mover abajo"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(index)}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', color: '#dc2626' }}
                    title="Quitar de esta colección"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 0' }}>
        <button onClick={handleBackToList} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ padding: '0.625rem 1.5rem', fontSize: '0.9375rem' }}
        >
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Colección'}
        </button>
      </div>
    </div>
  );
};

