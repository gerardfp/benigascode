import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Collection, Exercise } from '../types';

export const CollectionDetailView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) return;

    Promise.all([
      api.getCollection(collectionId),
      api.getCollectionExercises(collectionId),
    ])
      .then(([col, exs]) => {
        setCollection(col);
        setExercises(exs);
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar la colección');
      })
      .finally(() => setLoading(false));
  }, [collectionId]);

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando ejercicios de la colección...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="app-container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Colección no encontrada</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'No se pudo cargar la colección.'}</p>
          <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Volver al Inicio
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{collection.title}</h1>
          <span className={`badge ${collection.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`}>
            {collection.visibility === 'PUBLIC' ? '🌐 Colección Pública' : '🔒 Colección Privada'}
          </span>
        </div>
        {collection.description && (
          <p style={{ color: '#64748b', margin: '0.5rem 0 0', fontSize: '0.9375rem' }}>
            {collection.description}
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem' }}>
          Ejercicios Disponibles ({exercises.length})
        </h2>

        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Esta colección no contiene ejercicios disponibles en este momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exercises.map((ex, index) => (
              <div
                key={ex.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.875rem' }}>
                      #{index + 1}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
                      {ex.title}
                    </h3>
                    <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                      {ex.language}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Identificador: <code>{ex.slug}</code> • Versión: v{ex.versionNumber}
                  </div>
                </div>

                <Link
                  to={`/collections/${collectionId}/exercise/${ex.id}`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                >
                  Resolver Ejercicio &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
