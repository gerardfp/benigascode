import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const GitHubCallbackView: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error_description') || params.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code) {
      setError('No se recibió el código de autorización de GitHub.');
      return;
    }

    api.exchangeGitHubCode(code)
      .then((res) => {
        if (res.accessToken) {
          sessionStorage.setItem('github_access_token', res.accessToken);
          navigate('/teacher/sync');
        } else {
          setError('No se pudo obtener el token de acceso de GitHub.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Fallo al intercambiar el código con GitHub.');
      });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '3rem auto', padding: '1.5rem' }} className="card">
        <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error en la vinculación con GitHub</h2>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/teacher/sync')}>
          Volver a Sincronización
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center' }} className="card">
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🐙</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Conectando con GitHub...
      </h2>
      <p style={{ color: '#64748b' }}>
        Estamos validando tu autorización. Serás redirigido en un instante.
      </p>
    </div>
  );
};
