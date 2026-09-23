import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { AuthorizedTeacherDTO } from '../types';
import { SortableHeader } from '../components/SortableHeader';

interface TeacherManagementProps {
  embedded?: boolean;
}

export const TeacherManagementView: React.FC<TeacherManagementProps> = ({ embedded = false }) => {
  const [teachers, setTeachers] = useState<AuthorizedTeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState('');
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

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setError('Introduce al menos un profesor para autorizar');
      return;
    }

    const items = lines.map(line => {
      let user = line;
      let note = '';
      if (line.includes(':')) {
        const parts = line.split(':');
        user = parts[0].trim();
        note = parts.slice(1).join(':').trim();
      } else if (line.includes(',')) {
        const parts = line.split(',');
        user = parts[0].trim();
        note = parts.slice(1).join(',').trim();
      }
      user = user.replace(/^@/, '').trim();
      return { githubUsername: user, notes: note || undefined };
    });

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.bulkAddTeachers(items);
      let msg = '';
      if (res.added.length > 0) {
        msg += `${res.added.length} profesor(es) autorizado(s) correctamente. `;
      }
      if (res.skipped.length > 0) {
        msg += `Omitidos (${res.skipped.length} ya autorizados): ${res.skipped.join(', ')}. `;
      }
      if (res.errors.length > 0) {
        setError(res.errors.join(' | '));
      }
      if (msg) {
        setSuccessMsg(msg.trim());
      }
      setBulkText('');
      await loadTeachers();
    } catch (err: any) {
      setError(err.message || 'Error al autorizar profesores');
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
      <div className={embedded ? undefined : "app-container"}>
        <p style={{ color: '#64748b' }}>Cargando profesores autorizados...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : "app-container"}>
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

      {/* Listado de profesores autorizados */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}>
          <form onSubmit={handleBulkAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              rows={3}
              className="input-field"
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
              placeholder={`username:notes (ej: octocat:Profesor de DAM)\notro_usuario`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !bulkText.trim()}
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
              >
                {submitting ? 'Autorizando...' : 'Autorizar Profesores'}
              </button>
            </div>
          </form>
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
                            @{t.githubUsername} ↗
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

