import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignorar error de red al cerrar sesión
    }
    onLogout();
    navigate('/login');
  };

  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to={user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? '/teacher' : '/'} style={{ textDecoration: 'none', color: '#1e293b', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#2563eb' }}>&lt;/&gt;</span> Benigascode
          </Link>

          {user && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              {user.role === 'STUDENT' && (
                <>
                  <Link to="/" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Mis Actividades</Link>
                  <Link to="/collections" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Colecciones</Link>
                  <Link to="/progress" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Mi Progreso</Link>
                  <Link to="/history" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Historial</Link>
                </>
              )}
              {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                <>
                  <Link to="/teacher/collections" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Colecciones</Link>
                  <Link to="/teacher/exercises" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Ejercicios</Link>
                  <Link to="/teacher/spaces" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Espacios</Link>
                  <Link to="/teacher/students" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Alumnos</Link>
                  <Link to="/teacher/teachers" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Profesores</Link>
                  <Link to="/teacher/activities" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Actividades</Link>
                  <Link to="/teacher/insights" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Insights</Link>
                  <Link to="/teacher/submissions" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Envíos</Link>
                  <Link to="/teacher/sync" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Importar / Exportar</Link>
                </>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.githubUsername || user.fullName}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #cbd5e1',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                {user.githubUsername || user.fullName}
              </div>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>


  );
};

