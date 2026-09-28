import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { TeachingSpace, TeacherStudent, TeacherSubmissionItem, TeacherSubmissionDetail } from '../types';
import { 
  Play, Pause, RotateCw, Clock,
  ChevronDown, ChevronRight, Eye, Code2, Check, X
} from 'lucide-react';

interface TimeBin {
  start: number;
  end: number;
  label: string;
}

function formatBinLabel(start: number, end: number, intervalMs: number): string {
  const dStart = new Date(start);
  const dEnd = new Date(end);
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (intervalMs < 24 * 3600 * 1000) {
    const timeStart = `${pad(dStart.getHours())}:${pad(dStart.getMinutes())}`;
    const timeEnd = `${pad(dEnd.getHours())}:${pad(dEnd.getMinutes())}`;
    return `${timeStart} - ${timeEnd}`;
  } else {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dayStart = `${dStart.getDate()} ${months[dStart.getMonth()]}`;
    const dayEnd = `${dEnd.getDate()} ${months[dEnd.getMonth()]}`;
    if (dayStart === dayEnd) {
      return dayStart;
    }
    return `${dayStart} - ${dayEnd}`;
  }
}

function computeTimeBins(startTime: number, endTime: number): { bins: TimeBin[]; intervalLabel: string } {
  const durationMs = Math.max(60 * 1000, endTime - startTime);
  const minutes = durationMs / (60 * 1000);
  const hours = minutes / 60;
  const days = hours / 24;

  let intervalMs: number;
  let intervalLabel: string;

  if (minutes <= 15) {
    intervalMs = 60 * 1000; // 1 min
    intervalLabel = '1 min';
  } else if (minutes <= 45) {
    intervalMs = 2 * 60 * 1000; // 2 min
    intervalLabel = '2 min';
  } else if (minutes <= 90) { // ~1 hora
    intervalMs = 5 * 60 * 1000; // 5 min
    intervalLabel = '5 min';
  } else if (hours <= 3) {
    intervalMs = 10 * 60 * 1000; // 10 min
    intervalLabel = '10 min';
  } else if (hours <= 6) {
    intervalMs = 15 * 60 * 1000; // 15 min
    intervalLabel = '15 min';
  } else if (hours <= 12) {
    intervalMs = 30 * 60 * 1000; // 30 min
    intervalLabel = '30 min';
  } else if (hours <= 36) { // ~1 día
    intervalMs = 60 * 60 * 1000; // 1 hora
    intervalLabel = '1 hora';
  } else if (days <= 3) {
    intervalMs = 3 * 3600 * 1000; // 3 horas
    intervalLabel = '3 horas';
  } else if (days <= 7) {
    intervalMs = 6 * 3600 * 1000; // 6 horas
    intervalLabel = '6 horas';
  } else if (days <= 14) {
    intervalMs = 12 * 3600 * 1000; // 12 horas
    intervalLabel = '12 horas';
  } else if (days <= 45) { // ~1 mes
    intervalMs = 24 * 3600 * 1000; // 1 día
    intervalLabel = '1 día';
  } else if (days <= 90) {
    intervalMs = 2 * 24 * 3600 * 1000; // 2 días
    intervalLabel = '2 días';
  } else {
    intervalMs = 7 * 24 * 3600 * 1000; // 1 semana
    intervalLabel = '1 semana';
  }

  const bins: TimeBin[] = [];
  let cur = startTime;
  while (cur < endTime) {
    const next = Math.min(cur + intervalMs, endTime);
    bins.push({
      start: cur,
      end: next,
      label: formatBinLabel(cur, next, intervalMs),
    });
    cur += intervalMs;
  }

  if (bins.length === 0) {
    bins.push({
      start: startTime,
      end: endTime,
      label: formatBinLabel(startTime, endTime, intervalMs),
    });
  }

  return { bins, intervalLabel };
}

function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

function getSubmissionSquareInfo(sub: TeacherSubmissionItem): { bg: string; statusLabel: string } {
  const isCorrect = sub.status === 'CORRECT' || sub.evaluationStatus === 'CORRECT';
  if (isCorrect) {
    return { bg: '#22c55e', statusLabel: 'Superado' };
  }
  const isCompileError = sub.evaluationStatus === 'COMPILE_ERROR' || sub.status === 'COMPILE_ERROR';
  if (isCompileError) {
    return { bg: '#ef4444', statusLabel: 'Error de compilación' };
  }
  if (sub.testsPassed > 0 && sub.totalTests > 0) {
    return { bg: '#eab308', statusLabel: `Parcial (${sub.testsPassed}/${sub.totalTests})` };
  }
  return { bg: '#ef4444', statusLabel: 'Fallido' };
}

