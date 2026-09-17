import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Collection, CollectionProgressDTO } from '../types';
import { StudentCollectionCard } from '../components/StudentCollectionCard';
import { BookOpen, Search, FolderGit2 } from 'lucide-react';

export const StudentCollectionsView: React.FC = () => {
  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [collectionProgress, setCollectionProgress] = useState<Record<string, CollectionProgressDTO>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicCollections()
      .then((pubCols) => {
        setPublicCollections(pubCols);
        if (pubCols.length > 0) {
          Promise.allSettled(
            pubCols.map((c) => api.getCollectionProgress(c.id))
          ).then((results) => {
            const map: Record<string, CollectionProgressDTO> = {};
            results.forEach((res, idx) => {
              if (res.status === 'fulfilled') {
                map[pubCols[idx].id] = res.value;
              }
            });
            setCollectionProgress(map);
          });
        }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filteredCollections.map((col) => (
            <StudentCollectionCard
              key={col.id}
              collection={col}
              progress={collectionProgress[col.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};
