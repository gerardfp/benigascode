import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Activity, Collection } from '../types';

export const StudentDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [accessKey, setAccessKey] = useState('');
  const [claimStatus, setClaimStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [acts, cols] = await Promise.all([
        api.getMyActivities(),
        api.getMyCollections(),
      ]);
      setActivities(acts);
      setCollections(cols);
    } catch (e: any) {
      console.error('Error al cargar datos del alumno:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClaimKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    try {
      const col = await api.claimCollectionAccess(accessKey.trim());
      setClaimStatus({ message: `¡Acceso concedido a la colección "${col.title}"!`, isError: false });
      setAccessKey('');
      loadData();
    } catch (err: any) {
      setClaimStatus({ message: err.message || 'Clave de acceso inválida o caducada', isError: true });
    }
  };

  if (loading) {
    return <div className="app-container"><p>Cargando tus actividades...</p></div>;
  }

  return (
    <div className="app-container">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Columna Principal: Actividades Asignadas */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem' }}>
            Actividades Asignadas
          </h2>

          {activities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <p>No tienes actividades pendientes en tus cursos actualmente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activities.map((act) => (
                <div key={act.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className={`badge ${act.type === 'EXAM' ? 'badge-danger' : act.type === 'PRACTICE' ? 'badge-success' : 'badge-info'}`}>
                        {act.type}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{act.name}</h3>
                    </div>
                    <p style={{ margin: '0.25rem 0', color: '#475569', fontSize: '0.875rem' }}>
                      Ejercicio: <strong>{act.exerciseTitle || 'Sin título'}</strong>
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Intentos máximos: {act.maxAttempts !== null ? act.maxAttempts : 'Ilimitados'}
                      {act.dueAt && ` • Fecha límite: ${new Date(act.dueAt).toLocaleString()}`}
                    </div>
                  </div>

                  <div>
                    {act.isAvailableNow ? (
                      <Link to={`/activity/${act.id}/exercise/${act.exerciseVersionId}`} className="btn-primary" style={{ textDecoration: 'none' }}>
                        Realizar Ejercicio &rarr;
                      </Link>
                    ) : (
                      <span className="badge badge-warning">No disponible</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Colecciones Disponibles */}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
            Mis Colecciones Disponibles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {collections.map((col) => (
              <div key={col.id} className="card">
                <span className="badge badge-neutral" style={{ marginBottom: '0.5rem' }}>{col.visibility}</span>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{col.title}</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{col.description || 'Sin descripción'}</p>
                <div style={{ marginTop: '1rem' }}>
                  <Link to={`/collections/${col.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                    Ver ejercicios &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Lateral: Desbloquear Colección por Clave */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
              Acceso con Clave Privada
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
              Si tu profesor te ha proporcionado un código de acceso para un examen o colección privada, ingrésalo aquí:
            </p>

            {claimStatus && (
              <div style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                marginBottom: '0.75rem',
                backgroundColor: claimStatus.isError ? '#fee2e2' : '#dcfce7',
                color: claimStatus.isError ? '#b91c1c' : '#15803d',
              }}>
                {claimStatus.message}
              </div>
            )}

            <form onSubmit={handleClaimKey}>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. ABC-72F-X9"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                style={{ textTransform: 'uppercase', marginBottom: '0.75rem' }}
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Desbloquear Colección
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

