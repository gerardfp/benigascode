import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Collection, Exercise, CollectionProgressDTO, ExerciseProgressItem } from '../types';
import { CheckCircle2, Circle, ArrowRight, BarChart2, Search, X, Tag as TagIcon, Check } from 'lucide-react';
import { getTagBadgeStyles, getDeterministicTagColor, getCustomExerciseTagColor } from '../utils/tagColors';
import { matchTag } from '../utils/tagExpression';
import { DifficultyBar, getDifficultyLevel } from '../components/DifficultyBar';

export const CollectionDetailView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [progress, setProgress] = useState<CollectionProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de búsqueda, estado, etiquetas y dificultad
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

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

  // Helper para determinar el estado de un ejercicio
  const getExerciseStatus = (ex: Exercise): 'RESOLVED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
    const ep = getExerciseProgress(ex);
    if (!ep) return 'NOT_STARTED';
    const isResolved = ep.passPercentage >= 100 || ep.status === 'MASTERED' || (ep.status === 'PASSED' && ep.bestScore >= 100);
    if (isResolved) return 'RESOLVED';
    const isAttempted = ep.totalSubmissions > 0 || ep.status === 'ATTEMPTED' || ep.status === 'IN_PROGRESS' || ep.bestScore > 0;
    if (isAttempted) return 'IN_PROGRESS';
    return 'NOT_STARTED';
  };

  // Activar o desactivar etiqueta en los filtros
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // Obtener estilos de color para una etiqueta
  const getTagStyles = (tag: string) => {
    let effectiveColor: string | undefined;
    if (tag.includes(':')) {
      const [cat, ...valParts] = tag.split(':');
      effectiveColor = getDeterministicTagColor(cat, valParts.join(':'));
    } else {
      effectiveColor = getCustomExerciseTagColor(tag) || getDeterministicTagColor(undefined, tag);
    }
    return getTagBadgeStyles(effectiveColor);
  };

  // Lista única de todas las etiquetas presentes en los ejercicios de la colección
  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    exercises.forEach((ex) => {
      if (ex.tags && Array.isArray(ex.tags)) {
        ex.tags.forEach((t) => {
          if (t && t.trim()) {
            const trimmed = t.trim();
            const key = trimmed.toLowerCase();
            if (!map.has(key)) {
              map.set(key, trimmed);
            }
          }
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  // Cantidad de ejercicios asociados a cada etiqueta en esta colección
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    exercises.forEach((ex) => {
      allTags.forEach((tag) => {
        if (matchTag(ex.tags, tag)) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });
    return counts;
  }, [exercises, allTags]);

  // Cantidad de ejercicios según su estado de progreso
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: exercises.length,
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };
    exercises.forEach((ex) => {
      const st = getExerciseStatus(ex);
      counts[st]++;
    });
    return counts;
  }, [exercises, progress]);

  // Cantidad de ejercicios según su nivel de dificultad
  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: exercises.length,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      UNASSIGNED: 0,
    };
    exercises.forEach((ex) => {
      const lvl = getDifficultyLevel(ex.difficulty);
      if (lvl !== null) {
        counts[String(lvl)] = (counts[String(lvl)] || 0) + 1;
      } else {
        counts['UNASSIGNED'] = (counts['UNASSIGNED'] || 0) + 1;
      }
    });
    return counts;
  }, [exercises]);

  // Lista de ejercicios filtrada por búsqueda, estado, etiquetas activas y dificultad
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // 1. Filtro por nombre o slug
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesTitle = ex.title?.toLowerCase().includes(term);
        const matchesSlug = ex.slug?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesSlug) return false;
      }

      // 2. Filtro por estado
      if (statusFilter !== 'ALL') {
        const st = getExerciseStatus(ex);
        if (statusFilter !== st) return false;
      }

      // 3. Filtro por etiquetas activables
      if (selectedTags.size > 0) {
        const matchesAnyTag = Array.from(selectedTags).some((tag) =>
          matchTag(ex.tags, tag)
        );
        if (!matchesAnyTag) return false;
      }

      // 4. Filtro por dificultad
      if (difficultyFilter !== 'ALL') {
        if (difficultyFilter === 'UNASSIGNED') {
          if (ex.difficulty !== null && ex.difficulty !== undefined) return false;
        } else {
          const targetLevel = parseInt(difficultyFilter, 10);
          if (getDifficultyLevel(ex.difficulty) !== targetLevel) return false;
        }
      }

      return true;
    });
  }, [exercises, searchTerm, statusFilter, selectedTags, difficultyFilter, progress]);

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
      <Link
        to="/collections"
        style={{
          color: '#64748b',
          textDecoration: 'none',
          fontSize: '0.875rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginBottom: '0.75rem',
        }}
      >
        &larr; Volver a Colecciones
      </Link>

      {/* Tarjeta única con Cabecera, Progreso, Filtros y Lista de Ejercicios */}
      <div className="card">
        {/* Cabecera y progreso de la colección */}
        <div style={{ marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{collection.title}</h1>
                <span className={`badge ${collection.visibility === 'PUBLIC' ? 'badge-success' : 'badge-neutral'}`}>
                  {collection.visibility === 'PUBLIC' ? '🌐 Colección Pública' : '🔒 Colección Privada'}
                </span>
              </div>
              {collection.description && (
                <p style={{ color: '#64748b', margin: '0.375rem 0 0', fontSize: '0.875rem' }}>
                  {collection.description}
                </p>
              )}
            </div>

            {progress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                <span>
                  Completitud: <strong style={{ color: '#0f172a' }}>{progress.completionPercentage}%</strong>
                </span>
                <span>
                  Puntuación media: <strong style={{ color: '#0f172a' }}>{progress.averageScore} pts</strong>
                </span>
              </div>
            )}
          </div>

          {/* Progreso del alumno */}
          {progress && (
            <div style={{ marginTop: '0.75rem' }}>
              {/* Barra de progreso segmentada */}
              <div
                style={{
                  height: '6px',
                  width: '100%',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  display: 'flex',
                  marginBottom: '0.5rem',
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

              {/* Píldoras de resumen */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#475569', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <strong>{progress.completedExercises}</strong> de {progress.totalExercises} resueltos
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <strong>{progress.attemptedExercises}</strong> en progreso
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
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
                    <BarChart2 size={13} /> Ver todos mis insights &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separador sutil entre cabecera/progreso y ejercicios */}
        <div style={{ borderTop: '1px solid #f1f5f9', margin: '0.875rem 0 0.75rem' }} />

        {/* Barra de Búsqueda por Nombre y Filtro por Estado */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.875rem',
          }}
        >
          {/* Barra para buscar por nombre */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '2.25rem',
                paddingRight: searchTerm ? '2rem' : '0.75rem',
                height: '38px',
                fontSize: '0.875rem',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por estado: (Todos, Sin comenzar, En progreso, Resueltos) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'NOT_STARTED', label: 'Sin comenzar' },
                { id: 'IN_PROGRESS', label: 'En progreso' },
                { id: 'RESOLVED', label: 'Resueltos' },
              ] as const
            ).map((st) => {
              const isSelected = statusFilter === st.id;
              const count = statusCounts[st.id];

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 600 : 500,
                    borderRadius: '9999px',
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isSelected ? '#2563eb' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                  }}
                >
                  <span>{st.label}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '0.0625rem 0.375rem',
                      borderRadius: '9999px',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro por dificultad */}
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="input-field"
              style={{
                height: '34px',
                fontSize: '0.8125rem',
                borderRadius: '9999px',
                padding: '0 0.75rem',
                cursor: 'pointer',
                backgroundColor: difficultyFilter !== 'ALL' ? '#eff6ff' : '#f8fafc',
                borderColor: difficultyFilter !== 'ALL' ? '#2563eb' : '#cbd5e1',
                color: difficultyFilter !== 'ALL' ? '#1d4ed8' : '#475569',
                fontWeight: difficultyFilter !== 'ALL' ? 600 : 500,
              }}
              title="Filtrar por dificultad"
            >
              <option value="ALL">Dificultad: Todas ({difficultyCounts.ALL})</option>
              <option value="1">Nivel 1 (0 – 2) ({difficultyCounts['1']})</option>
              <option value="2">Nivel 2 (2.1 – 4) ({difficultyCounts['2']})</option>
              <option value="3">Nivel 3 (4.1 – 6) ({difficultyCounts['3']})</option>
              <option value="4">Nivel 4 (6.1 – 8) ({difficultyCounts['4']})</option>
              <option value="5">Nivel 5 (8.1 – 10) ({difficultyCounts['5']})</option>
              {difficultyCounts['UNASSIGNED'] > 0 && (
                <option value="UNASSIGNED">Sin dificultad ({difficultyCounts['UNASSIGNED']})</option>
              )}
            </select>
          </div>
        </div>

        {/* Barra con todas las etiquetas presentes en los ejercicios de la colección */}
        {allTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3125rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid #f1f5f9',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3125rem',
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
                marginRight: '0.25rem',
              }}
            >
              <TagIcon size={13} />
              <span>Etiquetas:</span>
            </div>

            {allTags.map((tag) => {
              const isSelected = selectedTags.has(tag);
              const tagStyles = getTagStyles(tag);
              const count = tagCounts[tag] || 0;

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isSelected ? tagStyles.bg : '#ffffff',
                    color: isSelected ? '#0f172a' : '#475569',
                    border: isSelected
                      ? `1.5px solid ${tagStyles.dot}`
                      : '1px solid #cbd5e1',
                    boxShadow: isSelected ? `0 0 0 1px ${tagStyles.dot}20` : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '0.45rem',
                      height: '0.45rem',
                      borderRadius: '50%',
                      backgroundColor: tagStyles.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span>{tag}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: isSelected ? '#0f172a' : '#94a3b8',
                      opacity: 0.85,
                    }}
                  >
                    ({count})
                  </span>
                  {isSelected && <Check size={11} style={{ color: tagStyles.dot, strokeWidth: 2.5 }} />}
                </button>
              );
            })}

            {selectedTags.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTags(new Set())}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                  textDecoration: 'underline',
                }}
              >
                Limpiar etiquetas
              </button>
            )}
          </div>
        )}

        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
            Esta colección no contiene ejercicios disponibles en este momento.
          </div>
        ) : filteredExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem' }}>
              No hay ejercicios que coincidan con los filtros seleccionados.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setSelectedTags(new Set());
              }}
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.625rem' }}
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {filteredExercises.map((ex) => {
              const ep = getExerciseProgress(ex);
              const isResolved = ep && (ep.passPercentage >= 100 || ep.status === 'MASTERED' || (ep.status === 'PASSED' && ep.bestScore >= 100));
              const isAttempted = ep && !isResolved && (ep.totalSubmissions > 0 || ep.status === 'ATTEMPTED' || ep.bestScore > 0);
              const colorConfig = isAttempted ? getScoreColorConfig(ep.passPercentage) : null;
              const originalIndex = exercises.findIndex((e) => e.id === ex.id);

              return (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: isResolved ? '#f3fcf6' : isAttempted ? '#fefaf0' : '#f8fafc',
                    border: `1px solid ${isResolved ? '#bbf7d0' : isAttempted ? '#fed7aa' : '#e2e8f0'}`,
                    borderRadius: '0.5rem',
                    transition: 'border-color 0.15s, background 0.15s',
                    gap: '0.75rem',
                  }}
                >
                  {/* Bloque izquierdo: indicador, número, título y etiquetas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1 }}>
                    {/* Indicador / Checkmark con color dinámico */}
                    <div>
                      {isResolved ? (
                        <div
                          title="Ejercicio resuelto con éxito"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: '#eaf8f0',
                            border: '1.5px solid #19ab5d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#19ab5d',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={16} />
                        </div>
                      ) : isAttempted && colorConfig ? (
                        <div
                          title={`Intentado: ${ep?.testsPassed}/${ep?.totalTests} tests (${Math.round(ep?.passPercentage || 0)}%)`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: colorConfig.bg,
                            border: `1.5px solid ${colorConfig.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colorConfig.iconColor,
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div
                          title="Ejercicio no intentado"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: '1.5px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            flexShrink: 0,
                          }}
                        >
                          <Circle size={12} />
                        </div>
                      )}
                    </div>

                    {/* Información del ejercicio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.8125rem' }}>
                        #{originalIndex >= 0 ? originalIndex + 1 : 1}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                        {ex.title}
                      </h3>

                      <DifficultyBar
                        difficulty={ex.difficulty}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const lvl = getDifficultyLevel(ex.difficulty);
                          if (lvl !== null) {
                            setDifficultyFilter((prev) => (prev === String(lvl) ? 'ALL' : String(lvl)));
                          }
                        }}
                        style={{ cursor: ex.difficulty !== undefined && ex.difficulty !== null ? 'pointer' : 'default' }}
                      />

                      {/* Etiquetas (Tags) redondeadas como el filtro y sin el # */}
                      {ex.tags && ex.tags.length > 0 && ex.tags.map((t) => {
                        const isTagActive = selectedTags.has(t);
                        const tagStyles = getTagStyles(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleTag(t);
                            }}
                            title={`Filtrar por etiqueta: ${t}`}
                            style={{
                              fontSize: '0.6875rem',
                              backgroundColor: isTagActive ? tagStyles.bg : '#ffffff',
                              color: isTagActive ? '#0f172a' : '#475569',
                              border: isTagActive
                                ? `1.5px solid ${tagStyles.dot}`
                                : '1px solid #e2e8f0',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer',
                              fontWeight: isTagActive ? 600 : 500,
                              lineHeight: 1.25,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span
                              style={{
                                width: '0.375rem',
                                height: '0.375rem',
                                borderRadius: '50%',
                                backgroundColor: tagStyles.dot,
                                flexShrink: 0,
                              }}
                            />
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloque derecho: tests y envíos (solo para ejercicios en progreso) y botón Resolver */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    {!isResolved && isAttempted && ep && (ep.totalSubmissions > 0 || ep.totalTests > 0) && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.0625rem' }}>
                        {/* Número de tests */}
                        {ep.totalTests > 0 && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: colorConfig?.text || '#b45309',
                            }}
                          >
                            {ep.testsPassed}/{ep.totalTests} tests{ep.passPercentage !== undefined ? ` (${Math.round(ep.passPercentage)}%)` : ''}
                          </span>
                        )}
                        {/* Número de envíos: "4 envíos" en lugar de "Envíos: 4" */}
                        {ep.totalSubmissions > 0 && (
                          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            {ep.totalSubmissions} {ep.totalSubmissions === 1 ? 'envío' : 'envíos'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Botón Resolver */}
                    <Link
                      to={`/collections/${collectionId}/exercise/${ex.id}`}
                      className="btn-primary"
                      style={{
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.375rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3125rem',
                        backgroundColor: isResolved ? '#0f172a' : '#2563eb',
                      }}
                    >
                      {isResolved ? 'Ver Solución' : isAttempted ? 'Continuar' : 'Resolver'}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
