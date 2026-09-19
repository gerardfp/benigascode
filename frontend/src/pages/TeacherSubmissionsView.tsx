import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { TeacherSubmissionItem, TeacherSubmissionDetail, Course, Group, TeachingSpace } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { Inbox, RotateCw } from 'lucide-react';

type GroupingMode = 'flat' | 'student' | 'exercise' | 'status';

export const TeacherSubmissionsView: React.FC = () => {
  const [submissions, setSubmissions] = useState<TeacherSubmissionItem[]>([]);
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  type SubmissionSortKey = 'createdAt' | 'studentName' | 'groupName' | 'exerciseTitle' | 'attemptNumber' | 'status' | 'tests';
  const [sortKey, setSortKey] = useState<SubmissionSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SubmissionSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'createdAt') {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        cmp = tA - tB;
      } else if (sortKey === 'studentName') {
        cmp = (a.studentName || '').localeCompare(b.studentName || '', undefined, { sensitivity: 'base' });
      } else if (sortKey === 'groupName') {
        cmp = (a.groupName || '').localeCompare(b.groupName || '', undefined, { sensitivity: 'base' });
      } else if (sortKey === 'exerciseTitle') {
        cmp = (a.exerciseTitle || '').localeCompare(b.exerciseTitle || '', undefined, { sensitivity: 'base' });
      } else if (sortKey === 'attemptNumber') {
        cmp = (a.attemptNumber || 0) - (b.attemptNumber || 0);
      } else if (sortKey === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortKey === 'tests') {
        const ratioA = a.totalTests > 0 ? (a.testsPassed || 0) / a.totalTests : 0;
        const ratioB = b.totalTests > 0 ? (b.testsPassed || 0) / b.totalTests : 0;
        cmp = ratioA - ratioB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [submissions, sortKey, sortDir]);

  // Filtros
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('flat');

  // Modal de Detalle
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<TeacherSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'code' | 'evaluation'>('code');
  const [reevaluating, setReevaluating] = useState(false);

  // Cargar espacios y cursos
  useEffect(() => {
    Promise.all([api.listSpaces(), api.listCourses()])
      .then(([spData, crsData]) => {
        setSpaces(spData);
        setCourses(crsData);
      })
      .catch((err) => console.error('Error al cargar espacios y cursos:', err));
  }, []);

  // Cargar grupos cuando cambia el curso
  useEffect(() => {
    if (!selectedCourseId) {
      setGroups([]);
      setSelectedGroupId('');
      return;
    }
    api.listGroups(selectedCourseId)
      .then(setGroups)
      .catch(console.error);
  }, [selectedCourseId]);

  // Cargar envíos según filtros
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTeacherSubmissions({
        spaceId: selectedSpaceId || selectedCourseId || undefined,
        courseId: selectedCourseId || undefined,
        groupId: selectedGroupId || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
      });
      setSubmissions(data);
    } catch (err: any) {
      console.error('Error al cargar envíos:', err);
      setError(err.message || 'Error al obtener los envíos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedSpaceId, selectedCourseId, selectedGroupId, selectedStatus]);

  // Manejar búsqueda con debounce manual o tecla Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchSubmissions();
    }
  };

  // Abrir detalle
  const handleOpenDetail = async (id: string) => {
    setSelectedSubmissionId(id);
    setDetailLoading(true);
    setDetailTab('code');
    try {
      const detail = await api.getTeacherSubmissionDetail(id);
      setSubmissionDetail(detail);
    } catch (err: any) {
      alert('Error al obtener el detalle de la entrega: ' + err.message);
      setSelectedSubmissionId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedSubmissionId(null);
    setSubmissionDetail(null);
  };

  const handleReevaluate = async (id: string) => {
    if (!confirm('¿Reevaluar esta entrega en el runner de ejecución?')) return;
    setReevaluating(true);
    try {
      await api.reevaluate(id, 'MANUAL_TEACHER_RETRY');
      alert('Reevaluación encolada correctamente.');
      if (selectedSubmissionId === id) {
        // Recargar detalle
        const updated = await api.getTeacherSubmissionDetail(id);
        setSubmissionDetail(updated);
      }
      fetchSubmissions();
    } catch (err: any) {
      alert('Error al reevaluar: ' + err.message);
    } finally {
      setReevaluating(false);
    }
  };

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = submissions.length;
    const correct = submissions.filter(s => s.evaluationStatus === 'CORRECT').length;
    const failedTests = submissions.filter(s => s.evaluationStatus === 'INCORRECT').length;
    const compileErrors = submissions.filter(s => s.evaluationStatus === 'COMPILE_ERROR').length;
    const passRate = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, failedTests, compileErrors, passRate };
  }, [submissions]);

  // Agrupaciones
  const groupedByStudent = useMemo(() => {
    const map = new Map<string, { studentName: string; studentEmail: string; groupName: string; items: TeacherSubmissionItem[] }>();
    submissions.forEach(sub => {
      if (!map.has(sub.studentId)) {
        map.set(sub.studentId, {
          studentName: sub.studentName,
          studentEmail: sub.studentEmail,
          groupName: sub.groupName,
          items: [],
        });
      }
      map.get(sub.studentId)!.items.push(sub);
    });
    return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [submissions]);

  const groupedByExercise = useMemo(() => {
    const map = new Map<string, { exerciseTitle: string; exerciseSlug: string; items: TeacherSubmissionItem[] }>();
    submissions.forEach(sub => {
      const key = sub.exerciseId || sub.exerciseTitle;
      if (!map.has(key)) {
        map.set(key, {
          exerciseTitle: sub.exerciseTitle,
          exerciseSlug: sub.exerciseSlug,
          items: [],
        });
      }
      map.get(key)!.items.push(sub);
    });
    return Array.from(map.values()).sort((a, b) => a.exerciseTitle.localeCompare(b.exerciseTitle));
  }, [submissions]);

  const groupedByStatus = useMemo(() => {
    const map = new Map<string, TeacherSubmissionItem[]>();
    submissions.forEach(sub => {
      const st = sub.evaluationStatus || sub.status || 'PENDING';
      if (!map.has(st)) map.set(st, []);
      map.get(st)!.push(sub);
    });
    return Array.from(map.entries());
  }, [submissions]);

  // Badges y estilos
  const getStatusBadge = (evaluationStatus: string, status: string) => {
    const st = evaluationStatus || status;
    switch (st) {
      case 'CORRECT':
        return <span className="badge badge-success">✓ Superado</span>;
      case 'INCORRECT':
        return <span className="badge badge-danger">✗ Tests Fallidos</span>;
      case 'COMPILE_ERROR':
        return <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>⚙ Error Compilación</span>;
      case 'TIMEOUT':
        return <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>⏱ Timeout</span>;
      case 'RUNTIME_ERROR':
        return <span className="badge" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>💥 Runtime Error</span>;
      case 'RUNNING':
      case 'PENDING':
        return <span className="badge badge-info">⏳ {st}</span>;
      default:
        return <span className="badge badge-neutral">{st}</span>;
    }
  };

  const getScoreBadge = (_score: number, passed: number, total: number) => {
    if (total === 0) return <span style={{ color: '#64748b' }}>-</span>;
    const pct = Math.round((passed / total) * 100);
    let color = '#dc2626';
    let bg = '#fee2e2';
    if (pct === 100) {
      color = '#16a34a';
      bg = '#dcfce7';
    } else if (pct >= 75) {
      color = '#65a30d';
      bg = '#ecfccb';
    } else if (pct >= 50) {
      color = '#d97706';
      bg = '#fef3c7';
    } else if (pct >= 25) {
      color = '#ea580c';
      bg = '#ffedd5';
    }

    return (
      <span style={{
        padding: '0.2rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
      }}>
        {passed}/{total} tests ({pct}%)
      </span>
    );
  };

  return (
    <div className="app-container" style={{ paddingBottom: '4rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Inbox size={24} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Envíos
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => fetchSubmissions()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCw size={16} /> Actualizar
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Envíos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Correctos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '0.25rem' }}>
            {stats.correct} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>({stats.passRate}%)</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ea580c', textTransform: 'uppercase' }}>Fallaron Tests</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c2410c', marginTop: '0.25rem' }}>{stats.failedTests}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Error Compilación</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.25rem' }}>{stats.compileErrors}</div>
        </div>
      </div>

      {/* Barra de Filtros y Agrupación */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
              Espacio Docente / Curso
            </label>
            <select
              className="input-field"
              value={selectedSpaceId || selectedCourseId}
              onChange={(e) => {
                setSelectedSpaceId(e.target.value);
                setSelectedCourseId(e.target.value);
              }}
              style={{ width: '100%', fontSize: '0.875rem' }}
            >
              <option value="">Todos los espacios / cursos</option>
              {spaces.length > 0 ? (
                spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))
              )}
            </select>
          </div>

          {groups.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Grupo
              </label>
              <select
                className="input-field"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                style={{ width: '100%', fontSize: '0.875rem' }}
              >
                <option value="">Todos los grupos</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
              Estado
            </label>
            <select
              className="input-field"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', fontSize: '0.875rem' }}
            >
              <option value="">Todos los estados</option>
              <option value="CORRECT">✓ Correctos</option>
              <option value="INCORRECT">✗ Fallaron tests</option>
              <option value="COMPILE_ERROR">⚙ Error compilación</option>
              <option value="TIMEOUT">⏱ Timeout</option>
              <option value="RUNTIME_ERROR">💥 Error ejecución</option>
              <option value="PENDING">⏳ Pendiente / En cola</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
              Buscar alumno o ejercicio
            </label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <input
                type="text"
                placeholder="Nombre, email o ejercicio..."
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
              <button onClick={() => fetchSubmissions()} className="btn-secondary" style={{ padding: '0.375rem 0.6rem' }}>
                🔍
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
              Modo de Agrupación
            </label>
            <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '0.2rem', borderRadius: '0.375rem' }}>
              <button
                onClick={() => setGroupingMode('flat')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: groupingMode === 'flat' ? 700 : 500,
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: groupingMode === 'flat' ? '#ffffff' : 'transparent',
                  color: groupingMode === 'flat' ? '#0f172a' : '#64748b',
                  border: groupingMode === 'flat' ? '1px solid #e2e8f0' : '1px solid transparent',
                }}
              >
                Cronológico
              </button>
              <button
                onClick={() => setGroupingMode('student')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: groupingMode === 'student' ? 700 : 500,
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: groupingMode === 'student' ? '#ffffff' : 'transparent',
                  color: groupingMode === 'student' ? '#0f172a' : '#64748b',
                  border: groupingMode === 'student' ? '1px solid #e2e8f0' : '1px solid transparent',
                }}
              >
                Por Alumno
              </button>
              <button
                onClick={() => setGroupingMode('exercise')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: groupingMode === 'exercise' ? 700 : 500,
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: groupingMode === 'exercise' ? '#ffffff' : 'transparent',
                  color: groupingMode === 'exercise' ? '#0f172a' : '#64748b',
                  border: groupingMode === 'exercise' ? '1px solid #e2e8f0' : '1px solid transparent',
                }}
              >
                Por Ejercicio
              </button>
              <button
                onClick={() => setGroupingMode('status')}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: groupingMode === 'status' ? 700 : 500,
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: groupingMode === 'status' ? '#ffffff' : 'transparent',
                  color: groupingMode === 'status' ? '#0f172a' : '#64748b',
                  border: groupingMode === 'status' ? '1px solid #e2e8f0' : '1px solid transparent',
                }}
              >
                Por Estado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Cargando entregas...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
          <p>{error}</p>
          <button onClick={() => fetchSubmissions()} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
            Reintentar
          </button>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155' }}>No se encontraron envíos con los filtros actuales</p>
          <p style={{ fontSize: '0.875rem' }}>Prueba a seleccionar otro curso, limpiar la búsqueda o cambiar el filtro de estado.</p>
        </div>
      ) : (
        <>
          {/* MODO 1: CRONOLÓGICO / LISTADO PLANO */}
          {groupingMode === 'flat' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <SortableHeader
                        label="Fecha"
                        sortKey="createdAt"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Alumno"
                        sortKey="studentName"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Grupo"
                        sortKey="groupName"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Ejercicio"
                        sortKey="exerciseTitle"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Intento"
                        sortKey="attemptNumber"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        align="center"
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Resultado"
                        sortKey="status"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <SortableHeader
                        label="Tests"
                        sortKey="tests"
                        currentSortKey={sortKey}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                        align="center"
                        style={{ padding: '0.75rem 1rem' }}
                      />
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubmissions.map(sub => (
                      <tr
                        key={sub.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        onClick={() => handleOpenDetail(sub.id)}
                      >
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                          {new Date(sub.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{sub.studentName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub.studentEmail}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            {sub.groupName || 'Sin grupo'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.exerciseTitle}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub.exerciseSlug}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>#{sub.attemptNumber}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {getStatusBadge(sub.evaluationStatus, sub.status)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {getScoreBadge(sub.score, sub.testsPassed, sub.totalTests)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(sub.id)}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                          >
                            Ver Código
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODO 2: AGRUPADO POR ALUMNO */}
          {groupingMode === 'student' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {groupedByStudent.map(group => (
                <div key={group.studentEmail} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{group.studentName}</span>
                      <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>({group.studentEmail})</span>
                      <span className="badge badge-neutral" style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}>{group.groupName}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      <strong>{group.items.length}</strong> envíos registrados
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <tbody>
                        {group.items.map(sub => (
                          <tr
                            key={sub.id}
                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onClick={() => handleOpenDetail(sub.id)}
                          >
                            <td style={{ padding: '0.65rem 1.25rem', color: '#64748b', fontSize: '0.8125rem', width: '180px' }}>
                              {new Date(sub.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                              {sub.exerciseTitle}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '80px', color: '#64748b' }}>
                              #{sub.attemptNumber}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', width: '160px' }}>
                              {getStatusBadge(sub.evaluationStatus, sub.status)}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '140px' }}>
                              {getScoreBadge(sub.score, sub.testsPassed, sub.totalTests)}
                            </td>
                            <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', width: '100px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenDetail(sub.id)}
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                              >
                                Detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODO 3: AGRUPADO POR EJERCICIO */}
          {groupingMode === 'exercise' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {groupedByExercise.map(group => (
                <div key={group.exerciseSlug} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#14532d' }}>{group.exerciseTitle}</span>
                      <span style={{ marginLeft: '0.5rem', color: '#16a34a', fontSize: '0.8125rem' }}>({group.exerciseSlug})</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#15803d' }}>
                      <strong>{group.items.length}</strong> envíos en total
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <tbody>
                        {group.items.map(sub => (
                          <tr
                            key={sub.id}
                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onClick={() => handleOpenDetail(sub.id)}
                          >
                            <td style={{ padding: '0.65rem 1.25rem', color: '#64748b', fontSize: '0.8125rem', width: '180px' }}>
                              {new Date(sub.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                              {sub.studentName}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                              {sub.groupName}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '80px', color: '#64748b' }}>
                              #{sub.attemptNumber}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', width: '160px' }}>
                              {getStatusBadge(sub.evaluationStatus, sub.status)}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '140px' }}>
                              {getScoreBadge(sub.score, sub.testsPassed, sub.totalTests)}
                            </td>
                            <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', width: '100px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenDetail(sub.id)}
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                              >
                                Detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODO 4: AGRUPADO POR ESTADO */}
          {groupingMode === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {groupedByStatus.map(([st, items]) => (
                <div key={st} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getStatusBadge(st, st)}
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>{st}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {items.length} entregas
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <tbody>
                        {items.map(sub => (
                          <tr
                            key={sub.id}
                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onClick={() => handleOpenDetail(sub.id)}
                          >
                            <td style={{ padding: '0.65rem 1.25rem', color: '#64748b', fontSize: '0.8125rem', width: '180px' }}>
                              {new Date(sub.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                              {sub.studentName}
                            </td>
                            <td style={{ padding: '0.65rem 1rem' }}>
                              {sub.exerciseTitle}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '80px', color: '#64748b' }}>
                              #{sub.attemptNumber}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', width: '140px' }}>
                              {getScoreBadge(sub.score, sub.testsPassed, sub.totalTests)}
                            </td>
                            <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', width: '100px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenDetail(sub.id)}
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                              >
                                Detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL DE DETALLE DE ENTREGA */}
      {selectedSubmissionId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5e1',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                    {submissionDetail?.exerciseTitle || 'Cargando detalle...'}
                  </h3>
                  {submissionDetail && getStatusBadge(submissionDetail.evaluation?.status || submissionDetail.status, submissionDetail.status)}
                </div>
                {submissionDetail && (
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Alumno: <strong>{submissionDetail.studentName}</strong> ({submissionDetail.studentEmail}) • Grupo: <strong>{submissionDetail.groupName || 'Sin grupo'}</strong> • Intento #{submissionDetail.attemptNumber}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {submissionDetail && (
                  <button
                    onClick={() => handleReevaluate(submissionDetail.id)}
                    disabled={reevaluating}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    {reevaluating ? 'Reevaluando...' : '⚡ Reevaluar'}
                  </button>
                )}
                <button
                  onClick={handleCloseDetail}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pestañas del Modal */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0 1.5rem' }}>
              <button
                onClick={() => setDetailTab('code')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: detailTab === 'code' ? '2px solid #2563eb' : '2px solid transparent',
                  color: detailTab === 'code' ? '#2563eb' : '#64748b',
                }}
              >
                💻 Código Fuente ({submissionDetail?.language || 'java'})
              </button>
              <button
                onClick={() => setDetailTab('evaluation')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: detailTab === 'evaluation' ? '2px solid #2563eb' : '2px solid transparent',
                  color: detailTab === 'evaluation' ? '#2563eb' : '#64748b',
                }}
              >
                🧪 Resultados de Tests ({submissionDetail?.evaluation?.testResults?.length || 0})
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Cargando código y evaluación...
                </div>
              ) : !submissionDetail ? (
                <div style={{ color: '#dc2626', textAlign: 'center' }}>No se pudo cargar el detalle.</div>
              ) : (
                <>
                  {detailTab === 'code' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Entregado: {new Date(submissionDetail.createdAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(submissionDetail.sourceCode)}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        >
                          Copiar Código
                        </button>
                      </div>
                      <pre style={{
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        overflowX: 'auto',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        lineHeight: 1.5,
                        margin: 0,
                        maxHeight: '480px',
                      }}>
                        <code>{submissionDetail.sourceCode}</code>
                      </pre>
                    </div>
                  )}

                  {detailTab === 'evaluation' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Resumen de Evaluación */}
                      {submissionDetail.evaluation ? (
                        <>
                          <div style={{
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: submissionDetail.evaluation.status === 'CORRECT' ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${submissionDetail.evaluation.status === 'CORRECT' ? '#bbf7d0' : '#fecaca'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: submissionDetail.evaluation.status === 'CORRECT' ? '#15803d' : '#b91c1c' }}>
                                Resultado: {submissionDetail.evaluation.status} (Puntuación: {submissionDetail.evaluation.score}%)
                              </div>
                              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                                Tests superados: {submissionDetail.evaluation.passedTests || 0} de {submissionDetail.evaluation.totalTests || 0}
                                {submissionDetail.evaluation.actualRuntime && ` • Runtime: ${submissionDetail.evaluation.actualRuntime}`}
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(submissionDetail.evaluation.status, submissionDetail.status)}
                            </div>
                          </div>

                          {/* Salida del compilador si hay errores */}
                          {(submissionDetail.evaluation.compileStdout || submissionDetail.evaluation.compileStderr) && (
                            <div className="card" style={{ padding: '0.875rem', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', marginBottom: '0.5rem' }}>
                                ⚙ Salida del Compilador / Ejecución
                              </div>
                              {submissionDetail.evaluation.compileStdout && (
                                <pre style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
                                  {submissionDetail.evaluation.compileStdout}
                                </pre>
                              )}
                              {submissionDetail.evaluation.compileStderr && (
                                <pre style={{ backgroundColor: '#450a0a', color: '#fca5a5', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', overflowX: 'auto', margin: 0 }}>
                                  {submissionDetail.evaluation.compileStderr}
                                </pre>
                              )}
                            </div>
                          )}

                          {/* Lista detallada de casos de prueba */}
                          <div>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                              Detalle de Pruebas Ejecutadas
                            </h4>
                            {(!submissionDetail.evaluation.testResults || submissionDetail.evaluation.testResults.length === 0) ? (
                              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>No se registraron casos de prueba individuales.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {submissionDetail.evaluation.testResults.map((tr, idx) => (
                                  <div
                                    key={tr.id || idx}
                                    style={{
                                      padding: '0.75rem 1rem',
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
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                          ⏱ {tr.durationMs}ms
                                        </span>
                                      </div>
                                      <div>
                                        <span className={`badge ${tr.status === 'PASSED' ? 'badge-success' : 'badge-danger'}`}>
                                          {tr.status}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Si falló, mostrar salida esperada vs obtenida */}
                                    {tr.status !== 'PASSED' && (
                                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
                            )}
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
