import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { 
  TeacherStudent, 
  TeachingSpace, 
  Tag, 
  BulkCreateStudentItem, 
  CreatedStudentItem 
} from '../types';
import { SortableHeader } from '../components/SortableHeader';
import { TagBadge } from '../components/TagBadge';
import { TagColorPicker } from '../components/TagColorPicker';
import { TeacherInvitationsView } from './TeacherInvitationsView';
import { 
  Users, 
  Tag as TagIcon, 
  Layers, 
  Search, 
  Plus, 
  X, 
  Check, 
  Trash2, 
  Pencil, 
  UserPlus, 
  Key, 
  Mail, 
  Github, 
  Copy, 
  AlertCircle
} from 'lucide-react';

export const TeacherStudentsView: React.FC = () => {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [spaces, setSpaces] = useState<TeachingSpace[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Top panels
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showInvitationsPanel, setShowInvitationsPanel] = useState(false);

  // Bulk student creation
  const [bulkStudentText, setBulkStudentText] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedStudentItem[] | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [createSelectedTagIds, setCreateSelectedTagIds] = useState<Set<string>>(new Set());
  const [showCreateTagPanel, setShowCreateTagPanel] = useState(false);
  const [createUnassignedSearch, setCreateUnassignedSearch] = useState('');
  const [createTagCategory, setCreateTagCategory] = useState('');
  const [createTagValue, setCreateTagValue] = useState('');
  const [createTagDescription, setCreateTagDescription] = useState('');
  const [createTagColor, setCreateTagColor] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);

  // Sorting
  type StudentSortKey = 'name' | 'username' | 'spaces' | 'tags';
  const [sortKey, setSortKey] = useState<StudentSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: StudentSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filters
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>('');
  const [selectedTagValue, setSelectedTagValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Batch tag creation
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [bulkNewCategory, setBulkNewCategory] = useState('group');
  const [bulkNewValue, setBulkNewValue] = useState('');
  const [bulkNewDesc, setBulkNewDesc] = useState('');
  const [bulkValidUntil, setBulkValidUntil] = useState('');
  const [bulkNewColor, setBulkNewColor] = useState<string | null>(null);

  // Single edit modal
  const [studentToEdit, setStudentToEdit] = useState<TeacherStudent | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modals
  const [studentToDelete, setStudentToDelete] = useState<TeacherStudent | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stdData, spacesData, tagsData] = await Promise.all([
        api.listTeacherStudents({
          spaceId: selectedSpaceId || undefined,
          category: selectedTagCategory || undefined,
          value: selectedTagValue || undefined,
          search: searchTerm || undefined,
        }),
        api.listSpaces(),
        api.listTags(),
      ]);
      setStudents(stdData);
      setSpaces(spacesData);
      setAvailableTags(tagsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el listado de alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSpaceId, selectedTagCategory, selectedTagValue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Helper: Get tag IDs associated with a teaching space
  const getSpaceTagIds = (space: TeachingSpace): string[] => {
    if (space.contextTags && space.contextTags.length > 0) {
      return space.contextTags.map(t => t.id);
    }
    if (space.tags && space.tags.length > 0) {
      return space.tags.map(t => t.id);
    }
    if (space.contextConfig?.tagIds && space.contextConfig.tagIds.length > 0) {
      return space.contextConfig.tagIds;
    }
    return [];
  };

  // Only spaces that actually have tags associated
  const spacesWithTags = useMemo(() => {
    return spaces.filter(space => getSpaceTagIds(space).length > 0);
  }, [spaces]);

  const usedTagColors = useMemo(() => {
    return availableTags.map(t => t.color).filter(Boolean) as string[];
  }, [availableTags]);

  const categories = useMemo(() => {
    return Array.from(new Set(availableTags.map(t => t.category))).sort();
  }, [availableTags]);

  // Selection handlers
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (sortedStudents.length === 0) return;
    const allSelected = sortedStudents.every(s => selectedStudentIds.has(s.id));
    if (allSelected) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(sortedStudents.map(s => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Tags in selected students
  interface SelectedTagInfo {
    tagId: string;
    category: string;
    value: string;
    color?: string | null;
    studentIdsWithTag: string[];
  }

  const tagsInSelectedStudents = useMemo(() => {
    if (selectedStudents.length === 0) return [];
    const tagMap = new Map<string, SelectedTagInfo>();

    for (const student of selectedStudents) {
      if (!student.activeTags) continue;
      for (const st of student.activeTags) {
        const tagId = st.tagId || st.tag?.id;
        if (!tagId) continue;
        const cat = st.category || st.tag?.category || '';
        const val = st.value || st.tag?.value || '';
        const tagColor = st.color || st.tag?.color;

        if (!tagMap.has(tagId)) {
          tagMap.set(tagId, {
            tagId,
            category: cat,
            value: val,
            color: tagColor,
            studentIdsWithTag: [student.id],
          });
        } else {
          const existing = tagMap.get(tagId)!;
          if (!existing.color && tagColor) {
            existing.color = tagColor;
          }
          if (!existing.studentIdsWithTag.includes(student.id)) {
            existing.studentIdsWithTag.push(student.id);
          }
        }
      }
    }

    return Array.from(tagMap.values()).sort((a, b) =>
      a.category.localeCompare(b.category) || a.value.localeCompare(b.value)
    );
  }, [selectedStudents]);

  const unassignedAvailableTags = useMemo(() => {
    if (selectedStudents.length === 0) return [];
    const assignedTagIds = new Set(tagsInSelectedStudents.map(t => t.tagId));
    let tags = availableTags.filter(t => !assignedTagIds.has(t.id));
    if (unassignedSearch.trim()) {
      const q = unassignedSearch.toLowerCase();
      tags = tags.filter(t =>
        t.category.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return tags.sort((a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value));
  }, [selectedStudents, tagsInSelectedStudents, availableTags, unassignedSearch]);

  // Batch assign tag
  const handleBatchAssignTag = async (tagId: string, targetStudentIds?: string[]) => {
    const idsToAssign = targetStudentIds && targetStudentIds.length > 0
      ? targetStudentIds
      : selectedStudents.map(s => s.id);
    if (idsToAssign.length === 0) return;

    setBatchSubmitting(true);
    try {
      await api.batchAssignTag(idsToAssign, tagId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al asignar etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Batch revoke tag
  const handleBatchRevokeTag = async (tagId: string, targetStudentIds?: string[]) => {
    const idsToRevoke = targetStudentIds && targetStudentIds.length > 0
      ? targetStudentIds
      : selectedStudents.map(s => s.id);
    if (idsToRevoke.length === 0) return;

    setBatchSubmitting(true);
    try {
      await api.batchRevokeTag(idsToRevoke, tagId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al desasociar etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Batch assign space
  const handleBatchAssignSpace = async (spaceId: string) => {
    const idsToAssign = selectedStudents.map(s => s.id);
    if (idsToAssign.length === 0) return;
    setBatchSubmitting(true);
    try {
      await api.batchAssignSpace(idsToAssign, spaceId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al asignar espacio docente');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Batch revoke space (preserves tags required by other spaces of each student)
  const handleBatchRevokeSpace = async (spaceId: string) => {
    const idsToRevoke = selectedStudents.map(s => s.id);
    if (idsToRevoke.length === 0) return;
    setBatchSubmitting(true);
    try {
      await api.batchRevokeSpace(idsToRevoke, spaceId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al desasociar espacio docente');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Create new tag in bulk assignment panel
  const handleBulkCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNewCategory.trim() || !bulkNewValue.trim()) return;

    setBatchSubmitting(true);
    try {
      let targetTag = availableTags.find(
        t => t.category.toLowerCase() === bulkNewCategory.trim().toLowerCase() &&
             t.value.toLowerCase() === bulkNewValue.trim().toLowerCase()
      );

      if (!targetTag) {
        targetTag = await api.createTag({
          category: bulkNewCategory.trim(),
          value: bulkNewValue.trim(),
          description: bulkNewDesc.trim() || undefined,
          color: bulkNewColor || undefined,
        });
        setAvailableTags(prev => [...prev, targetTag!]);
      }

      await api.batchAssignTag(
        selectedStudents.map(s => s.id),
        targetTag.id,
        bulkValidUntil || undefined
      );

      setBulkNewValue('');
      setBulkNewDesc('');
      setBulkValidUntil('');
      setBulkNewColor(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear y asignar etiqueta');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // ==================== CREACIÓN MASIVA DE ALUMNOS ====================
  const createSelectedTags = useMemo(() => {
    return availableTags.filter(t => createSelectedTagIds.has(t.id));
  }, [availableTags, createSelectedTagIds]);

  const createUnassignedTags = useMemo(() => {
    let list = availableTags.filter(t => !createSelectedTagIds.has(t.id));
    const q = createUnassignedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.category.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value));
  }, [availableTags, createSelectedTagIds, createUnassignedSearch]);

  const handleToggleCreateTag = (tagId: string) => {
    setCreateSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // Space toggle for new students: preserves tags that belong to other currently selected spaces
  const handleToggleCreateSpace = (space: TeachingSpace) => {
    const tagIds = getSpaceTagIds(space);
    if (tagIds.length === 0) return;

    const allSelected = tagIds.every(id => createSelectedTagIds.has(id));

    // Find tags needed by other spaces that are currently selected
    const otherSelectedSpaces = spacesWithTags.filter(s =>
      s.id !== space.id &&
      getSpaceTagIds(s).length > 0 &&
      getSpaceTagIds(s).every(id => createSelectedTagIds.has(id))
    );
    const tagsKeptByOtherSpaces = new Set(
      otherSelectedSpaces.flatMap(s => getSpaceTagIds(s))
    );

    setCreateSelectedTagIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        tagIds.forEach(id => {
          if (!tagsKeptByOtherSpaces.has(id)) {
            next.delete(id);
          }
        });
      } else {
        tagIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleCreateAndSelectTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = createTagCategory.trim();
    const val = createTagValue.trim();
    if (!cat || !val) return;

    setCreatingTag(true);
    try {
      const tag = await api.createTag({
        category: cat,
        value: val,
        description: createTagDescription.trim() || undefined,
        color: createTagColor || undefined,
      });
      setAvailableTags(prev => [...prev, tag]);
      setCreateSelectedTagIds(prev => new Set(prev).add(tag.id));
      setCreateTagCategory('');
      setCreateTagValue('');
      setCreateTagDescription('');
      setCreateTagColor(null);
    } catch (err: any) {
      alert(err.message || 'Error al crear etiqueta');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleBulkCreateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkStudentText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const items: BulkCreateStudentItem[] = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        fullName: parts[0] || '',
        username: parts[1] || undefined,
        password: parts[2] || undefined,
      };
    });

    setSubmittingBulk(true);
    setBulkErrors([]);
    try {
      const tagIdsToSend = Array.from(createSelectedTagIds);
      const res = await api.bulkCreateStudents(items, tagIdsToSend);
      if (res.created.length > 0) {
        setCreatedCredentials(res.created);
        setSuccessMsg(`${res.created.length} alumno(s) creado(s) correctamente.`);
      }
      if (res.errors.length > 0) {
        setBulkErrors(res.errors);
      }
      setBulkStudentText('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear alumnos');
    } finally {
      setSubmittingBulk(false);
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

  // ==================== EDICIÓN INDIVIDUAL ====================
  const handleOpenEdit = (student: TeacherStudent) => {
    setStudentToEdit(student);
    setEditFullName(student.fullName || '');
    setEditUsername(student.username || '');
    setEditPassword('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setUpdatingStudent(true);
    setEditError(null);
    try {
      await api.updateStudent(studentToEdit.id, {
        fullName: editFullName.trim(),
        username: editUsername.trim(),
        password: editPassword.trim() || undefined,
      });
      setStudentToEdit(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar alumno');
    } finally {
      setUpdatingStudent(false);
    }
  };

  // ==================== ELIMINACIÓN INDIVIDUAL ====================
  const handleConfirmDeleteSingle = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      await api.deleteStudentAccount(studentToDelete.id);
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        next.delete(studentToDelete.id);
        return next;
      });
      setStudentToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar alumno');
    } finally {
      setDeletingStudent(false);
    }
  };

  // ==================== ELIMINACIÓN MÚLTIPLE ====================
  const handleConfirmBatchDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    setDeletingBatch(true);
    try {
      await api.bulkDeleteStudents(Array.from(selectedStudentIds));
      setSelectedStudentIds(new Set());
      setShowBatchDeleteModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar alumnos seleccionados');
    } finally {
      setDeletingBatch(false);
    }
  };

  // Sorting logic
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'username') {
        cmp = a.username.localeCompare(b.username);
      } else if (sortKey === 'spaces') {
        const aCount = a.spaces?.length || 0;
        const bCount = b.spaces?.length || 0;
        cmp = aCount - bCount;
      } else if (sortKey === 'tags') {
        const aCount = a.activeTags?.length || 0;
        const bCount = b.activeTags?.length || 0;
        cmp = aCount - bCount;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, sortKey, sortDir]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1rem' }}>
      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
          {successMsg}
        </div>
      )}

      {/* Botones de Cabecera: Crear Alumnos & Claves de invitación */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setShowCreatePanel(!showCreatePanel);
            setShowInvitationsPanel(false);
          }}
          className={showCreatePanel ? 'btn-primary' : 'btn-secondary'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8125rem',
            borderRadius: '0.375rem',
          }}
        >
          <UserPlus size={15} />
          <span>Crear Alumnos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowInvitationsPanel(!showInvitationsPanel);
            setShowCreatePanel(false);
          }}
          className={showInvitationsPanel ? 'btn-primary' : 'btn-secondary'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8125rem',
            borderRadius: '0.375rem',
          }}
        >
          <Key size={15} />
          <span>Claves de invitación</span>
        </button>
      </div>

      {/* PANEL DESPLEGABLE: CREAR ALUMNOS */}
      {showCreatePanel && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1rem', overflow: 'visible' }}>
          <form onSubmit={handleBulkCreateStudents}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <textarea
                  rows={3}
                  placeholder="Nombre Completo, usuario (opcional), contraseña (opcional)&#10;Un alumno por línea..."
                  value={bulkStudentText}
                  onChange={e => setBulkStudentText(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 200 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTagPanel(!showCreateTagPanel)}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    background: createSelectedTagIds.size > 0 ? '#eff6ff' : '#ffffff',
                    border: createSelectedTagIds.size > 0 ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                    color: createSelectedTagIds.size > 0 ? '#1d4ed8' : '#475569',
                  }}
                >
                  <TagIcon size={13} />
                  <span>{createSelectedTagIds.size > 0 ? `${createSelectedTagIds.size} etiqueta(s)` : 'Asignar etiquetas / espacios'}</span>
                </button>

                <button
                  type="submit"
                  disabled={submittingBulk || !bulkStudentText.trim()}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <UserPlus size={15} />
                  <span>{submittingBulk ? 'Creando...' : 'Crear Alumnos'}</span>
                </button>
              </div>
            </div>

            {/* MARCO DE ETIQUETAS Y ESPACIOS PARA NUEVOS ALUMNOS */}
            {showCreateTagPanel && (
              <div style={{ marginTop: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '0.5rem', background: '#ffffff', overflow: 'visible' }}>
                {spacesWithTags.length > 0 && (
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={13} color="#2563eb" /> Espacios docentes
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {spacesWithTags.map(space => {
                        const tagIds = getSpaceTagIds(space);
                        const isAll = tagIds.length > 0 && tagIds.every(id => createSelectedTagIds.has(id));
                        return (
                          <button
                            key={space.id}
                            type="button"
                            onClick={() => handleToggleCreateSpace(space)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.3rem',
                              border: isAll ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                              background: isAll ? '#eff6ff' : '#ffffff',
                              color: isAll ? '#1d4ed8' : '#1e293b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {isAll ? <Check size={12} color="#2563eb" /> : <Plus size={12} color="#64748b" />}
                            <span>{space.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', padding: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Etiquetas seleccionadas ({createSelectedTags.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 160, overflowY: 'auto' }}>
                      {createSelectedTags.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Ninguna seleccionada</div>
                      ) : (
                        createSelectedTags.map(tag => (
                          <div key={tag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.5rem' }}>
                            <TagBadge category={tag.category} value={tag.value} color={tag.color} />
                            <button type="button" onClick={() => handleToggleCreateTag(tag.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 0 }}>
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Etiquetas disponibles ({createUnassignedTags.length})
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={createUnassignedSearch}
                      onChange={e => setCreateUnassignedSearch(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginBottom: '0.35rem' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 125, overflowY: 'auto' }}>
                      {createUnassignedTags.map(tag => (
                        <div key={tag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.25rem', padding: '0.25rem 0.5rem' }}>
                          <TagBadge category={tag.category} value={tag.value} color={tag.color} />
                          <button type="button" onClick={() => handleToggleCreateTag(tag.id)} style={{ border: 'none', background: 'transparent', color: '#1d4ed8', cursor: 'pointer', padding: 0 }}>
                            <Plus size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Formulario minimalista de crear etiqueta */}
                <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      list="students-create-tag-categories"
                      placeholder="Categoría: grupo, año..."
                      value={createTagCategory}
                      onChange={e => setCreateTagCategory(e.target.value)}
                      className="input-field"
                      style={{ flex: 1, minWidth: 120, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                    />
                    <datalist id="students-create-tag-categories">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    <input
                      type="text"
                      placeholder="Valor: DAM, 2026..."
                      value={createTagValue}
                      onChange={e => setCreateTagValue(e.target.value)}
                      className="input-field"
                      style={{ flex: 1, minWidth: 120, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={createTagDescription}
                      onChange={e => setCreateTagDescription(e.target.value)}
                      className="input-field"
                      style={{ flex: 1.5, minWidth: 140, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                    />
                    <TagColorPicker
                      selectedColor={createTagColor}
                      onChange={setCreateTagColor}
                      category={createTagCategory}
                      value={createTagValue}
                      usedColors={usedTagColors}
                    />
                    <button
                      type="button"
                      disabled={creatingTag || !createTagCategory.trim() || !createTagValue.trim()}
                      onClick={handleCreateAndSelectTag}
                      className="btn-primary"
                      style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Crear y seleccionar etiqueta"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Tabla de Credenciales Generadas */}
          {createdCredentials && createdCredentials.length > 0 && (
            <div style={{ marginTop: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', padding: '0.6rem 0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                  {createdCredentials.length} alumno(s) creado(s)
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Copy size={12} />
                    <span>{copiedCredentials ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedCredentials(null)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <tbody>
                    {createdCredentials.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #dcfce7' }}>
                        <td style={{ padding: '0.2rem 0.4rem', fontWeight: 600 }}>{c.fullName}</td>
                        <td style={{ padding: '0.2rem 0.4rem', fontFamily: 'monospace' }}>{c.username}</td>
                        <td style={{ padding: '0.2rem 0.4rem', fontFamily: 'monospace', color: '#047857' }}>{c.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bulkErrors.length > 0 && (
            <div style={{ marginTop: '0.5rem', color: '#dc2626', fontSize: '0.75rem' }}>
              {bulkErrors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL DESPLEGABLE: CLAVES DE INVITACIÓN */}
      {showInvitationsPanel && (
        <div style={{ marginBottom: '1rem' }}>
          <TeacherInvitationsView embedded={true} />
        </div>
      )}

      {/* PANEL DE ASIGNACIÓN MASIVA PARA ALUMNOS SELECCIONADOS */}
      {selectedStudentIds.size > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '0.75rem',
            border: '2px solid #2563eb',
            borderRadius: '0.5rem',
            padding: 0,
            overflow: 'visible',
            background: '#ffffff',
          }}
        >
          {/* Header de Selección */}
          <div
            style={{
              padding: '0.5rem 0.85rem',
              background: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: '#2563eb', color: '#fff', borderRadius: '0.25rem', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={13} />
              </div>
              <strong style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                {selectedStudentIds.size} {selectedStudentIds.size === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              {/* Botón Eliminar Selección Compacto */}
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Eliminar alumnos seleccionados"
              >
                <Trash2 size={13} />
                <span>Eliminar ({selectedStudentIds.size})</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', background: '#ffffff' }}
              >
                Deseleccionar
              </button>
            </div>
          </div>

          {/* Espacios docentes (solo los que tienen etiquetas) */}
          {spacesWithTags.length > 0 && (
            <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Layers size={13} color="#2563eb" /> Espacios docentes
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
                {spacesWithTags.map(space => {
                  const countWithSpace = selectedStudents.filter(st => st.spaces?.some(sp => (sp.id || sp.spaceId) === space.id)).length;
                  const total = selectedStudents.length;
                  const isAll = countWithSpace === total && total > 0;
                  const isNone = countWithSpace === 0;

                  return (
                    <div
                      key={space.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isAll ? '#eff6ff' : '#f8fafc',
                        border: isAll ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                        borderRadius: '0.3rem',
                        padding: '0.2rem 0.45rem',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAll ? '#1d4ed8' : '#1e293b' }}>
                        {space.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          padding: '0.05rem 0.3rem',
                          borderRadius: '9999px',
                          background: isAll ? '#dcfce7' : (isNone ? '#f1f5f9' : '#fef3c7'),
                          color: isAll ? '#166534' : (isNone ? '#64748b' : '#92400e'),
                          border: `1px solid ${isAll ? '#bbf7d0' : (isNone ? '#e2e8f0' : '#fde68a')}`,
                        }}
                      >
                        {countWithSpace}/{total}
                      </span>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button
                          type="button"
                          disabled={batchSubmitting || isAll}
                          onClick={() => handleBatchAssignSpace(space.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '0.2rem',
                            border: isAll ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                            background: isAll ? '#f1f5f9' : '#eff6ff',
                            color: isAll ? '#94a3b8' : '#1d4ed8',
                            cursor: isAll ? 'not-allowed' : 'pointer',
                            padding: 0,
                          }}
                          title="Asignar espacio a alumnos restantes"
                        >
                          {isAll ? <Check size={11} /> : <Plus size={11} />}
                        </button>

                        {!isNone && (
                          <button
                            type="button"
                            disabled={batchSubmitting}
                            onClick={() => handleBatchRevokeSpace(space.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '0.2rem',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Quitar espacio de los alumnos que lo tienen"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etiquetas no asignadas */}
          <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TagIcon size={13} color="#2563eb" /> Etiquetas no asignadas ({unassignedAvailableTags.length})
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                value={unassignedSearch}
                onChange={e => setUnassignedSearch(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
              {unassignedAvailableTags.length === 0 ? (
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  {unassignedSearch ? 'No se encontraron etiquetas' : (availableTags.length === 0 ? 'No hay etiquetas creadas' : 'Todas las etiquetas están asignadas')}
                </span>
              ) : (
                unassignedAvailableTags.map(tag => (
                  <div
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1.5px solid #d6daed',
                      borderRadius: '9999px',
                      gap: '0.45rem',
                      paddingInlineEnd: '0.25rem',
                    }}
                  >
                    <TagBadge category={tag.category} value={tag.value} color={tag.color} style={{ border: 'none' }} />
                    <button
                      type="button"
                      disabled={batchSubmitting}
                      onClick={() => handleBatchAssignTag(tag.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="Asignar a todos los seleccionados"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulario de creación rápida en bloque */}
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 0.85rem' }}>
            <form onSubmit={handleBulkCreateAndAssign} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                list="students-bulk-categories"
                placeholder="Categoría: grupo, año..."
                value={bulkNewCategory}
                onChange={e => setBulkNewCategory(e.target.value)}
                className="input-field"
                style={{ flex: 1, minWidth: 110, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                required
              />
              <datalist id="students-bulk-categories">
                {categories.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <input
                type="text"
                placeholder="Valor: DAM, 2026..."
                value={bulkNewValue}
                onChange={e => setBulkNewValue(e.target.value)}
                className="input-field"
                style={{ flex: 1, minWidth: 110, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                required
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={bulkNewDesc}
                onChange={e => setBulkNewDesc(e.target.value)}
                className="input-field"
                style={{ flex: 1.5, minWidth: 130, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              />
              <input
                type="date"
                value={bulkValidUntil}
                onChange={e => setBulkValidUntil(e.target.value)}
                className="input-field"
                style={{ width: 120, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                title="Válida hasta (opcional)"
              />
              <TagColorPicker
                selectedColor={bulkNewColor}
                onChange={setBulkNewColor}
                category={bulkNewCategory}
                value={bulkNewValue}
                usedColors={usedTagColors}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={batchSubmitting || !bulkNewCategory.trim() || !bulkNewValue.trim()}
                style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                title="Crear y asignar etiqueta"
              >
                <Plus size={15} />
              </button>
            </form>
          </div>

          {/* Etiquetas en seleccionados */}
          <div style={{ padding: '0.5rem 0.85rem', background: '#ffffff' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <TagIcon size={13} color="#2563eb" /> Etiquetas en seleccionados ({tagsInSelectedStudents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.35rem' }}>
              {tagsInSelectedStudents.length === 0 ? (
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  Sin etiquetas activas
                </span>
              ) : (
                tagsInSelectedStudents.map(tagInfo => {
                  const count = tagInfo.studentIdsWithTag.length;
                  const total = selectedStudents.length;
                  const isAll = count === total;
                  const unassigned = selectedStudents.filter(s => !tagInfo.studentIdsWithTag.includes(s.id)).map(s => s.id);

                  return (
                    <div
                      key={tagInfo.tagId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: '1.5px solid #d6daed',
                        borderRadius: '9999px',
                        gap: '0.45rem',
                        paddingInlineEnd: '0.25rem',
                      }}
                    >
                      <TagBadge category={tagInfo.category} value={tagInfo.value} color={tagInfo.color} style={{ border: 'none' }} />
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          padding: '0.05rem 0.3rem',
                          borderRadius: '9999px',
                          background: isAll ? '#dcfce7' : '#fef3c7',
                          color: isAll ? '#166534' : '#92400e',
                          border: `1px solid ${isAll ? '#bbf7d0' : '#fde68a'}`,
                        }}
                      >
                        {count}/{total}
                      </span>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button
                          type="button"
                          disabled={batchSubmitting || isAll}
                          onClick={() => handleBatchAssignTag(tagInfo.tagId, unassigned)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: isAll ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                            background: isAll ? '#f1f5f9' : '#eff6ff',
                            color: isAll ? '#94a3b8' : '#1d4ed8',
                            cursor: isAll ? 'not-allowed' : 'pointer',
                            padding: 0,
                          }}
                          title="Asignar al resto"
                        >
                          {isAll ? <Check size={11} /> : <Plus size={11} />}
                        </button>

                        <button
                          type="button"
                          disabled={batchSubmitting}
                          onClick={() => handleBatchRevokeTag(tagInfo.tagId, tagInfo.studentIdsWithTag)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title="Quitar etiqueta"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE ALUMNOS */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar de Filtros & Búsqueda */}
        <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: 160, flex: 1 }}>
              <select
                value={selectedSpaceId}
                onChange={e => setSelectedSpaceId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }}
              >
                <option value="">Todos los espacios docentes</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 140, flex: 1 }}>
              <select
                value={selectedTagCategory}
                onChange={e => {
                  setSelectedTagCategory(e.target.value);
                  setSelectedTagValue('');
                }}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }}
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {selectedTagCategory && (
              <div style={{ minWidth: 140, flex: 1 }}>
                <select
                  value={selectedTagValue}
                  onChange={e => setSelectedTagValue(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }}
                >
                  <option value="">Valores de {selectedTagCategory}</option>
                  {availableTags
                    .filter(t => t.category === selectedTagCategory)
                    .map(t => (
                      <option key={t.id} value={t.value}>{t.value}</option>
                    ))}
                </select>
              </div>
            )}

            <div style={{ minWidth: 180, flex: 1.5, display: 'flex', gap: '0.35rem' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nombre, usuario o GitHub..."
                className="input-field"
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} title="Buscar">
                <Search size={14} />
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
            Cargando alumnos...
          </div>
        ) : sortedStudents.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.25rem' }}>No se encontraron alumnos</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.45rem 0.6rem', width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.has(s.id))}
                      ref={input => {
                        if (input) {
                          const someSelected = sortedStudents.some(s => selectedStudentIds.has(s.id));
                          const allSelected = sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.has(s.id));
                          input.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onChange={handleSelectAllVisible}
                      title="Seleccionar todos"
                      style={{ cursor: 'pointer', width: 14, height: 14 }}
                    />
                  </th>
                  <SortableHeader<StudentSortKey> label="Alumno" sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.45rem 0.75rem' }} />
                  <SortableHeader<StudentSortKey> label="Etiquetas" sortKey="tags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.45rem 0.75rem' }} />
                  <SortableHeader<StudentSortKey> label="Espacios" sortKey="spaces" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} style={{ padding: '0.45rem 0.75rem' }} />
                  <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', width: 80 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  const avatar = student.avatarUrl || (student.githubUsername ? `https://github.com/${student.githubUsername}.png?size=60` : null);

                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : undefined,
                        transition: 'background-color 0.1s',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.45rem 0.6rem', width: 36, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(student.id)}
                          style={{ cursor: 'pointer', width: 14, height: 14 }}
                        />
                      </td>

                      {/* Alumno (Nombre + email/username + icono de cuenta) */}
                      <td style={{ padding: '0.45rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem', flexShrink: 0 }}>
                              {student.fullName ? student.fullName.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.fullName}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              <span>{student.username}</span>
                              {student.githubUsername ? (
                                <a
                                  href={`https://github.com/${student.githubUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#24292f', display: 'inline-flex', alignItems: 'center' }}
                                  title={`GitHub: @${student.githubUsername}`}
                                >
                                  <Github size={12} />
                                </a>
                              ) : (
                                <span title="Cuenta local / email" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <Mail size={12} style={{ color: '#94a3b8' }} />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Etiquetas */}
                      <td style={{ padding: '0.45rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                          {student.activeTags && student.activeTags.length > 0 ? (
                            student.activeTags.map(st => {
                              const cat = st.category || st.tag?.category || '';
                              const val = st.value || st.tag?.value || '';
                              const tagColor = st.color || st.tag?.color;
                              return (
                                <TagBadge
                                  key={st.id || `${cat}:${val}`}
                                  category={cat}
                                  value={val}
                                  color={tagColor}
                                  validUntil={st.validUntil}
                                />
                              );
                            })
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Espacios */}
                      <td style={{ padding: '0.45rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {student.spaces && student.spaces.length > 0 ? (
                            student.spaces.map(s => {
                              const sId = s.id || s.spaceId;
                              const sName = s.name || s.spaceName;
                              return (
                                <span
                                  key={sId}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '0.25rem',
                                    padding: '0.1rem 0.4rem',
                                    fontSize: '0.6875rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  <Layers size={11} /> {sName}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Acciones: Editar (Pencil) & Eliminar (Trash2) */}
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            style={{
                              padding: '0.25rem 0.35rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.25rem',
                              background: '#ffffff',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Editar alumno"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            style={{
                              padding: '0.25rem 0.35rem',
                              border: '1px solid #fecaca',
                              borderRadius: '0.25rem',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Eliminar alumno"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDITAR ALUMNO */}
      {studentToEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setStudentToEdit(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 420, padding: '1.25rem', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <strong style={{ fontSize: '1rem', color: '#1e293b' }}>Editar alumno</strong>
              <button
                type="button"
                onClick={() => setStudentToEdit(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Usuario / Email"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="password"
                  placeholder="Nueva contraseña (dejar en blanco para no cambiar)"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              {editError && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStudentToEdit(null)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingStudent || !editFullName.trim() || !editUsername.trim()}
                  className="btn-primary"
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                >
                  {updatingStudent ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR ALUMNO INDIVIDUAL */}
      {studentToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setStudentToDelete(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 380, padding: '1.25rem', background: '#ffffff' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#b91c1c' }}>
              <AlertCircle size={20} />
              <strong style={{ fontSize: '1rem' }}>¿Eliminar alumno?</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
              Se eliminará la cuenta de <strong>{studentToDelete.fullName}</strong> ({studentToDelete.username}). Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingStudent}
                onClick={handleConfirmDeleteSingle}
                className="btn-danger"
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', background: '#dc2626', color: '#ffffff' }}
              >
                {deletingStudent ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR ALUMNOS SELECCIONADOS */}
      {showBatchDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowBatchDeleteModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 380, padding: '1.25rem', background: '#ffffff' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#b91c1c' }}>
              <AlertCircle size={20} />
              <strong style={{ fontSize: '1rem' }}>¿Eliminar {selectedStudentIds.size} alumnos?</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
              Se eliminarán las cuentas de los {selectedStudentIds.size} alumnos seleccionados. Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingBatch}
                onClick={handleConfirmBatchDelete}
                className="btn-danger"
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', background: '#dc2626', color: '#ffffff' }}
              >
                {deletingBatch ? 'Eliminando...' : `Eliminar ${selectedStudentIds.size} alumnos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
