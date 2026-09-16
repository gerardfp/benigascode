import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Collection } from '../types';
import { BookOpen, Search, CheckCircle2, ArrowRight, FolderGit2 } from 'lucide-react';

export const StudentCollectionsView: React.FC = () => {
  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [myCollectionIds, setMyCollectionIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getPublicCollections(),
      api.getMyCollections().catch(() => []),
    ])
      .then(([pubCols, myCols]) => {
        setPublicCollections(pubCols);
        setMyCollectionIds(new Set(myCols.map((c) => c.id)));
      })
      .catch((err) => {
        console.error('Error al cargar colecciones públicas:', err);
        setError(err.message || 'No se pudieron cargar las colecciones públicas.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredCollections = publicCollections.filter((col) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      col.title.toLowerCase().includes(term) ||
      (col.description && col.description.toLowerCase().includes(term)) ||
      col.slug.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando catálogo de colecciones públicas...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Cabecera de la página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
            <BookOpen size={26} style={{ color: '#2563eb' }} />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Colecciones Públicas
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Explora todas las colecciones abiertas disponibles en la plataforma y empieza a practicar a tu ritmo.
          </p>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar colección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <p>{error}</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <FolderGit2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 0.5rem', color: '#334155', fontSize: '1.125rem' }}>
            {searchTerm ? 'No se encontraron colecciones con ese criterio' : 'No hay colecciones públicas disponibles'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Pronto se publicarán nuevas colecciones de ejercicios.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredCollections.map((col) => {
            const isEnrolled = myCollectionIds.has(col.id);

            return (
              <div
                key={col.id}
                className="card"
                style={{
                  border: isEnrolled ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  backgroundColor: isEnrolled ? '#f8fafc' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isEnrolled ? '0 1px 3px rgba(37, 99, 235, 0.08)' : undefined,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Badges superiores */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.6875rem',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                        }}
                      >
                        PÚBLICA
                      </span>
                      {isEnrolled && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.6875rem',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={12} /> En mis colecciones
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      v{col.versionNumber || 1}
                    </span>
                  </div>

                  {/* Título */}
                  <Link to={`/collections/${col.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        lineHeight: 1.3,
                      }}
                    >
                      {col.title}
                    </h2>
                  </Link>

                  {/* Descripción */}
                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {col.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Pie de tarjeta con botón */}
                <div style={{ marginTop: '1.25rem', paddingTop: '0.875rem', borderTop: '1px solid #f1f5f9' }}>
                  <Link
                    to={`/collections/${col.id}`}
                    className={isEnrolled ? 'btn-secondary' : 'btn-primary'}
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
                    {isEnrolled ? 'Continuar practicando' : 'Acceder a la colección'} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

