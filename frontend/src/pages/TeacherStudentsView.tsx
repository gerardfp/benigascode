import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { TeacherStudent, TeachingSpace, Tag, StudentTag } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Users, Tag as TagIcon, Layers, Trash2, Search, Clock, Plus, X, Check
} from 'lucide-react';

export const TeacherStudentsView: React.FC = () => {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  type StudentSortKey = 'name' | 'spaces' | 'tags' | 'createdAt';
  const [sortKey, setSortKey] = useState<StudentSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: StudentSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filtros
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>('');
  const [selectedTagValue, setSelectedTagValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selección múltiple de alumnos
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Búsqueda en etiquetas disponibles no asignadas
  const [unassignedSearch, setUnassignedSearch] = useState('');

  // Formulario creación rápida de etiqueta en bloque
  const [bulkNewCategory, setBulkNewCategory] = useState('group');
  const [bulkNewValue, setBulkNewValue] = useState('');
  const [bulkNewDesc, setBulkNewDesc] = useState('');
  const [bulkValidUntil, setBulkValidUntil] = useState('');

  // Modal Gestión de Etiquetas para un Alumno individual
  const [managingStudent, setManagingStudent] = useState<TeacherStudent | null>(null);
  const [studentTagAssignments, setStudentTagAssignments] = useState<StudentTag[]>([]);
  const [studentTagsLoading, setStudentTagsLoading] = useState(false);
  
  // Asignar etiqueta existente (modal individual)
  const [selectedTagIdToAssign, setSelectedTagIdToAssign] = useState<string>('');
  const [validUntilInput, setValidUntilInput] = useState<string>('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Crear nueva etiqueta e inmediatamente asignarla (modal individual)
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagCategory, setNewTagCategory] = useState('group');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stdData, spacesData, tagsData] = await Promise.all([
        api.listTeacherStudents({
          spaceId: selectedSpaceId || undefined,
          category: selectedTagCategory || undefined,
          value: selectedTagValue || undefined,
          search: searchTerm || undefined,
        }),
        api.listSpaces(),
        api.listTags(),
      ]);
      setStudents(stdData);
      setSpaces(spacesData);
      setAvailableTags(tagsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el listado de alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSpaceId, selectedTagCategory, selectedTagValue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Manejo de Selección Múltiple
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (sortedStudents.length === 0) return;
    const allSelected = sortedStudents.every(s => selectedStudentIds.has(s.id));
    if (allSelected) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(sortedStudents.map(s => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Alumnos seleccionados
  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Etiquetas distintas que tienen los alumnos seleccionados
  interface SelectedTagInfo {
    tagId: string;
    category: string;
    value: string;
    studentIdsWithTag: string[];
  }

  const tagsInSelectedStudents = useMemo(() => {
    if (selectedStudents.length === 0) return [];
    const tagMap = new Map<string, SelectedTagInfo>();

    for (const student of selectedStudents) {
      if (!student.activeTags) continue;
      for (const st of student.activeTags) {
        const tagId = st.tagId || st.tag?.id;
        if (!tagId) continue;
        const cat = st.category || st.tag?.category || '';
        const val = st.value || st.tag?.value || '';

        if (!tagMap.has(tagId)) {
          tagMap.set(tagId, {
            tagId,
            category: cat,
            value: val,
            studentIdsWithTag: [student.id],
          });
        } else {
          const existing = tagMap.get(tagId)!;
          if (!existing.studentIdsWithTag.includes(student.id)) {
            existing.studentIdsWithTag.push(student.id);
          }
        }
      }
    }

    return Array.from(tagMap.values()).sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
      return a.value.localeCompare(b.value);
    });
  }, [selectedStudents]);

  // Etiquetas existentes que no tenga NINGUNO de los alumnos seleccionados
  const unassignedAvailableTags = useMemo(() => {
    if (selectedStudents.length === 0) return [];
    const assignedTagIds = new Set(tagsInSelectedStudents.map(t => t.tagId));
    let tags = availableTags.filter(t => !assignedTagIds.has(t.id));
    if (unassignedSearch.trim()) {
      const query = unassignedSearch.toLowerCase();
      tags = tags.filter(t => t.category.toLowerCase().includes(query) || t.value.toLowerCase().includes(query));
    }
    return tags.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
      return a.value.localeCompare(b.value);
    });
  }, [selectedStudents, tagsInSelectedStudents, availableTags, unassignedSearch]);

  // Acciones en Bloque: Asignar y Quitar
  const handleBatchAssignTag = async (tagId: string, targetStudentIds?: string[], validUntil?: string) => {
    const ids = targetStudentIds && targetStudentIds.length > 0
      ? targetStudentIds
      : Array.from(selectedStudentIds);
    if (ids.length === 0) return;

    setBatchSubmitting(true);
    try {
      await api.batchAssignTag(ids, tagId, validUntil);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al asignar la etiqueta en lote');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchRevokeTag = async (tagId: string, targetStudentIds?: string[]) => {
    const ids = targetStudentIds && targetStudentIds.length > 0
      ? targetStudentIds
      : Array.from(selectedStudentIds);
    if (ids.length === 0) return;

    setBatchSubmitting(true);
    try {
      await api.batchRevokeTag(ids, tagId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al revocar la etiqueta en lote');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBulkCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = bulkNewCategory.trim().toLowerCase();
    const val = bulkNewValue.trim();
    if (!cat || !val || selectedStudentIds.size === 0) return;

    setBatchSubmitting(true);
    try {
      let targetTag = availableTags.find(
        t => t.category.toLowerCase() === cat && t.value.toLowerCase() === val.toLowerCase()
      );
      if (!targetTag) {
        targetTag = await api.createTag({
          category: cat,
          value: val,
          description: bulkNewDesc.trim() || undefined,
        });
        setAvailableTags(prev => [...prev, targetTag!]);
      }

      await api.batchAssignTag(
        Array.from(selectedStudentIds),
        targetTag.id,
        bulkValidUntil ? new Date(bulkValidUntil).toISOString() : undefined
      );

      setBulkNewValue('');
      setBulkNewDesc('');
      setBulkValidUntil('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear y asignar la etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Abrir modal de gestión de etiquetas para un alumno individual
  const handleOpenTagManager = async (student: TeacherStudent) => {
    setManagingStudent(student);
    setSelectedTagIdToAssign('');
    setValidUntilInput('');
    setIsCreatingNewTag(false);
    setStudentTagsLoading(true);
    try {
      const tags = await api.getStudentTags(student.id, true);
      setStudentTagAssignments(tags);
    } catch (err: any) {
      alert(err.message || 'Error al cargar las etiquetas del alumno');
    } finally {
      setStudentTagsLoading(false);
    }
  };

  // Asignar etiqueta al alumno (modal individual)
  const handleAssignTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingStudent) return;

    let tagId = selectedTagIdToAssign;

    setAssignSubmitting(true);
    try {
      if (isCreatingNewTag) {
        if (!newTagCategory.trim() || !newTagValue.trim()) return;
        const newTag = await api.createTag({
          category: newTagCategory.trim().toLowerCase(),
          value: newTagValue.trim(),
          description: newTagDesc.trim() || undefined,
        });
        setAvailableTags(prev => [...prev, newTag]);
        tagId = newTag.id;
      }

      if (!tagId) return;

      const assigned = await api.assignStudentTag(
        managingStudent.id,
        tagId,
        validUntilInput ? new Date(validUntilInput).toISOString() : undefined
      );

      setStudentTagAssignments(prev => [...prev, assigned]);
      setSelectedTagIdToAssign('');
      setValidUntilInput('');
      setIsCreatingNewTag(false);
      setNewTagValue('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al asignar la etiqueta');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Revocar etiqueta del alumno (modal individual)
  const handleRevokeTag = async (assignmentId: string) => {
    if (!window.confirm('¿Seguro que deseas revocar esta etiqueta del alumno?')) return;
    try {
      await api.revokeStudentTag(assignmentId);
      setStudentTagAssignments(prev => prev.filter(a => a.id !== assignmentId));
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al revocar la etiqueta');
    }
  };

  // Categorías de etiquetas disponibles
  const categories = useMemo(() => {
    return Array.from(new Set(availableTags.map(t => t.category)));
  }, [availableTags]);

  // Lista ordenada de alumnos
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'spaces') {
        cmp = (a.spaces?.length || 0) - (b.spaces?.length || 0);
      } else if (sortKey === 'tags') {
        cmp = (a.activeTags?.length || 0) - (b.activeTags?.length || 0);
      } else if (sortKey === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, sortKey, sortDir]);

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={24} style={{ color: '#2563eb' }} />
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Gestión de Alumnos y Etiquetas
            </h1>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9375rem' }}>
            Organización por características independientes y asignación temporal de etiquetas. Los espacios docentes se resuelven automáticamente.
          </p>
        </div>

        <Link to="/teacher/spaces" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Layers size={16} /> Ver Espacios Docentes
        </Link>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#b91c1c', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtrar por Espacio */}
          <div style={{ minWidth: 200, flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
              Filtrar por Espacio Docente
            </label>
            <select
              value={selectedSpaceId}
              onChange={e => setSelectedSpaceId(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.875rem' }}
            >
              <option value="">Todos los espacios docentes</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por Categoría */}
          <div style={{ minWidth: 160, flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
              Categoría de Etiqueta
            </label>
            <select
              value={selectedTagCategory}
              onChange={e => {
                setSelectedTagCategory(e.target.value);
                setSelectedTagValue('');
              }}
              className="input-field"
              style={{ width: '100%', fontSize: '0.875rem' }}
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por Valor de Etiqueta */}
          {selectedTagCategory && (
            <div style={{ minWidth: 160, flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Valor de Etiqueta
              </label>
              <select
                value={selectedTagValue}
                onChange={e => setSelectedTagValue(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.875rem' }}
              >
                <option value="">Todos los valores de {selectedTagCategory}</option>
                {availableTags
                  .filter(t => t.category === selectedTagCategory)
                  .map(t => (
                    <option key={t.id} value={t.value}>{t.value}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Buscador de Alumno */}
          <div style={{ minWidth: 220, flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
              Buscar Alumno
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nombre, usuario o GitHub..."
                className="input-field"
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
                <Search size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MARCO DE ASIGNACIÓN DE ETIQUETAS (Visible al seleccionar 1 o más alumnos) */}
      {selectedStudentIds.size > 0 && (
        <div
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
                  <strong>{selectedStudentIds.size}</strong> {selectedStudentIds.size === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'} para edición masiva
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
            {/* LADO IZQUIERDO: Etiquetas en alumnos seleccionados */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Etiquetas en alumnos seleccionados ({tagsInSelectedStudents.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Conjunto distinct
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                Pulsa <strong>x</strong> para eliminar la etiqueta de los alumnos que la tienen, o <strong>+</strong> para asignarla a los restantes.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                {tagsInSelectedStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                    Ninguno de los alumnos seleccionados tiene etiquetas activas.
                  </div>
                ) : (
                  tagsInSelectedStudents.map(tagInfo => {
                    const count = tagInfo.studentIdsWithTag.length;
                    const total = selectedStudents.length;
                    const isAll = count === total;
                    const unassignedStudents = selectedStudents.filter(s => !tagInfo.studentIdsWithTag.includes(s.id)).map(s => s.id);

                    return (
                      <div
                        key={tagInfo.tagId}
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
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: '#1e293b',
                            }}
                          >
                            {tagInfo.category && (
                              <span style={{ color: '#2563eb', fontWeight: 600, marginRight: '0.25rem' }}>
                                {tagInfo.category}:
                              </span>
                            )}
                            <strong>{tagInfo.value}</strong>
                          </span>

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
                            title={isAll ? 'Todos los alumnos seleccionados tienen esta etiqueta' : `${count} de ${total} alumnos seleccionados tienen esta etiqueta`}
                          >
                            {count}/{total} {count === 1 ? 'alumno' : 'alumnos'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {/* Botón '+' para asignarla a todos aquellos alumnos seleccionados que no la tuvieran */}
                          <button
                            type="button"
                            disabled={batchSubmitting || isAll}
                            onClick={() => handleBatchAssignTag(tagInfo.tagId, unassignedStudents)}
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
                            title={isAll ? 'Ya asignada a todos los alumnos seleccionados' : `Asignar a los ${unassignedStudents.length} alumnos restantes`}
                          >
                            {isAll ? <Check size={14} /> : <Plus size={14} />}
                          </button>

                          {/* Botón 'x' para eliminarla de todos aquellos alumnos seleccionados que la tuvieran */}
                          <button
                            type="button"
                            disabled={batchSubmitting}
                            onClick={() => handleBatchRevokeTag(tagInfo.tagId, tagInfo.studentIdsWithTag)}
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
                            title={`Quitar de los ${count} alumnos que la tienen`}
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

            {/* LADO DERECHO: Todas las etiquetas existentes que no tenga ninguno de los alumnos seleccionados */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Etiquetas no asignadas ({unassignedAvailableTags.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Sin asignar en la selección
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                Etiquetas del sistema que no tiene ningún alumno seleccionado. Pulsa <strong>+</strong> para asignarla a todos.
              </p>

              {/* Buscador de etiquetas no asignadas */}
              {availableTags.length > 5 && (
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
                    {unassignedSearch ? 'No se encontraron etiquetas con ese término.' : 'No hay más etiquetas existentes libres.'}
                  </div>
                ) : (
                  unassignedAvailableTags.map(tag => (
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
                        <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>{tag.category}:</span>{' '}
                          <strong>{tag.value}</strong>
                          {tag.description && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                              ({tag.description})
                            </span>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={batchSubmitting}
                        onClick={() => handleBatchAssignTag(tag.id)}
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
                        title="Asignar a todos los alumnos seleccionados"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* PARTE INFERIOR: Espacio para crear etiqueta (categoria:valor) y asignarla a todos los seleccionados */}
          <div
            style={{
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              padding: '0.875rem 1.25rem',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Crear nueva etiqueta y asignarla a la vez a todos los alumnos seleccionados
            </div>
            <form
              onSubmit={handleBulkCreateAndAssign}
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
                  list="bulk-tag-categories"
                  placeholder="ej. group, año..."
                  value={bulkNewCategory}
                  onChange={e => setBulkNewCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                  required
                />
                <datalist id="bulk-tag-categories">
                  {categories.map(cat => (
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
                  value={bulkNewValue}
                  onChange={e => setBulkNewValue(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                  required
                />
              </div>

              <div style={{ minWidth: 160, flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Grupo de refuerzo"
                  value={bulkNewDesc}
                  onChange={e => setBulkNewDesc(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                />
              </div>

              <div style={{ minWidth: 140, flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                  Válida hasta (opcional)
                </label>
                <input
                  type="date"
                  value={bulkValidUntil}
                  onChange={e => setBulkValidUntil(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={batchSubmitting || !bulkNewCategory.trim() || !bulkNewValue.trim()}
                  style={{
                    padding: '0.45rem 0.875rem',
                    fontSize: '0.8125rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} />
                  {batchSubmitting ? 'Asignando...' : 'Crear y asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Alumnos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            Cargando alumnos...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No se encontraron alumnos</p>
            <p style={{ fontSize: '0.875rem' }}>Prueba a modificar los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem', width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.has(s.id))}
                      ref={input => {
                        if (input) {
                          const someSelected = sortedStudents.some(s => selectedStudentIds.has(s.id));
                          const allSelected = sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.has(s.id));
                          input.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onChange={handleSelectAllVisible}
                      title="Seleccionar todos los alumnos visibles"
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <SortableHeader<StudentSortKey> label="Alumno" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Etiquetas Activas" sortKey="tags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Espacios Resueltos" sortKey="spaces" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Fecha Registro" sortKey="createdAt" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : undefined,
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '1rem', width: 44, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(student.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#475569' }}>
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{student.fullName}</div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{student.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Etiquetas Activas */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
                          {student.activeTags && student.activeTags.length > 0 ? (
                            student.activeTags.map(st => {
                              const cat = st.category || st.tag?.category || '';
                              const val = st.value || st.tag?.value || '';
                              return (
                                <span
                                  key={st.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '9999px',
                                    padding: '0.125rem 0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                  }}
                                  title={st.validUntil ? `Válida hasta: ${new Date(st.validUntil).toLocaleDateString()}` : 'Vigencia activa indefinida'}
                                >
                                  {cat && <span style={{ opacity: 0.75, marginRight: '0.25rem' }}>{cat}:</span>}
                                  <strong>{val || 'Sin valor'}</strong>
                                  {st.validUntil && (
                                    <Clock size={10} style={{ marginLeft: '0.25rem', opacity: 0.7 }} />
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                              Sin etiquetas
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Espacios Resueltos */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {student.spaces && student.spaces.length > 0 ? (
                            student.spaces.map(s => (
                              <span
                                key={s.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '0.25rem',
                                  padding: '0.125rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                              >
                                <Layers size={12} /> {s.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                              Ningún espacio activo
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                        {new Date(student.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenTagManager(student)}
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          <TagIcon size={14} /> Gestionar Etiquetas
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL GESTIÓN DE ETIQUETAS DE UN ALUMNO INDIVIDUAL */}
      {managingStudent && (
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
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  Etiquetas de {managingStudent.fullName}
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {managingStudent.username}
                </div>
              </div>
              <button
                onClick={() => setManagingStudent(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Listado de Etiquetas Asignadas Actuales */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                Etiquetas Activas ({studentTagAssignments.length})
              </h3>

              {studentTagsLoading ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando asignaciones...</p>
              ) : studentTagAssignments.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', background: '#f8fafc', padding: '1rem', borderRadius: '0.375rem', textAlign: 'center' }}>
                  Este alumno no tiene ninguna etiqueta asignada.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {studentTagAssignments.map(assignment => {
                    const cat = assignment.category || assignment.tag?.category || '';
                    const val = assignment.value || assignment.tag?.value || '';
                    return (
                      <div
                        key={assignment.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.625rem 0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {cat && (
                              <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.875rem' }}>
                                {cat}:
                              </span>
                            )}
                            <strong style={{ fontSize: '0.9375rem' }}>{val || 'Sin valor'}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Válida desde: {new Date(assignment.validFrom).toLocaleDateString()}
                            {assignment.validUntil ? ` • Hasta: ${new Date(assignment.validUntil).toLocaleDateString()}` : ' • Indefinida'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeTag(assignment.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                          }}
                          title="Revocar etiqueta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Asignar Nueva Etiqueta */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  Asignar Nueva Etiqueta
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewTag(!isCreatingNewTag)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  {isCreatingNewTag ? '« Elegir de existentes' : '+ Crear nueva etiqueta'}
                </button>
              </div>

              <form onSubmit={handleAssignTag}>
                {!isCreatingNewTag ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Seleccionar Etiqueta
                    </label>
                    <select
                      value={selectedTagIdToAssign}
                      onChange={e => setSelectedTagIdToAssign(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.875rem' }}
                      required
                    >
                      <option value="">-- Selecciona una etiqueta --</option>
                      {availableTags.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.category}: {t.value} {t.description ? `(${t.description})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Categoría *
                        </label>
                        <input
                          type="text"
                          value={newTagCategory}
                          onChange={e => setNewTagCategory(e.target.value)}
                          placeholder="ej. academic_year, education, group"
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8125rem' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Valor *
                        </label>
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={e => setNewTagValue(e.target.value)}
                          placeholder="ej. 2026-2027, DAM, Grupo A"
                          className="input-field"
                          style={{ width: '100%', fontSize: '0.8125rem' }}
                          required
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Descripción (opcional)
                      </label>
                      <input
                        type="text"
                        value={newTagDesc}
                        onChange={e => setNewTagDesc(e.target.value)}
                        placeholder="ej. Grupo turno de mañana"
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Fecha de Expiración Opcional */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Válida hasta (opcional - dejar vacío para vigencia indefinida)
                  </label>
                  <input
                    type="date"
                    value={validUntilInput}
                    onChange={e => setValidUntilInput(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={assignSubmitting || (!isCreatingNewTag && !selectedTagIdToAssign) || (isCreatingNewTag && (!newTagCategory.trim() || !newTagValue.trim()))}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {assignSubmitting ? 'Asignando...' : 'Asignar Etiqueta'}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setManagingStudent(null)}
                className="btn-secondary"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
