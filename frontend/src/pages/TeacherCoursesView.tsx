import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';

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

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Panel Docente
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>Gestión de Cursos</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Administra tus asignaturas, consulta las entregas de los alumnos y da de alta nuevos cursos.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
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

              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
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
