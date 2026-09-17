import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Activity, Collection, TeachingSpace, CollectionProgressDTO } from '../types';
import { BookOpen, FolderGit2, Key, Award, ArrowRight, Users, CheckCircle2 } from 'lucide-react';

const CollectionProgressBar: React.FC<{ progress?: CollectionProgressDTO }> = ({ progress }) => {
  if (!progress || !progress.items || progress.items.length === 0) {
    return (
      <div
        style={{
          width: '6em',
          height: '5px',
          backgroundColor: '#e2e8f0',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '0.625rem',
        }}
      />
    );
  }

  const items = progress.items;
  const total = items.length;

  let passed = 0;
  let partial = 0;
  let attemptedFailed = 0;

  for (const item of items) {
    const isPassed =
      item.bestScore >= 100 ||
      item.status === 'PASSED' ||
      item.status === 'MASTERED' ||
      (item.totalTests > 0 && item.testsPassed === item.totalTests);

    if (isPassed) {
      passed++;
    } else if (item.testsPassed > 0 || item.bestScore > 0) {
      partial++;
    } else if (
      item.totalSubmissions > 0 ||
      item.status === 'ATTEMPTED' ||
      item.status === 'IN_PROGRESS'
    ) {
      attemptedFailed++;
    }
  }

  const notStarted = Math.max(0, total - passed - partial - attemptedFailed);

  const passedPct = (passed / total) * 100;
  const partialPct = (partial / total) * 100;
  const attemptedFailedPct = (attemptedFailed / total) * 100;
  const notStartedPct = (notStarted / total) * 100;

  return (
    <div
      style={{
        width: '6em',
        height: '5px',
        backgroundColor: '#e2e8f0',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '0.625rem',
      }}
      title={`Superados: ${passed}, Con casos conseguidos: ${partial}, Intentados sin éxito: ${attemptedFailed}, Sin empezar: ${notStarted}`}
    >
      {passedPct > 0 && (
        <div style={{ width: `${passedPct}%`, backgroundColor: '#16a34a', height: '100%' }} />
      )}
      {partialPct > 0 && (
        <div style={{ width: `${partialPct}%`, backgroundColor: '#eab308', height: '100%' }} />
      )}
      {attemptedFailedPct > 0 && (
        <div style={{ width: `${attemptedFailedPct}%`, backgroundColor: '#ea580c', height: '100%' }} />
      )}
      {notStartedPct > 0 && (
        <div style={{ width: `${notStartedPct}%`, backgroundColor: '#e2e8f0', height: '100%' }} />
      )}
    </div>
  );
};

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionProgress, setCollectionProgress] = useState<Record<string, CollectionProgressDTO>>({});
  const [mySpaces, setMySpaces] = useState<TeachingSpace[]>([]);
  const [accessKey, setAccessKey] = useState('');
  const [claimStatus, setClaimStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [acts, cols, spaces] = await Promise.all([
        api.getMyActivities(),
        api.getMyCollections(),
        api.getMySpaces().catch(() => []),
      ]);
      setActivities(acts);
      setCollections(cols);
      setMySpaces(spaces);

      if (cols.length > 0) {
        Promise.allSettled(
          cols.map((c) => api.getCollectionProgress(c.id))
        ).then((results) => {
          const map: Record<string, CollectionProgressDTO> = {};
          results.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
              map[cols[idx].id] = res.value;
            }
          });
          setCollectionProgress(map);
        });
      }
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
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando tus actividades...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA: Mis Espacios y Mis Colecciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* SECCIÓN: Mis Espacios */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={22} style={{ color: '#2563eb' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Mis Espacios
                </h2>
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                {mySpaces.length} {mySpaces.length === 1 ? 'espacio docente' : 'espacios docentes'}
              </span>
            </div>

            {mySpaces.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '1.75rem', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  No perteneces a ningún espacio docente actualmente. Tus profesores te añadirán mediante tus etiquetas de grupo o curso.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {mySpaces.map((space) => {
                  const collectionsCount = space.collections?.length || 0;

                  return (
                    <div
                      key={space.id}
                      className="card"
                      onClick={() => navigate(`/spaces/${space.id}`)}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.625rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                          {space.name}
                        </h3>
                        {space.description && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                            {space.description}
                          </p>
                        )}
                      </div>

                      {/* Pie de la tarjeta: Colecciones y profesores */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: '#64748b',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '0.5rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        <div>
                          <strong>{collectionsCount}</strong> {collectionsCount === 1 ? 'colección' : 'colecciones'}
                        </div>
                        {space.teachers && space.teachers.length > 0 && (
                          <div style={{ color: '#475569' }}>
                            Profesor: {space.teachers.map((t) => t.fullName).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN: Mis Colecciones */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={22} style={{ color: '#0284c7' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Mis Colecciones
                  </h2>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Colecciones en las que participas o asignadas a tus espacios docentes
                  </p>
                </div>
              </div>
              <Link
                to="/collections"
                style={{
                  fontSize: '0.8125rem',
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            {collections.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <FolderGit2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                  Aún no has participado en ninguna colección ni tienes colecciones asignadas.
                </p>
                <Link
                  to="/collections"
                  className="btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                >
                  Explorar Colecciones Públicas <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className="card"
                    onClick={() => navigate(`/collections/${col.id}`)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div>
                      <CollectionProgressBar progress={collectionProgress[col.id]} />
                      <h4 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                        {col.title}
                      </h4>
                      {col.description && (
                        <p
                          style={{
                            margin: 0,
                            color: '#64748b',
                            fontSize: '0.8125rem',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {col.description}
                        </p>
                      )}
                      {collectionProgress[col.id]?.usedLanguages && (collectionProgress[col.id]?.usedLanguages?.length ?? 0) > 0 && (
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
                          {collectionProgress[col.id]?.usedLanguages?.map((lang) => (
                            <span
                              key={lang}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '0.25rem',
                                backgroundColor: lang.toLowerCase() === 'python' ? '#fef3c7' : '#e0e7ff',
                                color: lang.toLowerCase() === 'python' ? '#92400e' : '#3730a3',
                                border: `1px solid ${lang.toLowerCase() === 'python' ? '#fde68a' : '#c7d2fe'}`,
                                fontWeight: 600,
                              }}
                            >
                              {lang.toLowerCase() === 'python' ? '🐍 Python' : '☕ Java'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Actividades Asignadas y Acceso con Clave Privada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Actividades Asignadas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Award size={22} style={{ color: '#ea580c' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Actividades Asignadas
              </h2>
            </div>

            {activities.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '1.75rem', color: '#64748b' }}>
                <CheckCircle2 size={30} style={{ margin: '0 auto 0.5rem', opacity: 0.4, color: '#16a34a' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  No tienes actividades pendientes en tus cursos actualmente.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="card"
                    style={{
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className={`badge ${act.type === 'EXAM' ? 'badge-danger' : act.type === 'PRACTICE' ? 'badge-success' : 'badge-info'}`}>
                          {act.type}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{act.name}</h3>
                      </div>
                      <p style={{ margin: '0.25rem 0', color: '#475569', fontSize: '0.8125rem' }}>
                        Ejercicio: <strong>{act.exerciseTitle || 'Sin título'}</strong>
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Intentos máximos: {act.maxAttempts !== null ? act.maxAttempts : 'Ilimitados'}
                        {act.dueAt && ` • Límite: ${new Date(act.dueAt).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div>
                      {act.isAvailableNow ? (
                        <Link
                          to={`/activity/${act.id}/exercise/${act.exerciseVersionId}`}
                          className="btn-primary"
                          style={{
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            width: '100%',
                            fontSize: '0.8125rem',
                            padding: '0.5rem',
                          }}
                        >
                          Realizar Ejercicio &rarr;
                        </Link>
                      ) : (
                        <span className="badge badge-warning" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                          No disponible ahora
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acceso con Clave Privada */}
          <div className="card" style={{ border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Key size={18} style={{ color: '#475569' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Acceso con Clave Privada
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem', lineHeight: 1.4 }}>
              Si tu profesor te ha proporcionado un código de acceso para un examen o colección privada, ingrésalo aquí:
            </p>

            {claimStatus && (
              <div
                style={{
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  marginBottom: '0.75rem',
                  backgroundColor: claimStatus.isError ? '#fee2e2' : '#dcfce7',
                  color: claimStatus.isError ? '#b91c1c' : '#15803d',
                }}
              >
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
                style={{ textTransform: 'uppercase', marginBottom: '0.75rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
              >
                Desbloquear Colección
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
