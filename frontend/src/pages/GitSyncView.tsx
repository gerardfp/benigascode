import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { GitRepository, GitHubRepo, GitHubConfig, DeployKey } from '../types';

export const GitSyncView: React.FC = () => {
  const [linkedRepo, setLinkedRepo] = useState<GitRepository | null>(null);
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  const [ghToken, setGhToken] = useState<string | null>(sessionStorage.getItem('github_access_token'));
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [selectedGhRepoUrl, setSelectedGhRepoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'oauth' | 'deploy_key' | 'public'>('oauth');

  // Form states
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootPath, setRootPath] = useState('');
  const [generatedKey, setGeneratedKey] = useState<DeployKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [repo, config] = await Promise.all([
        api.getLinkedRepository().catch(() => null),
        api.getGitHubConfig().catch(() => ({ oauthEnabled: false, clientId: '', redirectUri: '' })),
      ]);
      setLinkedRepo(repo);
      setGhConfig(config);

      if (!config.oauthEnabled) {
        setActiveTab('deploy_key');
      }

      const storedToken = sessionStorage.getItem('github_access_token');
      if (storedToken) {
        setGhToken(storedToken);
        loadGitHubRepos(storedToken);
      }
    } catch (e: any) {
      console.error('Error al inicializar vista de sincronización:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadGitHubRepos = async (token: string) => {
    try {
      const repos = await api.getGitHubRepos(token);
      setGhRepos(repos);
      if (repos.length > 0) {
        setSelectedGhRepoUrl(repos[0].clone_url);
        setRepoName(repos[0].name);
        setBranch(repos[0].default_branch || 'main');
      }
    } catch (err: any) {
      setMessage({ text: 'Error al obtener repositorios de GitHub: ' + err.message, type: 'error' });
    }
  };

  const handleStartOAuth = async () => {
    try {
      const { url } = await api.getGitHubSyncAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setMessage({ text: 'Error al iniciar conexión con GitHub: ' + err.message, type: 'error' });
    }
  };

  const handleDisconnectGitHub = () => {
    sessionStorage.removeItem('github_access_token');
    setGhToken(null);
    setGhRepos([]);
  };

  const handleGenerateKey = async () => {
    try {
      const key = await api.generateDeployKey();
      setGeneratedKey(key);
      setCopiedKey(false);
    } catch (err: any) {
      setMessage({ text: 'Error al generar Deploy Key: ' + err.message, type: 'error' });
    }
  };

  const handleCopyKey = () => {
    if (generatedKey?.publicKey) {
      navigator.clipboard.writeText(generatedKey.publicKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const handleLinkOAuthRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGhRepoUrl) return;

    const chosenRepo = ghRepos.find((r) => r.clone_url === selectedGhRepoUrl);
    const finalName = repoName || chosenRepo?.name || 'GitHub Repo';

    setSyncing(true);
    setMessage(null);
    try {
      const linked = await api.linkRepository({
        name: finalName,
        repositoryUrl: selectedGhRepoUrl,
        branch: branch || 'main',
        rootPath: rootPath.trim(),
        authType: 'OAUTH_TOKEN',
        authToken: ghToken || undefined,
      });
      setLinkedRepo(linked);
      setMessage({ text: '¡Repositorio vinculado y sincronizado exitosamente!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al vincular el repositorio', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkDeployKeyRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setMessage({ text: 'Introduce la URL SSH del repositorio', type: 'error' });
      return;
    }
    if (!generatedKey) {
      setMessage({ text: 'Debes generar una Deploy Key antes de continuar', type: 'error' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    try {
      const linked = await api.linkRepository({
        name: repoName || 'Git Repo',
        repositoryUrl: repoUrl.trim(),
        branch: branch || 'main',
        rootPath: rootPath.trim(),
        authType: 'DEPLOY_KEY',
        publicKey: generatedKey.publicKey,
        privateKey: generatedKey.privateKey,
      });
      setLinkedRepo(linked);
      setMessage({ text: '¡Repositorio vinculado con Deploy Key y sincronizado!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al vincular repositorio con Deploy Key', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkPublicRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setMessage({ text: 'Introduce la URL HTTPS del repositorio', type: 'error' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    try {
      const linked = await api.linkRepository({
        name: repoName || 'Public Repo',
        repositoryUrl: repoUrl.trim(),
        branch: branch || 'main',
        rootPath: rootPath.trim(),
        authType: 'PUBLIC',
      });
      setLinkedRepo(linked);
      setMessage({ text: '¡Repositorio público vinculado y sincronizado!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al vincular repositorio público', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!linkedRepo) return;
    setSyncing(true);
    setMessage(null);
    try {
      await api.syncLinkedRepository(linkedRepo.id);
      const updated = await api.getLinkedRepository();
      setLinkedRepo(updated);
      setMessage({ text: 'Sincronización completada con éxito.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Fallo al sincronizar: ' + err.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedRepo) return;
    if (!confirm('¿Estás seguro de que deseas desvincular este repositorio? Las versiones creadas previamente se conservarán.')) {
      return;
    }
    try {
      await api.unlinkRepository(linkedRepo.id);
      setLinkedRepo(null);
      setMessage({ text: 'Repositorio desvinculado.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Error al desvincular: ' + err.message, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#64748b' }}>Cargando configuración de sincronización...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/teacher" style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
          ← Volver al Panel Docente
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
          Sincronización Git & GitHub
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
          Conecta un repositorio Git con tus ejercicios, colecciones y tests automatizados para mantenerlos siempre al día.
        </p>
      </div>

      {message && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '0.375rem',
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '0.875rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Tarjeta de Repositorio Actualmente Vinculado */}
      {linkedRepo && (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{linkedRepo.name}</h3>
                <span className={`badge ${
                  linkedRepo.lastSyncStatus === 'SUCCESS' ? 'badge-success' :
                  linkedRepo.lastSyncStatus === 'FAILED' ? 'badge-danger' :
                  linkedRepo.lastSyncStatus === 'IN_PROGRESS' ? 'badge-info' : 'badge-neutral'
                }`}>
                  {linkedRepo.lastSyncStatus}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {linkedRepo.authType === 'OAUTH_TOKEN' ? 'OAuth GitHub' :
                   linkedRepo.authType === 'DEPLOY_KEY' ? 'Deploy Key SSH' : 'Público'}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', wordBreak: 'break-all' }}>
                URL: <code>{linkedRepo.repositoryUrl}</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSyncNow} disabled={syncing} className="btn-primary" style={{ fontSize: '0.875rem' }}>
                {syncing ? 'Sincronizando...' : '🔄 Sincronizar Ahora'}
              </button>
              <button onClick={handleUnlink} disabled={syncing} className="btn-secondary" style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                Desvincular
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Rama:</span>
              <strong>{linkedRepo.branch}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Carpeta raíz:</span>
              <strong>{linkedRepo.rootPath || '/'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Último Commit:</span>
              <code>{linkedRepo.lastCommit ? linkedRepo.lastCommit.substring(0, 7) : 'Ninguno'}</code>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Última Sincronización:</span>
              <span>{linkedRepo.lastSyncAt ? new Date(linkedRepo.lastSyncAt).toLocaleString() : 'Pendiente'}</span>
            </div>
          </div>

          {linkedRepo.lastSyncError && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#be123c' }}>
              <strong>Error de última sincronización:</strong> {linkedRepo.lastSyncError}
            </div>
          )}

          {/* Instrucciones de Webhook Automático */}
          <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', fontSize: '0.8125rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>⚡ Sincronización Automática con Webhook (Opcional):</div>
            <p style={{ margin: '0 0 0.5rem', color: '#64748b' }}>
              Si quieres que Benigascode actualice los ejercicios automáticamente con cada <code>git push</code> en GitHub, configura este Webhook en Settings &gt; Webhooks:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{ background: '#fff', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', flex: 1, wordBreak: 'break-all' }}>
                {window.location.origin}/api/v1/webhooks/github/content-sync
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Formulario para Vincular o Cambiar Repositorio */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
          {linkedRepo ? 'Cambiar o Actualizar Repositorio' : 'Vincular un Repositorio Git'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
          Selecciona cómo deseas autenticarte con el repositorio donde se alojan los contenidos.
        </p>

        {/* Pestañas de Métodos de Vinculación */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              background: 'transparent',
              fontWeight: activeTab === 'oauth' ? 600 : 400,
              color: activeTab === 'oauth' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'oauth' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            🐙 Conectar con GitHub (OAuth)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deploy_key')}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              background: 'transparent',
              fontWeight: activeTab === 'deploy_key' ? 600 : 400,
              color: activeTab === 'deploy_key' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'deploy_key' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            🔑 Deploy Key SSH
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              background: 'transparent',
              fontWeight: activeTab === 'public' ? 600 : 400,
              color: activeTab === 'public' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'public' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            🌐 Repositorio Público (HTTPS)
          </button>
        </div>

        {/* TAB 1: GITHUB OAUTH */}
        {activeTab === 'oauth' && (
          <div>
            {!ghConfig?.oauthEnabled ? (
              <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>GitHub OAuth no está configurado</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  El servidor no tiene configuradas las variables <code>GITHUB_CLIENT_ID</code> y <code>GITHUB_CLIENT_SECRET</code>.
                  Puedes utilizar la pestaña <strong>"Deploy Key SSH"</strong> para conectar repositorios privados sin necesidad de configurar OAuth en el servidor.
                </p>
              </div>
            ) : !ghToken ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                  Conecta directamente con tu cuenta de GitHub para elegir tus repositorios en un clic sin gestionar claves a mano.
                </p>
                <button onClick={handleStartOAuth} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
                  <span>🐙</span> Conectar con GitHub
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkOAuthRepo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#166534', fontWeight: 500 }}>✅ Cuenta de GitHub conectada para esta sesión</span>
                  <button type="button" onClick={handleDisconnectGitHub} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Desconectar cuenta
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Selecciona Repositorio de GitHub
                  </label>
                  <select
                    className="input-field"
                    value={selectedGhRepoUrl}
                    onChange={(e) => {
                      setSelectedGhRepoUrl(e.target.value);
                      const r = ghRepos.find((repo) => repo.clone_url === e.target.value);
                      if (r) {
                        setRepoName(r.name);
                        setBranch(r.default_branch || 'main');
                      }
                    }}
                    required
                  >
                    {ghRepos.map((r) => (
                      <option key={r.id} value={r.clone_url}>
                        {r.full_name} {r.private ? '🔒 (Privado)' : '🌐 (Público)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                      Rama (Branch)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                      Carpeta raíz de contenidos
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={rootPath}
                      onChange={(e) => setRootPath(e.target.value)}
                      placeholder="Ej: ejercicios o dejar vacío para raíz /"
                    />
                  </div>
                </div>

                <button type="submit" disabled={syncing} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                  {syncing ? 'Vinculando y clonando...' : 'Vincular y Sincronizar'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: DEPLOY KEY SSH */}
        {activeTab === 'deploy_key' && (
          <form onSubmit={handleLinkDeployKeyRepo} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Paso 1: Generar Deploy Key para GitHub</h4>
                <button type="button" onClick={handleGenerateKey} className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  🔑 {generatedKey ? 'Regenerar Clave' : 'Generar Deploy Key'}
                </button>
              </div>

              {generatedKey ? (
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
                    Copia esta clave pública y agrégala en GitHub (<strong>Settings &gt; Deploy keys &gt; Add deploy key</strong>):
                  </p>
                  <textarea
                    readOnly
                    rows={3}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'none', marginBottom: '0.5rem' }}
                    value={generatedKey.publicKey}
                  />
                  <button type="button" onClick={handleCopyKey} className="btn-secondary" style={{ fontSize: '0.75rem' }}>
                    {copiedKey ? '✅ ¡Copiada al portapapeles!' : '📋 Copiar Clave Pública'}
                  </button>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                  Haz clic en "Generar Deploy Key" para crear un par de claves SSH Ed25519 seguras para este repositorio.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', fontWeight: 600 }}>Paso 2: Datos del Repositorio</h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  URL SSH del Repositorio
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="git@github.com:usuario/mi-repositorio.git"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Nombre identificativo
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="Ej: DAM 2026"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Rama (Branch)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Carpeta raíz (opcional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={rootPath}
                    onChange={(e) => setRootPath(e.target.value)}
                    placeholder="ej: ejercicios o /"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={syncing || !generatedKey} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
              {syncing ? 'Clonando con Deploy Key...' : 'Guardar y Sincronizar'}
            </button>
          </form>
        )}

        {/* TAB 3: PUBLIC REPO */}
        {activeTab === 'public' && (
          <form onSubmit={handleLinkPublicRepo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                URL HTTPS del Repositorio Público
              </label>
              <input
                type="text"
                className="input-field"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/usuario/mi-repositorio.git"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Nombre identificativo
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="Ej: Repositorio Abierto"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Rama (Branch)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Carpeta raíz (opcional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={rootPath}
                  onChange={(e) => setRootPath(e.target.value)}
                  placeholder="ej: ejercicios o /"
                />
              </div>
            </div>

            <button type="submit" disabled={syncing} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
              {syncing ? 'Clonando repositorio...' : 'Guardar y Sincronizar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
