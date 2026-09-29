import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StudentInsightsDTO } from '../types';
import { Tag, Layers, Calendar, Sparkles } from 'lucide-react';
import { ExerciseStackedAreaChart } from '../components/ExerciseStackedAreaChart';

export const StudentInsightsView: React.FC = () => {
  const [data, setData] = useState<StudentInsightsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyInsights()
      .then(setData)
      .catch((err) => setError(err.message || 'Error al cargar tus insights'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando analítica y estadísticas...</p>
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

  // Max valor de actividad temporal para escalar gráfico de barras
  const maxDaily = Math.max(1, ...data.activityTimeline.map(d => d.submissionsCount));

  return (
    <div className="app-container">
      {/* Cabecera Principal */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={22} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Mi Progreso e Insights
          </h1>
        </div>
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

      {/* Sección de Gráficos: Evolución de Ejercicios y Progreso por Colección */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Gráfico 1: Stacked Area Chart de Estado de Ejercicios */}
        <div className="card">
          <ExerciseStackedAreaChart
            timeline={data.exerciseTimeline || []}
            memberSince={data.memberSince}
          />
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
        {/* Gráfico 3: Dominio por Temas y Etiquetas */}
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
    </div>
  );
};
