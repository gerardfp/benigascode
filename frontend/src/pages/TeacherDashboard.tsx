import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Activity, Collection } from '../types';

export const TeacherDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [syncStatus, setSyncStatus] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ rawKey: string } | null>(null);
  const [selectedColId, setSelectedColId] = useState<string>('');

  const loadData = async () => {
    try {
      const [crs, acts, cols, syncs] = await Promise.all([
        api.listCourses(),
        api.listActivities(),
        api.getMyCollections(),
        api.getSyncStatus(),
      ]);
      setCourses(crs);
      setActivities(acts);
      setCollections(cols);
      setSyncStatus(syncs);
      if (cols.length > 0 && !selectedColId) {
        setSelectedColId(cols[0].id);
      }
    } catch (e) {
      console.error('Error al cargar datos de profesor:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.syncContent();
      await loadData();
      alert('Sincronización de contenidos completada.');
    } catch (err: any) {
      alert('Error al sincronizar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!selectedColId) return;
    try {
      const res = await api.generateAccessKey(selectedColId, 30);
      setNewKeyResult(res);
    } catch (err: any) {
      alert('Error al generar clave: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Panel de Administración Docente</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Gestión de cursos, actividades, sincronización y claves de acceso</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSync} disabled={isSyncing} className="btn-primary">
            {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar desde Git'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Cursos y Actividades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem' }}>Mis Cursos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {courses.map((c) => (
                <div key={c.id} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.375rem' }}>
                  <span className="badge badge-info" style={{ marginBottom: '0.25rem' }}>{c.code}</span>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{c.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Curso {c.academicYear}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem' }}>Actividades Publicadas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activities.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-neutral">{a.type}</span>
                      <strong>{a.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Ejercicio: {a.exerciseTitle} • Intentos máx: {a.maxAttempts ?? 'Ilimitados'}
                    </div>
                  </div>
                  <Link to={`/teacher/courses/${a.courseId}/submissions`} className="btn-secondary" style={{ fontSize: '0.8125rem', textDecoration: 'none' }}>
                    Ver Entregas
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Lateral: Claves de Acceso y Estado Git */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Generar Clave de Colección</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
              Crea una clave temporal para dar acceso a los alumnos a una colección privada.
            </p>

            <select
              className="input-field"
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              style={{ marginBottom: '0.75rem' }}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.slug})</option>
              ))}
            </select>

            <button onClick={handleGenerateKey} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Generar Nueva Clave
            </button>

            {newKeyResult && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>CLAVE GENERADA:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', letterSpacing: '0.05em', margin: '0.25rem 0' }}>
                  {newKeyResult.rawKey}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#4ade80' }}>Cópiala ahora; se guarda como hash seguro.</div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Historial Sincronizaciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              {syncStatus.slice(0, 5).map((s) => (
                <div key={s.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={`badge ${s.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span>
                    <span style={{ color: '#64748b' }}>{new Date(s.startedAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Commit: {s.gitCommit ? s.gitCommit.substring(0, 7) : 'local'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

