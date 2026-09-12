import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Collection, Exercise, CollectionProgressDTO, ExerciseProgressItem } from '../types';
import { CheckCircle2, Circle, ArrowRight, Award, BarChart2 } from 'lucide-react';

export const CollectionDetailView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [progress, setProgress] = useState<CollectionProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) return;

    Promise.all([
      api.getCollection(collectionId),
      api.getCollectionExercises(collectionId),
      api.getCollectionProgress(collectionId).catch(() => null),
    ])
      .then(([col, exs, prog]) => {
        setCollection(col);
        setExercises(exs);
        setProgress(prog);
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

  // Helper para buscar el progreso de un ejercicio
  const getExerciseProgress = (ex: Exercise): ExerciseProgressItem | undefined => {
    if (!progress || !progress.items) return undefined;
    return progress.items.find(
      (item) => item.exerciseId === ex.exerciseId || item.exerciseId === ex.id || item.slug === ex.slug
    );
  };

  // Helper de color según el porcentaje de tests logrados
  const getScoreColorConfig = (pct: number) => {
    if (pct >= 100) {
      return {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        text: '#065f46',
        badgeBg: '#10b981',
        iconColor: '#059669',
      };
    }
    if (pct >= 75) {
      return {
        bg: '#f0fdf4',
        border: '#bbf7d0',
        text: '#166534',
        badgeBg: '#84cc16',
        iconColor: '#15803d',
      };
    }
    if (pct >= 50) {
      return {
        bg: '#fefce8',
        border: '#fde047',
        text: '#854d0e',
        badgeBg: '#eab308',
        iconColor: '#ca8a04',
      };
    }
    if (pct >= 25) {
      return {
        bg: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
        badgeBg: '#f97316',
        iconColor: '#ea580c',
      };
    }
    return {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      badgeBg: '#ef4444',
      iconColor: '#dc2626',
    };
  };

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/collections" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Volver a Colecciones
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

      {/* Estadísticas Sutiles de Progreso del Alumno */}
      {progress && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>
                Tu Progreso en esta Colección
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem' }}>
              <span style={{ color: '#64748b' }}>
                Completitud: <strong style={{ color: '#0f172a' }}>{progress.completionPercentage}%</strong>
              </span>
              <span style={{ color: '#64748b' }}>
                Puntuación media: <strong style={{ color: '#0f172a' }}>{progress.averageScore} pts</strong>
              </span>
            </div>
          </div>

          {/* Barra de progreso segmentada */}
          <div
            style={{
              height: '8px',
              width: '100%',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '0.75rem',
            }}
          >
            {progress.totalExercises > 0 && (
              <>
                <div
                  style={{
                    width: `${(progress.completedExercises / progress.totalExercises) * 100}%`,
                    backgroundColor: '#10b981',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Completados: ${progress.completedExercises}`}
                />
                <div
                  style={{
                    width: `${(progress.attemptedExercises / progress.totalExercises) * 100}%`,
                    backgroundColor: '#f59e0b',
                    transition: 'width 0.4s ease',
                  }}
                  title={`En progreso: ${progress.attemptedExercises}`}
                />
              </>
            )}
          </div>

          {/* Píldoras de resumen sutil */}
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem', color: '#475569', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <strong>{progress.completedExercises}</strong> de {progress.totalExercises} resueltos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <strong>{progress.attemptedExercises}</strong> en progreso
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
              <strong>{progress.notStartedExercises}</strong> sin comenzar
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Link
                to="/progress"
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <BarChart2 size={14} /> Ver todos mis insights &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Ejercicios */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem' }}>
          Ejercicios Disponibles ({exercises.length})
        </h2>

        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Esta colección no contiene ejercicios disponibles en este momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {exercises.map((ex, index) => {
              const ep = getExerciseProgress(ex);
              const isResolved = ep && (ep.passPercentage >= 100 || ep.status === 'MASTERED' || (ep.status === 'PASSED' && ep.bestScore >= 100));
              const isAttempted = ep && !isResolved && (ep.totalSubmissions > 0 || ep.status === 'ATTEMPTED' || ep.bestScore > 0);
              const colorConfig = isAttempted ? getScoreColorConfig(ep.passPercentage) : null;

              return (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.125rem 1.25rem',
                    background: isResolved ? '#f8fdfa' : isAttempted ? '#fffefc' : '#f8fafc',
                    border: `1px solid ${isResolved ? '#bbf7d0' : isAttempted ? colorConfig?.border : '#e2e8f0'}`,
                    borderRadius: '0.625rem',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Indicador / Checkmark con color dinámico */}
                    <div>
                      {isResolved ? (
                        <div
                          title="Ejercicio resuelto con éxito (100% de tests superados)"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: '#dcfce7',
                            border: '1.5px solid #86efac',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#15803d',
                          }}
                        >
                          <CheckCircle2 size={20} />
                        </div>
                      ) : isAttempted && colorConfig ? (
                        <div
                          title={`Intentado: ${ep?.testsPassed}/${ep?.totalTests} tests (${Math.round(ep?.passPercentage || 0)}%)`}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: colorConfig.bg,
                            border: `1.5px solid ${colorConfig.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colorConfig.iconColor,
                          }}
                        >
                          <CheckCircle2 size={20} />
                        </div>
                      ) : (
                        <div
                          title="Ejercicio no intentado"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: '1.5px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                          }}
                        >
                          <Circle size={14} />
                        </div>
                      )}
                    </div>

                    {/* Información del ejercicio */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.875rem' }}>
                          #{index + 1}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600, color: '#1e293b' }}>
                          {ex.title}
                        </h3>

                        {/* Badge de estado del alumno */}
                        {isResolved && (
                          <span
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            ✓ Resuelto
                          </span>
                        )}

                        {isAttempted && colorConfig && ep && (
                          <span
                            style={{
                              backgroundColor: colorConfig.bg,
                              color: colorConfig.text,
                              border: `1px solid ${colorConfig.border}`,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            ✓ {ep.totalTests > 0 ? `${ep.testsPassed}/${ep.totalTests} tests` : ''} ({Math.round(ep.passPercentage)}%)
                          </span>
                        )}

                        <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {ex.language}
                        </span>

                        {/* Etiquetas (Tags) */}
                        {ex.tags && ex.tags.length > 0 && ex.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '0.6875rem',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        Identificador: <code>{ex.slug}</code> • Versión: v{ex.versionNumber}
                        {ep && ep.totalSubmissions > 0 && (
                          <span> • Envíos: <strong>{ep.totalSubmissions}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón Resolver */}
                  <Link
                    to={`/collections/${collectionId}/exercise/${ex.id}`}
                    className="btn-primary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      backgroundColor: isResolved ? '#0f172a' : '#2563eb',
                    }}
                  >
                    {isResolved ? 'Ver Solución' : isAttempted ? 'Continuar' : 'Resolver'}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
