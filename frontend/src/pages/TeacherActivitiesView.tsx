import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Activity } from '../types';
import { FileCode } from 'lucide-react';

export const TeacherActivitiesView: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listActivities()
      .then(setActivities)
      .catch((err) => console.error('Error al cargar actividades:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando actividades...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCode size={24} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Actividades
          </h1>
        </div>
      </div>

      <div className="card">
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            No hay actividades publicadas actualmente. Sincroniza contenidos desde Git o asígnalas desde el panel principal.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`badge ${a.type === 'EXAM' ? 'badge-danger' : a.type === 'PRACTICE' ? 'badge-success' : 'badge-info'}`}>
                      {a.type}
                    </span>
                    <strong style={{ fontSize: '1rem' }}>{a.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Ejercicio asociado: <strong>{a.exerciseTitle}</strong> {a.teachingSpaceName ? `• Espacio: ${a.teachingSpaceName}` : ''} • Intentos máximos: {a.maxAttempts ?? 'Ilimitados'}
                  </div>
                </div>

                <Link
                  to="/teacher/submissions"
                  className="btn-secondary"
                  style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
                >
                  Ver Entregas
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
