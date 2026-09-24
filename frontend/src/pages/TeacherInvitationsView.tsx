import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { InvitationCode, Tag } from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { TagBadge } from '../components/TagBadge';
import { 
  Tag as TagIcon, 
  Plus, 
  X, 
  AlertCircle, 
  Copy, 
  Check 
} from 'lucide-react';

interface TeacherInvitationsProps {
  embedded?: boolean;
}

export const TeacherInvitationsView: React.FC<TeacherInvitationsProps> = ({ embedded = false }) => {
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Asignación de etiquetas para la clave de invitación
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [unassignedTagSearch, setUnassignedTagSearch] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

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

  const loadData = async () => {
    try {
      const [invData, tagData] = await Promise.all([
        api.listTeacherInvitations(),
        api.listTags().catch(() => [] as Tag[])
      ]);
      setInvitations(invData);
      setAvailableTags(tagData);
    } catch (err: any) {
      console.error('Error al cargar invitaciones y etiquetas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tags seleccionados para asignar
  const selectedTags = useMemo(() => {
    return availableTags.filter(t => selectedTagIds.has(t.id));
  }, [availableTags, selectedTagIds]);

  // Tags disponibles no seleccionados con búsqueda
  const unassignedTags = useMemo(() => {
    let list = availableTags.filter(t => !selectedTagIds.has(t.id));
    const q = unassignedTagSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.category.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value));
  }, [availableTags, selectedTagIds, unassignedTagSearch]);

  // Categorías existentes para el datalist
  const existingCategories = useMemo(() => {
    return Array.from(new Set(availableTags.map(t => t.category))).sort();
  }, [availableTags]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleClearTagSelection = () => {
    setSelectedTagIds(new Set());
  };

  const handleCreateAndSelectTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newTagCategory.trim();
    const val = newTagValue.trim();
    if (!cat || !val) return;

    setCreatingTag(true);
    try {
      const tag = await api.createTag({
        category: cat,
        value: val,
        description: newTagDescription.trim() || undefined,
      });
      setAvailableTags(prev => [...prev, tag]);
      setSelectedTagIds(prev => new Set(prev).add(tag.id));
      setNewTagCategory('');
      setNewTagValue('');
      setNewTagDescription('');
    } catch (err: any) {
      alert(err.message || 'Error al crear etiqueta');
    } finally {
      setCreatingTag(false);
    }
  };

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
      await api.createTeacherInvitation(
        cleanCode,
        description.trim() || undefined,
        true,
        selectedTagIds.size > 0 ? Array.from(selectedTagIds) : undefined
      );
      setCode('');
      setDescription('');
      setSelectedTagIds(new Set());
      setShowTagPanel(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear clave de invitación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleTeacherInvitation(id);
      await loadData();
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
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la clave');
    }
  };

  const handleCopy = (codeVal: string, id: string) => {
    navigator.clipboard.writeText(codeVal);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className={embedded ? undefined : "app-container"}>
        <p style={{ color: '#64748b' }}>Cargando claves de invitación...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : "app-container"}>
      {!embedded && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Link to="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; Volver al Panel Docente
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0' }}>
            Claves de Invitación
          </h1>
        </div>
      )}

      {/* Card de Creación Integrada con Panel de Etiquetas */}
      <div className="card" style={{ padding: 0, marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  placeholder="Código *"
                  className="input-field"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', width: 140 }}
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                >
                  🎲 Aleatoria
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowTagPanel(prev => !prev)}
                  className={showTagPanel || selectedTagIds.size > 0 ? "btn-primary" : "btn-secondary"}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8125rem',
                    padding: '0.45rem 0.85rem',
                  }}
                >
                  <TagIcon size={14} />
                  Asignar etiquetas {selectedTagIds.size > 0 ? `(${selectedTagIds.size})` : ''}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                {submitting ? 'Creando...' : 'Crear Clave'}
              </button>
            </div>

            {selectedTags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {selectedTags.map(tag => (
                  <TagBadge
                    key={tag.id}
                    category={tag.category}
                    value={tag.value}
                    color={tag.color}
                    onRemove={() => handleToggleTag(tag.id)}
                  />
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Panel de Asignación de Etiquetas (Integrado en la misma card) */}
        {showTagPanel && (
          <div
            style={{
              borderTop: '1px solid #bfdbfe',
              background: '#ffffff',
            }}
          >
            {/* Cabecera del Marco */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                background: '#eff6ff',
                borderBottom: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ background: '#2563eb', color: '#fff', borderRadius: '0.375rem', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TagIcon size={16} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Asignación de etiquetas para nuevos alumnos
                  </h2>
                  <div style={{ fontSize: '0.8125rem', color: '#1d4ed8' }}>
                    <strong>{selectedTagIds.size} {selectedTagIds.size === 1 ? 'etiqueta seleccionada' : 'etiquetas seleccionadas'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedTagIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTagSelection}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: '#ffffff' }}
                  >
                    Deseleccionar todas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowTagPanel(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: '#ffffff' }}
                >
                  Cerrar panel
                </button>
              </div>
            </div>

            {/* Contenido: 2 Columnas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
                padding: '1.25rem',
              }}
            >
              {/* LADO IZQUIERDO: Etiquetas seleccionadas */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Etiquetas seleccionadas ({selectedTags.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 250, overflowY: 'auto' }}>
                  {selectedTags.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                      Ninguna etiqueta seleccionada
                    </div>
                  ) : (
                    selectedTags.map(tag => (
                      <div
                        key={tag.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          padding: '0.4rem 0.625rem',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                          <TagBadge
                            category={tag.category}
                            value={tag.value}
                            color={tag.color}
                          />
                          {tag.description && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                              ({tag.description})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '0.25rem',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                          title="Quitar de la selección"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LADO DERECHO: Etiquetas disponibles */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Etiquetas disponibles ({unassignedTags.length})
                  </h3>
                </div>

                {availableTags.length > 4 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Buscar etiqueta..."
                      value={unassignedTagSearch}
                      onChange={e => setUnassignedTagSearch(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {unassignedTags.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      {unassignedTagSearch ? 'No se encontraron etiquetas con ese término.' : 'No hay más etiquetas disponibles.'}
                    </div>
                  ) : (
                    unassignedTags.map(tag => (
                      <div
                        key={tag.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          padding: '0.4rem 0.625rem',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                          <TagBadge
                            category={tag.category}
                            value={tag.value}
                            color={tag.color}
                          />
                          {tag.description && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                              ({tag.description})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '0.25rem',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                          }}
                          title="Añadir a la selección"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* PARTE INFERIOR: Formulario para crear etiqueta */}
            <div
              style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '0.875rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Crear nueva etiqueta
              </div>
              <form
                onSubmit={handleCreateAndSelectTag}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 140, flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                    Categoría *
                  </label>
                  <input
                    type="text"
                    list="invitation-tag-categories"
                    placeholder="ej. group, año..."
                    value={newTagCategory}
                    onChange={e => setNewTagCategory(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                    required
                  />
                  <datalist id="invitation-tag-categories">
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div style={{ minWidth: 160, flex: 1.5 }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                    Valor *
                  </label>
                  <input
                    type="text"
                    placeholder="ej. DAM2, 2026-2027..."
                    value={newTagValue}
                    onChange={e => setNewTagValue(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                    required
                  />
                </div>

                <div style={{ minWidth: 160, flex: 1.5 }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Grupo de refuerzo"
                    value={newTagDescription}
                    onChange={e => setNewTagDescription(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTag || !newTagCategory.trim() || !newTagValue.trim()}
                  className="btn-primary"
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.45rem 1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} />
                  {creatingTag ? 'Creando...' : 'Crear y seleccionar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de invitaciones */}
      {invitations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>No hay claves de invitación creadas todavía.</p>
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
                  <th style={{ padding: '0.875rem 1rem' }}>Etiquetas</th>
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
                          style={{
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Copiar código al portapapeles"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <Check size={12} style={{ color: '#16a34a' }} />
                              <span style={{ color: '#16a34a' }}>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: inv.description ? '#1e293b' : '#94a3b8' }}>
                      {inv.description || '-'}
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      {inv.tags && inv.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {inv.tags.map(t => (
                            <TagBadge
                              key={t.id}
                              category={t.category}
                              value={t.value}
                              color={t.color}
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
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
