import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GitHubRepo, StudentExportSummary, StudentExportResult } from '../types';
import { X, Download, Github, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StudentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentExportModal: React.FC<StudentExportModalProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<StudentExportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub OAuth & Push state
  const [githubToken, setGithubToken] = useState<string | null>(
    sessionStorage.getItem('github_export_token')
  );
  const [loadingAuthUrl, setLoadingAuthUrl] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<StudentExportResult | null>(null);

  // Repo options
  const [mode, setMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [repoName, setRepoName] = useState('mi-catalogo-benigascode');
  const [isPrivate, setIsPrivate] = useState(true);
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('Exportación de ejercicios Benigascode');
  const [existingRepos, setExistingRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setPushResult(null);
    setLoadingSummary(true);

    api.getStudentExportSummary()
      .then((data) => setSummary(data))
      .catch((err) => setError(err.message || 'Error al cargar el catálogo de ejercicios.'))
      .finally(() => setLoadingSummary(false));

    const token = sessionStorage.getItem('github_export_token');
    setGithubToken(token);
    if (token) {
      loadGitHubRepos(token);
    }
  }, [isOpen]);

  const loadGitHubRepos = (token: string) => {
    setLoadingRepos(true);
    api.getStudentExportGitHubRepos(token)
      .then((repos) => {
        setExistingRepos(repos);
        if (repos.length > 0 && !selectedRepoUrl) {
          setSelectedRepoUrl(repos[0].html_url || repos[0].clone_url || repos[0].name);
        }
      })
      .catch((err) => {
        console.error('Error al cargar repositorios de GitHub:', err);
        // Si el token falló o expiró, resetearlo
        if (err.message && (err.message.includes('401') || err.message.includes('Bad credentials'))) {
          sessionStorage.removeItem('github_export_token');
          setGithubToken(null);
        }
      })
      .finally(() => setLoadingRepos(false));
  };

  const handleConnectGitHub = async () => {
    try {
      setLoadingAuthUrl(true);
      setError(null);
      sessionStorage.setItem('github_oauth_redirect_uri', `${window.location.origin}/auth/github/callback`);
      const { url } = await api.getStudentExportGitHubAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Error al conectar con GitHub.');
      setLoadingAuthUrl(false);
    }
  };

  const handleDisconnectGitHub = () => {
    sessionStorage.removeItem('github_export_token');
    setGithubToken(null);
    setExistingRepos([]);
  };

  const handlePushToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken) return;

    setError(null);
    setPushResult(null);
    setIsPushing(true);

    try {
      const targetRepo = mode === 'NEW' ? repoName.trim() : selectedRepoUrl;
      const res = await api.pushStudentExportToGitHub({
        repositoryName: targetRepo,
        createNewRepo: mode === 'NEW',
        isPrivate: mode === 'NEW' ? isPrivate : false,
        branch: branch.trim() || 'main',
        commitMessage: commitMessage.trim() || 'Exportación de ejercicios Benigascode',
        githubToken,
      });

      setPushResult(res);
      if (mode === 'NEW') {
        loadGitHubRepos(githubToken);
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir a GitHub.');
    } finally {
      setIsPushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 540,
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Exportar catálogo de ejercicios
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen */}
        {loadingSummary ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', padding: '0.75rem 0' }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: '0.875rem' }}>Cargando catálogo...</span>
          </div>
        ) : summary ? (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.8125rem',
              color: '#334155',
            }}
          >
            <span><strong>{summary.startedCollectionsCount}</strong> {summary.startedCollectionsCount === 1 ? 'colección iniciada' : 'colecciones iniciadas'}</span>
            <span>•</span>
            <span><strong>{summary.exercisesCount}</strong> {summary.exercisesCount === 1 ? 'ejercicio preparado' : 'ejercicios preparados'}</span>
          </div>
        ) : null}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {pushResult && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              padding: '0.75rem',
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>Exportado correctamente</span>
            </div>
            {pushResult.repositoryUrl && (
              <a
                href={pushResult.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#16a34a', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {pushResult.repositoryUrl}
              </a>
            )}
          </div>
        )}

        {/* Sección 1: Descargar ZIP */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
          <a
            href={api.getStudentExportZipUrl()}
            download
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            <Download size={16} />
            <span>Descargar paquete ZIP</span>
          </a>
        </div>

        {/* Sección 2: Exportar a GitHub */}
        <div>
          {!githubToken ? (
            <button
              type="button"
              onClick={handleConnectGitHub}
              disabled={loadingAuthUrl}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.625rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            >
              <Github size={16} />
              <span>{loadingAuthUrl ? 'Conectando...' : 'Conectar con GitHub'}</span>
            </button>
          ) : (
            <form onSubmit={handlePushToGitHub} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Github size={16} /> GitHub
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectGitHub}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Desconectar
                </button>
              </div>

              {/* Selector de modo: Nuevo vs Existente */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportMode"
                    checked={mode === 'NEW'}
                    onChange={() => setMode('NEW')}
                  />
                  <span>Crear nuevo repositorio</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportMode"
                    checked={mode === 'EXISTING'}
                    onChange={() => setMode('EXISTING')}
                  />
                  <span>Usar repositorio existente</span>
                </label>
              </div>

              {mode === 'NEW' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Nombre del repositorio
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      required
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    <span>Repositorio privado</span>
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Seleccionar repositorio
                    </label>
                    {loadingRepos ? (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Cargando repositorios...</div>
                    ) : existingRepos.length > 0 ? (
                      <select
                        className="input-field"
                        value={selectedRepoUrl}
                        onChange={(e) => setSelectedRepoUrl(e.target.value)}
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {existingRepos.map((r) => (
                          <option key={r.id || r.full_name} value={r.html_url || r.clone_url || r.full_name}>
                            {r.full_name || r.name} {r.private ? '(Privado)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="usuario/repositorio"
                        value={selectedRepoUrl}
                        onChange={(e) => setSelectedRepoUrl(e.target.value)}
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Rama
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Mensaje del commit
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPushing || (mode === 'NEW' && !repoName.trim()) || (mode === 'EXISTING' && !selectedRepoUrl.trim())}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.625rem',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  boxSizing: 'border-box',
                }}
              >
                {isPushing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Subiendo a GitHub...</span>
                  </>
                ) : (
                  <>
                    <Github size={16} />
                    <span>Subir a GitHub</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
