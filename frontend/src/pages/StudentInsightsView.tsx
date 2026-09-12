import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StudentInsightsDTO } from '../types';
import { 
  CheckCircle2, Circle, Tag, 
  Layers, Search, Calendar, TrendingUp, Sparkles 
} from 'lucide-react';

export const StudentInsightsView: React.FC = () => {
  const [data, setData] = useState<StudentInsightsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedCollection, setSelectedCollection] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    api.getMyInsights()
      .then(setData)
      .catch((err) => setError(err.message || 'Error al cargar tus insights'))
      .finally(() => setLoading(false));
  }, []);

  // Ejercicios filtrados
  const filteredExercises = useMemo(() => {
    if (!data || !data.exercises) return [];
    return data.exercises.filter((ex) => {
      // Filtro Colección
      if (selectedCollection !== 'ALL' && ex.collectionId !== selectedCollection) {
        return false;
      }
      // Filtro Tag
      if (selectedTag !== 'ALL' && (!ex.tags || !ex.tags.includes(selectedTag))) {
        return false;
      }
      // Filtro Estado
      if (selectedStatus === 'COMPLETED') {
        const isComp = ex.passPercentage >= 100 || ex.status === 'MASTERED' || (ex.status === 'PASSED' && ex.bestScore >= 100);
        if (!isComp) return false;
      } else if (selectedStatus === 'ATTEMPTED') {
        const isComp = ex.passPercentage >= 100 || ex.status === 'MASTERED' || (ex.status === 'PASSED' && ex.bestScore >= 100);
        const isAtt = !isComp && (ex.totalSubmissions > 0 || ex.status === 'ATTEMPTED' || ex.bestScore > 0);
        if (!isAtt) return false;
      } else if (selectedStatus === 'NOT_STARTED') {
        const isComp = ex.passPercentage >= 100 || ex.status === 'MASTERED' || (ex.status === 'PASSED' && ex.bestScore >= 100);
        const isAtt = !isComp && (ex.totalSubmissions > 0 || ex.status === 'ATTEMPTED' || ex.bestScore > 0);
        if (isComp || isAtt) return false;
      }
      // Búsqueda de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = ex.title.toLowerCase().includes(term);
        const matchSlug = ex.slug.toLowerCase().includes(term);
        const matchTag = ex.tags && ex.tags.some(t => t.toLowerCase().includes(term));
        if (!matchTitle && !matchSlug && !matchTag) return false;
      }
      return true;
    });
  }, [data, selectedCollection, selectedTag, selectedStatus, searchTerm]);

  // Colores dinámicos
  const getScoreColorConfig = (pct: number) => {
    if (pct >= 100) return { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '#059669' };
    if (pct >= 75) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '#15803d' };
    if (pct >= 50) return { bg: '#fefce8', border: '#fde047', text: '#854d0e', icon: '#ca8a04' };
    if (pct >= 25) return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', icon: '#ea580c' };
    return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#dc2626' };
  };

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando analítica y estadísticas de aprendizaje...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#dc2626' }}>Error al cargar insights</h2>
          <p style={{ color: '#64748b' }}>{error || 'No se pudieron recuperar los datos analíticos.'}</p>
        </div>
      </div>
    );
  }

  // Cálculos para el donut chart
  const completedPct = data.totalExercises > 0 ? (data.completedExercises / data.totalExercises) * 100 : 0;
  const attemptedPct = data.totalExercises > 0 ? (data.attemptedExercises / data.totalExercises) * 100 : 0;

  // Max valor de actividad temporal para escalar gráfico
  const maxDaily = Math.max(1, ...data.activityTimeline.map(d => d.submissionsCount));

  return (
    <div className="app-container">
      {/* Cabecera Principal */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Sparkles size={22} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Mi Progreso e Insights
          </h1>
        </div>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9375rem' }}>
          Analítica personalizada de tu aprendizaje, competencias por etiquetas y actividad en el tiempo
        </p>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Ejercicios Resueltos
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#065f46' }}>
              {data.completedExercises}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>de {data.totalExercises}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.25rem' }}>
            {data.completionPercentage}% del catálogo completado
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            En Progreso / Intentados
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#92400e' }}>
              {data.attemptedExercises}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>ejercicios</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
            {data.notStartedExercises} pendientes por comenzar
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Puntuación Media
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e40af' }}>
              {data.averageScore}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>/ 100 pts</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem' }}>
            Promedio global en tus resoluciones
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total de Entregas
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#5b21b6' }}>
              {data.totalSubmissions}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>envíos evaluados</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.25rem' }}>
            En sandbox Java 26 oficial
          </div>
        </div>
      </div>

      {/* Sección de Gráficos: Distribución y Progreso por Colección */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Gráfico 1: Anillo de Distribución de Estado */}
        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
            Distribución del Estado de Ejercicios
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '0.5rem 0' }}>
            {/* SVG Donut */}
            <svg width="150" height="150" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              {/* Resueltos */}
              <circle
                cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="6"
                strokeDasharray={`${completedPct} ${100 - completedPct}`}
                strokeDashoffset="25"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              {/* En progreso */}
              <circle
                cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="6"
                strokeDasharray={`${attemptedPct} ${100 - attemptedPct}`}
                strokeDashoffset={`${25 - completedPct}`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text x="21" y="21" textAnchor="middle" dy=".3em" fontSize="6" fontWeight="bold" fill="#1e293b">
                {Math.round(completedPct)}%
              </text>
            </svg>

            {/* Leyenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Resueltos (100%): <strong>{data.completedExercises}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span>En progreso: <strong>{data.attemptedExercises}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                <span>Pendientes: <strong>{data.notStartedExercises}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Progreso por Colección */}
        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: '#2563eb' }} />
            Progreso por Colección
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.collections.map((col) => (
              <div key={col.collectionId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <Link to={`/collections/${col.collectionId}`} style={{ color: '#1e293b', fontWeight: 600, textDecoration: 'none' }}>
                    {col.title}
                  </Link>
                  <span style={{ color: '#64748b' }}>
                    {col.completedExercises} / {col.totalExercises} ({col.completionPercentage}%)
                  </span>
                </div>
                <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                  <div
                    style={{
                      width: `${col.completionPercentage}%`,
                      backgroundColor: '#2563eb',
                      transition: 'width 0.4s ease',
                    }}
                  />
                  <div
                    style={{
                      width: `${(col.attemptedExercises / Math.max(1, col.totalExercises)) * 100}%`,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección de Gráficos: Competencias por Etiquetas y Actividad Temporal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Gráfico 3: Dominio por Etiquetas (Tags) */}
        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={18} style={{ color: '#2563eb' }} />
            Dominio por Temas y Etiquetas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.tags.slice(0, 7).map((t) => (
              <div key={t.tag}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>#{t.tag}</span>
                  <span style={{ color: '#64748b' }}>
                    {t.completedExercises} de {t.totalExercises} ({t.completionPercentage}%)
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${t.completionPercentage}%`,
                      backgroundColor: t.completionPercentage >= 70 ? '#10b981' : t.completionPercentage >= 30 ? '#3b82f6' : '#f59e0b',
                      height: '100%',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 4: Actividad en los últimos 30 días */}
        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#2563eb' }} />
            Actividad de Envíos (Últimos 30 días)
          </h3>
          <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', gap: '2px', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
            {data.activityTimeline.map((item) => {
              const h = Math.round((item.submissionsCount / maxDaily) * 110);
              const hasActivity = item.submissionsCount > 0;
              return (
                <div
                  key={item.date}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                  title={`${item.date}: ${item.submissionsCount} envíos (${item.passedCount} aprobados)`}
                >
                  <div
                    style={{
                      width: '100%',
                      minHeight: hasActivity ? 4 : 1,
                      height: `${h}px`,
                      backgroundColor: item.passedCount > 0 ? '#10b981' : hasActivity ? '#3b82f6' : '#e2e8f0',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease',
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

      {/* Explorador Interactivo de Ejercicios con Filtros */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              Explorador de Ejercicios y Competencias
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
              Filtra por colección, etiqueta o estado para planificar tus sesiones de estudio
            </p>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Mostrando <strong>{filteredExercises.length}</strong> ejercicios
          </span>
        </div>

        {/* Barra de Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          {/* Búsqueda */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Buscar por título
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Fibonacci, Array..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem', fontSize: '0.8125rem', height: '36px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '0.7rem', color: '#94a3b8' }} />
            </div>
          </div>

          {/* Filtro Colección */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Colección
            </label>
            <select
              className="input-field"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              style={{ fontSize: '0.8125rem', height: '36px' }}
            >
              <option value="ALL">Todas las Colecciones</option>
              {data.collections.map((c) => (
                <option key={c.collectionId} value={c.collectionId}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Filtro Tag */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Etiqueta / Tema
            </label>
            <select
              className="input-field"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ fontSize: '0.8125rem', height: '36px' }}
            >
              <option value="ALL">Todas las Etiquetas</option>
              {data.tags.map((t) => (
                <option key={t.tag} value={t.tag}>#{t.tag} ({t.totalExercises})</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Estado
            </label>
            <select
              className="input-field"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ fontSize: '0.8125rem', height: '36px' }}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="COMPLETED">✓ Resueltos (100%)</option>
              <option value="ATTEMPTED">⚡ En progreso / Intentados</option>
              <option value="NOT_STARTED">○ Sin comenzar</option>
            </select>
          </div>
        </div>

        {/* Lista de Ejercicios Filtrados */}
        {filteredExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            No se han encontrado ejercicios con los filtros seleccionados.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredExercises.map((ex) => {
              const isResolved = ex.passPercentage >= 100 || ex.status === 'MASTERED' || (ex.status === 'PASSED' && ex.bestScore >= 100);
              const isAttempted = !isResolved && (ex.totalSubmissions > 0 || ex.status === 'ATTEMPTED' || ex.bestScore > 0);
              const colorConfig = isAttempted ? getScoreColorConfig(ex.passPercentage) : null;

              return (
                <div
                  key={ex.exerciseId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    backgroundColor: isResolved ? '#f8fdfa' : isAttempted ? '#fffefc' : '#ffffff',
                    border: `1px solid ${isResolved ? '#bbf7d0' : isAttempted ? colorConfig?.border : '#e2e8f0'}`,
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    {/* Indicador */}
                    <div>
                      {isResolved ? (
                        <div
                          title="Resuelto al 100%"
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            backgroundColor: '#dcfce7', border: '1.5px solid #86efac',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d'
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </div>
                      ) : isAttempted && colorConfig ? (
                        <div
                          title={`Tests: ${ex.testsPassed}/${ex.totalTests} (${Math.round(ex.passPercentage)}%)`}
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            backgroundColor: colorConfig.bg, border: `1.5px solid ${colorConfig.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorConfig.icon
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </div>
                      ) : (
                        <div
                          title="Sin comenzar"
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            backgroundColor: '#f1f5f9', border: '1.5px dashed #cbd5e1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                          }}
                        >
                          <Circle size={12} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                          {ex.title}
                        </h4>

                        {isResolved && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.125rem 0.375rem', borderRadius: 999, fontWeight: 600 }}>
                            ✓ 100%
                          </span>
                        )}

                        {isAttempted && colorConfig && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: colorConfig.bg, color: colorConfig.text, border: `1px solid ${colorConfig.border}`, padding: '0.125rem 0.375rem', borderRadius: 999, fontWeight: 600 }}>
                            ✓ {ex.totalTests > 0 ? `${ex.testsPassed}/${ex.totalTests} tests` : ''} ({Math.round(ex.passPercentage)}%)
                          </span>
                        )}

                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          en <strong>{ex.collectionTitle}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {ex.tags && ex.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '0.6875rem',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '0.0625rem 0.375rem',
                              borderRadius: '0.25rem',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                        {ex.totalSubmissions > 0 && (
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            • {ex.totalSubmissions} envíos realizados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/collections/${ex.collectionId}/exercise/${ex.exerciseVersionId}`}
                    className="btn-secondary"
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {isResolved ? 'Revisar' : 'Resolver'} &rarr;
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
