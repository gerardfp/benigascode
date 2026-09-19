import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { api } from '../services/api';
import { ChevronDown, LogOut } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Ensure navbar is visible when changing routes
  useEffect(() => {
    setVisible(true);
  }, [location.pathname]);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show near top of page
      if (currentScrollY <= 10) {
        setVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // Threshold to prevent jitter
      if (Math.abs(diff) < 8) {
        return;
      }

      if (diff > 0) {
        // Scrolling down
        setVisible(false);
        setUserMenuOpen(false);
      } else {
        // Scrolling up
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPathActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/teacher/teachers' || path === '/teacher/management') {
      return location.pathname.startsWith('/teacher/teachers') || location.pathname.startsWith('/teacher/management');
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignorar error de red al cerrar sesión
    }
    setUserMenuOpen(false);
    onLogout();
    navigate('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.25s ease-in-out',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link
            to={user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? '/teacher' : '/'}
            style={{
              textDecoration: 'none',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '1.2rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#2563eb', whiteSpace: 'nowrap', display: 'inline-block' }}>&lt;/&gt;</span>
            <span style={{ whiteSpace: 'nowrap' }}>Benigascode</span>
          </Link>

          {user && (
            <nav style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {user.role === 'STUDENT' && (
                <>
                  <Link to="/" className={`nav-link ${isPathActive('/') ? 'active' : ''}`}>Mis Actividades</Link>
                  <Link to="/collections" className={`nav-link ${isPathActive('/collections') ? 'active' : ''}`}>Colecciones</Link>
                  <Link to="/progress" className={`nav-link ${isPathActive('/progress') ? 'active' : ''}`}>Mi Progreso</Link>
                  <Link to="/history" className={`nav-link ${isPathActive('/history') ? 'active' : ''}`}>Historial</Link>
                </>
              )}
              {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                <>
                  <Link to="/teacher/collections" className={`nav-link ${isPathActive('/teacher/collections') ? 'active' : ''}`}>Colecciones</Link>
                  <Link to="/teacher/exercises" className={`nav-link ${isPathActive('/teacher/exercises') ? 'active' : ''}`}>Ejercicios</Link>
                  <Link to="/teacher/spaces" className={`nav-link ${isPathActive('/teacher/spaces') ? 'active' : ''}`}>Espacios</Link>
                  <Link to="/teacher/students" className={`nav-link ${isPathActive('/teacher/students') ? 'active' : ''}`}>Alumnos</Link>
                  <Link to="/teacher/teachers" className={`nav-link ${isPathActive('/teacher/teachers') ? 'active' : ''}`}>Profesores</Link>
                  <Link to="/teacher/activities" className={`nav-link ${isPathActive('/teacher/activities') ? 'active' : ''}`}>Actividades</Link>
                  <Link to="/teacher/insights" className={`nav-link ${isPathActive('/teacher/insights') ? 'active' : ''}`}>Insights</Link>
                  <Link to="/teacher/submissions" className={`nav-link ${isPathActive('/teacher/submissions') ? 'active' : ''}`}>Envíos</Link>
                  <Link to="/teacher/sync" className={`nav-link ${isPathActive('/teacher/sync') ? 'active' : ''}`}>Importar / Exportar</Link>
                </>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: userMenuOpen ? '#f8fafc' : 'transparent',
                border: '1px solid',
                borderColor: userMenuOpen ? '#cbd5e1' : 'transparent',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title="Menú de usuario"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.githubUsername || user.fullName}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #cbd5e1',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 30,
                    height: 30,
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
                  {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                {user.githubUsername || user.fullName}
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: '#64748b',
                  transition: 'transform 0.15s ease',
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.375rem)',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                  minWidth: 170,
                  zIndex: 100,
                  overflow: 'hidden',
                  padding: '0.375rem',
                }}
              >
                <div style={{ padding: '0.5rem 0.625rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                  Conectado como <strong style={{ color: '#0f172a', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.githubUsername || user.fullName}</strong>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.8125rem',
                    color: '#dc2626',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '0.25rem',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
