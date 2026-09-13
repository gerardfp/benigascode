import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';

interface GitHubCallbackViewProps {
  onAuthSuccess?: (user: User) => void;
}

export const GitHubCallbackView: React.FC<GitHubCallbackViewProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{ label: string; to: string }>({
    label: 'Volver a Iniciar Sesión',
    to: '/login'
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state') || '';
    const errorParam = params.get('error_description') || params.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code) {
      setError('No se recibió el código de autorización de GitHub.');
      return;
    }

    // Caso 1: Sincronización docente de repositorios
    if (state === 'sync' || window.location.pathname.includes('/teacher/sync')) {
      api.exchangeGitHubCode(code)
        .then((res) => {
          if (res.accessToken) {
            sessionStorage.setItem('github_access_token', res.accessToken);
            navigate('/teacher/sync');
          } else {
            setError('No se pudo obtener el token de acceso de GitHub.');
            setErrorAction({ label: 'Volver a Sincronización', to: '/teacher/sync' });
          }
        })
        .catch((err) => {
          setError(err.message || 'Fallo al intercambiar el código con GitHub.');
          setErrorAction({ label: 'Volver a Sincronización', to: '/teacher/sync' });
        });
      return;
    }

    // Caso 2: Registro por invitación o inicio de sesión
    let invitationCode: string | undefined = undefined;
    if (state.startsWith('signup:')) {
      invitationCode = decodeURIComponent(state.substring(7));
    } else {
      // Como respaldo, verificar si había una clave guardada en sessionStorage
      const savedCode = sessionStorage.getItem('pending_invitation_code');
      if (savedCode) {
        invitationCode = savedCode;
      }
    }

    const redirectUri = `${window.location.origin}/auth/github/callback`;

    api.authenticateWithGitHub(code, invitationCode, redirectUri)
      .then((user) => {
        sessionStorage.removeItem('pending_invitation_code');
        if (onAuthSuccess) {
          onAuthSuccess(user);
        }
        if (user.role === 'TEACHER' || user.role === 'ADMIN') {
          navigate('/teacher');
        } else {
          navigate('/');
        }
      })
      .catch((err) => {
        const msg = err.message || 'Error al autenticar con GitHub.';
        setError(msg);
        if (msg.toLowerCase().includes('invitación') || msg.toLowerCase().includes('invitacion') || state.startsWith('signup:')) {
          setErrorAction({ label: 'Ir al Registro con Invitación', to: '/register' });
        } else {
          setErrorAction({ label: 'Ir al Inicio de Sesión', to: '/login' });
        }
      });
  }, [navigate, onAuthSuccess]);

  if (error) {
    return (
      <div style={{ maxWidth: 540, margin: '3rem auto', padding: '1.5rem' }} className="card">
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h2 style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '1.25rem' }}>
          Error de Autenticación con GitHub
        </h2>
        <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {error}
        </p>
        <button className="btn-primary" onClick={() => navigate(errorAction.to)}>
          {errorAction.label}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center' }} className="card">
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🐙</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Conectando con GitHub...
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
        Estamos validando tu cuenta y configurando tu sesión. Serás redirigido en un instante.
      </p>
    </div>
  );
};
