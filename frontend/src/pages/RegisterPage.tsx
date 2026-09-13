import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export const RegisterPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    description?: string | null;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Por favor, introduce la clave de invitación proporcionada por tu profesor.');
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const res = await api.validateInvitation(cleanCode);
      setValidationResult(res);
      if (!res.valid) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al validar la clave de invitación');
    } finally {
      setValidating(false);
    }
  };

  const handleGitHubSignup = async () => {
    if (!code.trim()) {
      setError('Introduce tu clave de invitación antes de continuar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectUri = `${window.location.origin}/auth/github/callback`;
      const state = `signup:${code.trim()}`;
      const res = await api.getGitHubAuthUrl(state, redirectUri);

      if (!res.configured || !res.url) {
        setError('El inicio con GitHub no está configurado en el servidor todavía. Contacta con tu profesor.');
        setLoading(false);
        return;
      }

      // Guardar clave en sessionStorage como respaldo
      sessionStorage.setItem('pending_invitation_code', code.trim());
      // Redirigir a GitHub OAuth
      window.location.href = res.url;
    } catch (err: any) {
      setError(err.message || 'Error al conectar con GitHub');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🎓</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Registro de Alumno</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Para darte de alta en Benigascode necesitas una clave de invitación facilitada por tu profesor.
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

        {/* Paso 1: Introducir y validar clave */}
        <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Clave de Invitación *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                required
                className="input-field"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setValidationResult(null);
                  setError(null);
                }}
                placeholder="ej. 123456"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  letterSpacing: '0.05em',
                  fontWeight: 600
                }}
              />
              <button
                type="submit"
                disabled={validating || !code.trim()}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {validating ? 'Comprobando...' : 'Validar'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', margin: 0 }}>
              Pídele esta clave a tu profesor de la asignatura.
            </p>
          </div>
        </form>

        {/* Mensaje de clave válida */}
        {validationResult && validationResult.valid && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '0.875rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginTop: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <span>✓</span> Clave de invitación válida
            </div>
            {validationResult.description && (
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: '#15803d' }}>
                Grupo/Asignatura: <strong>{validationResult.description}</strong>
              </div>
            )}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>
              Ahora pulsa el botón a continuación para autorizarte con tu cuenta de GitHub.
            </p>
          </div>
        )}

        {/* Paso 2: Botón de registro con GitHub */}
        <div style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={handleGitHubSignup}
            disabled={loading || !code.trim() || (validationResult !== null && !validationResult.valid)}
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
              fontSize: '0.9375rem'
            }}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {loading ? 'Redirigiendo a GitHub...' : 'Registrarse con GitHub'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
};

