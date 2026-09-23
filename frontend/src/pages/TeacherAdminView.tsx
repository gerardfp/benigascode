import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { TeacherStudent } from '../types';
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
  Eye, 
  EyeOff, 
  Dices, 
  Trash2, 
  Search, 
  AlertCircle,
  CheckCircle2,
  ExternalLink
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

  // Modal para creación manual de alumno
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [newStudentFullName, setNewStudentFullName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Alumno a eliminar
  const [studentToDelete, setStudentToDelete] = useState<TeacherStudent | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setStudentError(null);
    try {
      const data = await api.listTeacherStudents();
      setStudents(data);
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

  // Generador de contraseña aleatoria segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStudentPassword(res);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFullName.trim() || !newStudentUsername.trim() || !newStudentPassword) {
      setCreateModalError('Por favor completa todos los campos requeridos');
      return;
    }

    setCreatingStudent(true);
    setCreateModalError(null);

    try {
      await api.createStudentAccount({
        fullName: newStudentFullName.trim(),
        username: newStudentUsername.trim(),
        password: newStudentPassword,
      });

      setStudentSuccess(`Cuenta para "${newStudentFullName.trim()}" creada exitosamente.`);
      setShowCreateStudentModal(false);
      setNewStudentFullName('');
      setNewStudentUsername('');
      setNewStudentPassword('');
      await loadStudents();
    } catch (err: any) {
      setCreateModalError(err.message || 'Error al crear la cuenta de alumno');
    } finally {
      setCreatingStudent(false);
    }
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

  // KPIs
  const totalStudents = students.length;
  const githubStudents = students.filter(s => !!s.githubUsername).length;
  const localStudents = students.filter(s => !s.githubUsername).length;

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
                  {/* Tarjetas KPI de Alumnos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{ fontSize: '1.75rem' }}>🎓</div>
                      <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{totalStudents}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Alumnos</div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{ fontSize: '1.75rem' }}>🐙</div>
                      <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb' }}>{githubStudents}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vía GitHub OAuth</div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{ fontSize: '1.75rem' }}>🔑</div>
                      <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a' }}>{localStudents}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cuentas Locales</div>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Búsqueda y Botón Crear Alumno */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: '0.875rem 1.25rem',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 260px' }}>
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

                      <button
                        type="button"
                        onClick={() => {
                          setNewStudentFullName('');
                          setNewStudentUsername('');
                          setNewStudentPassword('');
                          setCreateModalError(null);
                          setShowCreateStudentModal(true);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                      >
                        <UserPlus size={16} />
                        + Crear Cuenta de Alumno
                      </button>
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

      {/* ==================== MODAL: CREAR ALUMNO LOCAL ==================== */}
      {showCreateStudentModal && (
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
          <div className="card" style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '0.375rem' }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Crear Cuenta de Alumno</h2>
              </div>
            </div>

            {createModalError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {createModalError}
              </div>
            )}

            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. María López"
                  className="input-field"
                  value={newStudentFullName}
                  onChange={e => setNewStudentFullName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Nombre de Usuario o Email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. mlopez o mlopez@centro.edu"
                  className="input-field"
                  value={newStudentUsername}
                  onChange={e => setNewStudentUsername(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Contraseña Inicial *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="input-field"
                      style={{ paddingRight: '2.5rem', width: '100%', fontFamily: showPassword ? 'monospace' : undefined }}
                      value={newStudentPassword}
                      onChange={e => setNewStudentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '0.25rem',
                      }}
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    title="Generar contraseña aleatoria"
                  >
                    <Dices size={14} />
                    Aleatoria
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateStudentModal(false)}
                  className="btn-secondary"
                  disabled={creatingStudent}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creatingStudent} className="btn-primary">
                  {creatingStudent ? 'Creando...' : 'Crear Alumno'}
                </button>
              </div>
            </form>
          </div>
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

