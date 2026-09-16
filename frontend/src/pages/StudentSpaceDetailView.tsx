import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TeachingSpace } from '../types';
import { TagBadge } from '../components/TagBadge';
import { ArrowLeft, BookOpen, Users, FolderGit2, AlertCircle } from 'lucide-react';

export const StudentSpaceDetailView: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<TeachingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) return;

    api.getMySpace(spaceId)
      .then((data) => {
        setSpace(data);
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
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem' }}>Espacio Docente no encontrado</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {error || 'El espacio docente solicitado no existe o no tienes acceso a él.'}
          </p>
          <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowLeft size={16} /> Volver a Mis Actividades
          </Link>
        </div>
      </div>
    );
  }

  const tags = (space as any).contextTags || space.tags || [];
  const collections = space.collections || [];

  return (
    <div className="app-container">
      {/* Botón de regreso */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
        >
          <ArrowLeft size={15} /> Volver a Mis Actividades
        </button>
      </div>

      {/* Cabecera del espacio docente */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
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
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
                <strong>Profesorado:</strong> {space.teachers.map((t) => t.fullName).join(', ')}
              </div>
            )}

            {/* Etiquetas de contexto asociadas */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginRight: '0.25rem' }}>
                  Etiquetas:
                </span>
                {tags.map((tag: any) => (
                  <TagBadge
                    key={tag.id || tag.tagId || tag.value}
                    category={tag.category}
                    value={tag.value}
                    color={tag.color}
                  />
                ))}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {collections.map((col) => (
              <div
                key={col.id}
                className="card"
                style={{
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.6875rem',
                        backgroundColor: col.visibility === 'PUBLIC' ? '#e0f2fe' : '#fef3c7',
                        color: col.visibility === 'PUBLIC' ? '#0369a1' : '#b45309',
                      }}
                    >
                      {col.visibility}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      v{col.versionNumber || 1}
                    </span>
                  </div>

                  <Link to={`/collections/${col.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                      {col.title}
                    </h3>
                  </Link>

                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: '0.8125rem',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {col.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.875rem', borderTop: '1px solid #f1f5f9' }}>
                  <Link
                    to={`/collections/${col.id}`}
                    className="btn-primary"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      gap: '0.375rem',
                      fontSize: '0.8125rem',
                      padding: '0.5rem',
                    }}
                  >
                    Ver ejercicios &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

