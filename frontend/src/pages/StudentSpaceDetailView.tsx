import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TeachingSpace, CollectionProgressDTO } from '../types';
import { StudentCollectionCard } from '../components/StudentCollectionCard';
import { ArrowLeft, BookOpen, Users, FolderGit2, AlertCircle } from 'lucide-react';

export const StudentSpaceDetailView: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<TeachingSpace | null>(null);
  const [collectionProgress, setCollectionProgress] = useState<Record<string, CollectionProgressDTO>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) return;

    api.getMySpace(spaceId)
      .then((data) => {
        setSpace(data);
        if (data.collections && data.collections.length > 0) {
          Promise.allSettled(
            data.collections.map((c) => api.getCollectionProgress(c.id))
          ).then((results) => {
            const map: Record<string, CollectionProgressDTO> = {};
            results.forEach((res, idx) => {
              if (res.status === 'fulfilled') {
                map[data.collections![idx].id] = res.value;
              }
            });
            setCollectionProgress(map);
          });
        }
      })
      .catch((err) => {
        console.error('Error al cargar el espacio:', err);
        setError(err.message || 'No se pudo cargar la información del espacio docente.');
      })
      .finally(() => setLoading(false));
  }, [spaceId]);

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando espacio docente...</p>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="app-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#dc2626' }}>
          <AlertCircle size={36} style={{ margin: '0 auto 0.75rem' }} />
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Espacio no disponible</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            {error || 'No tienes acceso a este espacio docente o no existe.'}
          </p>
        </div>
      </div>
    );
  }

  const collections = space.collections || [];

  return (
    <div className="app-container">
      {/* Botón Volver */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/student/dashboard')}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
        >
          <ArrowLeft size={14} /> Volver al panel
        </button>
      </div>

      {/* Cabecera del Espacio */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={22} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                {space.name}
              </h1>
            </div>

            {space.description && (
              <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.9375rem', color: '#475569', lineHeight: 1.5 }}>
                {space.description}
              </p>
            )}

            {/* Profesores */}
            {space.teachers && space.teachers.length > 0 && (
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                <strong>Profesorado:</strong> {space.teachers.map((t) => t.fullName).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Colecciones Asignadas al Espacio */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={22} style={{ color: '#2563eb' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Colecciones Asignadas
              </h2>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Colecciones de ejercicios preparadas por el profesorado de este espacio
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
            {collections.length} {collections.length === 1 ? 'colección' : 'colecciones'}
          </span>
        </div>

        {collections.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            <FolderGit2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.05rem', color: '#334155', margin: '0 0 0.5rem' }}>
              Sin colecciones asignadas
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              El profesorado de este espacio aún no ha asignado ninguna colección de ejercicios.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {collections.map((col) => (
              <StudentCollectionCard
                key={col.id}
                collection={col}
                progress={collectionProgress[col.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
