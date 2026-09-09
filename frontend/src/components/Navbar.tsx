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
          <Link to="/" style={{ textDecoration: 'none', color: '#1e293b', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#2563eb' }}>&lt;/&gt;</span> CodeLab
          </Link>

          {user && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              {user.role === 'STUDENT' && (
                <>
                  <Link to="/" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Mis Actividades</Link>
                  <Link to="/collections" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Colecciones</Link>
                  <Link to="/history" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Historial</Link>
                </>
              )}
              {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                <>
                  <Link to="/teacher" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Panel Docente</Link>
                  <Link to="/teacher/courses" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Cursos</Link>
                  <Link to="/teacher/activities" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Actividades</Link>
                  <Link to="/teacher/sync" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Sincronización Git</Link>
                </>
              )}
            </nav>
          )}
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.fullName}</div>
              <span className={`badge ${user.role === 'TEACHER' ? 'badge-info' : 'badge-neutral'}`}>
                {user.role}
              </span>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
};

