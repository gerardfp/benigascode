import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/auth/github/callback`;
      const res = await api.getGitHubAuthUrl('login', redirectUri);
      if (!res.configured || !res.url) {
        setError('El acceso con GitHub no está configurado en el servidor.');
        setGithubLoading(false);
        return;
      }
      window.location.href = res.url;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar conexión con GitHub');
      setGithubLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await api.login(username, password);
      onLoginSuccess(user);
      if (user.role === 'TEACHER' || user.role === 'ADMIN') {
        navigate('/teacher');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Iniciar Sesión</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Accede a la plataforma educativa Benigascode
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Botón de inicio con GitHub */}
        <button
          type="button"
          onClick={handleGitHubLogin}
          disabled={githubLoading}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#24292e',
            borderColor: '#24292e',
            padding: '0.625rem 1rem',
            fontSize: '0.9375rem',
            marginBottom: '1.25rem'
          }}
        >
          <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          {githubLoading ? 'Conectando con GitHub...' : 'Continuar con GitHub'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '0 0 1.25rem',
          color: '#94a3b8',
          fontSize: '0.8125rem'
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          <span>o con credenciales</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Usuario / Email
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ejemplo@benigascode.local"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <div style={{
          marginTop: '1.25rem',
          padding: '0.875rem',
          backgroundColor: '#eff6ff',
          borderRadius: '0.375rem',
          border: '1px solid #bfdbfe',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          ¿Tienes una clave de invitación?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
            Regístrate aquí &rarr;
          </Link>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Usuarios de prueba disponibles:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setDemoCredentials('student@benigascode.local', 'StudentPass123!')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              Alumno Demo
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('teacher@benigascode.local', 'TeacherPass123!')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              Profesor García
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

