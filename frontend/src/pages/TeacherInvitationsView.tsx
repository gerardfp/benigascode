import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { InvitationCode } from '../types';
import { SortableHeader } from '../components/SortableHeader';

interface TeacherInvitationsProps {
  embedded?: boolean;
}

export const TeacherInvitationsView: React.FC<TeacherInvitationsProps> = ({ embedded = false }) => {
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting
  type InvitationSortKey = 'code' | 'description' | 'active' | 'createdBy' | 'createdAt';
  const [sortKey, setSortKey] = useState<InvitationSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: InvitationSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedInvitations = useMemo(() => {
    return [...invitations].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'code') {
        cmp = a.code.localeCompare(b.code);
      } else if (sortKey === 'description') {
        cmp = (a.description || '').localeCompare(b.description || '', undefined, { sensitivity: 'base' });
      } else if (sortKey === 'active') {
        cmp = (a.active === b.active) ? 0 : a.active ? -1 : 1;
      } else if (sortKey === 'createdBy') {
        const nameA = a.createdByFullName || a.createdByUsername || '';
        const nameB = b.createdByFullName || b.createdByUsername || '';
        cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'createdAt') {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        cmp = tA - tB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invitations, sortKey, sortDir]);

  const loadInvitations = async () => {
    try {
      const data = await api.listTeacherInvitations();
      setInvitations(data);
    } catch (err: any) {
      console.error('Error al cargar invitaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('La clave de invitación no puede estar vacía');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createTeacherInvitation(cleanCode, description.trim() || undefined, true);
      setShowCreateModal(false);
      setCode('');
      setDescription('');
      await loadInvitations();
    } catch (err: any) {
      setError(err.message || 'Error al crear clave de invitación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleTeacherInvitation(id);
      await loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de la clave');
    }
  };

  const handleDelete = async (id: string, codeVal: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la clave de invitación "${codeVal}"?`)) {
      return;
    }

    try {
      await api.deleteTeacherInvitation(id);
      await loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la clave');
    }
  };

  const handleCopy = (codeVal: string, id: string) => {
    navigator.clipboard.writeText(codeVal);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeCount = invitations.filter((i) => i.active).length;

  if (loading) {
    return (
      <div className={embedded ? undefined : "app-container"}>
        <p style={{ color: '#64748b' }}>Cargando claves de invitación...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : "app-container"}>
      {!embedded ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              &larr; Volver al Panel Docente
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
              Claves de Invitación para Alumnos
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
              Genera códigos para que tus alumnos puedan registrarse con su cuenta de GitHub. Puedes desactivar una clave en cualquier momento.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                setCode('');
                setDescription('');
                setError(null);
                setShowCreateModal(true);
              }}
              className="btn-primary"
            >
              + Nueva Clave de Invitación
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
              Claves de Invitación para Registro con GitHub
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.8125rem' }}>
              Genera códigos para que los alumnos se registren ellos mismos mediante su cuenta de GitHub.
            </p>
          </div>
          <button
            onClick={() => {
              setCode('');
              setDescription('');
              setError(null);
              setShowCreateModal(true);
            }}
            className="btn-primary"
            style={{ fontSize: '0.875rem' }}
          >
            + Nueva Clave de Invitación
          </button>
        </div>
      )}

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>🔑</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{activeCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Claves Activas</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>📋</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{invitations.length}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total Generadas</div>
          </div>
        </div>
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' }}>
              Crear Clave de Invitación
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Código de la Clave *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="ej. 123456 o DAM2026"
                    className="input-field"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem' }}
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
                  >
                    🎲 Aleatoria
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Puedes definir un código fácil de recordar (como 123456) o generar uno aleatorio.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Descripción u Objetivo
                </label>
                <input
                  type="text"
                  placeholder="ej. Clase 1º DAM - Curso 2026/2027"
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : 'Crear Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de invitaciones */}
      {invitations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔑</div>
          <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>No hay claves de invitación creadas todavía.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Crear tu primera clave de invitación
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <SortableHeader
                    label="Código"
                    sortKey="code"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1rem' }}
                  />
                  <SortableHeader
                    label="Descripción"
                    sortKey="description"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1rem' }}
                  />
                  <SortableHeader
                    label="Estado"
                    sortKey="active"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1rem' }}
                  />
                  <SortableHeader
                    label="Creado por"
                    sortKey="createdBy"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1rem' }}
                  />
                  <SortableHeader
                    label="Fecha"
                    sortKey="createdAt"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    style={{ padding: '0.875rem 1rem' }}
                  />
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvitations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '1.0625rem',
                          backgroundColor: '#f1f5f9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          color: '#0f172a'
                        }}>
                          {inv.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(inv.code, inv.id)}
                          className="btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                          title="Copiar código al portapapeles"
                        >
                          {copiedId === inv.id ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: inv.description ? '#1e293b' : '#94a3b8' }}>
                      {inv.description || 'Sin descripción'}
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      {inv.active ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16a34a' }} />
                          Activa
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                          Inactiva
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: '#475569', fontSize: '0.8125rem' }}>
                      {inv.createdByFullName || inv.createdByUsername || 'Profesor'}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(inv.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggle(inv.id)}
                          className="btn-secondary"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            color: inv.active ? '#d97706' : '#16a34a',
                            borderColor: inv.active ? '#fcd34d' : '#86efac'
                          }}
                        >
                          {inv.active ? 'Desactivar' : 'Activar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, inv.code)}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

