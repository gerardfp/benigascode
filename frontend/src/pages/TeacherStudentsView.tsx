import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { TeacherStudent, Course, Group } from '../types';

export const TeacherStudentsView: React.FC = () => {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Estado para modal/diálogo de asignar curso
  const [assigningStudent, setAssigningStudent] = useState<TeacherStudent | null>(null);
  const [assignCourseId, setAssignCourseId] = useState<string>('');
  const [assignGroups, setAssignGroups] = useState<Group[]>([]);
  const [assignGroupId, setAssignGroupId] = useState<string>('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Estado para añadir etiqueta rápida
  const [taggingStudentId, setTaggingStudentId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');

  const loadData = async () => {
    try {
      const [stdData, crsData, tagsData] = await Promise.all([
        api.listTeacherStudents(selectedCourseId || undefined, selectedTag || undefined, search || undefined),
        api.listCourses(),
        api.listAllStudentTags(),
      ]);
      setStudents(stdData);
      setCourses(crsData);
      setAllTags(tagsData);
    } catch (err: any) {
      console.error('Error al cargar datos de alumnos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourseId, selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Cargar grupos cuando se selecciona un curso en el modal de asignación
  const handleCourseChange = async (cid: string) => {
    setAssignCourseId(cid);
    setAssignGroupId('');
    if (!cid) {
      setAssignGroups([]);
      return;
    }
    try {
      const groups = await api.listGroups(cid);
      setAssignGroups(groups);
    } catch {
      setAssignGroups([]);
    }
  };

  const handleOpenAssignModal = (student: TeacherStudent) => {
    setAssigningStudent(student);
    setAssignCourseId('');
    setAssignGroupId('');
    setAssignGroups([]);
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStudent || !assignCourseId) return;

    setAssignSubmitting(true);
    try {
      await api.assignStudentCourse(assigningStudent.id, assignCourseId, assignGroupId || undefined);
      setAssigningStudent(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al asignar alumno al curso');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleUnassignCourse = async (studentId: string, courseId: string, courseName: string) => {
    if (!window.confirm(`¿Seguro que deseas desmatricular al alumno del curso "${courseName}"?`)) {
      return;
    }
    try {
      await api.unassignStudentCourse(studentId, courseId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al desmatricular alumno');
    }
  };

  const handleAddTag = async (studentId: string) => {
    const cleanTag = newTagInput.trim();
    if (!cleanTag) {
      setTaggingStudentId(null);
      return;
    }
    try {
      await api.addStudentTag(studentId, cleanTag);
      setTaggingStudentId(null);
      setNewTagInput('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al añadir etiqueta');
    }
  };

  const handleRemoveTag = async (studentId: string, tag: string) => {
    try {
      await api.removeStudentTag(studentId, tag);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al quitar etiqueta');
    }
  };

  const enrolledCount = students.filter((s) => s.courses.length > 0).length;
  const unenrolledCount = students.length - enrolledCount;

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Panel Docente
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
            Gestión de Alumnos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Supervisa a todos los alumnos registrados, asígnalos a los cursos que impartes y añade etiquetas privadas de seguimiento.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/teacher/invitations" className="btn-secondary" style={{ textDecoration: 'none' }}>
            🔑 Gestionar Claves de Invitación
          </Link>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>👥</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{students.length}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total Alumnos Registrados</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>📚</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{enrolledCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Matriculados en Cursos</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: unenrolledCount > 0 ? '#d97706' : '#64748b' }}>
              {unenrolledCount}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pendientes de Asignar Curso</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Buscador de texto */}
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              BUSCAR ALUMNO
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nombre, usuario o GitHub..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
                Buscar
              </button>
            </div>
          </div>

          {/* Filtro por Curso */}
          <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              FILTRAR POR CURSO
            </label>
            <select
              className="input-field"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Etiqueta Docente */}
          <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              FILTRAR POR ETIQUETA
            </label>
            <select
              className="input-field"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  🏷️ {t}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedCourseId || selectedTag) && (
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCourseId('');
                  setSelectedTag('');
                }}
                className="btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Modal de Asignación de Curso */}
      {assigningStudent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 460, width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Asignar a Curso
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem' }}>
              Matricular a <strong>{assigningStudent.fullName}</strong> (@{assigningStudent.username}) en un curso.
            </p>

            <form onSubmit={handleConfirmAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Seleccionar Curso *
                </label>
                <select
                  required
                  className="input-field"
                  value={assignCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  <option value="">Elige un curso...</option>
                  {courses.map((c) => {
                    const alreadyEnrolled = assigningStudent.courses.some((sc) => sc.courseId === c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={alreadyEnrolled}>
                        {c.code} — {c.name} {alreadyEnrolled ? '(Ya matriculado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {assignGroups.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Grupo (Opcional)
                  </label>
                  <select
                    className="input-field"
                    value={assignGroupId}
                    onChange={(e) => setAssignGroupId(e.target.value)}
                  >
                    <option value="">Sin grupo específico</option>
                    {assignGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAssigningStudent(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting || !assignCourseId}
                  className="btn-primary"
                >
                  {assignSubmitting ? 'Asignando...' : 'Asignar al Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Alumnos */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>Cargando alumnos...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No se han encontrado alumnos con los filtros seleccionados.</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Comparte una clave de invitación con tus estudiantes para que se registren en la plataforma.
          </p>
          <Link to="/teacher/invitations" className="btn-primary" style={{ display: 'inline-block', marginTop: '0.5rem', textDecoration: 'none' }}>
            Ir a Claves de Invitación
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.875rem 1rem' }}>Alumno</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Cursos Asignados</th>
                  <th style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Etiquetas Privadas</span>
                      <span title="Solo visibles por los profesores" style={{ cursor: 'help', fontSize: '0.85rem' }}>🔒</span>
                    </div>
                  </th>
                  <th style={{ padding: '0.875rem 1rem' }}>Fecha Alta</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Alumno Info */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.fullName}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}>
                            {student.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{student.username}</span>
                            {student.githubUsername && (
                              <span style={{ color: '#2563eb' }}>• 🐙 {student.githubUsername}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cursos Asignados */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {student.courses.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Sin cursos asignados
                          </span>
                        ) : (
                          student.courses.map((c) => (
                            <span
                              key={c.courseId}
                              className="badge"
                              style={{
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              <strong>{c.courseCode}</strong>
                              {c.groupName && <span style={{ color: '#15803d' }}>({c.groupName})</span>}
                              <button
                                type="button"
                                onClick={() => handleUnassignCourse(student.id, c.courseId, c.courseName)}
                                title="Desmatricular de este curso"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0 0.1rem',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  fontSize: '0.8125rem'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Etiquetas Privadas */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {student.tags.map((tag) => (
                          <span
                            key={tag}
                            className="badge"
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            🏷️ {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(student.id, tag)}
                              title="Quitar etiqueta"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0 0.1rem',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '0.8125rem'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}

                        {/* Añadir etiqueta rápida */}
                        {taggingStudentId === student.id ? (
                          <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              autoFocus
                              list="tags-autocomplete"
                              placeholder="Nueva etiqueta..."
                              className="input-field"
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTag(student.id);
                                } else if (e.key === 'Escape') {
                                  setTaggingStudentId(null);
                                }
                              }}
                              style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', width: '110px' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddTag(student.id)}
                              className="btn-primary"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaggingStudentId(null)}
                              className="btn-secondary"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTaggingStudentId(student.id);
                              setNewTagInput('');
                            }}
                            className="btn-secondary"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: '#64748b' }}
                            title="Añadir etiqueta privada a este alumno"
                          >
                            + Etiqueta
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Fecha de Alta */}
                    <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(student.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(student)}
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        + Asignar Curso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Datalist para autocompletar etiquetas existentes */}
      <datalist id="tags-autocomplete">
        {allTags.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
};

