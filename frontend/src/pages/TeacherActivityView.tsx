import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Submission } from '../types';

export const TeacherActivityView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = async () => {
    if (!courseId) return;
    try {
      const subs = await api.getSubmissionsForCourse(courseId);
      setSubmissions(subs);
    } catch (e) {
      console.error('Error al cargar entregas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [courseId]);

  const handleReevaluate = async (submissionId: string) => {
    const reason = prompt('Motivo de la reevaluación (ej. TEST_CORRECTION):', 'CORRECCION_TESTS');
    if (!reason) return;

    try {
      await api.reevaluate(submissionId, reason);
      alert('Reevaluación encolada.');
      loadSubmissions();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const downloadCsv = () => {
    window.location.href = `/api/v1/teacher/export/courses/${courseId}/submissions.csv`;
  };

  if (loading) {
    return <div className="app-container"><p>Cargando entregas del curso...</p></div>;
  }

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>&larr; Volver al Panel Docente</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0' }}>Entregas del Curso</h1>
        </div>

        <button onClick={downloadCsv} className="btn-secondary">
          📥 Exportar Calificaciones CSV
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>Alumno</th>
              <th style={{ padding: '0.75rem' }}>Actividad</th>
              <th style={{ padding: '0.75rem' }}>Ejercicio</th>
              <th style={{ padding: '0.75rem' }}>Fecha</th>
              <th style={{ padding: '0.75rem' }}>Estado</th>
              <th style={{ padding: '0.75rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No se han registrado entregas para este curso todavía.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sub.studentName}</td>
                  <td style={{ padding: '0.75rem' }}>{sub.activityName}</td>
                  <td style={{ padding: '0.75rem' }}>{sub.exerciseTitle}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{new Date(sub.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${sub.status === 'FINISHED' ? 'badge-success' : 'badge-warning'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => handleReevaluate(sub.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Reevaluar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

