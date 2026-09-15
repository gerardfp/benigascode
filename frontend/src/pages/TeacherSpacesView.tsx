import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { TeachingSpace, Tag, Collection, TeacherStudent, ContextPreviewDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Layers, Plus, Trash2, Edit3, Users, BookOpen, Shield, Info 
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

  // Modal Crear / Editar Espacio
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDesc, setSpaceDesc] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live Context Preview
  const [contextPreview, setContextPreview] = useState<ContextPreviewDTO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Inline Tag Creation within form
  const [showInlineTagForm, setShowInlineTagForm] = useState(false);
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [inlineTagSubmitting, setInlineTagSubmitting] = useState(false);

  // Modal Administrar Espacio
  const [activeSpace, setActiveSpace] = useState<TeachingSpace | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'collections' | 'teachers'>('students');
  const [spaceStudents, setSpaceStudents] = useState<TeacherStudent[]>([]);
  const [spaceStudentsLoading, setSpaceStudentsLoading] = useState(false);

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
    if (!showFormModal) return;
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
  }, [selectedTagIds, showFormModal]);

  // Agrupar etiquetas por categoría
  const tagsByCategory = useMemo(() => {
    const map: Record<string, Tag[]> = {};
    allTags.forEach(tag => {
      if (!map[tag.category]) map[tag.category] = [];
      map[tag.category].push(tag);
    });
    return map;
  }, [allTags]);

  const openCreateModal = () => {
    setEditingSpaceId(null);
    setSpaceName('');
    setSpaceDesc('');
    setSelectedTagIds([]);
    setSelectedCollectionIds([]);
    setSelectedTeacherIds([]);
    setContextPreview(null);
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditModal = (space: TeachingSpace) => {
    setEditingSpaceId(space.id);
    setSpaceName(space.name);
    setSpaceDesc(space.description || '');
    const tagIds = space.tags ? space.tags.map(t => t.id) : (space.contextConfig?.tagIds || []);
    setSelectedTagIds(tagIds);
    setSelectedCollectionIds(space.collections ? space.collections.map(c => c.id) : []);
    setSelectedTeacherIds(space.teachers ? space.teachers.map(t => t.id) : []);
    setContextPreview(null);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleToggleCollection = (colId: string) => {
    setSelectedCollectionIds(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) {
      setFormError('El nombre del espacio es obligatorio');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingSpaceId) {
        await api.updateSpace(editingSpaceId, {
          name: spaceName.trim(),
          description: spaceDesc.trim() || undefined,
          requiredTagIds: selectedTagIds,
          collectionIds: selectedCollectionIds,
          teacherIds: selectedTeacherIds,
        });
      } else {
        await api.createSpace({
          name: spaceName.trim(),
          description: spaceDesc.trim() || undefined,
          requiredTagIds: selectedTagIds,
          collectionIds: selectedCollectionIds,
          teacherIds: selectedTeacherIds,
        });
      }
      setShowFormModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el espacio docente');
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

  const handleCreateInlineTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagCategory.trim() || !newTagValue.trim()) return;
    setInlineTagSubmitting(true);
    try {
      const created = await api.createTag({
        category: newTagCategory.trim().toLowerCase(),
        value: newTagValue.trim(),
        description: newTagDesc.trim() || undefined,
      });
      setAllTags(prev => [...prev, created]);
      setSelectedTagIds(prev => [...prev, created.id]);
      setNewTagCategory('');
      setNewTagValue('');
      setNewTagDesc('');
      setShowInlineTagForm(false);
    } catch (err: any) {
      alert(err.message || 'Error al crear la etiqueta');
    } finally {
      setInlineTagSubmitting(false);
    }
  };

  // Open Administration modal for a space
  const openManageModal = async (space: TeachingSpace, initialTab: 'students' | 'collections' | 'teachers' = 'students') => {
    setActiveSpace(space);
    setActiveTab(initialTab);
    setSpaceStudentsLoading(true);
    try {
      const students = await api.getSpaceStudents(space.id);
      setSpaceStudents(students);
    } catch (err) {
      console.error('Error al cargar alumnos del espacio:', err);
    } finally {
      setSpaceStudentsLoading(false);
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
      } else if (sortKey === 'collections') {
        cmp = (a.collections?.length || 0) - (b.collections?.length || 0);
      } else if (sortKey === 'teachers') {
        cmp = (a.teachers?.length || 0) - (b.teachers?.length || 0);
      } else if (sortKey === 'students') {
        cmp = (a.matchedStudentsCount || 0) - (b.matchedStudentsCount || 0);
      } else if (sortKey === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [spaces, sortKey, sortDir]);

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Layers size={24} style={{ color: '#2563eb' }} />
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Espacios Docentes (Teaching Spaces)
            </h1>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9375rem' }}>
            Workspaces configurados por contexto (conjunción de etiquetas). Los alumnos se resuelven de forma dinámica en tiempo real sin listas estáticas.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Crear Espacio Docente
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#b91c1c', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tabla de Espacios */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            Cargando espacios docentes...
          </div>
        ) : spaces.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Layers size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No hay espacios docentes creados</p>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              Crea tu primer espacio docente definiendo su contexto de etiquetas para asociar colecciones y alumnos.
            </p>
            <button onClick={openCreateModal} className="btn-primary">
              Crear Primer Espacio
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <SortableHeader<SpaceSortKey> label="Nombre del Espacio" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem' }}>Contexto (Etiquetas AND)</th>
                  <SortableHeader<SpaceSortKey> label="Colecciones" sortKey="collections" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<SpaceSortKey> label="Profesores" sortKey="teachers" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<SpaceSortKey> label="Alumnos (Contexto)" sortKey="students" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedSpaces.map(space => (
                  <tr key={space.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{space.name}</div>
                      {space.description && (
                        <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{space.description}</div>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {space.tags && space.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {space.tags.map(t => (
                            <span
                              key={t.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '9999px',
                                padding: '0.125rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                              }}
                            >
                              <span style={{ opacity: 0.75, marginRight: '0.25rem' }}>{t.category}:</span>
                              <strong>{t.value}</strong>
                            </span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Shield size={16} style={{ color: '#4f46e5' }} />
                        <span>{space.teachers?.map(t => t.fullName).join(', ') || 'Tú'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => openManageModal(space, 'students')}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          padding: '0.25rem 0.625rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          color: '#334155',
                        }}
                      >
                        <Users size={14} style={{ color: '#2563eb' }} />
                        <strong>{space.matchedStudentsCount ?? 0}</strong> alumnos
                      </button>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openManageModal(space)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Administrar colecciones y alumnos"
                        >
                          Administrar
                        </button>
                        <button
                          onClick={() => openEditModal(space)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Editar espacio"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSpace(space)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #fecaca',
                            borderRadius: '0.375rem',
                            color: '#dc2626',
                            padding: '0.25rem 0.5rem',
                            cursor: 'pointer',
                          }}
                          title="Eliminar espacio"
                        >
                          <Trash2 size={14} />
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

      {/* MODAL CREAR / EDITAR ESPACIO DOCENTE */}
      {showFormModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {editingSpaceId ? 'Editar Espacio Docente' : 'Nuevo Espacio Docente'}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveSpace}>
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
                  placeholder="Descripción o notas internas del espacio docente"
                  className="input-field"
                  style={{ width: '100%', minHeight: 60 }}
                />
              </div>

              {/* CONTEXT BUILDER */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>Context Builder (Conjunción AND de Etiquetas)</strong>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                      Los alumnos que posean TODAS las etiquetas seleccionadas tendrán acceso automático.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineTagForm(!showInlineTagForm)}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    + Nueva Etiqueta
                  </button>
                </div>

                {/* Inline Tag Creator */}
                {showInlineTagForm && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>Crear Etiqueta Rápida</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Categoría (ej: academic_year, group, level)"
                        value={newTagCategory}
                        onChange={e => setNewTagCategory(e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.8125rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Valor (ej: 2026-2027, Grupo A, Primero)"
                        value={newTagValue}
                        onChange={e => setNewTagValue(e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowInlineTagForm(false)}
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateInlineTag}
                        disabled={inlineTagSubmitting || !newTagCategory.trim() || !newTagValue.trim()}
                        className="btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {inlineTagSubmitting ? 'Creando...' : 'Crear y Añadir'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Categorized Tag Selector */}
                {Object.keys(tagsByCategory).length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                    No hay etiquetas disponibles. Crea etiquetas como <code>academic_year</code>, <code>education</code> o <code>group</code> arriba.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(tagsByCategory).map(([category, tags]) => (
                      <div key={category}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          {category}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {tags.map(tag => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                              <button
                                type="button"
                                key={tag.id}
                                onClick={() => handleToggleTag(tag.id)}
                                style={{
                                  padding: '0.25rem 0.625rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.8125rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSelected ? '#2563eb' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#334155',
                                }}
                              >
                                {isSelected ? '✓ ' : ''}{tag.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Context Resolution Preview */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Users size={16} style={{ color: '#2563eb' }} />
                    <span>Resolución en vivo:</span>
                    {previewLoading ? (
                      <span style={{ color: '#64748b' }}>Calculando...</span>
                    ) : contextPreview ? (
                      <strong>
                        {contextPreview.matchedStudentsCount} alumno(s) coinciden actualmente
                      </strong>
                    ) : (
                      <span style={{ color: '#64748b' }}>Selecciona etiquetas para previsualizar</span>
                    )}
                  </div>
                  {contextPreview && contextPreview.matchedStudents.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                      Ej: {contextPreview.matchedStudents.slice(0, 3).map(s => s.fullName).join(', ')}
                      {contextPreview.matchedStudents.length > 3 ? ` y ${contextPreview.matchedStudents.length - 3} más` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* ASOCIAR COLECCIONES */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  Colecciones Disponibles en este Espacio
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem' }}>
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

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Guardando...' : editingSpaceId ? 'Actualizar Espacio' : 'Crear Espacio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / ADMINISTRAR ESPACIO */}
      {activeSpace && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  {activeSpace.name}
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Contexto: {activeSpace.tags?.map(t => `${t.category}:${t.value}`).join(' AND ') || 'Sin etiquetas (abierto)'}
                </div>
              </div>
              <button
                onClick={() => setActiveSpace(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Pestañas de Navegación */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <button
                onClick={() => setActiveTab('students')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderBottom: activeTab === 'students' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'students' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'students' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <Users size={16} /> Alumnos por Contexto ({spaceStudents.length})
              </button>

              <button
                onClick={() => setActiveTab('collections')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderBottom: activeTab === 'collections' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'collections' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'collections' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <BookOpen size={16} /> Colecciones ({activeSpace.collections?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderBottom: activeTab === 'teachers' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'teachers' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'teachers' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <Shield size={16} /> Profesores ({activeSpace.teachers?.length || 0})
              </button>
            </div>

            {/* Contenido Pestaña ALUMNOS */}
            {activeTab === 'students' && (
              <div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', padding: '0.75rem 1rem', color: '#1e40af', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} />
                  <span>
                    Estos alumnos pertenecen automáticamente a este espacio porque satisfacen la conjunción de etiquetas en tiempo real.
                  </span>
                </div>

                {spaceStudentsLoading ? (
                  <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando alumnos del espacio...</p>
                ) : spaceStudents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                    Ningún alumno tiene actualmente todas las etiquetas requeridas por este espacio.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Nombre</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Email / Usuario</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Etiquetas Activas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spaceStudents.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{student.fullName}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{student.username}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {student.activeTags?.map(st => (
                                <span key={st.id} style={{ background: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                  {st.category}:{st.value}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Contenido Pestaña COLECCIONES */}
            {activeTab === 'collections' && (
              <div>
                {activeSpace.collections && activeSpace.collections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeSpace.collections.map(col => (
                      <div key={col.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.9375rem' }}>{col.title}</strong>
                          <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{col.slug}</div>
                        </div>
                        <span className={`badge ${col.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`}>
                          {col.visibility}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                    No hay colecciones asociadas a este espacio docente.
                  </p>
                )}
              </div>
            )}

            {/* Contenido Pestaña PROFESORES */}
            {activeTab === 'teachers' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeSpace.teachers && activeSpace.teachers.length > 0 ? (
                    activeSpace.teachers.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.9375rem' }}>{t.fullName}</strong>
                          <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{t.username}</div>
                        </div>
                        <span className="badge badge-info">Profesor</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                      No hay otros profesores asignados a este espacio.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setActiveSpace(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
