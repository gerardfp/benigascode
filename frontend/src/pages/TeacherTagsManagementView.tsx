import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Tag, ExerciseTag } from '../types';
import { TagBadge } from '../components/TagBadge';
import { TagColorPicker } from '../components/TagColorPicker';
import { registerExerciseTagColors, setCustomExerciseTagColor, TAG_COLOR_PALETTE } from '../utils/tagColors';
import {
  Plus,
  Trash2,
  Edit2,
  GitMerge,
  Search,
  BookOpen,
  Users,
  Check,
  X,
  Palette
} from 'lucide-react';

export const TeacherTagsManagementView: React.FC = () => {
  const [subTab, setSubTab] = useState<'exercises' | 'students'>('exercises');

  // Exercise tags state
  const [exerciseTags, setExerciseTags] = useState<ExerciseTag[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseUsageFilter, setExerciseUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  // Student / space tags state
  const [studentTags, setStudentTags] = useState<Tag[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [studentUsageFilter, setStudentUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [createExerciseModalOpen, setCreateExerciseModalOpen] = useState(false);
  const [newExerciseTagName, setNewExerciseTagName] = useState('');
  const [newExerciseTagColor, setNewExerciseTagColor] = useState<string | null>(null);

  const [editExerciseTag, setEditExerciseTag] = useState<ExerciseTag | null>(null);
  const [editExerciseTagName, setEditExerciseTagName] = useState('');
  const [editExerciseTagColor, setEditExerciseTagColor] = useState<string | null>(null);

  const [mergeExerciseSource, setMergeExerciseSource] = useState<ExerciseTag | null>(null);
  const [mergeExerciseTarget, setMergeExerciseTarget] = useState<string>('');

  const [createStudentModalOpen, setCreateStudentModalOpen] = useState(false);
  const [newStudentCategory, setNewStudentCategory] = useState('');
  const [newStudentValue, setNewStudentValue] = useState('');
  const [newStudentDescription, setNewStudentDescription] = useState('');
  const [newStudentColor, setNewStudentColor] = useState<string | null>(null);

  const [editStudentTag, setEditStudentTag] = useState<Tag | null>(null);
  const [editStudentCategory, setEditStudentCategory] = useState('');
  const [editStudentValue, setEditStudentValue] = useState('');
  const [editStudentDescription, setEditStudentDescription] = useState('');
  const [editStudentColor, setEditStudentColor] = useState<string | null>(null);

  const [mergeStudentSource, setMergeStudentSource] = useState<Tag | null>(null);
  const [mergeStudentTarget, setMergeStudentTarget] = useState<string>('');

  // Quick color popover state
  const [quickColorTarget, setQuickColorTarget] = useState<{ type: 'exercise' | 'student'; idOrName: string; currentColor: string } | null>(null);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const loadExerciseTags = async () => {
    setLoadingExercises(true);
    try {
      const data = await api.listExerciseTags();
      setExerciseTags(data);
      registerExerciseTagColors(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar etiquetas de ejercicios');
    } finally {
      setLoadingExercises(false);
    }
  };

  const loadStudentTags = async () => {
    setLoadingStudents(true);
    try {
      const data = await api.listTags(undefined, true);
      setStudentTags(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar etiquetas de alumnos/espacios');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadExerciseTags();
    loadStudentTags();
  }, []);

  // Filtered exercise tags
  const filteredExerciseTags = useMemo(() => {
    return exerciseTags.filter(t => {
      const matchesSearch = !exerciseSearch.trim() || t.name.toLowerCase().includes(exerciseSearch.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (exerciseUsageFilter === 'used') return t.exerciseCount > 0;
      if (exerciseUsageFilter === 'unused') return t.exerciseCount === 0;
      return true;
    });
  }, [exerciseTags, exerciseSearch, exerciseUsageFilter]);

  const unusedExerciseCount = useMemo(() => {
    return exerciseTags.filter(t => t.exerciseCount === 0).length;
  }, [exerciseTags]);

  // Categories list for student tags
  const studentCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of studentTags) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [studentTags]);

  // Filtered student tags
  const filteredStudentTags = useMemo(() => {
    return studentTags.filter(t => {
      const matchesSearch = !studentSearch.trim() ||
        t.value.toLowerCase().includes(studentSearch.toLowerCase().trim()) ||
        t.category.toLowerCase().includes(studentSearch.toLowerCase().trim()) ||
        (t.description && t.description.toLowerCase().includes(studentSearch.toLowerCase().trim()));
      if (!matchesSearch) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      const inUse = (t.studentCount || 0) > 0 || (t.spaceCount || 0) > 0;
      if (studentUsageFilter === 'used') return inUse;
      if (studentUsageFilter === 'unused') return !inUse;
      return true;
    });
  }, [studentTags, studentSearch, selectedCategory, studentUsageFilter]);

  const unusedStudentCount = useMemo(() => {
    return studentTags.filter(t => ((t.studentCount || 0) === 0 && (t.spaceCount || 0) === 0)).length;
  }, [studentTags]);

  // ==================== HANDLERS: EJERCICIOS ====================

  const handleCreateExerciseTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseTagName.trim()) return;
    try {
      const created = await api.createExerciseTag({
        name: newExerciseTagName.trim(),
        color: newExerciseTagColor || undefined
      });
      setCreateExerciseModalOpen(false);
      setNewExerciseTagName('');
      setNewExerciseTagColor(null);
      flashSuccess(`Etiqueta "${created.name}" creada`);
      loadExerciseTags();
    } catch (err: any) {
      setError(err.message || 'Error al crear etiqueta');
    }
  };

  const handleSaveEditExerciseTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExerciseTag || !editExerciseTagName.trim()) return;
    try {
      const updated = await api.updateExerciseTag(editExerciseTag.name, {
        newName: editExerciseTagName.trim(),
        color: editExerciseTagColor || undefined
      });
      setEditExerciseTag(null);
      flashSuccess(`Etiqueta "${updated.name}" actualizada`);
      loadExerciseTags();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar etiqueta');
    }
  };

  const handleMergeExerciseTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeExerciseSource || !mergeExerciseTarget) return;
    if (mergeExerciseSource.name.toLowerCase() === mergeExerciseTarget.toLowerCase()) {
      setError('No se puede combinar una etiqueta consigo misma');
      return;
    }
    try {
      await api.mergeExerciseTags(mergeExerciseSource.name, mergeExerciseTarget);
      setMergeExerciseSource(null);
      setMergeExerciseTarget('');
      flashSuccess(`Etiquetas combinadas en "${mergeExerciseTarget}"`);
      loadExerciseTags();
    } catch (err: any) {
      setError(err.message || 'Error al combinar etiquetas');
    }
  };

  const handleDeleteExerciseTag = async (tag: ExerciseTag) => {
    if (tag.exerciseCount > 0) {
      if (!window.confirm(`La etiqueta "${tag.name}" está asignada a ${tag.exerciseCount} ejercicio(s). ¿Deseas eliminarla y desvincularla de todos los ejercicios?`)) {
        return;
      }
      try {
        await api.deleteExerciseTag(tag.name, true);
        flashSuccess(`Etiqueta "${tag.name}" eliminada de los ejercicios`);
        loadExerciseTags();
      } catch (err: any) {
        setError(err.message || 'Error al eliminar etiqueta');
      }
    } else {
      if (!window.confirm(`¿Eliminar la etiqueta "${tag.name}"?`)) return;
      try {
        await api.deleteExerciseTag(tag.name, false);
        flashSuccess(`Etiqueta "${tag.name}" eliminada`);
        loadExerciseTags();
      } catch (err: any) {
        setError(err.message || 'Error al eliminar etiqueta');
      }
    }
  };

  const handleCleanUnusedExerciseTags = async () => {
    if (!window.confirm(`¿Eliminar todas las ${unusedExerciseCount} etiquetas de ejercicios sin uso?`)) return;
    try {
      const res = await api.cleanUnusedExerciseTags();
      flashSuccess(`Se eliminaron ${res.deletedCount} etiquetas sin uso`);
      loadExerciseTags();
    } catch (err: any) {
      setError(err.message || 'Error al limpiar etiquetas sin uso');
    }
  };

  // ==================== HANDLERS: ALUMNOS / ESPACIOS ====================

  const handleCreateStudentTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentCategory.trim() || !newStudentValue.trim()) return;
    try {
      const created = await api.createTag({
        category: newStudentCategory.trim(),
        value: newStudentValue.trim(),
        description: newStudentDescription.trim() || undefined,
        color: newStudentColor || undefined
      });
      setCreateStudentModalOpen(false);
      setNewStudentCategory('');
      setNewStudentValue('');
      setNewStudentDescription('');
      setNewStudentColor(null);
      flashSuccess(`Etiqueta "${created.category}:${created.value}" creada`);
      loadStudentTags();
    } catch (err: any) {
      setError(err.message || 'Error al crear etiqueta');
    }
  };

  const handleSaveEditStudentTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentTag || !editStudentCategory.trim() || !editStudentValue.trim()) return;
    try {
      const updated = await api.updateTag(editStudentTag.id, {
        category: editStudentCategory.trim(),
        value: editStudentValue.trim(),
        description: editStudentDescription.trim() || undefined,
        color: editStudentColor || undefined
      });
      setEditStudentTag(null);
      flashSuccess(`Etiqueta "${updated.category}:${updated.value}" actualizada`);
      loadStudentTags();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar etiqueta');
    }
  };

  const handleMergeStudentTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeStudentSource || !mergeStudentTarget) return;
    if (mergeStudentSource.id === mergeStudentTarget) {
      setError('No se puede combinar una etiqueta consigo misma');
      return;
    }
    try {
      await api.mergeTags(mergeStudentSource.id, mergeStudentTarget);
      setMergeStudentSource(null);
      setMergeStudentTarget('');
      flashSuccess('Etiquetas combinadas correctamente');
      loadStudentTags();
    } catch (err: any) {
      setError(err.message || 'Error al combinar etiquetas');
    }
  };

  const handleDeleteStudentTag = async (tag: Tag) => {
    const inUse = (tag.studentCount || 0) > 0 || (tag.spaceCount || 0) > 0;
    if (inUse) {
      if (!window.confirm(`La etiqueta "${tag.category}:${tag.value}" está en uso (${tag.studentCount || 0} alumnos, ${tag.spaceCount || 0} espacios). ¿Deseas forzar su eliminación y desvincularla?`)) {
        return;
      }
      try {
        await api.deleteTag(tag.id, true);
        flashSuccess(`Etiqueta "${tag.value}" eliminada`);
        loadStudentTags();
      } catch (err: any) {
        setError(err.message || 'Error al eliminar etiqueta');
      }
    } else {
      if (!window.confirm(`¿Eliminar la etiqueta "${tag.category}:${tag.value}"?`)) return;
      try {
        await api.deleteTag(tag.id, false);
        flashSuccess(`Etiqueta "${tag.value}" eliminada`);
        loadStudentTags();
      } catch (err: any) {
        setError(err.message || 'Error al eliminar etiqueta');
      }
    }
  };

  const handleCleanUnusedStudentTags = async () => {
    if (!window.confirm(`¿Eliminar todas las ${unusedStudentCount} etiquetas de alumnos/espacios sin uso?`)) return;
    try {
      const res = await api.cleanUnusedTags();
      flashSuccess(`Se eliminaron ${res.deletedCount} etiquetas sin uso`);
      loadStudentTags();
    } catch (err: any) {
      setError(err.message || 'Error al limpiar etiquetas sin uso');
    }
  };

  // Quick color update
  const handleQuickColorSelect = async (hex: string) => {
    if (!quickColorTarget) return;
    try {
      if (quickColorTarget.type === 'exercise') {
        await api.updateExerciseTag(quickColorTarget.idOrName, { color: hex });
        setCustomExerciseTagColor(quickColorTarget.idOrName, hex);
        setExerciseTags(prev => prev.map(t => t.name === quickColorTarget.idOrName ? { ...t, color: hex } : t));
      } else {
        await api.updateTag(quickColorTarget.idOrName, { color: hex });
        setStudentTags(prev => prev.map(t => t.id === quickColorTarget.idOrName ? { ...t, color: hex } : t));
      }
      setQuickColorTarget(null);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar color');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Notificaciones */}
      {error && (
        <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><X size={16} /></button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', color: '#166534', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}><X size={16} /></button>
        </div>
      )}

      {/* Sub-pestañas: Ejercicios | Alumnos / Espacios */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => { setSubTab('exercises'); setError(null); }}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: subTab === 'exercises' ? '#eff6ff' : 'transparent',
            color: subTab === 'exercises' ? '#1d4ed8' : '#64748b',
            fontWeight: subTab === 'exercises' ? 700 : 500,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={16} />
          Ejercicios ({exerciseTags.length})
        </button>

        <button
          type="button"
          onClick={() => { setSubTab('students'); setError(null); }}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: subTab === 'students' ? '#eff6ff' : 'transparent',
            color: subTab === 'students' ? '#1d4ed8' : '#64748b',
            fontWeight: subTab === 'students' ? 700 : 500,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          Alumnos / Espacios ({studentTags.length})
        </button>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: ETIQUETAS DE EJERCICIOS                              */}
      {/* ============================================================== */}
      {subTab === 'exercises' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Barra de Filtros y Acciones */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 320px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar etiqueta..."
                  value={exerciseSearch}
                  onChange={e => setExerciseSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.1rem', fontSize: '0.875rem', width: '100%' }}
                />
              </div>

              {/* Filtro uso */}
              <select
                value={exerciseUsageFilter}
                onChange={e => setExerciseUsageFilter(e.target.value as any)}
                className="input-field"
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.65rem', minWidth: 120 }}
              >
                <option value="all">Todas</option>
                <option value="used">En uso</option>
                <option value="unused">Sin uso ({unusedExerciseCount})</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unusedExerciseCount > 0 && (
                <button
                  type="button"
                  onClick={handleCleanUnusedExerciseTags}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.45rem 0.85rem',
                    color: '#dc2626',
                    borderColor: '#fca5a5',
                    backgroundColor: '#fff5f5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Eliminar todas las etiquetas que no tienen ningún ejercicio"
                >
                  <Trash2 size={15} />
                  Limpiar sin uso ({unusedExerciseCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setNewExerciseTagName('');
                  setNewExerciseTagColor(null);
                  setCreateExerciseModalOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={15} />
                Nueva etiqueta
              </button>
            </div>
          </div>

          {/* Tabla de Etiquetas de Ejercicios */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Etiqueta</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Uso</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600, width: 90 }}>Color</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600, textAlign: 'right', width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingExercises ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Cargando etiquetas...
                    </td>
                  </tr>
                ) : filteredExerciseTags.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron etiquetas de ejercicios.
                    </td>
                  </tr>
                ) : (
                  filteredExerciseTags.map(tag => {
                    const isUnused = tag.exerciseCount === 0;
                    return (
                      <tr key={tag.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <TagBadge value={tag.name} color={tag.color} />
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          {isUnused ? (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>
                              Sin uso
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                              {tag.exerciseCount} {tag.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <button
                            type="button"
                            onClick={() => setQuickColorTarget({ type: 'exercise', idOrName: tag.name, currentColor: tag.color })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                            title="Cambiar color"
                          >
                            <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: tag.color, display: 'inline-block' }} />
                            <Palette size={13} style={{ color: '#64748b' }} />
                          </button>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditExerciseTag(tag);
                                setEditExerciseTagName(tag.name);
                                setEditExerciseTagColor(tag.color);
                              }}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Renombrar / Editar"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMergeExerciseSource(tag);
                                const firstOther = exerciseTags.find(t => t.name.toLowerCase() !== tag.name.toLowerCase());
                                setMergeExerciseTarget(firstOther ? firstOther.name : '');
                              }}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Combinar con otra etiqueta"
                            >
                              <GitMerge size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteExerciseTag(tag)}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: ETIQUETAS DE ALUMNOS / ESPACIOS                       */}
      {/* ============================================================== */}
      {subTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Barra de Filtros y Acciones */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 420px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por valor, categoría o descripción..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.1rem', fontSize: '0.875rem', width: '100%' }}
                />
              </div>

              {/* Filtro categoría */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.65rem', minWidth: 130 }}
              >
                <option value="all">Todas las categorías</option>
                {studentCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Filtro uso */}
              <select
                value={studentUsageFilter}
                onChange={e => setStudentUsageFilter(e.target.value as any)}
                className="input-field"
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.65rem', minWidth: 120 }}
              >
                <option value="all">Todos</option>
                <option value="used">En uso</option>
                <option value="unused">Sin uso ({unusedStudentCount})</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unusedStudentCount > 0 && (
                <button
                  type="button"
                  onClick={handleCleanUnusedStudentTags}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.45rem 0.85rem',
                    color: '#dc2626',
                    borderColor: '#fca5a5',
                    backgroundColor: '#fff5f5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Eliminar todas las etiquetas sin alumnos ni espacios asociados"
                >
                  <Trash2 size={15} />
                  Limpiar sin uso ({unusedStudentCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setNewStudentCategory('');
                  setNewStudentValue('');
                  setNewStudentDescription('');
                  setNewStudentColor(null);
                  setCreateStudentModalOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={15} />
                Nueva etiqueta
              </button>
            </div>
          </div>

          {/* Tabla de Etiquetas de Alumnos / Espacios */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Etiqueta</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Categoría</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Descripción</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Uso</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600, width: 90 }}>Color</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 600, textAlign: 'right', width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Cargando etiquetas...
                    </td>
                  </tr>
                ) : filteredStudentTags.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron etiquetas de alumnos/espacios.
                    </td>
                  </tr>
                ) : (
                  filteredStudentTags.map(tag => {
                    const studentCount = tag.studentCount || 0;
                    const spaceCount = tag.spaceCount || 0;
                    const isUnused = studentCount === 0 && spaceCount === 0;

                    return (
                      <tr key={tag.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <TagBadge category={tag.category} value={tag.value} color={tag.color} />
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>
                          <code>{tag.category}</code>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#64748b', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tag.description || '-'}
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          {isUnused ? (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>
                              Sin uso
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {studentCount > 0 && (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                                  {studentCount} {studentCount === 1 ? 'alumno' : 'alumnos'}
                                </span>
                              )}
                              {spaceCount > 0 && (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                  {spaceCount} {spaceCount === 1 ? 'espacio' : 'espacios'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <button
                            type="button"
                            onClick={() => setQuickColorTarget({ type: 'student', idOrName: tag.id, currentColor: tag.color || '#3b82f6' })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                            title="Cambiar color"
                          >
                            <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: tag.color || '#3b82f6', display: 'inline-block' }} />
                            <Palette size={13} style={{ color: '#64748b' }} />
                          </button>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditStudentTag(tag);
                                setEditStudentCategory(tag.category);
                                setEditStudentValue(tag.value);
                                setEditStudentDescription(tag.description || '');
                                setEditStudentColor(tag.color || null);
                              }}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Renombrar / Editar"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMergeStudentSource(tag);
                                const firstOther = studentTags.find(t => t.id !== tag.id);
                                setMergeStudentTarget(firstOther ? firstOther.id : '');
                              }}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Combinar con otra etiqueta"
                            >
                              <GitMerge size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudentTag(tag)}
                              style={{ padding: '0.35rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', borderRadius: '0.25rem' }}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREAR ETIQUETA DE EJERCICIO                            */}
      {/* ============================================================== */}
      {createExerciseModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nueva etiqueta de ejercicio</h3>
              <button type="button" onClick={() => setCreateExerciseModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateExerciseTag}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej. arrays, bucles, recursion"
                  value={newExerciseTagName}
                  onChange={e => setNewExerciseTagName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Color</label>
                <TagColorPicker
                  selectedColor={newExerciseTagColor}
                  onChange={setNewExerciseTagColor}
                  value={newExerciseTagName}
                  category="exercise"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setCreateExerciseModalOpen(false)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Crear etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR / RENOMBRAR ETIQUETA DE EJERCICIO              */}
      {/* ============================================================== */}
      {editExerciseTag && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Editar etiqueta de ejercicio</h3>
              <button type="button" onClick={() => setEditExerciseTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEditExerciseTag}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Nombre</label>
                <input
                  type="text"
                  required
                  value={editExerciseTagName}
                  onChange={e => setEditExerciseTagName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Color</label>
                <TagColorPicker
                  selectedColor={editExerciseTagColor}
                  onChange={setEditExerciseTagColor}
                  value={editExerciseTagName}
                  category="exercise"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setEditExerciseTag(null)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: COMBINAR ETIQUETAS DE EJERCICIOS                       */}
      {/* ============================================================== */}
      {mergeExerciseSource && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Combinar etiqueta de ejercicio</h3>
              <button type="button" onClick={() => setMergeExerciseSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleMergeExerciseTags}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Etiqueta origen</label>
                <div>
                  <TagBadge value={mergeExerciseSource.name} color={mergeExerciseSource.color} />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Etiqueta destino</label>
                <select
                  required
                  value={mergeExerciseTarget}
                  onChange={e => setMergeExerciseTarget(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                >
                  <option value="">Selecciona etiqueta destino...</option>
                  {exerciseTags
                    .filter(t => t.name.toLowerCase() !== mergeExerciseSource.name.toLowerCase())
                    .map(t => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.exerciseCount} ejercicios)
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setMergeExerciseSource(null)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={!mergeExerciseTarget} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Combinar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREAR ETIQUETA DE ALUMNO / ESPACIO                    */}
      {/* ============================================================== */}
      {createStudentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nueva etiqueta de alumno/espacio</h3>
              <button type="button" onClick={() => setCreateStudentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStudentTag}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="ej. academic_year, education, level, group, support"
                  list="student-categories-list"
                  value={newStudentCategory}
                  onChange={e => setNewStudentCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
                <datalist id="student-categories-list">
                  {studentCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Valor</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 2026-2027, DAM, Primer curso, Grupo A"
                  value={newStudentValue}
                  onChange={e => setNewStudentValue(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Descripción (opcional)</label>
                <input
                  type="text"
                  value={newStudentDescription}
                  onChange={e => setNewStudentDescription(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Color</label>
                <TagColorPicker
                  selectedColor={newStudentColor}
                  onChange={setNewStudentColor}
                  category={newStudentCategory}
                  value={newStudentValue}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setCreateStudentModalOpen(false)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Crear etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR / RENOMBRAR ETIQUETA DE ALUMNO / ESPACIO       */}
      {/* ============================================================== */}
      {editStudentTag && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Editar etiqueta</h3>
              <button type="button" onClick={() => setEditStudentTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEditStudentTag}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Categoría</label>
                <input
                  type="text"
                  required
                  list="student-categories-list-edit"
                  value={editStudentCategory}
                  onChange={e => setEditStudentCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
                <datalist id="student-categories-list-edit">
                  {studentCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Valor</label>
                <input
                  type="text"
                  required
                  value={editStudentValue}
                  onChange={e => setEditStudentValue(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Descripción</label>
                <input
                  type="text"
                  value={editStudentDescription}
                  onChange={e => setEditStudentDescription(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Color</label>
                <TagColorPicker
                  selectedColor={editStudentColor}
                  onChange={setEditStudentColor}
                  category={editStudentCategory}
                  value={editStudentValue}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setEditStudentTag(null)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: COMBINAR ETIQUETAS DE ALUMNO / ESPACIO                 */}
      {/* ============================================================== */}
      {mergeStudentSource && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 440, padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Combinar etiqueta</h3>
              <button type="button" onClick={() => setMergeStudentSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleMergeStudentTags}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Etiqueta origen</label>
                <div>
                  <TagBadge category={mergeStudentSource.category} value={mergeStudentSource.value} color={mergeStudentSource.color} />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Etiqueta destino</label>
                <select
                  required
                  value={mergeStudentTarget}
                  onChange={e => setMergeStudentTarget(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                >
                  <option value="">Selecciona etiqueta destino...</option>
                  {studentTags
                    .filter(t => t.id !== mergeStudentSource.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.category}:{t.value} ({t.studentCount || 0} alumnos, {t.spaceCount || 0} espacios)
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setMergeStudentSource(null)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={!mergeStudentTarget} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  Combinar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUICK COLOR SELECTOR MODAL                                   */}
      {/* ============================================================== */}
      {quickColorTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', width: '100%', maxWidth: 360, padding: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cambiar color</span>
              <button type="button" onClick={() => setQuickColorTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.35rem', marginBottom: '1rem' }}>
              {TAG_COLOR_PALETTE.slice(0, 32).map(hex => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleQuickColorSelect(hex)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: hex,
                    border: quickColorTarget.currentColor.toLowerCase() === hex.toLowerCase() ? '2.5px solid #0f172a' : '1px solid rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {quickColorTarget.currentColor.toLowerCase() === hex.toLowerCase() && (
                    <Check size={14} color="#ffffff" />
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setQuickColorTarget(null)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
