import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Collection, CourseCollectionDTO, User, TeacherStudent } from '../types';

export const TeacherCoursesView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal de administración de curso
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'collections' | 'students' | 'teachers'>('collections');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Datos del curso seleccionado
  const [courseCollections, setCourseCollections] = useState<CourseCollectionDTO[]>([]);
  const [allCatalogCollections, setAllCatalogCollections] = useState<Collection[]>([]);
  const [courseStudents, setCourseStudents] = useState<TeacherStudent[]>([]);
  const [allPlatformStudents, setAllPlatformStudents] = useState<TeacherStudent[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<User[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);

  // Acciones en colecciones
  const [selectedColToAdd, setSelectedColToAdd] = useState<string>('');
  const [addColAssignAll, setAddColAssignAll] = useState<boolean>(true);
  const [editingColAssignment, setEditingColAssignment] = useState<CourseCollectionDTO | null>(null);
  const [editColAssignAll, setEditColAssignAll] = useState<boolean>(true);
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<Set<string>>(new Set());

  // Acciones en alumnos y profesores
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState<string>('');
  const [selectedTeacherToAdd, setSelectedTeacherToAdd] = useState<string>('');

  const loadCourses = async () => {
    try {
      const crs = await api.listCourses();
      setCourses(crs);
    } catch (e: any) {
      console.error('Error al cargar cursos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const openCourseAdminModal = async (course: Course, initialTab: 'collections' | 'students' | 'teachers' = 'collections') => {
    setSelectedCourse(course);
    setActiveTab(initialTab);
    setModalLoading(true);
    setModalError(null);
    setModalSuccess(null);
    setEditingColAssignment(null);

    try {
      const [cols, allCols, students, allStudents, teachers, availTeachers] = await Promise.all([
        api.getCourseCollections(course.id),
        api.teacherGetCollections(),
        api.getCourseStudents(course.id),
        api.listTeacherStudents(),
        api.getCourseTeachers(course.id),
        api.getAvailableTeachers(course.id),
      ]);

      setCourseCollections(cols);
      setAllCatalogCollections(allCols);
      setCourseStudents(students);
      setAllPlatformStudents(allStudents);
      setCourseTeachers(teachers);
      setAvailableTeachers(availTeachers);

      // Preseleccionar colección disponible para asociar
      const assignedIds = new Set(cols.map((c: CourseCollectionDTO) => c.collectionId));
      const unassigned = allCols.filter((c: Collection) => !assignedIds.has(c.id));
      setSelectedColToAdd(unassigned.length > 0 ? unassigned[0].id : '');
      setAddColAssignAll(true);

      // Preseleccionar alumno disponible para matricular
      const enrolledStudentIds = new Set(students.map((s: TeacherStudent) => s.id));
      const availableStudents = allStudents.filter((s: TeacherStudent) => !enrolledStudentIds.has(s.id));
      setSelectedStudentToEnroll(availableStudents.length > 0 ? availableStudents[0].id : '');

      // Preseleccionar profesor disponible
      setSelectedTeacherToAdd(availTeachers.length > 0 ? availTeachers[0].id : '');
    } catch (err: any) {
      setModalError(err.message || 'Error al cargar los datos del curso');
    } finally {
      setModalLoading(false);
    }
  };

  const refreshCourseData = async (courseId: string) => {
    try {
      const [cols, students, teachers, availTeachers] = await Promise.all([
        api.getCourseCollections(courseId),
        api.getCourseStudents(courseId),
        api.getCourseTeachers(courseId),
        api.getAvailableTeachers(courseId),
      ]);
      setCourseCollections(cols);
      setCourseStudents(students);
      setCourseTeachers(teachers);
      setAvailableTeachers(availTeachers);

      // Actualizar preselecciones
      const assignedIds = new Set(cols.map((c: CourseCollectionDTO) => c.collectionId));
      const unassigned = allCatalogCollections.filter((c: Collection) => !assignedIds.has(c.id));
      setSelectedColToAdd(unassigned.length > 0 ? unassigned[0].id : '');

      const enrolledStudentIds = new Set(students.map((s: TeacherStudent) => s.id));
      const availableStudents = allPlatformStudents.filter((s: TeacherStudent) => !enrolledStudentIds.has(s.id));
      setSelectedStudentToEnroll(availableStudents.length > 0 ? availableStudents[0].id : '');
      setSelectedTeacherToAdd(availTeachers.length > 0 ? availTeachers[0].id : '');
    } catch (e: any) {
      console.error('Error refrescando datos del curso:', e);
    }
  };

  // --- Handlers de Colecciones ---
  const handleAssignCollection = async () => {
    if (!selectedCourse || !selectedColToAdd) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.assignCollectionToCourse(selectedCourse.id, selectedColToAdd, {
        assignedAllStudents: addColAssignAll,
        studentIds: addColAssignAll ? [] : courseStudents.map(s => s.id)
      });
      setModalSuccess('Colección asociada correctamente al curso');
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al asociar la colección');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEditAssignment = (col: CourseCollectionDTO) => {
    setEditingColAssignment(col);
    setEditColAssignAll(col.assignedAllStudents);
    setEditSelectedStudentIds(new Set(col.assignedStudentIds || []));
  };

  const handleSaveCollectionAssignment = async () => {
    if (!selectedCourse || !editingColAssignment) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.updateCollectionAssignments(selectedCourse.id, editingColAssignment.collectionId, {
        assignedAllStudents: editColAssignAll,
        studentIds: editColAssignAll ? [] : Array.from(editSelectedStudentIds)
      });
      setModalSuccess(`Asignación de alumnos para "${editingColAssignment.title}" actualizada`);
      setEditingColAssignment(null);
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al actualizar asignación de alumnos');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveCollection = async (collectionId: string) => {
    if (!selectedCourse) return;
    if (!window.confirm('¿Desasociar esta colección del curso? Los alumnos ya no podrán acceder a ella a través de este curso.')) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.removeCollectionFromCourse(selectedCourse.id, collectionId);
      setModalSuccess('Colección eliminada del curso');
      if (editingColAssignment?.collectionId === collectionId) {
        setEditingColAssignment(null);
      }
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al desasociar la colección');
    } finally {
      setModalLoading(false);
    }
  };

  // --- Handlers de Alumnos ---
  const handleEnrollStudent = async () => {
    if (!selectedCourse || !selectedStudentToEnroll) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.enrollCourseStudent(selectedCourse.id, selectedStudentToEnroll);
      setModalSuccess('Alumno matriculado en el curso correctamente');
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al matricular al alumno');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!selectedCourse) return;
    if (!window.confirm(`¿Estás seguro de desmatricular a "${studentName}" del curso?`)) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.unenrollCourseStudent(selectedCourse.id, studentId);
      setModalSuccess(`Alumno "${studentName}" desmatriculado del curso`);
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al desmatricular al alumno');
    } finally {
      setModalLoading(false);
    }
  };

  // --- Handlers de Profesores ---
  const handleAddTeacher = async () => {
    if (!selectedCourse || !selectedTeacherToAdd) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.addCourseTeacher(selectedCourse.id, selectedTeacherToAdd);
      setModalSuccess('Profesor incorporado al curso');
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al añadir profesor al curso');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string, teacherName: string) => {
    if (!selectedCourse) return;
    if (!window.confirm(`¿Quitar al profesor "${teacherName}" del curso?`)) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.removeCourseTeacher(selectedCourse.id, teacherId);
      setModalSuccess(`Profesor "${teacherName}" eliminado del curso`);
      await refreshCourseData(selectedCourse.id);
    } catch (err: any) {
      setModalError(err.message || 'Error al quitar profesor del curso');
    } finally {
      setModalLoading(false);
    }
  };

  // --- Creación de Nuevo Curso ---
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !academicYear.trim()) {
      setError('Por favor, completa los campos obligatorios (*).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createCourse({
        name: name.trim(),
        code: code.trim(),
        academicYear: academicYear.trim(),
        description: description.trim() || undefined,
      });
      setShowCreateModal(false);
      setName('');
      setCode('');
      setDescription('');
      await loadCourses();
    } catch (err: any) {
      setError(err.message || 'Error al crear el curso');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando cursos...</p>
      </div>
    );
  }

  const assignedCollectionIds = new Set(courseCollections.map((c: CourseCollectionDTO) => c.collectionId));
  const availableCollectionsToAssign = allCatalogCollections.filter((c: Collection) => !assignedCollectionIds.has(c.id));

  const enrolledStudentIds = new Set(courseStudents.map((s: TeacherStudent) => s.id));
  const availableStudentsToEnroll = allPlatformStudents.filter((s: TeacherStudent) => !enrolledStudentIds.has(s.id));

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Panel Docente
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>Gestión de Cursos</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Administra tus asignaturas, equipos docentes, matriculación de alumnos y asignación de colecciones.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Nuevo Curso
        </button>
      </div>

      {/* MODAL CREAR CURSO */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' }}>Crear Nuevo Curso</h2>
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Nombre del Curso *
                </label>
                <input
                  type="text" required placeholder="ej. Programación Java" className="input-field"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Código *
                  </label>
                  <input
                    type="text" required placeholder="ej. 1DAM-PROG" className="input-field"
                    value={code} onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Año Académico *
                  </label>
                  <input
                    type="text" required placeholder="ej. 2025-2026" className="input-field"
                    value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Descripción
                </label>
                <textarea
                  rows={3} placeholder="Descripción u objetivos del curso..." className="input-field"
                  value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setError(null); }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADMINISTRACIÓN INTEGRAL DEL CURSO */}
      {selectedCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 840, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-info">{selectedCourse.code}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedCourse.academicYear}</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
                  Administrar: {selectedCourse.name}
                </h2>
              </div>
              <button
                onClick={() => { setSelectedCourse(null); setModalError(null); setModalSuccess(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Mensajes de error / éxito */}
            {modalError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}
            {modalSuccess && (
              <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalSuccess}
              </div>
            )}

            {/* Pestañas de navegación */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('collections'); setEditingColAssignment(null); }}
                style={{
                  padding: '0.625rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                  borderBottom: activeTab === 'collections' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'collections' ? '#2563eb' : '#64748b',
                }}
              >
                📚 Colecciones ({courseCollections.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('students'); setEditingColAssignment(null); }}
                style={{
                  padding: '0.625rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                  borderBottom: activeTab === 'students' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'students' ? '#2563eb' : '#64748b',
                }}
              >
                🎓 Alumnos Matriculados ({courseStudents.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('teachers'); setEditingColAssignment(null); }}
                style={{
                  padding: '0.625rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                  borderBottom: activeTab === 'teachers' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'teachers' ? '#2563eb' : '#64748b',
                }}
              >
                👨‍🏫 Equipo Docente ({courseTeachers.length})
              </button>
            </div>

            {/* TAB 1: COLECCIONES Y ASIGNACIONES */}
            {activeTab === 'collections' && (
              <div>
                {/* Formulario para asociar nueva colección */}
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}>+ Asociar Colección al Curso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={selectedColToAdd}
                      onChange={(e) => setSelectedColToAdd(e.target.value)}
                      disabled={availableCollectionsToAssign.length === 0 || modalLoading}
                    >
                      {availableCollectionsToAssign.length === 0 ? (
                        <option value="">Todas las colecciones del catálogo ya están asociadas a este curso</option>
                      ) : (
                        availableCollectionsToAssign.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.visibility === 'PUBLIC' ? 'Pública' : 'Privada'})
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignCollection}
                      disabled={!selectedColToAdd || modalLoading}
                      className="btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Asociar Colección
                    </button>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addColAssignAll}
                        onChange={(e) => setAddColAssignAll(e.target.checked)}
                      />
                      Asignar automáticamente a todos los alumnos matriculados en el curso
                    </label>
                  </div>
                </div>

                {/* Sub-panel de edición de asignación selectiva */}
                {editingColAssignment && (
                  <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#1e40af' }}>
                        Asignación de alumnos para: "{editingColAssignment.title}"
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingColAssignment(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editColAssignAll}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditColAssignAll(checked);
                            if (checked) {
                              setEditSelectedStudentIds(new Set(courseStudents.map(s => s.id)));
                            }
                          }}
                        />
                        Asignar a todos los alumnos del curso ({courseStudents.length} alumnos)
                      </label>
                    </div>

                    {!editColAssignAll && (
                      <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '0.375rem', border: '1px solid #cbd5e1', padding: '0.5rem' }}>
                        {courseStudents.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', padding: '0.5rem' }}>
                            No hay alumnos matriculados en este curso todavía.
                          </p>
                        ) : (
                          courseStudents.map(s => {
                            const isChecked = editSelectedStudentIds.has(s.id);
                            return (
                              <label
                                key={s.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem',
                                  borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: isChecked ? '#f0fdf4' : 'transparent',
                                  fontSize: '0.8125rem', marginBottom: '0.25rem'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const next = new Set(editSelectedStudentIds);
                                    if (e.target.checked) next.add(s.id);
                                    else next.delete(s.id);
                                    setEditSelectedStudentIds(next);
                                  }}
                                />
                                <strong>{s.fullName}</strong>
                                <span style={{ color: '#64748b' }}>({s.username})</span>
                                {s.tags && s.tags.length > 0 && (
                                  <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '0.1rem 0.35rem', borderRadius: '0.25rem' }}>
                                    {s.tags.join(', ')}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button type="button" onClick={() => setEditingColAssignment(null)} className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
                        Cancelar
                      </button>
                      <button type="button" onClick={handleSaveCollectionAssignment} disabled={modalLoading} className="btn-primary" style={{ fontSize: '0.8125rem' }}>
                        Guardar Asignación
                      </button>
                    </div>
                  </div>
                )}

                {/* Listado de colecciones del curso */}
                {courseCollections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>Este curso aún no tiene colecciones asociadas.</p>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.8125rem' }}>Selecciona una colección arriba para asociarla al curso.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {courseCollections.map(col => (
                      <div
                        key={col.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem',
                          borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{col.title}</span>
                            <span className={`badge ${col.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                              {col.visibility}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontWeight: 600,
                                backgroundColor: col.assignedAllStudents ? '#ecfdf5' : '#eff6ff',
                                color: col.assignedAllStudents ? '#065f46' : '#1d4ed8',
                                border: col.assignedAllStudents ? '1px solid #a7f3d0' : '1px solid #bfdbfe'
                              }}
                            >
                              {col.assignedAllStudents
                                ? `Todos los alumnos (${col.totalCourseStudents})`
                                : `Asignada a ${col.assignedStudentsCount} de ${col.totalCourseStudents} alumnos`}
                            </span>
                          </div>
                          {col.description && (
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{col.description}</p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditAssignment(col)}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                          >
                            👥 Gestionar Alumnos
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCollection(col.collectionId)}
                            disabled={modalLoading}
                            className="btn-secondary"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALUMNOS MATRICULADOS */}
            {activeTab === 'students' && (
              <div>
                {/* Formulario para matricular alumno */}
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}>+ Matricular Alumno en el Curso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={selectedStudentToEnroll}
                      onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                      disabled={availableStudentsToEnroll.length === 0 || modalLoading}
                    >
                      {availableStudentsToEnroll.length === 0 ? (
                        <option value="">Todos los alumnos registrados ya están matriculados en este curso</option>
                      ) : (
                        availableStudentsToEnroll.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.username}) {s.githubUsername ? `[@${s.githubUsername}]` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleEnrollStudent}
                      disabled={!selectedStudentToEnroll || modalLoading}
                      className="btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Matricular Alumno
                    </button>
                  </div>
                </div>

                {/* Listado de alumnos matriculados */}
                {courseStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>No hay alumnos matriculados en este curso todavía.</p>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.8125rem' }}>Selecciona un alumno arriba para incorporarlo al curso.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {courseStudents.map(student => (
                      <div
                        key={student.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem',
                          borderRadius: '0.375rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.fullName} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                              {student.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{student.fullName}</span>
                              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{student.username}</span>
                              {student.githubUsername && (
                                <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>@{student.githubUsername}</span>
                              )}
                            </div>
                            {student.tags && student.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {student.tags.map(t => (
                                  <span key={t} style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: '0.25rem' }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnenrollStudent(student.id, student.fullName)}
                          disabled={modalLoading}
                          className="btn-secondary"
                          style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                        >
                          Desmatricular
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PROFESORES DEL CURSO */}
            {activeTab === 'teachers' && (
              <div>
                {/* Formulario para incorporar profesor */}
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}>+ Incorporar Co-profesor al Curso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={selectedTeacherToAdd}
                      onChange={(e) => setSelectedTeacherToAdd(e.target.value)}
                      disabled={availableTeachers.length === 0 || modalLoading}
                    >
                      {availableTeachers.length === 0 ? (
                        <option value="">No hay otros profesores disponibles en la plataforma</option>
                      ) : (
                        availableTeachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} ({t.username})
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddTeacher}
                      disabled={!selectedTeacherToAdd || modalLoading}
                      className="btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Añadir Profesor
                    </button>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Todos los profesores asignados al curso pueden gestionar actividades, colecciones y alumnos colegiadamente.
                  </p>
                </div>

                {/* Listado de profesores asignados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {courseTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem',
                        borderRadius: '0.375rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {teacher.avatarUrl ? (
                          <img src={teacher.avatarUrl} alt={teacher.fullName} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                            {teacher.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{teacher.fullName}</span>
                            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{teacher.username}</span>
                            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>{teacher.role}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTeacher(teacher.id, teacher.fullName)}
                        disabled={courseTeachers.length <= 1 || modalLoading}
                        title={courseTeachers.length <= 1 ? 'No se puede quitar el único profesor del curso' : 'Quitar profesor'}
                        className="btn-secondary"
                        style={{
                          color: courseTeachers.length <= 1 ? '#94a3b8' : '#dc2626',
                          borderColor: courseTeachers.length <= 1 ? '#cbd5e1' : '#fca5a5',
                          fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                          cursor: courseTeachers.length <= 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer del modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => { setSelectedCourse(null); setModalError(null); setModalSuccess(null); }}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTADO DE CURSOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {courses.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>No tienes ningún curso registrado todavía.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Crear tu primer curso
            </button>
          </div>
        ) : (
          courses.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="badge badge-info">{c.code}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.academicYear}</span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>{c.name}</h3>
                {c.description && (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.4 }}>
                    {c.description}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button
                    type="button"
                    onClick={() => openCourseAdminModal(c, 'collections')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    title="Gestionar colecciones del curso"
                  >
                    📚 Colecciones
                  </button>
                  <button
                    type="button"
                    onClick={() => openCourseAdminModal(c, 'students')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    title="Gestionar alumnos matriculados"
                  >
                    🎓 Alumnos
                  </button>
                  <button
                    type="button"
                    onClick={() => openCourseAdminModal(c, 'teachers')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    title="Gestionar profesores del curso"
                  >
                    👨‍🏫 Profesores
                  </button>
                </div>
                <Link
                  to={`/teacher/courses/${c.id}/submissions`}
                  className="btn-secondary"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  📋 Entregas
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