export const TeacherLiveView: React.FC = () => {
  // Instante inicial (por defecto hace 1 hora)
  const [initialInstantStr, setInitialInstantStr] = useState<string>(() => {
    const d = new Date(Date.now() - 60 * 60 * 1000);
    return toDateTimeLocalString(d);
  });

  // Filtros
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');

  // Configuración de refresco (segundos)
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Datos
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [submissions, setSubmissions] = useState<TeacherSubmissionItem[]>([]);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'students' | 'feed'>('students');

  // Modal de Detalle de Envío
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<TeacherSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'code' | 'evaluation'>('code');

  const initialInstantMs = useMemo(() => {
    const parsed = new Date(initialInstantStr).getTime();
    return isNaN(parsed) ? Date.now() - 60 * 60 * 1000 : parsed;
  }, [initialInstantStr]);

  // Cargar espacios
  useEffect(() => {
    api.listSpaces()
      .then(setSpaces)
      .catch(console.error);
  }, []);

  // Cargar estudiantes (según espacio o todos)
  useEffect(() => {
    api.listTeacherStudents({ spaceId: selectedSpaceId || undefined })
      .then(setStudents)
      .catch(console.error);
  }, [selectedSpaceId]);

  // Función de carga de envíos en vivo
  const fetchLiveSubmissions = useCallback(async () => {
    setIsFetching(true);
    try {
      const sinceIso = new Date(initialInstantMs).toISOString();
      const subs = await api.getTeacherSubmissions({
        spaceId: selectedSpaceId || undefined,
        since: sinceIso,
      });
      setSubmissions(subs);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error al cargar envíos en vivo:', err);
    } finally {
      setIsFetching(false);
    }
  }, [initialInstantMs, selectedSpaceId]);

  // Cargar al cambiar instante inicial o espacio
  useEffect(() => {
    fetchLiveSubmissions();
    setCountdown(refreshInterval);
  }, [fetchLiveSubmissions, refreshInterval]);

  // Temporizador de refresco periódico
  useEffect(() => {
    if (isPaused || refreshInterval <= 0) return;

    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLiveSubmissions();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [isPaused, refreshInterval, fetchLiveSubmissions]);

  // Cargar detalle de entrega al abrir modal
  useEffect(() => {
    if (!selectedSubmissionId) {
      setSubmissionDetail(null);
      return;
    }
    setDetailLoading(true);
    api.getTeacherSubmissionDetail(selectedSubmissionId)
      .then(setSubmissionDetail)
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selectedSubmissionId]);

  const filteredStudents = students;

  const selectedStudentIds = useMemo(() => {
    return new Set(filteredStudents.map(s => s.id));
  }, [filteredStudents]);

  // Filtrar envíos correspondientes a los estudiantes seleccionados
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => selectedStudentIds.has(s.studentId));
  }, [submissions, selectedStudentIds]);

  // Bins de tiempo calculados dinámicamente entre initialInstant y now
  const nowMs = lastUpdated.getTime();
  const { bins } = useMemo(() => {
    return computeTimeBins(initialInstantMs, Math.max(initialInstantMs + 60000, nowMs));
  }, [initialInstantMs, nowMs]);

  // Agrupar envíos por estudiante y por bin
  const studentMetrics = useMemo(() => {
    const map = new Map<string, {
      total: number;
      passed: number;
      failed: number;
      binsCount: number[];
      binsPassed: number[];
      lastSubmission?: TeacherSubmissionItem;
    }>();

    // Inicializar para todos los alumnos filtrados
    filteredStudents.forEach(st => {
      map.set(st.id, {
        total: 0,
        passed: 0,
        failed: 0,
        binsCount: new Array(bins.length).fill(0),
        binsPassed: new Array(bins.length).fill(0),
      });
    });

    // Rellenar con los envíos
    filteredSubmissions.forEach(sub => {
      const entry = map.get(sub.studentId);
      if (!entry) return;

      const subTime = new Date(sub.createdAt).getTime();
      const isPassed = sub.status === 'CORRECT' || sub.evaluationStatus === 'CORRECT';

      entry.total += 1;
      if (isPassed) entry.passed += 1;
      else entry.failed += 1;

      if (!entry.lastSubmission || new Date(sub.createdAt).getTime() > new Date(entry.lastSubmission.createdAt).getTime()) {
        entry.lastSubmission = sub;
      }

      // Encontrar el bin correspondiente
      for (let i = 0; i < bins.length; i++) {
        if (subTime >= bins[i].start && (subTime < bins[i].end || i === bins.length - 1)) {
          entry.binsCount[i] += 1;
          if (isPassed) entry.binsPassed[i] += 1;
          break;
        }
      }
    });

    return map;
  }, [filteredStudents, filteredSubmissions, bins]);

  // Toggle expansión de estudiante
  const toggleStudentExpand = (id: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Preajustes rápidos de tiempo
  const applyPreset = (minutesAgo: number) => {
    const d = new Date(Date.now() - minutesAgo * 60 * 1000);
    setInitialInstantStr(toDateTimeLocalString(d));
  };

  const getStatusBadge = (evaluationStatus: string, status: string) => {
    const st = evaluationStatus || status;
    switch (st) {
      case 'CORRECT':
        return <span className="badge badge-success">✓ Superado</span>;
      case 'INCORRECT':
        return <span className="badge badge-danger">✗ Fallido</span>;
      case 'COMPILE_ERROR':
        return <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>⚙ Compilación</span>;
      case 'TIMEOUT':
        return <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>⏱ Timeout</span>;
      case 'RUNTIME_ERROR':
        return <span className="badge" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>💥 Runtime</span>;
      case 'RUNNING':
      case 'PENDING':
        return <span className="badge badge-info">⏳ En cola</span>;
      default:
        return <span className="badge badge-neutral">{st}</span>;
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '4rem' }}>
      
      {/* Barra de Controles y Filtros */}
      <div 
        className="card" 
        style={{ 
          padding: '0.5rem 0.875rem', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Izquierda: Instante Inicial y Espacio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* Selector de Instante Inicial */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center' }} title="Desde">
              <Clock size={15} />
            </span>
            <input
              type="datetime-local"
              value={initialInstantStr}
              onChange={(e) => setInitialInstantStr(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.8125rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            />

            {/* Presets rápidos */}
            <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => applyPreset(60)}
                className="btn-secondary"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                title="Última hora"
              >
                1h
              </button>
              <button
                type="button"
                onClick={() => applyPreset(120)}
                className="btn-secondary"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                title="Últimas 2 horas"
              >
                2h
              </button>
              <button
                type="button"
                onClick={() => applyPreset(180)}
                className="btn-secondary"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                title="Últimas 3 horas"
              >
                3h
              </button>
            </div>
          </div>

          {/* Espacio Docente */}
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.8125rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Todos los espacios</option>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector de Vista: Alumnos vs Envíos */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.15rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '0.25rem',
              border: 'none',
              backgroundColor: activeTab === 'students' ? '#ffffff' : 'transparent',
              color: activeTab === 'students' ? '#1e293b' : '#64748b',
              fontWeight: activeTab === 'students' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'students' ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Alumnos ({filteredStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '0.25rem',
              border: 'none',
              backgroundColor: activeTab === 'feed' ? '#ffffff' : 'transparent',
              color: activeTab === 'feed' ? '#1e293b' : '#64748b',
              fontWeight: activeTab === 'feed' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'feed' ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Envíos ({filteredSubmissions.length})
          </button>
        </div>

        {/* Derecha: Configuración de Refresco y Estado En Vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.3rem', 
              padding: '0.2rem 0.45rem',
              borderRadius: '9999px',
              backgroundColor: isPaused ? '#f1f5f9' : '#dcfce7',
              border: `1px solid ${isPaused ? '#cbd5e1' : '#86efac'}`,
              color: isPaused ? '#475569' : '#15803d',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title={isPaused ? 'Pausado' : `Refresco cada ${refreshInterval}s`}
          >
            <span 
              style={{ 
                width: 7, 
                height: 7, 
                borderRadius: '50%', 
                backgroundColor: isPaused ? '#94a3b8' : '#22c55e',
                display: 'inline-block' 
              }} 
            />
            <span>{isPaused ? 'Pausado' : `${countdown}s`}</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Refresco:</span>
            <input
              type="number"
              min="2"
              max="300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Math.max(2, parseInt(e.target.value) || 10))}
              style={{
                width: '42px',
                padding: '0.2rem 0.3rem',
                fontSize: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                textAlign: 'center'
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(prev => !prev)}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.45rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title={isPaused ? "Reanudar refresco automático" : "Pausar refresco automático"}
          >
            {isPaused ? <Play size={14} style={{ color: '#16a34a' }} /> : <Pause size={14} style={{ color: '#b45309' }} />}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchLiveSubmissions();
              setCountdown(refreshInterval);
            }}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.45rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Refrescar datos ahora"
            disabled={isFetching}
          >
            <RotateCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* VISTA 1: Lista de Alumnos con Gráfica de Barras, Mini-Historial y KPIs */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No hay alumnos en el espacio seleccionado.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {filteredStudents.map((st, idx) => {
                const metrics = studentMetrics.get(st.id) || {
                  total: 0,
                  passed: 0,
                  failed: 0,
                  binsCount: new Array(bins.length).fill(0),
                  binsPassed: new Array(bins.length).fill(0),
                };

                const maxBinCount = Math.max(1, ...metrics.binsCount);
                const isExpanded = expandedStudentIds.has(st.id);
                const isLast = idx === filteredStudents.length - 1;

                // Filtrar envíos específicos de este alumno en el período y ordenarlos cronológicamente (antiguos a recientes)
                const stSubmissions = filteredSubmissions.filter(s => s.studentId === st.id);
                const chronoSorted = [...stSubmissions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                const recentSubs = chronoSorted.slice(-10);

                return (
                  <div 
                    key={st.id} 
                    style={{ 
                      borderBottom: isLast && !isExpanded ? 'none' : '1px solid #f1f5f9',
                      padding: '0.5rem 1rem',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Fila principal del alumno con columnas perfectamente alineadas */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        minWidth: '780px',
                      }}
                    >
                      {/* 1. Alumno info (avatar + solo nombre) */}
                      <div 
                        style={{ 
                          width: '200px', 
                          flexShrink: 0, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.625rem',
                          overflow: 'hidden' 
                        }}
                      >
                        {st.avatarUrl ? (
                          <img
                            src={st.avatarUrl}
                            alt={st.fullName}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'A'}
                          </div>
                        )}

                        <div 
                          style={{ 
                            fontWeight: 600, 
                            fontSize: '0.8125rem', 
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={st.fullName || st.username}
                        >
                          {st.fullName || st.username}
                        </div>
                      </div>

                      {/* 2. Gráfica de Barras Dinámica (envíos/tiempo) - Alineada entre alumnos */}
                      <div 
                        style={{ 
                          flex: 1, 
                          minWidth: '220px',
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          padding: '0 0.25rem',
                        }}
                      >
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'flex-end', 
                            height: '28px', 
                            gap: '2px', 
                            paddingBottom: '2px',
                            borderBottom: '1px solid #e2e8f0',
                            position: 'relative',
                          }}
                        >
                          {bins.map((bin, bIdx) => {
                            const count = metrics.binsCount[bIdx] || 0;
                            const passedCount = metrics.binsPassed[bIdx] || 0;
                            const failedCount = count - passedCount;

                            // Altura proporcional
                            const heightPct = count > 0 
                              ? Math.max(15, Math.round((count / maxBinCount) * 100))
                              : 4;

                            // Color según resultado
                            let barColor = '#cbd5e1';
                            if (count > 0) {
                              if (failedCount === 0) {
                                barColor = '#22c55e'; // Todo correcto
                              } else if (passedCount > 0) {
                                barColor = '#3b82f6'; // Mixto
                              } else {
                                barColor = '#ef4444'; // Fallido
                              }
                            }

                            const tooltip = count > 0 
                              ? `${bin.label}: ${count} envío${count !== 1 ? 's' : ''} (${passedCount} superado${passedCount !== 1 ? 's' : ''}, ${failedCount} fallido${failedCount !== 1 ? 's' : ''})`
                              : `${bin.label}: Sin envíos`;

                            return (
                              <div
                                key={bIdx}
                                style={{
                                  flex: 1,
                                  height: `${heightPct}%`,
                                  backgroundColor: barColor,
                                  borderRadius: '2px 2px 0 0',
                                  transition: 'all 0.2s ease',
                                  cursor: count > 0 ? 'pointer' : 'default',
                                  opacity: count > 0 ? 1 : 0.4,
                                }}
                                title={tooltip}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Mini-historial de últimos envíos (hasta 10 cuadrados) */}
                      <div style={{ width: '160px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {recentSubs.length > 0 ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {recentSubs.map((sub, i) => {
                              const { bg, statusLabel } = getSubmissionSquareInfo(sub);
                              const prevSub = recentSubs[i - 1];
                              const nextSub = recentSubs[i + 1];

                              const isSameAsPrev = prevSub && (prevSub.exerciseId ? prevSub.exerciseId === sub.exerciseId : prevSub.exerciseTitle === sub.exerciseTitle);
                              const isSameAsNext = nextSub && (nextSub.exerciseId ? nextSub.exerciseId === sub.exerciseId : nextSub.exerciseTitle === sub.exerciseTitle);

                              let borderRadius = '3px';
                              if (isSameAsPrev && isSameAsNext) borderRadius = '0';
                              else if (!isSameAsPrev && isSameAsNext) borderRadius = '3px 0 0 3px';
                              else if (isSameAsPrev && !isSameAsNext) borderRadius = '0 3px 3px 0';

                              const marginRight = isSameAsNext ? 0 : (i === recentSubs.length - 1 ? 0 : '6px');
                              const borderRight = isSameAsNext ? '1px solid rgba(255, 255, 255, 0.4)' : 'none';

                              const timeStr = new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const tooltip = `${sub.exerciseTitle} · Intento #${sub.attemptNumber} · ${statusLabel} (${sub.testsPassed}/${sub.totalTests}) · ${timeStr}`;

                              return (
                                <div
                                  key={sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubmissionId(sub.id);
                                  }}
                                  title={tooltip}
                                  style={{
                                    width: '13px',
                                    height: '13px',
                                    backgroundColor: bg,
                                    borderRadius,
                                    marginRight,
                                    borderRight,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'transform 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>-</span>
                        )}
                      </div>

                      {/* 4. Pequeños KPI por alumno (solo número verde superados y rojo fallidos) */}
                      <div 
                        style={{ 
                          width: '55px', 
                          flexShrink: 0, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '0.45rem', 
                          fontSize: '0.875rem', 
                          fontWeight: 700 
                        }}
                      >
                        <span style={{ color: '#16a34a' }} title="Superados">{metrics.passed}</span>
                        <span style={{ color: '#dc2626' }} title="Fallidos">{metrics.failed}</span>
                      </div>

                      {/* 5. Botón Desplegar detalles del alumno */}
                      <div style={{ width: '28px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => toggleStudentExpand(st.id)}
                          disabled={metrics.total === 0}
                          className="btn-secondary"
                          style={{ 
                            padding: '0.25rem', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            opacity: metrics.total === 0 ? 0.25 : 1,
                            cursor: metrics.total === 0 ? 'not-allowed' : 'pointer'
                          }}
                          title={isExpanded ? "Ocultar entregas" : "Ver entregas detalladas"}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Panel expandido con todos los envíos del alumno */}
                    {isExpanded && stSubmissions.length > 0 && (
                      <div style={{ marginTop: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {stSubmissions.map((sub) => (
                            <div 
                              key={sub.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.3rem 0.6rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '0.375rem',
                                fontSize: '0.8125rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {sub.exerciseTitle}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {sub.language} · Intento #{sub.attemptNumber}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {getStatusBadge(sub.evaluationStatus, sub.status)}
                                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                  {sub.testsPassed}/{sub.totalTests} tests
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubmissionId(sub.id)}
                                  className="btn-secondary"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                  title="Inspeccionar código y resultados de test"
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* VISTA 2: Feed Cronológico de Envíos en Vivo */}
      {activeTab === 'feed' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No se han registrado envíos de los alumnos seleccionados en este período.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Hora</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Alumno</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Ejercicio</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Lenguaje</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Intento</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Estado</th>
                    <th style={{ padding: '0.6rem 0.875rem' }}>Tests</th>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => (
                    <tr 
                      key={sub.id} 
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                    >
                      <td style={{ padding: '0.6rem 0.875rem', fontFamily: 'monospace', color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {sub.studentName}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', color: '#1e293b' }}>
                        {sub.exerciseTitle}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', color: '#64748b' }}>
                        {sub.language}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', color: '#64748b' }}>
                        #{sub.attemptNumber}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem' }}>
                        {getStatusBadge(sub.evaluationStatus, sub.status)}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', fontWeight: 600 }}>
                        <span style={{ color: sub.testsPassed === sub.totalTests && sub.totalTests > 0 ? '#15803d' : '#475569' }}>
                          {sub.testsPassed}/{sub.totalTests}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionId(sub.id)}
                          className="btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Inspeccionar código y tests"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALLE DE ENVÍO */}
      {selectedSubmissionId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedSubmissionId(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {submissionDetail?.exerciseTitle || 'Detalle del Envío'}
                </h3>
                {submissionDetail && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Alumno: <strong>{submissionDetail.studentName || submissionDetail.studentEmail}</strong> · Intento #{submissionDetail.attemptNumber} · {new Date(submissionDetail.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pestañas del modal: Código / Evaluación */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0 1rem' }}>
              <button
                type="button"
                onClick={() => setDetailTab('code')}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderBottom: detailTab === 'code' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'none',
                  color: detailTab === 'code' ? '#2563eb' : '#64748b',
                  fontWeight: detailTab === 'code' ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Code2 size={15} />
                <span>Código Fuente ({submissionDetail?.language || ''})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('evaluation')}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderBottom: detailTab === 'evaluation' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'none',
                  color: detailTab === 'evaluation' ? '#2563eb' : '#64748b',
                  fontWeight: detailTab === 'evaluation' ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Check size={15} />
                <span>Resultados de Tests</span>
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              {detailLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Cargando detalle del envío...
                </div>
              ) : !submissionDetail ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
                  No se pudo cargar la información del envío.
                </div>
              ) : (
                <>
                  {detailTab === 'code' && (
                    <div>
                      <pre
                        style={{
                          margin: 0,
                          padding: '1rem',
                          backgroundColor: '#1e293b',
                          color: '#f8fafc',
                          borderRadius: '0.5rem',
                          fontSize: '0.8125rem',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          lineHeight: 1.5,
                        }}
                      >
                        {submissionDetail.sourceCode}
                      </pre>
                    </div>
                  )}

                  {detailTab === 'evaluation' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {submissionDetail.evaluation ? (
                        <>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {getStatusBadge(submissionDetail.evaluation.status, submissionDetail.status)}
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              Tests superados: {submissionDetail.evaluation.passedTests ?? 0}/{submissionDetail.evaluation.totalTests ?? 0}
                            </span>
                          </div>

                          {(submissionDetail.evaluation.compileStderr || submissionDetail.evaluation.compileStdout) && (
                            <div>
                              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.8125rem', color: '#475569' }}>Salida de compilación:</h4>
                              <pre style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', margin: 0 }}>
                                {submissionDetail.evaluation.compileStderr || submissionDetail.evaluation.compileStdout}
                              </pre>
                            </div>
                          )}

                          {/* Casos de prueba */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {submissionDetail.evaluation.testResults?.map((tr, idx) => (
                              <div
                                key={tr.id || idx}
                                style={{
                                  padding: '0.6rem 0.875rem',
                                  borderRadius: '0.375rem',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: tr.status === 'PASSED' ? '#f8fafc' : '#fff1f2',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                                      Caso #{idx + 1}
                                    </span>
                                    <span className={`badge ${tr.isPublic ? 'badge-info' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                                      {tr.isPublic ? 'Público' : 'Privado'}
                                    </span>
                                  </div>
                                  <span className={`badge ${tr.status === 'PASSED' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                                    {tr.status}
                                  </span>
                                </div>

                                {tr.status !== 'PASSED' && (
                                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {tr.expectedOutput && (
                                      <div>
                                        <span style={{ color: '#15803d', fontWeight: 600 }}>Esperado: </span>
                                        <code style={{ background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>{tr.expectedOutput}</code>
                                      </div>
                                    )}
                                    {tr.actualOutput && (
                                      <div>
                                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>Obtenido: </span>
                                        <code style={{ background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>{tr.actualOutput}</code>
                                      </div>
                                    )}
                                    {tr.stderr && (
                                      <div style={{ color: '#be123c', fontStyle: 'italic' }}>
                                        Stderr: {tr.stderr}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          Esta entrega aún no ha sido evaluada o se encuentra en cola.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
