import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { AuthorizedTeacherDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { Shield } from 'lucide-react';

export const TeacherManagementView: React.FC = () => {
  const [teachers, setTeachers] = useState<AuthorizedTeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sorting
  type TeacherSortKey = 'teacher' | 'registered' | 'notes' | 'authorizedBy';
  const [sortKey, setSortKey] = useState<TeacherSortKey>('teacher');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: TeacherSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'teacher') {
        const nameA = a.fullName || a.githubUsername || '';
        const nameB = b.fullName || b.githubUsername || '';
        cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'registered') {
        cmp = (a.registered === b.registered) ? 0 : a.registered ? -1 : 1;
      } else if (sortKey === 'notes') {
        cmp = (a.notes || '').localeCompare(b.notes || '', undefined, { sensitivity: 'base' });
      } else if (sortKey === 'authorizedBy') {
        cmp = (a.createdByName || '').localeCompare(b.createdByName || '', undefined, { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [teachers, sortKey, sortDir]);

  const loadTeachers = async () => {
    try {
      const list = await api.listAuthorizedTeachers();
      setTeachers(list);
    } catch (err: any) {
      console.error('Error al cargar profesores:', err);
      setError(err.message || 'Error al cargar la lista de profesores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = githubUsername.trim().replace(/^@/, '');
    if (!cleanUser) {
      setError('Introduce un nombre de usuario de GitHub válido');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const added = await api.addAuthorizedTeacher(cleanUser, notes.trim() || undefined);
      setSuccessMsg(`Profesor @${added.githubUsername} autorizado correctamente.`);
      setGithubUsername('');
      setNotes('');
      await loadTeachers();
    } catch (err: any) {
      setError(err.message || 'Error al autorizar profesor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (t: AuthorizedTeacherDTO) => {
    if (!t.id) return;
    if (!window.confirm(`¿Seguro que deseas revocar la autorización de profesor a @${t.githubUsername}?`)) {
      return;
    }

    try {
      await api.removeAuthorizedTeacher(t.id);
      setSuccessMsg(`Autorización de @${t.githubUsername} revocada.`);
      await loadTeachers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar profesor');
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando profesores autorizados...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: 1200 }}>
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
          Gestión de Profesores
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
          Configura las cuentas de GitHub con permisos docentes en Benigascode
        </p>
      </div>

      {/* Explicación del funcionamiento */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>ℹ️ Acceso docente con GitHub</div>
        <div>
          Cualquier usuario de GitHub añadido a esta lista podrá iniciar sesión directamente desde la pantalla de login pulsando <strong>"Continuar con GitHub"</strong> y se le asignará automáticamente el rol de <strong>Profesor</strong>.
          Los alumnos, en cambio, deben registrarse mediante sus <strong>claves de invitación</strong>.
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={24} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Profesores
          </h1>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          marginBottom: '1.25rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          color: '#166534',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          border: '1px solid #bbf7d0'
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Formulario para añadir profesor */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0 0 1rem' }}>
          + Autorizar Nuevo Profesor (GitHub)
        </h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem', color: '#475569' }}>
              Usuario de GitHub *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>@</span>
              <input
                type="text"
                required
                className="input-field"
                style={{ paddingLeft: '2rem' }}
                placeholder="ej. octocat"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: '2 1 300px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem', color: '#475569' }}>
              Notas / Nombre / Departamento
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="ej. Profesor de Programación DAM"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
          >
            {submitting ? 'Añadiendo...' : '+ Autorizar Profesor'}
          </button>
        </form>
      </div>

      {/* Listado de profesores autorizados */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
            Profesores Autorizados ({teachers.length})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <SortableHeader
                  label="Profesor"
                  sortKey="teacher"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                />
                <SortableHeader
                  label="Estado de Acceso"
                  sortKey="registered"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                />
                <SortableHeader
                  label="Notas"
                  sortKey="notes"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                />
                <SortableHeader
                  label="Autorizado Por"
                  sortKey="authorizedBy"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                />
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeachers.map((t) => {
                const avatar = t.avatarUrl || `https://github.com/${t.githubUsername}.png?size=80`;
                return (
                  <tr key={t.githubUsername} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={avatar}
                          alt={t.githubUsername}
                          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                          onError={(e) => {
                            // Fallback si la imagen no carga
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {t.fullName || `@${t.githubUsername}`}
                          </div>
                          <a
                            href={`https://github.com/${t.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            @{t.githubUsername} &nearr;
                          </a>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {t.isPrimary && (
                          <span className="badge badge-info" title="Profesor principal inicial del sistema">
                            Profesor Inicial
                          </span>
                        )}
                        {t.registered ? (
                          <span className="badge badge-success">
                            ✓ Activo en Plataforma
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            ⏳ Pendiente de primer login
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.875rem 1.25rem', color: '#64748b' }}>
                      {t.notes || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin notas</span>}
                    </td>

                    <td style={{ padding: '0.875rem 1.25rem', color: '#64748b', fontSize: '0.8125rem' }}>
                      {t.createdByName || 'Sistema'}
                    </td>

                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                      {t.isPrimary ? (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Protegido</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemove(t)}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#b91c1c' }}
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

