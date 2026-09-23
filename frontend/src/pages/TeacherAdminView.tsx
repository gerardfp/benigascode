import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { TeacherStudent, BulkCreateStudentItem, CreatedStudentItem, Tag } from '../types';
import { TagBadge } from '../components/TagBadge';
import { TeacherManagementView } from './TeacherManagementView';
import { TeacherInvitationsView } from './TeacherInvitationsView';
import { GitSyncView } from './GitSyncView';
import { SortableHeader } from '../components/SortableHeader';
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  Key, 
  RefreshCw, 
  ShieldCheck, 
  Trash2, 
  Search, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Tag as TagIcon,
  Plus,
  X
} from 'lucide-react';

export const TeacherAdminView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tabs principales: 'accounts' | 'sync'
  const activeTab = (searchParams.get('tab') as 'accounts' | 'sync') || 'accounts';
  // Sub-tabs de cuentas: 'teachers' | 'students'
  const activeSubtab = (searchParams.get('subtab') as 'teachers' | 'students') || 'teachers';
  // Sub-sección de alumnos: 'accounts' | 'invitations'
  const activeStudentSection = (searchParams.get('section') as 'accounts' | 'invitations') || 'accounts';

  const setTab = (tab: 'accounts' | 'sync') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const setSubtab = (subtab: 'teachers' | 'students') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'accounts');
    next.set('subtab', subtab);
    setSearchParams(next);
  };

  const setStudentSection = (section: 'accounts' | 'invitations') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'accounts');
    next.set('subtab', 'students');
    next.set('section', section);
    setSearchParams(next);
  };

  // ==================== GESTIÓN DE ALUMNOS (Cuentas Locales y Listado) ====================
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentSuccess, setStudentSuccess] = useState<string | null>(null);

  // Filtro de búsqueda de alumnos
  const [searchTerm, setSearchTerm] = useState('');

  // Ordenación de alumnos
  type StudentSortKey = 'name' | 'username' | 'access' | 'createdAt';
  const [sortKey, setSortKey] = useState<StudentSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleStudentSort = (key: StudentSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Creación masiva de alumnos (CSV)
  const [bulkStudentText, setBulkStudentText] = useState('');
  const [submittingBulkStudents, setSubmittingBulkStudents] = useState(false);
  const [bulkStudentErrors, setBulkStudentErrors] = useState<string[]>([]);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedStudentItem[] | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Asignación de etiquetas para nuevos alumnos
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [unassignedTagSearch, setUnassignedTagSearch] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Alumno a eliminar
  const [studentToDelete, setStudentToDelete] = useState<TeacherStudent | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setStudentError(null);
    try {
      const [data, tags] = await Promise.all([
        api.listTeacherStudents(),
        api.listTags().catch(() => [] as Tag[])
      ]);
      setStudents(data);
      setAvailableTags(tags);
    } catch (err: any) {
      setStudentError(err.message || 'Error al cargar la lista de alumnos');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'accounts' && activeSubtab === 'students') {
      loadStudents();
    }
  }, [activeTab, activeSubtab]);

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

  const handleBulkCreateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkStudentText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setStudentError('Introduce al menos un alumno para crear');
      return;
    }

    const items: BulkCreateStudentItem[] = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        fullName: parts[0] || '',
        username: parts[1] || undefined,
        password: parts[2] || undefined,
      };
    });

    setSubmittingBulkStudents(true);
    setStudentError(null);
    setStudentSuccess(null);
    setBulkStudentErrors([]);

    try {
      const tagIdsToSend = Array.from(selectedTagIds);
      const res = await api.bulkCreateStudents(items, tagIdsToSend);
      if (res.created.length > 0) {
        const tagMsg = tagIdsToSend.length > 0 ? ` con ${tagIdsToSend.length} etiqueta(s)` : '';
        setStudentSuccess(`${res.created.length} alumno(s) creado(s) correctamente${tagMsg}.`);
        setCreatedCredentials(res.created);
      }
      if (res.errors.length > 0) {
        setBulkStudentErrors(res.errors);
      }
      setBulkStudentText('');
      await loadStudents();
    } catch (err: any) {
      setStudentError(err.message || 'Error al crear alumnos');
    } finally {
      setSubmittingBulkStudents(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials || createdCredentials.length === 0) return;
    const text = createdCredentials
      .map(c => `${c.fullName}\t${c.username}\t${c.password}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      await api.deleteStudentAccount(studentToDelete.id);
      setStudentSuccess(`Cuenta del alumno "${studentToDelete.fullName}" eliminada correctamente.`);
      setStudentToDelete(null);
      await loadStudents();
    } catch (err: any) {
      setStudentError(err.message || 'Error al eliminar la cuenta de alumno');
    } finally {
      setDeletingStudent(false);
    }
  };

  // Lista filtrada y ordenada de alumnos
  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = students;
    if (query) {
      list = list.filter(
        s =>
          s.fullName.toLowerCase().includes(query) ||
          s.username.toLowerCase().includes(query) ||
          (s.githubUsername && s.githubUsername.toLowerCase().includes(query))
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'username') {
        cmp = a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'access') {
        const typeA = a.githubUsername ? 'github' : 'local';
        const typeB = b.githubUsername ? 'github' : 'local';
        cmp = typeA.localeCompare(typeB);
      } else if (sortKey === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, searchTerm, sortKey, sortDir]);

  const totalStudents = students.length;

  return (
    <div className="app-container" style={{ paddingBottom: '3rem' }}>
      {/* Pestañas Principales: Cuentas | Importar / Exportar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setTab('accounts')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'accounts' ? 700 : 500,
            color: activeTab === 'accounts' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'accounts' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'color 0.15s',
          }}
        >
          <Users size={18} />
          Cuentas
        </button>

        <button
          type="button"
          onClick={() => setTab('sync')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'sync' ? 700 : 500,
            color: activeTab === 'sync' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'sync' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'color 0.15s',
          }}
        >
          <RefreshCw size={18} />
          Importar / Exportar
        </button>
      </div>

      {/* ========================================================= */}
      {/* 👥 TAB 1: CUENTAS */}
      {/* ========================================================= */}
      {activeTab === 'accounts' && (
        <div>
          {/* Sub-pestañas: Profesores | Alumnos */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '0.25rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => setSubtab('teachers')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: activeSubtab === 'teachers' ? '#ffffff' : 'transparent',
                color: activeSubtab === 'teachers' ? '#1e293b' : '#64748b',
                fontWeight: activeSubtab === 'teachers' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: activeSubtab === 'teachers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <ShieldCheck size={16} style={{ color: activeSubtab === 'teachers' ? '#2563eb' : '#64748b' }} />
              Profesores
            </button>

            <button
              type="button"
              onClick={() => setSubtab('students')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: activeSubtab === 'students' ? '#ffffff' : 'transparent',
                color: activeSubtab === 'students' ? '#1e293b' : '#64748b',
                fontWeight: activeSubtab === 'students' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: activeSubtab === 'students' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <GraduationCap size={16} style={{ color: activeSubtab === 'students' ? '#2563eb' : '#64748b' }} />
              Alumnos
            </button>
          </div>

          {/* SUBTAB: PROFESORES */}
          {activeSubtab === 'teachers' && (
            <TeacherManagementView embedded={true} />
          )}

          {/* SUBTAB: ALUMNOS */}
          {activeSubtab === 'students' && (
            <div>
              {/* Sub-sección pills: Cuentas Registradas & Alta | Claves de Invitación */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStudentSection('accounts')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    borderColor: activeStudentSection === 'accounts' ? '#2563eb' : '#cbd5e1',
                    background: activeStudentSection === 'accounts' ? '#eff6ff' : '#ffffff',
                    color: activeStudentSection === 'accounts' ? '#1d4ed8' : '#475569',
                    fontWeight: activeStudentSection === 'accounts' ? 600 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  <Users size={15} />
                  Cuentas Registradas ({totalStudents})
                </button>

                <button
                  type="button"
                  onClick={() => setStudentSection('invitations')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    borderColor: activeStudentSection === 'invitations' ? '#2563eb' : '#cbd5e1',
                    background: activeStudentSection === 'invitations' ? '#eff6ff' : '#ffffff',
                    color: activeStudentSection === 'invitations' ? '#1d4ed8' : '#475569',
                    fontWeight: activeStudentSection === 'invitations' ? 600 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  <Key size={15} />
                  Claves de Invitación (GitHub)
                </button>
              </div>

              {studentError && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertCircle size={16} />
                  {studentError}
                </div>
              )}

              {studentSuccess && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <CheckCircle2 size={16} />
                  {studentSuccess}
                </div>
              )}

              {/* SECCIÓN 1: CUENTAS REGISTRADAS & ALTA */}
              {activeStudentSection === 'accounts' && (
                <div>
                  {/* Creación Masiva de Alumnos (CSV) */}
                  <div className="card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem' }}>
                    <form onSubmit={handleBulkCreateStudents} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <textarea
                        rows={3}
                        className="input-field"
                        style={{
                          width: '100%',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          resize: 'vertical',
                        }}
                        placeholder={`Nombre Completo, username/email, contraseña (ej: María Lopez, mlopez@centro.edu, pass1234)\nJuan Pérez\nAna Gómez, agomez`}
                        value={bulkStudentText}
                        onChange={e => setBulkStudentText(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
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
                        </div>

                        <button
                          type="submit"
                          disabled={submittingBulkStudents || !bulkStudentText.trim()}
                          className="btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1.25rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                        >
                          <UserPlus size={16} />
                          {submittingBulkStudents ? 'Creando...' : 'Crear Alumnos'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* MARCO DE ASIGNACIÓN DE ETIQUETAS (Análogo a /teacher/students) */}
                  {showTagPanel && (
                    <div
                      className="card"
                      style={{
                        marginBottom: '1.25rem',
                        border: '2px solid #2563eb',
                        borderRadius: '0.75rem',
                        padding: 0,
                        overflow: 'hidden',
                        boxShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.15)',
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

                      {/* PARTE INFERIOR: Formulario para crear etiqueta (categoria:valor) */}
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
                              list="admin-tag-categories"
                              placeholder="ej. group, año..."
                              value={newTagCategory}
                              onChange={e => setNewTagCategory(e.target.value)}
                              className="input-field"
                              style={{ width: '100%', fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                              required
                            />
                            <datalist id="admin-tag-categories">
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

                  {bulkStudentErrors.length > 0 && (
                    <div style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem',
                      fontSize: '0.875rem',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Errores durante la creación:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {bulkStudentErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {createdCredentials && createdCredentials.length > 0 && (
                    <div className="card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                          Credenciales Creadas ({createdCredentials.length})
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={handleCopyCredentials}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Copy size={13} />
                            {copiedCredentials ? 'Copiado' : 'Copiar Credenciales'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatedCredentials(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1rem', lineHeight: 1 }}
                            title="Cerrar"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                              <th style={{ padding: '0.4rem 0.6rem' }}>Nombre</th>
                              <th style={{ padding: '0.4rem 0.6rem' }}>Usuario / Email</th>
                              <th style={{ padding: '0.4rem 0.6rem' }}>Contraseña</th>
                            </tr>
                          </thead>
                          <tbody>
                            {createdCredentials.map(c => (
                              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 500 }}>{c.fullName}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace' }}>{c.username}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace', color: '#0f766e' }}>{c.password}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Barra de Búsqueda */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: '0.875rem 1.25rem',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Buscar alumno por nombre, usuario o GitHub..."
                          className="input-field"
                          style={{ paddingLeft: '2.25rem', fontSize: '0.875rem', width: '100%' }}
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Tabla de Alumnos */}
                    {loadingStudents ? (
                      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        Cargando cuentas de alumnos...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <GraduationCap size={44} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>No se encontraron cuentas de alumnos</p>
                        <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                          {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Crea una cuenta local o genera una clave de invitación para que tus alumnos se registren.'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <SortableHeader
                                label="Alumno"
                                sortKey="name"
                                currentSortKey={sortKey}
                                currentSortDir={sortDir}
                                onSort={handleStudentSort}
                                style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                              />
                              <SortableHeader
                                label="Usuario / Email"
                                sortKey="username"
                                currentSortKey={sortKey}
                                currentSortDir={sortDir}
                                onSort={handleStudentSort}
                                style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                              />
                              <SortableHeader
                                label="Método de Acceso"
                                sortKey="access"
                                currentSortKey={sortKey}
                                currentSortDir={sortDir}
                                onSort={handleStudentSort}
                                style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                              />
                              <SortableHeader
                                label="Fecha de Alta"
                                sortKey="createdAt"
                                currentSortKey={sortKey}
                                currentSortDir={sortDir}
                                onSort={handleStudentSort}
                                style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
                              />
                              <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map(student => {
                              const avatar = student.avatarUrl || (student.githubUsername ? `https://github.com/${student.githubUsername}.png?size=80` : null);
                              return (
                                <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.75rem 1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      {avatar ? (
                                        <img
                                          src={avatar}
                                          alt={student.fullName}
                                          style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                                          onError={e => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: '50%',
                                            backgroundColor: '#e2e8f0',
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600,
                                            fontSize: '0.8125rem',
                                            border: '1px solid #cbd5e1',
                                          }}
                                        >
                                          {student.fullName ? student.fullName.charAt(0).toUpperCase() : '?'}
                                        </div>
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                          {student.fullName}
                                        </div>
                                        {student.activeTags && student.activeTags.length > 0 && (
                                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                            {student.activeTags.map(st => {
                                              const cat = st.category || st.tag?.category || '';
                                              const val = st.value || st.tag?.value || '';
                                              const tagColor = st.color || st.tag?.color;
                                              return (
                                                <TagBadge
                                                  key={st.id || `${cat}:${val}`}
                                                  category={cat}
                                                  value={val}
                                                  color={tagColor}
                                                />
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td style={{ padding: '0.75rem 1.25rem', color: '#475569', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                    {student.username}
                                  </td>

                                  <td style={{ padding: '0.75rem 1.25rem' }}>
                                    {student.githubUsername ? (
                                      <a
                                        href={`https://github.com/${student.githubUsername}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          textDecoration: 'none',
                                          color: '#2563eb',
                                          fontSize: '0.8125rem',
                                          fontWeight: 500,
                                        }}
                                      >
                                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                          GitHub @{student.githubUsername}
                                          <ExternalLink size={12} />
                                        </span>
                                      </a>
                                    ) : (
                                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                                        Local (Contraseña)
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                    {student.createdAt
                                      ? new Date(student.createdAt).toLocaleDateString('es-ES', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })
                                      : '—'}
                                  </td>

                                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => setStudentToDelete(student)}
                                      className="btn-secondary"
                                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                      title="Eliminar cuenta de alumno"
                                    >
                                      <Trash2 size={13} />
                                      Eliminar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: CLAVES DE INVITACIÓN */}
              {activeStudentSection === 'invitations' && (
                <div>
                  <TeacherInvitationsView embedded={true} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 📦 TAB 2: IMPORTAR / EXPORTAR */}
      {/* ========================================================= */}
      {activeTab === 'sync' && (
        <div>
          <GitSyncView embedded={true} />
        </div>
      )}



      {/* ==================== MODAL: CONFIRMAR ELIMINACIÓN DE ALUMNO ==================== */}
      {studentToDelete && (
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
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: '100%' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.75rem', color: '#dc2626' }}>
              Eliminar Cuenta de Alumno
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1rem' }}>
              ¿Estás seguro de que deseas eliminar permanentemente la cuenta de{' '}
              <strong>{studentToDelete.fullName}</strong> ({studentToDelete.username})?
            </p>
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                borderRadius: '0.375rem',
                border: '1px solid #fecaca',
                fontSize: '0.8125rem',
                color: '#991b1b',
                marginBottom: '1.25rem',
              }}
            >
              ⚠️ Esta acción eliminará también las entregas, evaluaciones y registros de actividad del alumno en la plataforma.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="btn-secondary"
                disabled={deletingStudent}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={deletingStudent}
                className="btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                {deletingStudent ? 'Eliminando...' : 'Eliminar Alumno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

