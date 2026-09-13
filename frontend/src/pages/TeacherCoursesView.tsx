import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Collection } from '../types';

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

  // Modal de colecciones del curso
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseCollections, setCourseCollections] = useState<Collection[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedColToAdd, setSelectedColToAdd] = useState<string>('');
  const [collectionActionLoading, setCollectionActionLoading] = useState(false);
  const [collectionModalError, setCollectionModalError] = useState<string | null>(null);

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

  const openCollectionsModal = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingCollections(true);
    setCollectionModalError(null);
    try {
      const [courseCols, allCols] = await Promise.all([
        api.getCourseCollections(course.id),
        api.teacherGetCollections(),
      ]);
      setCourseCollections(courseCols);
      setAllCollections(allCols);
      const assignedIds = new Set(courseCols.map(c => c.id));
      const unassigned = allCols.filter(c => !assignedIds.has(c.id));
      if (unassigned.length > 0) {
        setSelectedColToAdd(unassigned[0].id);
      } else {
        setSelectedColToAdd('');
      }
    } catch (err: any) {
      setCollectionModalError(err.message || 'Error al cargar colecciones del curso');
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleAssignCollection = async () => {
    if (!selectedCourse || !selectedColToAdd) return;
    setCollectionActionLoading(true);
    setCollectionModalError(null);
    try {
      await api.assignCollectionToCourse(selectedCourse.id, selectedColToAdd);
      const updated = await api.getCourseCollections(selectedCourse.id);
      setCourseCollections(updated);
      const assignedIds = new Set(updated.map(c => c.id));
      const unassigned = allCollections.filter(c => !assignedIds.has(c.id));
      if (unassigned.length > 0) {
        setSelectedColToAdd(unassigned[0].id);
      } else {
        setSelectedColToAdd('');
      }
    } catch (err: any) {
      setCollectionModalError(err.message || 'Error al asociar la colección');
    } finally {
      setCollectionActionLoading(false);
    }
  };

  const handleRemoveCollection = async (collectionId: string) => {
    if (!selectedCourse) return;
    setCollectionActionLoading(true);
    setCollectionModalError(null);
    try {
      await api.removeCollectionFromCourse(selectedCourse.id, collectionId);
      const updated = await api.getCourseCollections(selectedCourse.id);
      setCourseCollections(updated);
      const assignedIds = new Set(updated.map(c => c.id));
      const unassigned = allCollections.filter(c => !assignedIds.has(c.id));
      if (unassigned.length > 0 && !selectedColToAdd) {
        setSelectedColToAdd(unassigned[0].id);
      }
    } catch (err: any) {
      setCollectionModalError(err.message || 'Error al desasociar la colección');
    } finally {
      setCollectionActionLoading(false);
    }
  };

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

  const assignedIds = new Set(courseCollections.map(c => c.id));
  const availableToAssign = allCollections.filter(c => !assignedIds.has(c.id));

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Panel Docente
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>Gestión de Cursos</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Administra tus asignaturas, asocia colecciones de ejercicios y consulta las entregas de los alumnos.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Nuevo Curso
        </button>
      </div>

      {showCreateModal && (
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
                  type="text"
                  required
                  placeholder="ej. Programación Java"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 1DAM-PROG"
                    className="input-field"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Año Académico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 2025-2026"
                    className="input-field"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Descripción breve del curso u objetivos..."
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(null); }}
                  className="btn-secondary"
                >
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

      {/* Modal de Colecciones Asociadas al Curso */}
      {selectedCourse && (
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
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-info">{selectedCourse.code}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedCourse.academicYear}</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
                  Colecciones de {selectedCourse.name}
                </h2>
              </div>
              <button
                onClick={() => { setSelectedCourse(null); setCollectionModalError(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
              Los alumnos matriculados en este curso tendrán acceso directo a las siguientes colecciones y sus ejercicios:
            </p>

            {collectionModalError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {collectionModalError}
              </div>
            )}

            {/* Asignar nueva colección */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
              <select
                className="input-field"
                value={selectedColToAdd}
                onChange={(e) => setSelectedColToAdd(e.target.value)}
                style={{ flex: 1 }}
                disabled={availableToAssign.length === 0 || collectionActionLoading}
              >
                {availableToAssign.length === 0 ? (
                  <option value="">Todas las colecciones ya están asociadas</option>
                ) : (
                  availableToAssign.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.visibility === 'PUBLIC' ? 'Pública' : 'Privada'})
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleAssignCollection}
                disabled={!selectedColToAdd || collectionActionLoading}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                + Asociar Colección
              </button>
            </div>

            {/* Lista de colecciones asignadas */}
            {loadingCollections ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Cargando colecciones...</p>
            ) : courseCollections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                  Este curso aún no tiene colecciones asignadas.
                </p>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.8125rem' }}>
                  Selecciona una colección arriba para dar acceso a los alumnos del curso.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {courseCollections.map(col => (
                  <div
                    key={col.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{col.title}</span>
                        <span className={`badge ${col.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                          {col.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
                        </span>
                      </div>
                      {col.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                          {col.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCollection(col.id)}
                      disabled={collectionActionLoading}
                      className="btn-secondary"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setSelectedCourse(null); setCollectionModalError(null); }}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => openCollectionsModal(c)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  📚 Colecciones
                </button>
                <Link
                  to={`/teacher/courses/${c.id}/submissions`}
                  className="btn-secondary"
                  style={{ textDecoration: 'none', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  📋 Ver Entregas
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
