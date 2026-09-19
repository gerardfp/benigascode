import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { TeacherInsightsDTO, Course, Group, TeachingSpace } from '../types';
import { 
  Users, BarChart2, Calendar, TrendingUp, AlertTriangle, 
  User, Layers, Tag, Eye 
} from 'lucide-react';

export const TeacherInsightsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'GROUP' | 'STUDENT'>('GENERAL');
  const [data, setData] = useState<TeacherInsightsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de navegación
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Cargar espacios y cursos al montar
  useEffect(() => {
    Promise.all([api.listSpaces(), api.listCourses()])
      .then(([spData, crsData]) => {
        setSpaces(spData);
        setCourses(crsData);
        if (spData.length > 0) {
          setSelectedSpaceId(spData[0].id);
        } else if (crsData.length > 0) {
          setSelectedCourseId(crsData[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Cargar grupos cuando cambia el curso
  useEffect(() => {
    if (!selectedCourseId) return;
    api.listGroups(selectedCourseId)
      .then((grps) => {
        setGroups(grps);
        if (grps.length > 0 && activeTab === 'GROUP' && !selectedGroupId) {
          setSelectedGroupId(grps[0].id);
        }
      })
      .catch(console.error);
  }, [selectedCourseId, activeTab]);

  // Cargar datos según la pestaña y filtros seleccionados
  const loadInsights = () => {
    setLoading(true);
    setError(null);

    const params: { spaceId?: string; courseId?: string; groupId?: string; studentId?: string } = {};

    const targetSpace = selectedSpaceId || selectedCourseId;
    if (activeTab === 'GROUP' && selectedGroupId) {
      params.groupId = selectedGroupId;
      if (targetSpace) params.spaceId = targetSpace;
    } else if (activeTab === 'STUDENT' && selectedStudentId) {
      params.studentId = selectedStudentId;
    } else if (activeTab === 'GENERAL' && targetSpace) {
      params.spaceId = targetSpace;
    }

    api.getTeacherInsights(params)
      .then((res) => {
        setData(res);
        // Si no hay alumno seleccionado en modo STUDENT pero hay lista, seleccionar el primero
        if (activeTab === 'STUDENT' && !selectedStudentId && res.students && res.students.length > 0) {
          setSelectedStudentId(res.students[0].studentId);
        }
      })
      .catch((err) => setError(err.message || 'Error al cargar analítica del profesor'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInsights();
  }, [activeTab, selectedSpaceId, selectedCourseId, selectedGroupId, selectedStudentId]);

  // Manejar salto a la vista individual desde la tabla
  const handleViewStudentDetail = (stId: string) => {
    setSelectedStudentId(stId);
    setActiveTab('STUDENT');
  };

  const maxTimeline = Math.max(1, ...(data?.activityTimeline ? data.activityTimeline.map(d => d.submissionsCount) : [1]));

  return (
    <div className="app-container">

      {/* Selector de Pestañas de Vista */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('GENERAL')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'GENERAL' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'GENERAL' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <TrendingUp size={16} /> Visión General
        </button>

        <button
          onClick={() => setActiveTab('GROUP')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'GROUP' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'GROUP' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Users size={16} /> Por Grupo (Clase)
        </button>

        <button
          onClick={() => setActiveTab('STUDENT')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'STUDENT' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'STUDENT' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <User size={16} /> Individual (Por Alumno)
        </button>
      </div>

      {/* Barra de Filtros según la Pestaña Activa */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Selector de Espacio Docente */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
            Espacio Docente
          </label>
          <select
            className="input-field"
            value={selectedSpaceId || selectedCourseId}
            onChange={(e) => {
              setSelectedSpaceId(e.target.value);
              setSelectedCourseId(e.target.value);
            }}
            style={{ fontSize: '0.8125rem', height: '36px', minWidth: '240px' }}
          >
            {spaces.length > 0 ? (
              spaces.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))
            )}
          </select>
        </div>

        {/* Selector de Grupo si tab === GROUP */}
        {activeTab === 'GROUP' && (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Grupo / Clase
            </label>
            <select
              className="input-field"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              style={{ fontSize: '0.8125rem', height: '36px', minWidth: '180px' }}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Selector de Alumno si tab === STUDENT */}
        {activeTab === 'STUDENT' && (
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Seleccionar Alumno
            </label>
            <select
              className="input-field"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{ fontSize: '0.8125rem', height: '36px', width: '100%' }}
            >
              {data?.students && data.students.map((st) => (
                <option key={st.studentId} value={st.studentId}>
                  {st.studentName} ({st.groupName}) — {st.studentEmail}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Cargando analítica...
        </div>
      ) : error || !data ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          {error || 'Error al cargar métricas'}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* PESTAÑA 1: VISIÓN GENERAL */}
          {/* ========================================================================= */}
          {activeTab === 'GENERAL' && (
            <div>
              {/* Tarjetas KPI Globales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #3b82f6', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Alumnos Activos</div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e3a8a', marginTop: '0.25rem' }}>{data.totalStudents}</div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>En cursos asignados</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #8b5cf6', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Envíos Totales</div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#5b21b6', marginTop: '0.25rem' }}>{data.totalSubmissions}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Evaluados en sandbox Java 26</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #10b981', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tasa de Éxito Global</div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#065f46', marginTop: '0.25rem' }}>{data.overallPassRate}%</div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{data.totalExercisesSolved} ejercicios superados</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Nota Media General</div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#92400e', marginTop: '0.25rem' }}>{data.overallAverageScore}</div>
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Promedio de calificaciones</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #06b6d4', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Mediana y Percentiles</div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#155e75', marginTop: '0.25rem' }}>
                    {data.medianScore ?? data.overallAverageScore}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#06b6d4' }}>
                    {data.percentiles ? `P25: ${data.percentiles['p25']} • P75: ${data.percentiles['p75']} • P90: ${data.percentiles['p90']}` : 'Mediana estadística'}
                  </div>
                </div>
              </div>

              {/* Fila 2: Distribución de Notas y Actividad Temporal */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Distribución de Notas */}
                <div className="card">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={18} style={{ color: '#2563eb' }} />
                    Distribución de Calificaciones
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(data.scoreDistribution).map(([range, count]) => {
                      const total = Math.max(1, data.totalSubmissions);
                      const pct = Math.round((count / total) * 100);
                      const barColor = range === '90-100%' ? '#10b981' : range === '70-89%' ? '#3b82f6' : range === '50-69%' ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={range}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>Rango {range}</span>
                            <span style={{ color: '#64748b' }}>{count} entregas ({pct}%)</span>
                          </div>
                          <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actividad Temporal */}
                <div className="card">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} style={{ color: '#2563eb' }} />
                    Actividad en Plataforma (Últimos 30 días)
                  </h3>
                  <div style={{ height: 130, display: 'flex', alignItems: 'flex-end', gap: '2px', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    {data.activityTimeline.map((item) => {
                      const h = Math.round((item.submissionsCount / maxTimeline) * 105);
                      return (
                        <div
                          key={item.date}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                          title={`${item.date}: ${item.submissionsCount} envíos (${item.passedCount} aprobados)`}
                        >
                          <div
                            style={{
                              width: '100%',
                              minHeight: item.submissionsCount > 0 ? 4 : 1,
                              height: `${h}px`,
                              backgroundColor: item.passedCount > 0 ? '#10b981' : item.submissionsCount > 0 ? '#3b82f6' : '#e2e8f0',
                              borderRadius: '2px 2px 0 0',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    <span>Hace 30 días</span>
                    <span>Hoy</span>
                  </div>
                </div>
              </div>

              {/* Fila 3: Ejercicios con Mayor Dificultad (Cuellos de Botella) */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                  Ejercicios con Mayor Dificultad (Detección de Dudas y Cuellos de Botella)
                </h3>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                  Ejercicios con menor tasa de aprobación respecto al volumen de entregas realizadas
                </p>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Ejercicio</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Total Envíos</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Aprobados</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Tasa de Aprobación</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Nivel de Dificultad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.difficultExercises.map((ex) => (
                        <tr key={ex.exerciseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{ex.title}</td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>{ex.totalSubmissions}</td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>{ex.passedSubmissions}</td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <span style={{
                              fontWeight: 700,
                              color: ex.passRate >= 70 ? '#10b981' : ex.passRate >= 40 ? '#f59e0b' : '#ef4444'
                            }}>
                              {ex.passRate}%
                            </span>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <span className={`badge ${ex.passRate < 40 ? 'badge-danger' : ex.passRate < 70 ? 'badge-warning' : 'badge-success'}`}>
                              {ex.passRate < 40 ? 'Alta Dificultad' : ex.passRate < 70 ? 'Media' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fila 4: Resumen de Grupos */}
              <div className="card">
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: '#2563eb' }} />
                  Comparativa de Grupos de Clase
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {data.groups.map((grp) => (
                    <div
                      key={grp.groupId}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedGroupId(grp.groupId);
                        setActiveTab('GROUP');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                          {grp.groupName}
                        </h4>
                        <span className="badge badge-info">{grp.courseName}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', color: '#475569' }}>
                        <div>Alumnos matriculados: <strong>{grp.studentCount}</strong></div>
                        <div>Total entregas: <strong>{grp.totalSubmissions}</strong></div>
                        <div>Nota media: <strong>{grp.averageScore} pts</strong></div>
                        <div>Tasa de resolución: <strong>{grp.passRate}%</strong></div>
                      </div>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#2563eb', fontWeight: 600 }}>
                        Ver detalle del grupo &rarr;
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PESTAÑA 2: POR GRUPO (CLASE) */}
          {/* ========================================================================= */}
          {activeTab === 'GROUP' && (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Alumnado de {data.groupName || 'Grupo Seleccionado'} ({data.students.length} estudiantes)
                </h3>
              </div>

              <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '0.75rem' }}>Alumno</th>
                      <th style={{ padding: '0.75rem' }}>Email</th>
                      <th style={{ padding: '0.75rem' }}>Resueltos</th>
                      <th style={{ padding: '0.75rem' }}>En Progreso</th>
                      <th style={{ padding: '0.75rem' }}>Nota Media</th>
                      <th style={{ padding: '0.75rem' }}>Entregas</th>
                      <th style={{ padding: '0.75rem' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No hay alumnos matriculados en este grupo.
                        </td>
                      </tr>
                    ) : (
                      data.students.map((st) => (
                        <tr key={st.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{st.studentName}</td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>{st.studentEmail}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {st.exercisesSolved}</span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚡ {st.exercisesAttempted}</span>
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{st.averageScore} pts</td>
                          <td style={{ padding: '0.75rem' }}>{st.totalSubmissions}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <button
                              onClick={() => handleViewStudentDetail(st.studentId)}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Eye size={12} /> Ver Insights
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PESTAÑA 3: INDIVIDUAL (POR ALUMNO) */}
          {/* ========================================================================= */}
          {activeTab === 'STUDENT' && data.studentDetail && (
            <div>
              {/* Tarjeta de Perfil del Alumno */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
                    {data.studentName ? data.studentName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {data.studentName}
                    </h2>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.125rem' }}>
                      Curso: <strong>{data.courseName}</strong> • Grupo: <strong>{data.groupName}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{data.studentDetail.completedExercises}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Resueltos</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{data.studentDetail.attemptedExercises}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>En progreso</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{data.studentDetail.averageScore}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Nota media</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{data.studentDetail.totalSubmissions}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Entregas</div>
                  </div>
                </div>
              </div>

              {/* Progreso por Colecciones y Tags del Alumno */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} style={{ color: '#2563eb' }} />
                    Colecciones del Alumno
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.studentDetail.collections.map((col) => (
                      <div key={col.collectionId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{col.title}</span>
                          <span style={{ color: '#64748b' }}>{col.completedExercises} / {col.totalExercises} ({col.completionPercentage}%)</span>
                        </div>
                        <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${col.completionPercentage}%`, backgroundColor: '#2563eb', height: '100%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={18} style={{ color: '#2563eb' }} />
                    Temas y Competencias del Alumno
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.studentDetail.tags.slice(0, 6).map((t) => (
                      <div key={t.tag}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>#{t.tag}</span>
                          <span style={{ color: '#64748b' }}>{t.completedExercises} / {t.totalExercises} ({t.completionPercentage}%)</span>
                        </div>
                        <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${t.completionPercentage}%`, backgroundColor: t.completionPercentage >= 70 ? '#10b981' : '#f59e0b', height: '100%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista Detallada de Ejercicios del Alumno */}
              <div className="card">
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem' }}>
                  Detalle de Ejercicios del Alumno ({data.studentDetail.exercises.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data.studentDetail.exercises.map((ex) => {
                    const isResolved = ex.passPercentage >= 100;
                    const isAttempted = !isResolved && ex.totalSubmissions > 0;
                    return (
                      <div
                        key={ex.exerciseId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #e2e8f0',
                          backgroundColor: isResolved ? '#f8fdfa' : isAttempted ? '#fffefc' : '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isResolved ? (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                          ) : isAttempted ? (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚡</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>○</span>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ex.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Colección: {ex.collectionTitle} • Envíos: {ex.totalSubmissions}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isResolved ? (
                            <span className="badge badge-success">✓ 100% Superado</span>
                          ) : isAttempted ? (
                            <span className="badge badge-warning">
                              ✓ {ex.totalTests > 0 ? `${ex.testsPassed}/${ex.totalTests} tests` : ''} ({Math.round(ex.passPercentage)}%)
                            </span>
                          ) : (
                            <span className="badge badge-neutral">Sin comenzar</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
