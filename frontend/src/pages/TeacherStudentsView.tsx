import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { TeacherStudent, TeachingSpace, Tag, StudentTag } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Users, Tag as TagIcon, Layers, Trash2, Search, Clock 
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

  // Modal Gestión de Etiquetas para un Alumno
  const [managingStudent, setManagingStudent] = useState<TeacherStudent | null>(null);
  const [studentTagAssignments, setStudentTagAssignments] = useState<StudentTag[]>([]);
  const [studentTagsLoading, setStudentTagsLoading] = useState(false);
  
  // Asignar etiqueta existente
  const [selectedTagIdToAssign, setSelectedTagIdToAssign] = useState<string>('');
  const [validUntilInput, setValidUntilInput] = useState<string>('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Crear nueva etiqueta e inmediatamente asignarla
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

  // Abrir modal de gestión de etiquetas para un alumno
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

  // Asignar etiqueta al alumno
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

  // Revocar etiqueta del alumno
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
                  <SortableHeader<StudentSortKey> label="Alumno" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Etiquetas Activas" sortKey="tags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Espacios Resueltos" sortKey="spaces" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <SortableHeader<StudentSortKey> label="Fecha Registro" sortKey="createdAt" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL GESTIÓN DE ETIQUETAS DE UN ALUMNO */}
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
