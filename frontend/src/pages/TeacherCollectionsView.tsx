import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Collection, Exercise, CollectionItemDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Plus, Search, Trash2, Download, 
  ArrowUp, ArrowDown, CheckCircle, AlertCircle, Folder, BookOpen, Edit3,
  GripVertical, ChevronsRight
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

  // Initial values for dirty checking
  const [initialTitle, setInitialTitle] = useState('');
  const [initialSlug, setInitialSlug] = useState('');
  const [initialDescription, setInitialDescription] = useState('');
  const [initialVisibility, setInitialVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  const isCollectionDirty =
    title.trim() !== initialTitle.trim() ||
    slug.trim() !== initialSlug.trim() ||
    description.trim() !== initialDescription.trim() ||
    visibility !== initialVisibility;

  // Exercises inside this collection
  const [collectionExercises, setCollectionExercises] = useState<CollectionItemDTO[]>([]);

  // Drag and drop reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Quick position editing state
  const [editingPosIndex, setEditingPosIndex] = useState<number | null>(null);
  const [editingPosValue, setEditingPosValue] = useState<string>('');

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

  // Back to list helper
  const handleBackToList = () => {
    setMode('list');
    setSelectedId(null);
    setSearchParams({});
    setStatusMsg(null);
  };

  useEffect(() => {
    const handleReset = () => {
      handleBackToList();
    };
    window.addEventListener('benigascode:reset-collections', handleReset);
    return () => window.removeEventListener('benigascode:reset-collections', handleReset);
  }, []);

  useEffect(() => {
    if (collectionIdParam && collectionIdParam !== selectedId) {
      handleOpenEdit(collectionIdParam);
    } else if (!collectionIdParam && (selectedId || mode === 'editor')) {
      handleBackToList();
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
      setCollectionExercises(detail.exercises || []);
      setInitialTitle(detail.title || '');
      setInitialSlug(detail.slug || '');
      setInitialDescription(detail.description || '');
      setInitialVisibility(detail.visibility || 'PUBLIC');
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
    setCollectionExercises([]);
    setInitialTitle('');
    setInitialSlug('');
    setInitialDescription('');
    setInitialVisibility('PUBLIC');
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

  // Exercises reordering & removal with immediate save
  const handleMoveExercise = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= collectionExercises.length) return;
    const updated = [...collectionExercises];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    const ordered = updated.map((ex, i) => ({ ...ex, orderIndex: i }));
    setCollectionExercises(ordered);

    if (selectedId) {
      try {
        await api.teacherSaveCollection({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          visibility,
          exerciseIds: ordered.map((e) => e.exerciseId)
        }, selectedId);
      } catch (err: any) {
        setCollectionExercises(collectionExercises);
        setStatusMsg({ type: 'error', text: err.message || 'Error al reordenar ejercicios.' });
      }
    }
  };

  const handleDropReorder = async (fromIndex: number, targetIndex: number) => {
    let toIndex = targetIndex;
    if (fromIndex < toIndex) {
      toIndex = toIndex - 1;
    }
    if (fromIndex === toIndex) return;

    const updated = [...collectionExercises];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    const ordered = updated.map((ex, i) => ({ ...ex, orderIndex: i }));
    setCollectionExercises(ordered);

    if (selectedId) {
      try {
        await api.teacherSaveCollection({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          visibility,
          exerciseIds: ordered.map((e) => e.exerciseId)
        }, selectedId);
      } catch (err: any) {
        setCollectionExercises(collectionExercises);
        setStatusMsg({ type: 'error', text: err.message || 'Error al reordenar ejercicios.' });
      }
    }
  };

  const handleSetPosition = async (fromIndex: number, newPos1Based: number) => {
    if (isNaN(newPos1Based)) return;
    const targetPos = Math.max(1, Math.min(collectionExercises.length, newPos1Based));
    const targetIndex = targetPos - 1;
    if (targetIndex === fromIndex) return;

    const updated = [...collectionExercises];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    const ordered = updated.map((ex, i) => ({ ...ex, orderIndex: i }));
    setCollectionExercises(ordered);

    if (selectedId) {
      try {
        await api.teacherSaveCollection({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          visibility,
          exerciseIds: ordered.map((e) => e.exerciseId)
        }, selectedId);
        loadCollections();
      } catch (err: any) {
        setCollectionExercises(collectionExercises);
        setStatusMsg({ type: 'error', text: err.message || 'Error al recolocar el ejercicio.' });
      }
    }
  };

  const handleRemoveExercise = async (index: number) => {
    const updated = collectionExercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, orderIndex: i }));
    setCollectionExercises(updated);

    if (selectedId) {
      try {
        await api.teacherSaveCollection({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          visibility,
          exerciseIds: updated.map((e) => e.exerciseId)
        }, selectedId);
        loadCollections();
      } catch (err: any) {
        setCollectionExercises(collectionExercises);
        setStatusMsg({ type: 'error', text: err.message || 'Error al quitar el ejercicio de la colección.' });
      }
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (collectionExercises.some((e) => e.exerciseId === exercise.id)) {
      return; // Already in collection
    }
    const newItem: CollectionItemDTO = {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      exerciseSlug: exercise.slug,
      orderIndex: collectionExercises.length
    };
    const updated = [...collectionExercises, newItem];
    setCollectionExercises(updated);

    if (selectedId) {
      try {
        await api.teacherSaveCollection({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          visibility,
          exerciseIds: updated.map((e) => e.exerciseId)
        }, selectedId);
        loadCollections();
      } catch (err: any) {
        setCollectionExercises(collectionExercises);
        setStatusMsg({ type: 'error', text: err.message || 'Error al añadir el ejercicio a la colección.' });
      }
    }
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
      setCollectionExercises(result.exercises || []);
      setInitialTitle(result.title);
      setInitialSlug(result.slug);
      setInitialDescription(result.description || '');
      setInitialVisibility(result.visibility || 'PUBLIC');
      setSearchParams({ collectionId: result.id });
      setStatusMsg({ type: 'success', text: selectedId ? 'Parámetros actualizados correctamente.' : 'Colección creada correctamente. Ahora puedes añadir ejercicios.' });
      setTimeout(() => setStatusMsg(null), 3500);
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
        {/* Collections Table / Cards */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Toolbar de búsqueda y acciones pegado a la tabla */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 500 }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar colección por título o identificador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.875rem' }}
              />
            </div>

            <button onClick={handleOpenCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
              <Plus size={16} /> Crear Colección
            </button>
          </div>
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
                          className="btn-table-action"
                          title="Editar colección"
                        >
                          <Edit3 size={15} />
                        </button>
                        <a
                          href={api.teacherExportCollectionZipUrl(col.id)}
                          download
                          className="btn-table-action"
                          style={{ textDecoration: 'none' }}
                          title="Exportar ZIP"
                        >
                          <Download size={15} />
                        </a>
                        <button
                          onClick={() => handleDelete(col.id, col.title)}
                          className="btn-table-action-danger"
                          title="Eliminar colección"
                        >
                          <Trash2 size={15} />
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

  // RENDER: SINGLE-SHEET EDITOR VIEW (PARÁMETROS ARRIBA, EJERCICIOS ABAJO DENTRO DE LA CARD)
  return (
    <div className="app-container">
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

      {/* CARD: PARÁMETROS Y EJERCICIOS */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        {!selectedId && (
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={18} color="#2563eb" /> Nueva Colección
          </h2>
        )}
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

        {/* BOTONES DE PARÁMETROS */}
        {!selectedId ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={handleBackToList}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              disabled={saving || !title.trim() || !slug.trim()}
            >
              {saving ? 'Creando...' : 'Crear Colección'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
            <a
              href={api.teacherExportCollectionZipUrl(selectedId)}
              download
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
              title="Exportar ZIP"
            >
              <Download size={16} /> Exportar ZIP
            </a>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleBackToList}
                className="btn-secondary"
                disabled={saving}
              >
                Volver a la lista
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
                disabled={saving || !isCollectionDirty || !title.trim() || !slug.trim()}
                style={{
                  opacity: (!isCollectionDirty || !title.trim() || !slug.trim()) ? 0.5 : 1,
                  cursor: (!isCollectionDirty || !title.trim() || !slug.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE EJERCICIOS DE LA COLECCIÓN (SOLO SI YA ESTÁ CREADA) */}
        {selectedId && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={18} color="#2563eb" /> Ejercicios ({collectionExercises.length})
                </h3>
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
              <div
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTargetIndex(null);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                {collectionExercises.map((item, index) => {
                  const showPlaceholderBefore =
                    draggedIndex !== null &&
                    dropTargetIndex === index &&
                    dropTargetIndex !== draggedIndex &&
                    dropTargetIndex !== draggedIndex + 1;

                  const isLastItem = index === collectionExercises.length - 1;
                  const showPlaceholderAfter =
                    isLastItem &&
                    draggedIndex !== null &&
                    dropTargetIndex === collectionExercises.length &&
                    dropTargetIndex !== draggedIndex &&
                    dropTargetIndex !== draggedIndex + 1;

                  return (
                    <React.Fragment key={item.exerciseId}>
                      {showPlaceholderBefore && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedIndex !== null && dropTargetIndex !== null) {
                              handleDropReorder(draggedIndex, dropTargetIndex);
                            }
                            setDraggedIndex(null);
                            setDropTargetIndex(null);
                          }}
                          style={{
                            height: '48px',
                            backgroundColor: '#eff6ff',
                            border: '2px dashed #3b82f6',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Mover a la posición #{index + 1}
                        </div>
                      )}

                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                          setDraggedIndex(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mid = rect.top + rect.height / 2;
                          const pos = e.clientY > mid ? index + 1 : index;
                          if (dropTargetIndex !== pos) {
                            setDropTargetIndex(pos);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && dropTargetIndex !== null) {
                            handleDropReorder(draggedIndex, dropTargetIndex);
                          }
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          opacity: draggedIndex === index ? 0.35 : 1,
                          cursor: 'grab',
                          boxShadow: draggedIndex === index ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : undefined,
                          transition: 'opacity 0.15s, box-shadow 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', cursor: 'grab' }}
                            title="Arrastrar para reordenar"
                          >
                            <GripVertical size={16} />
                          </div>
                          {editingPosIndex === index ? (
                            <div
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min={1}
                                max={collectionExercises.length}
                                value={editingPosValue}
                                autoFocus
                                onChange={(e) => setEditingPosValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const parsed = parseInt(editingPosValue, 10);
                                    if (!isNaN(parsed)) {
                                      handleSetPosition(index, parsed);
                                    }
                                    setEditingPosIndex(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingPosIndex(null);
                                  }
                                }}
                                style={{
                                  width: '48px',
                                  padding: '0.2rem 0.35rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  border: '1px solid #2563eb',
                                  borderRadius: '0.25rem',
                                  outline: 'none',
                                  backgroundColor: '#ffffff',
                                  color: '#1e293b',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const parsed = parseInt(editingPosValue, 10);
                                  if (!isNaN(parsed)) {
                                    handleSetPosition(index, parsed);
                                  }
                                  setEditingPosIndex(null);
                                }}
                                className="btn-primary"
                                style={{
                                  padding: '0.25rem 0.4rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '0.25rem',
                                }}
                                title="Mover a esta posición"
                              >
                                <ChevronsRight size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPosIndex(index);
                                setEditingPosValue(String(index + 1));
                              }}
                              className="btn-secondary"
                              style={{
                                padding: '0.15rem 0.4rem',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: '#475569',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0.25rem',
                                minWidth: '34px',
                                textAlign: 'center',
                                cursor: 'pointer',
                              }}
                              title="Haz clic para cambiar de posición"
                            >
                              #{index + 1}
                            </button>
                          )}
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
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                        >
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
                      {showPlaceholderAfter && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedIndex !== null && dropTargetIndex !== null) {
                              handleDropReorder(draggedIndex, dropTargetIndex);
                            }
                            setDraggedIndex(null);
                            setDropTargetIndex(null);
                          }}
                          style={{
                            height: '48px',
                            backgroundColor: '#eff6ff',
                            border: '2px dashed #3b82f6',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Mover al final (posición #{collectionExercises.length})
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

