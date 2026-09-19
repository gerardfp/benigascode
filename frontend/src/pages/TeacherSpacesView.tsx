import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { TeachingSpace, Tag, Collection, ContextPreviewDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { TagBadge } from '../components/TagBadge';
import { TagColorPicker } from '../components/TagColorPicker';
import {
  Layers, Plus, Trash2, Edit3, Users, BookOpen,
  Shield, X, Check
} from 'lucide-react';

export const TeacherSpacesView: React.FC = () => {
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  type SpaceSortKey = 'name' | 'tags' | 'collections' | 'teachers' | 'students' | 'createdAt';
  const [sortKey, setSortKey] = useState<SpaceSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SpaceSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Modo de vista: 'list' | 'editor'
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDesc, setSpaceDesc] = useState('');
  const [initialSpaceName, setInitialSpaceName] = useState('');
  const [initialSpaceDesc, setInitialSpaceDesc] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSpaceDirty = spaceName.trim() !== initialSpaceName.trim() || spaceDesc.trim() !== initialSpaceDesc.trim();

  const handleBackToList = () => {
    setMode('list');
    setEditingSpaceId(null);
    setFormError(null);
    setSaveSuccessMsg(null);
  };

  useEffect(() => {
    const handleReset = () => {
      handleBackToList();
    };
    window.addEventListener('benigascode:reset-spaces', handleReset);
    return () => window.removeEventListener('benigascode:reset-spaces', handleReset);
  }, []);

  // Live Context Preview
  const [contextPreview, setContextPreview] = useState<ContextPreviewDTO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [availableTagsSearch, setAvailableTagsSearch] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [newTagColor, setNewTagColor] = useState<string | null>(null);
  const [inlineTagSubmitting, setInlineTagSubmitting] = useState(false);

  const usedTagColors = useMemo(() => {
    return allTags.map(t => t.color).filter(Boolean);
  }, [allTags]);

  const assignedTags = useMemo(() => {
    return allTags.filter(t => selectedTagIds.includes(t.id));
  }, [allTags, selectedTagIds]);

  const availableTags = useMemo(() => {
    return allTags.filter(t => !selectedTagIds.includes(t.id));
  }, [allTags, selectedTagIds]);

  const filteredAvailableTags = useMemo(() => {
    if (!availableTagsSearch.trim()) return availableTags;
    const q = availableTagsSearch.toLowerCase();
    return availableTags.filter(t =>
      t.value.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }, [availableTags, availableTagsSearch]);

  const existingCategories = useMemo(() => {
    return Array.from(new Set(allTags.map(t => t.category).filter(Boolean)));
  }, [allTags]);


  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [spacesData, tagsData, colsData] = await Promise.all([
        api.listSpaces(),
        api.listTags(),
        api.teacherGetCollections(),
      ]);
      setSpaces(spacesData);
      setAllTags(tagsData);
      setAllCollections(colsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los espacios docentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update live context preview when selected tags change
  useEffect(() => {
    if (mode !== 'editor') return;
    if (selectedTagIds.length === 0) {
      setContextPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const preview = await api.previewContext(selectedTagIds);
        setContextPreview(preview);
      } catch (e) {
        console.error('Error fetching context preview:', e);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedTagIds, mode]);


  const handleOpenCreate = () => {
    setEditingSpaceId(null);
    setSpaceName('');
    setSpaceDesc('');
    setInitialSpaceName('');
    setInitialSpaceDesc('');
    setSelectedTagIds([]);
    setSelectedCollectionIds([]);
    setContextPreview(null);
    setFormError(null);
    setSaveSuccessMsg(null);
    setAvailableTagsSearch('');
    setNewTagCategory('');
    setNewTagValue('');
    setNewTagDesc('');
    setNewTagColor(null);
    setMode('editor');
  };

  const handleOpenEdit = (space: TeachingSpace) => {
    setEditingSpaceId(space.id);
    setSpaceName(space.name);
    setSpaceDesc(space.description || '');
    setInitialSpaceName(space.name);
    setInitialSpaceDesc(space.description || '');
    const tags = space.contextTags || space.tags || [];
    const tagIds = tags.map(t => t.id);
    setSelectedTagIds(tagIds);
    setSelectedCollectionIds(space.collections ? space.collections.map(c => c.id) : []);
    setContextPreview(null);
    setFormError(null);
    setSaveSuccessMsg(null);
    setAvailableTagsSearch('');
    setNewTagCategory('');
    setNewTagValue('');
    setNewTagDesc('');
    setNewTagColor(null);
    setMode('editor');
  };

  const handleToggleTag = async (tagId: string) => {
    if (!editingSpaceId) return;
    const isAssigned = selectedTagIds.includes(tagId);
    const newTagIds = isAssigned
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];

    setSelectedTagIds(newTagIds);
    try {
      await api.updateSpace(editingSpaceId, {
        name: spaceName.trim(),
        description: spaceDesc.trim() || undefined,
        contextTagIds: newTagIds,
        requiredTagIds: newTagIds,
      });
      loadData();
    } catch (err: any) {
      setSelectedTagIds(selectedTagIds);
      alert(err.message || 'Error al actualizar las etiquetas del espacio');
    }
  };

  const handleToggleCollection = async (colId: string) => {
    if (!editingSpaceId) return;
    const isSelected = selectedCollectionIds.includes(colId);
    const newCollectionIds = isSelected
      ? selectedCollectionIds.filter(id => id !== colId)
      : [...selectedCollectionIds, colId];

    setSelectedCollectionIds(newCollectionIds);
    try {
      if (isSelected) {
        await api.removeSpaceCollection(editingSpaceId, colId);
      } else {
        await api.addSpaceCollection(editingSpaceId, colId);
      }
      loadData();
    } catch (err: any) {
      setSelectedCollectionIds(selectedCollectionIds);
      alert(err.message || 'Error al actualizar la colección del espacio');
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) {
      setFormError('El nombre del espacio es obligatorio');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createSpace({
        name: spaceName.trim(),
        description: spaceDesc.trim() || undefined,
        contextTagIds: [],
        requiredTagIds: [],
        collectionIds: [],
        teacherIds: [],
      });
      setEditingSpaceId(created.id);
      setSpaceName(created.name);
      setSpaceDesc(created.description || '');
      setInitialSpaceName(created.name);
      setInitialSpaceDesc(created.description || '');
      setSelectedTagIds(created.tags ? created.tags.map(t => t.id) : (created.contextConfig?.tagIds || []));
      const createdTags = created.contextTags || created.tags || [];
      setSelectedTagIds(createdTags.map(t => t.id));
      setSelectedCollectionIds(created.collections ? created.collections.map(c => c.id) : []);
      setSaveSuccessMsg('Espacio creado correctamente. Ahora puedes asociar colecciones y etiquetas.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear el espacio docente');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateSpaceParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpaceId) return;
    if (!spaceName.trim()) {
      setFormError('El nombre del espacio es obligatorio');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const updated = await api.updateSpace(editingSpaceId, {
        name: spaceName.trim(),
        description: spaceDesc.trim() || undefined,
        contextTagIds: selectedTagIds,
        requiredTagIds: selectedTagIds,
      });
      setInitialSpaceName(updated.name);
      setInitialSpaceDesc(updated.description || '');
      setSaveSuccessMsg('Parámetros actualizados correctamente');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar el espacio docente');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSpace = async (space: TeachingSpace) => {
    if (!window.confirm(`¿Estás seguro de eliminar el espacio "${space.name}"? Los datos de entregas permanecerán vinculados históricamente.`)) {
      return;
    }
    try {
      await api.deleteSpace(space.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el espacio');
    }
  };

  const handleCreateInlineTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagCategory.trim() || !newTagValue.trim()) return;
    setInlineTagSubmitting(true);
    try {
      const created = await api.createTag({
        category: newTagCategory.trim().toLowerCase(),
        value: newTagValue.trim(),
        description: newTagDesc.trim() || undefined,
        color: newTagColor,
      });
      setAllTags(prev => [...prev, created]);
      const nextTagIds = [...selectedTagIds, created.id];
      setSelectedTagIds(nextTagIds);
      setNewTagCategory('');
      setNewTagValue('');
      setNewTagDesc('');
      setNewTagColor(null);

      if (editingSpaceId) {
        await api.updateSpace(editingSpaceId, {
          name: spaceName.trim(),
          description: spaceDesc.trim() || undefined,
          requiredTagIds: nextTagIds,
        });
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error al crear la etiqueta');
    } finally {
      setInlineTagSubmitting(false);
    }
  };


  // Sorted list of spaces
  const sortedSpaces = useMemo(() => {
    return [...spaces].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'tags') {
        cmp = (a.tags?.length || 0) - (b.tags?.length || 0);
        cmp = ((a.contextTags || a.tags)?.length || 0) - ((b.contextTags || b.tags)?.length || 0);
      } else if (sortKey === 'collections') {
        cmp = (a.collections?.length || 0) - (b.collections?.length || 0);
      } else if (sortKey === 'teachers') {
        cmp = (a.teachers?.length || 0) - (b.teachers?.length || 0);
      } else if (sortKey === 'students') {
        cmp = (a.matchedStudentsCount || 0) - (b.matchedStudentsCount || 0);
        cmp = (a.studentCount ?? a.matchedStudentsCount ?? 0) - (b.studentCount ?? b.matchedStudentsCount ?? 0);
      } else if (sortKey === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [spaces, sortKey, sortDir]);

  if (mode === 'editor') {
    return (
      <div className="app-container">
        {formError && (
          <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {formError}
          </div>
        )}

        {saveSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', color: '#166534', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={16} /> {saveSuccessMsg}
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem' }}>
          {!editingSpaceId && (
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#2563eb" /> Nuevo Espacio
            </h2>
          )}
          <form onSubmit={editingSpaceId ? handleUpdateSpaceParams : handleCreateSpace}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Nombre del Espacio *
              </label>
              <input
                type="text"
                value={spaceName}
                onChange={e => setSpaceName(e.target.value)}
                placeholder="ej. Programación Java DAM 1 - Grupo A"
                className="input-field"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Descripción
              </label>
              <textarea
                value={spaceDesc}
                onChange={e => setSpaceDesc(e.target.value)}
                placeholder="Descripción o notas internas del espacio"
                className="input-field"
                style={{ width: '100%', minHeight: 60 }}
              />
            </div>

            {/* BOTONES DE PARÁMETROS */}
            {!editingSpaceId ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting || !spaceName.trim()}
                >
                  {formSubmitting ? 'Creando...' : 'Crear Espacio'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting || !isSpaceDirty || !spaceName.trim()}
                  style={{
                    opacity: (!isSpaceDirty || !spaceName.trim()) ? 0.5 : 1,
                    cursor: (!isSpaceDirty || !spaceName.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formSubmitting ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            )}
          </form>

          {/* SOLO SE MUESTRAN COLECCIONES Y ETIQUETAS SI EL ESPACIO YA ESTÁ CREADO */}
          {editingSpaceId && (
            <>
              {/* 2. COLECCIONES DISPONIBLES */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                Colecciones Disponibles en este Espacio
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem' }}>
                {allCollections.map(col => {
                  const isSelected = selectedCollectionIds.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.5rem',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        border: isSelected ? '1px solid #86efac' : '1px solid #f1f5f9',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCollection(col.id)}
                      />
                      <span style={{ fontWeight: isSelected ? 600 : 400 }}>{col.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. ETIQUETAS Y LISTA DE ALUMNOS */}
            <div style={{ marginBottom: '1.25rem' }}>
              {/* Panel de Etiquetas */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
                {/* Cabecera del Panel */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>Etiquetas</strong>
                </div>

                {/* Contenido: 2 Columnas */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.25rem',
                    padding: '1rem',
                  }}
                >
                  {/* LADO IZQUIERDO: Etiquetas asociadas al espacio */}
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
                        Etiquetas asociadas ({assignedTags.length})
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto' }}>
                      {assignedTags.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                          No hay etiquetas asociadas a este espacio.
                        </div>
                      ) : (
                        assignedTags.map(tag => (
                          <div
                            key={tag.id}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                              <TagBadge
                                category={tag.category}
                                value={tag.value}
                                color={tag.color}
                              />
                              {tag.description && (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                                  ({tag.description})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleTag(tag.id)}
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
                              title="Quitar etiqueta del espacio"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* LADO DERECHO: Etiquetas disponibles */}
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
                        Etiquetas disponibles ({availableTags.length})
                      </h3>
                    </div>

                    {availableTags.length > 4 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Buscar etiqueta disponible..."
                          value={availableTagsSearch}
                          onChange={e => setAvailableTagsSearch(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto' }}>
                      {filteredAvailableTags.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                          {availableTagsSearch ? 'No se encontraron etiquetas con ese término.' : 'No hay más etiquetas disponibles.'}
                        </div>
                      ) : (
                        filteredAvailableTags.map(tag => (
                          <div
                            key={tag.id}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                              <TagBadge
                                category={tag.category}
                                value={tag.value}
                                color={tag.color}
                              />
                              {tag.description && (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                                  ({tag.description})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleTag(tag.id)}
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
                              title="Asociar etiqueta al espacio"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* PARTE INFERIOR: Opción de crear una nueva etiqueta (como en el panel de alumnos) */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    padding: '0.875rem 1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                    Crear nueva etiqueta y asociarla al espacio
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 140, flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                        Categoría *
                      </label>
                      <input
                        type="text"
                        list="space-new-tag-categories"
                        placeholder="ej. group, año..."
                        value={newTagCategory}
                        onChange={e => setNewTagCategory(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                      />
                      <datalist id="space-new-tag-categories">
                        {existingCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>

                    <div style={{ minWidth: 160, flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                        Valor *
                      </label>
                      <input
                        type="text"
                        placeholder="ej. DAM2, 2026-2027..."
                        value={newTagValue}
                        onChange={e => setNewTagValue(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ minWidth: 160, flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                        Descripción (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Grupo de refuerzo"
                        value={newTagDesc}
                        onChange={e => setNewTagDesc(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                      />
                    </div>

                    <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <TagColorPicker
                        selectedColor={newTagColor}
                        onChange={setNewTagColor}
                        category={newTagCategory}
                        value={newTagValue}
                        usedColors={usedTagColors}
                      />

                      <button
                        type="button"
                        onClick={() => handleCreateInlineTag()}
                        disabled={inlineTagSubmitting || !newTagCategory.trim() || !newTagValue.trim()}
                        className="btn-primary"
                        style={{
                          padding: '0.45rem 0.875rem',
                          fontSize: '0.8125rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          whiteSpace: 'nowrap',
                          marginLeft: 'auto',
                        }}
                      >
                        <Plus size={14} />
                        {inlineTagSubmitting ? 'Creando...' : 'Crear y asociar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Alumnos que tienen las etiquetas seleccionadas */}
              {(() => {
                const matchedStudentsList = contextPreview?.matchingStudents ?? contextPreview?.matchedStudents ?? [];
                const matchedStudentsCount = contextPreview?.matchingStudentsCount ?? contextPreview?.matchedStudentsCount ?? matchedStudentsList.length;

                return (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} style={{ color: '#2563eb' }} />
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                          Alumnos con las etiquetas seleccionadas
                          {contextPreview !== null ? ` (${matchedStudentsCount})` : ''}
                        </strong>
                      </div>
                      {previewLoading && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Calculando...</span>
                      )}
                    </div>

                    {selectedTagIds.length === 0 ? (
                      <div style={{ padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.8125rem', textAlign: 'center' }}>
                        No hay etiquetas seleccionadas. Asocia etiquetas arriba para ver los alumnos que coinciden.
                      </div>
                    ) : previewLoading && !contextPreview ? (
                      <div style={{ padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.8125rem', textAlign: 'center' }}>
                        Cargando alumnos coincidentes...
                      </div>
                    ) : contextPreview && matchedStudentsList.length === 0 ? (
                      <div style={{ padding: '1.5rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', fontStyle: 'italic' }}>
                        Ningún alumno posee actualmente todas las etiquetas seleccionadas.
                      </div>
                    ) : (
                      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                          <thead>
                            <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Nombre</th>
                              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Usuario / Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchedStudentsList.map(student => (
                              <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>
                                  {student.fullName}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                                  {student.username}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="app-container">
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#b91c1c', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tabla de Espacios */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          <button onClick={handleOpenCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Plus size={16} /> Crear Espacio
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            Cargando espacios...
          </div>
        ) : spaces.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Layers size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No hay espacios creados</p>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              Crea tu primer espacio definiendo su contexto de etiquetas para asociar colecciones y alumnos.
            </p>
            <button onClick={handleOpenCreate} className="btn-primary">
              Crear Primer Espacio
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <SortableHeader<SpaceSortKey> label="Nombre del Espacio" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem' }}>Etiquetas</th>
                  <SortableHeader<SpaceSortKey> label="Colecciones" sortKey="collections" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<SpaceSortKey> label="Profesores" sortKey="teachers" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<SpaceSortKey> label="Alumnos" sortKey="students" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedSpaces.map(space => (
                  <tr key={space.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td
                      onClick={() => handleOpenEdit(space)}
                      style={{ padding: '1rem', cursor: 'pointer' }}
                      title="Editar espacio"
                    >
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}>{space.name}</div>
                      {space.description && (
                        <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{space.description}</div>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {(space.contextTags || space.tags) && (space.contextTags || space.tags)!.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {(space.contextTags || space.tags)!.map(t => (
                            <TagBadge
                              key={t.id}
                              category={t.category}
                              value={t.value}
                              color={t.color}
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                          Sin restricciones (público)
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <BookOpen size={16} style={{ color: '#059669' }} />
                        <span style={{ fontWeight: 600 }}>{space.collections?.length || 0}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {space.teachers && space.teachers.length > 0 ? (
                          space.teachers.map((t, idx) => (
                            <div key={t.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Shield size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />
                              <span>{t.fullName || t.username}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Shield size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />
                            <span>Tú</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Users size={16} style={{ color: '#2563eb' }} />
                        <span style={{ fontWeight: 600 }}>{space.studentCount ?? space.matchedStudentsCount ?? 0}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(space)}
                          className="btn-table-action"
                          title="Editar espacio"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSpace(space)}
                          className="btn-table-action-danger"
                          title="Eliminar espacio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
