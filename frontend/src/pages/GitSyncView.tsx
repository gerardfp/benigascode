import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ArrowLeftRight } from 'lucide-react';
import {
  GitRepository,
  GitHubRepo,
  GitHubConfig,
  GitHubUserProfile,
  DeployKey,
  CatalogConflictStrategy,
  CatalogImportPreviewDTO,
  CatalogImportResultDTO,
  CatalogExportPushResultDTO,
} from '../types';

export const GitSyncView: React.FC = () => {
  // Pestaña principal activa: 'import' | 'export' | 'sync'
  const [mainTab, setMainTab] = useState<'import' | 'export' | 'sync'>('import');

  // Estado de conexión GitHub
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  const [ghToken, setGhToken] = useState<string | null>(sessionStorage.getItem('github_access_token'));
  const [ghProfile, setGhProfile] = useState<GitHubUserProfile | null>(() => {
    const saved = sessionStorage.getItem('github_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [loadingGhRepos, setLoadingGhRepos] = useState(false);

  // Mensaje de notificación global
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ==================== ESTADO IMPORTACIÓN ====================
  const [importSourceType, setImportSourceType] = useState<'github' | 'public_url' | 'zip'>('github');
  const [importSelectedRepoUrl, setImportSelectedRepoUrl] = useState('');
  const [importPublicUrl, setImportPublicUrl] = useState('');
  const [importZipFile, setImportZipFile] = useState<File | null>(null);
  const [importBranch, setImportBranch] = useState('main');
  const [importRootPath, setImportRootPath] = useState('');
  const [conflictStrategy, setConflictStrategy] = useState<CatalogConflictStrategy>('OVERWRITE');
  const [checkingPreview, setCheckingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<CatalogImportPreviewDTO | null>(null);
  const [executingImport, setExecutingImport] = useState(false);
  const [importResult, setImportResult] = useState<CatalogImportResultDTO | null>(null);

  // ==================== ESTADO EXPORTACIÓN ====================
  const [exportSourceType, setExportSourceType] = useState<'github' | 'custom'>('github');
  const [exportSelectedRepoUrl, setExportSelectedRepoUrl] = useState('');
  const [exportCustomUrl, setExportCustomUrl] = useState('');
  const [exportCustomToken, setExportCustomToken] = useState('');
  const [exportBranch, setExportBranch] = useState('main');
  const [exportRootPath, setExportRootPath] = useState('');
  const [exportCommitMsg, setExportCommitMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<CatalogExportPushResultDTO | null>(null);

  // ==================== ESTADO VINCULACIÓN / SYNC CONTINUA ====================
  const [linkedRepo, setLinkedRepo] = useState<GitRepository | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncAuthTab, setSyncAuthTab] = useState<'oauth' | 'deploy_key' | 'public'>('oauth');
  const [syncRepoName, setSyncRepoName] = useState('');
  const [syncRepoUrl, setSyncRepoUrl] = useState('');
  const [syncBranch, setSyncBranch] = useState('main');
  const [syncRootPath, setSyncRootPath] = useState('');
  const [generatedKey, setGeneratedKey] = useState<DeployKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Carga inicial
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [repo, config] = await Promise.all([
        api.getLinkedRepository().catch(() => null),
        api.getGitHubConfig().catch(() => ({ oauthEnabled: false, clientId: '', redirectUri: '' })),
      ]);
      setLinkedRepo(repo);
      setGhConfig(config);

      const storedToken = sessionStorage.getItem('github_access_token');
      if (storedToken) {
        setGhToken(storedToken);
        loadGitHubData(storedToken);
      } else if (!config.oauthEnabled) {
        setImportSourceType('public_url');
        setSyncAuthTab('deploy_key');
      }
    } catch (e: any) {
      console.error('Error al inicializar vista de sincronización:', e);
    }
  };

  const loadGitHubData = async (token: string) => {
    setLoadingGhRepos(true);
    try {
      const [repos, profile] = await Promise.all([
        api.getGitHubRepos(token).catch((err) => {
          console.warn('Error al cargar repositorios de GitHub:', err);
          return [] as GitHubRepo[];
        }),
        api.getGitHubUserProfile(token).catch((err) => {
          console.warn('Error al cargar perfil de GitHub:', err);
          return null;
        }),
      ]);

      setGhRepos(repos);
      if (profile) {
        setGhProfile(profile);
        sessionStorage.setItem('github_user_profile', JSON.stringify(profile));
      }

      if (repos.length > 0) {
        setImportSelectedRepoUrl(repos[0].clone_url);
        setExportSelectedRepoUrl(repos[0].clone_url);
        setSyncRepoUrl(repos[0].clone_url);
        setSyncRepoName(repos[0].name);
      }
    } catch (err: any) {
      console.warn('Error al cargar datos de GitHub:', err);
    } finally {
      setLoadingGhRepos(false);
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
    sessionStorage.removeItem('github_user_profile');
    setGhToken(null);
    setGhProfile(null);
    setGhRepos([]);
    setImportSourceType('public_url');
    setExportSourceType('custom');
    setMessage({ text: 'Cuenta de GitHub desconectada de esta sesión.', type: 'info' });
  };

  // ==================== LÓGICA DE IMPORTACIÓN ====================

  const getEffectiveImportUrl = () => {
    if (importSourceType === 'github') {
      return importSelectedRepoUrl;
    }
    return importPublicUrl.trim();
  };

  const handleCheckImportPreview = async () => {
    if (importSourceType === 'zip') {
      if (!importZipFile) {
        setMessage({ text: 'Por favor, selecciona o arrastra un archivo ZIP a importar.', type: 'error' });
        return;
      }

      setCheckingPreview(true);
      setMessage(null);
      setImportResult(null);

      try {
        const preview = await api.previewCatalogZipImport(importZipFile, conflictStrategy);
        setPreviewData(preview);
        setMessage({
          text: `Comprobación finalizada: ${preview.totalExercises} ejercicios y ${preview.totalCollections} colecciones detectados en el archivo ZIP. Revisa el desglose antes de confirmar.`,
          type: 'info',
        });
      } catch (err: any) {
        setMessage({ text: 'Error en la comprobación del ZIP: ' + err.message, type: 'error' });
        setPreviewData(null);
      } finally {
        setCheckingPreview(false);
      }
      return;
    }

    const url = getEffectiveImportUrl();
    if (!url) {
      setMessage({ text: 'Por favor, introduce o selecciona la URL del repositorio a importar.', type: 'error' });
      return;
    }

    setCheckingPreview(true);
    setMessage(null);
    setImportResult(null);

    try {
      const preview = await api.previewCatalogImport({
        repositoryUrl: url,
        branch: importBranch || 'main',
        rootPath: importRootPath.trim() || undefined,
        authType: importSourceType === 'github' && ghToken ? 'OAUTH_TOKEN' : 'PUBLIC',
        authToken: importSourceType === 'github' ? (ghToken || undefined) : undefined,
        conflictStrategy,
      });
      setPreviewData(preview);
      setMessage({
        text: `Comprobación finalizada: ${preview.totalExercises} ejercicios y ${preview.totalCollections} colecciones detectados. Revisa el desglose antes de confirmar.`,
        type: 'info',
      });
    } catch (err: any) {
      setMessage({ text: 'Error en la comprobación: ' + err.message, type: 'error' });
      setPreviewData(null);
    } finally {
      setCheckingPreview(false);
    }
  };

  const handleExecuteImport = async () => {
    if (importSourceType === 'zip') {
      if (!importZipFile) {
        setMessage({ text: 'Por favor, selecciona o arrastra un archivo ZIP a importar.', type: 'error' });
        return;
      }

      setExecutingImport(true);
      setMessage(null);

      try {
        const result = await api.executeCatalogZipImport(importZipFile, conflictStrategy);
        setImportResult(result);
        setPreviewData(null); // Limpiar preview tras ejecutar
        setMessage({
          text: `¡Importación ZIP completada con éxito! Nuevos: ${result.importedNew}, Sobrescritos: ${result.overwritten}, Renombrados: ${result.renamed}, Omitidos: ${result.skipped}.`,
          type: 'success',
        });
      } catch (err: any) {
        setMessage({ text: 'Error durante la importación del ZIP: ' + err.message, type: 'error' });
      } finally {
        setExecutingImport(false);
      }
      return;
    }

    const url = getEffectiveImportUrl();
    if (!url) {
      setMessage({ text: 'Por favor, introduce o selecciona la URL del repositorio.', type: 'error' });
      return;
    }

    setExecutingImport(true);
    setMessage(null);

    try {
      const result = await api.executeCatalogImport({
        repositoryUrl: url,
        branch: importBranch || 'main',
        rootPath: importRootPath.trim() || undefined,
        authType: importSourceType === 'github' && ghToken ? 'OAUTH_TOKEN' : 'PUBLIC',
        authToken: importSourceType === 'github' ? (ghToken || undefined) : undefined,
        conflictStrategy,
      });
      setImportResult(result);
      setPreviewData(null); // Limpiar preview tras ejecutar
      setMessage({
        text: `¡Importación completada con éxito! Nuevos: ${result.importedNew}, Sobrescritos: ${result.overwritten}, Renombrados: ${result.renamed}, Omitidos: ${result.skipped}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: 'Error durante la importación: ' + err.message, type: 'error' });
    } finally {
      setExecutingImport(false);
    }
  };

  // ==================== LÓGICA DE EXPORTACIÓN ====================

  const handleExecuteExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = exportSourceType === 'github' ? exportSelectedRepoUrl : exportCustomUrl.trim();
    const token = exportSourceType === 'github' ? (ghToken || undefined) : exportCustomToken.trim();

    if (!url) {
      setMessage({ text: 'Por favor, introduce o selecciona la URL del repositorio destino.', type: 'error' });
      return;
    }
    if (!token) {
      setMessage({
        text: 'Se requiere un token de acceso (OAuth o Personal Access Token) con permisos de escritura (repo) para hacer push a GitHub.',
        type: 'error',
      });
      return;
    }

    setExporting(true);
    setMessage(null);
    setExportResult(null);

    try {
      const result = await api.pushCatalogExport({
        repositoryUrl: url,
        branch: exportBranch || 'main',
        rootPath: exportRootPath.trim() || undefined,
        authToken: token,
        commitMessage: exportCommitMsg.trim() || undefined,
      });
      setExportResult(result);
      setMessage({
        text: `¡Catálogo exportado exitosamente! Commit ${result.commitSha.substring(0, 7)} en rama ${exportBranch}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: 'Error al exportar catálogo a GitHub: ' + err.message, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // ==================== LÓGICA DE VINCULACIÓN CONTINUA ====================

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

  const handleLinkRepo = async (authType: 'OAUTH_TOKEN' | 'DEPLOY_KEY' | 'PUBLIC') => {
    const url = authType === 'OAUTH_TOKEN' ? syncRepoUrl : syncRepoUrl.trim();
    if (!url) {
      setMessage({ text: 'Introduce la URL del repositorio', type: 'error' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    try {
      const linked = await api.linkRepository({
        name: syncRepoName || 'Repositorio Benigascode',
        repositoryUrl: url,
        branch: syncBranch || 'main',
        rootPath: syncRootPath.trim(),
        authType,
        authToken: authType === 'OAUTH_TOKEN' ? (ghToken || undefined) : undefined,
        publicKey: authType === 'DEPLOY_KEY' ? generatedKey?.publicKey : undefined,
        privateKey: authType === 'DEPLOY_KEY' ? generatedKey?.privateKey : undefined,
      });
      setLinkedRepo(linked);
      setMessage({ text: '¡Repositorio vinculado y sincronizado exitosamente!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al vincular el repositorio', type: 'error' });
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

  return (
    <div className="app-container" style={{ paddingBottom: '3rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={24} style={{ color: '#2563eb' }} />
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Importar / Exportar
          </h1>
        </div>

        {/* Tarjeta compacta de estado de conexión GitHub */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.875rem',
            background: ghToken ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${ghToken ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            fontSize: '0.8125rem'
          }}>
            {ghProfile?.avatarUrl ? (
              <img
                src={ghProfile.avatarUrl}
                alt={ghProfile.login}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #86efac', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '1.25rem' }}>🐙</span>
            )}
            <div>
              {ghToken ? (
                <div>
                  <div style={{ color: '#166534', fontWeight: 600 }}>
                    {ghProfile?.login ? (
                      <>
                        Cuenta: @{ghProfile.login}
                        {ghProfile.name && ghProfile.name !== ghProfile.login && (
                          <span style={{ fontWeight: 400, color: '#15803d', fontSize: '0.75rem', marginLeft: '0.35rem' }}>
                            ({ghProfile.name})
                          </span>
                        )}
                      </>
                    ) : (
                      'Cuenta GitHub Conectada'
                    )}
                  </div>
                  <div style={{ color: '#15803d', fontSize: '0.75rem' }}>
                    {loadingGhRepos ? 'Cargando repositorios...' : `${ghRepos.length} repositorios accesibles`}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ color: '#475569', fontWeight: 600 }}>GitHub no conectado</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Conecta para seleccionar tus repos</div>
                </div>
              )}
            </div>
            {ghToken ? (
              <button
                onClick={handleDisconnectGitHub}
                style={{
                  background: 'none',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleStartOAuth}
                className="btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                disabled={!ghConfig?.oauthEnabled}
              >
                Conectar GitHub
              </button>
            )}
          </div>
        </div>

      {/* Alerta de feedback */}
      {message && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '0.375rem',
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : message.type === 'error' ? '#fee2e2' : '#eff6ff',
          color: message.type === 'success' ? '#166534' : message.type === 'error' ? '#991b1b' : '#1e40af',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : message.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          fontSize: '0.875rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Pestañas Superiores: Importar / Exportar / Sincronización Continua */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setMainTab('import')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: mainTab === 'import' ? 700 : 500,
            color: mainTab === 'import' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'import' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📥 Importar Catálogo
        </button>
        <button
          type="button"
          onClick={() => setMainTab('export')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: mainTab === 'export' ? 700 : 500,
            color: mainTab === 'export' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'export' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📤 Exportar Catálogo (Push)
        </button>
        <button
          type="button"
          onClick={() => setMainTab('sync')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: mainTab === 'sync' ? 700 : 500,
            color: mainTab === 'sync' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'sync' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🔄 Repositorio Vinculado &amp; Webhook
        </button>
      </div>

      {/* ========================================================= */}
      {/* 📥 PESTAÑA 1: IMPORTAR CATÁLOGO */}
      {/* ========================================================= */}
      {mainTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Configuración de la Importación
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Descarga e incorpora ejercicios y colecciones al sistema desde un repositorio Git o desde un archivo ZIP. Puedes simular primero para revisar qué pasará ante posibles colisiones de ID/slug.
            </p>

            {/* Selector de origen */}
            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="importSourceType"
                  value="github"
                  checked={importSourceType === 'github'}
                  onChange={() => setImportSourceType('github')}
                  disabled={!ghToken}
                />
                Repositorio de cuenta GitHub conectada
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="importSourceType"
                  value="public_url"
                  checked={importSourceType === 'public_url'}
                  onChange={() => setImportSourceType('public_url')}
                />
                Repositorio Git público (URL directa)
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="importSourceType"
                  value="zip"
                  checked={importSourceType === 'zip'}
                  onChange={() => setImportSourceType('zip')}
                />
                📦 Archivo ZIP del catálogo (.zip)
              </label>
            </div>

            {/* Campo según origen */}
            {importSourceType === 'zip' ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Archivo ZIP del Catálogo
                </label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: importZipFile ? '#f0fdf4' : '#f8fafc',
                    borderColor: importZipFile ? '#86efac' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                  onClick={() => document.getElementById('zip-file-input')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const f = e.dataTransfer.files[0];
                      if (f.name.toLowerCase().endsWith('.zip')) {
                        setImportZipFile(f);
                        setPreviewData(null);
                        setImportResult(null);
                      } else {
                        setMessage({ text: 'Por favor, selecciona un archivo en formato .zip', type: 'error' });
                      }
                    }
                  }}
                >
                  <input
                    id="zip-file-input"
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportZipFile(e.target.files[0]);
                        setPreviewData(null);
                        setImportResult(null);
                      }
                    }}
                  />
                  {importZipFile ? (
                    <div>
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>📦</div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.9375rem' }}>
                        {importZipFile.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: '0.25rem' }}>
                        {(importZipFile.size / (1024 * 1024)).toFixed(2)} MB • Haz clic o arrastra otro archivo para cambiar
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>📁</div>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9375rem' }}>
                        Arrastra aquí tu archivo .zip o haz clic para seleccionarlo
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                        El ZIP puede contener carpetas <code>exercises/</code> y/o <code>collections/</code> (a nivel raíz o en un subdirectorio).
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : importSourceType === 'github' ? (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Selecciona Repositorio de GitHub
                </label>
                {loadingGhRepos ? (
                  <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Cargando repositorios...</div>
                ) : ghRepos.length > 0 ? (
                  <select
                    className="input-field"
                    value={importSelectedRepoUrl}
                    onChange={(e) => {
                      setImportSelectedRepoUrl(e.target.value);
                      const r = ghRepos.find((repo) => repo.clone_url === e.target.value);
                      if (r?.default_branch) setImportBranch(r.default_branch);
                    }}
                  >
                    {ghRepos.map((r) => (
                      <option key={r.id} value={r.clone_url}>
                        {r.full_name} {r.private ? '🔒 (Privado)' : '🌐 (Público)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
                    No se encontraron repositorios o no has iniciado sesión con GitHub.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  URL HTTPS del Repositorio Git Público
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={importPublicUrl}
                  onChange={(e) => setImportPublicUrl(e.target.value)}
                  placeholder="https://github.com/usuario/ejercicios-dam.git"
                />
              </div>
            )}

            {/* Parámetros de repositorio Git (Rama y Carpeta raíz) */}
            {importSourceType !== 'zip' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Rama (Branch)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={importBranch}
                    onChange={(e) => setImportBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Carpeta raíz dentro del repositorio (opcional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={importRootPath}
                    onChange={(e) => setImportRootPath(e.target.value)}
                    placeholder="ej: catalogo o dejar vacío para raíz /"
                  />
                </div>
              </div>
            )}

            {/* Selector de Estrategia ante Conflictos */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                ⚖️ Estrategia ante conflictos de ID / Slug:
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
                Define qué debe hacer el sistema cuando un ejercicio o colección del repositorio tenga un slug que ya exista en Benigascode:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="OVERWRITE"
                    checked={conflictStrategy === 'OVERWRITE'}
                    onChange={() => setConflictStrategy('OVERWRITE')}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <strong>🔄 Sobrescribir (OVERWRITE)</strong>
                    <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      Crea una nueva versión actualizada del ejercicio o colección existente manteniendo su historial.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="SKIP"
                    checked={conflictStrategy === 'SKIP'}
                    onChange={() => setConflictStrategy('SKIP')}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <strong>⏭️ Ignorar (SKIP)</strong>
                    <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      Conserva la versión actual del sistema sin modificarla y solo importa aquellos elementos que sean completamente nuevos.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="NEW_SLUG"
                    checked={conflictStrategy === 'NEW_SLUG'}
                    onChange={() => setConflictStrategy('NEW_SLUG')}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <strong>➕ Generar nuevo ID/slug correlativo (NEW_SLUG)</strong>
                    <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      Crea un nuevo elemento asignándole un identificador sucesivo automático (ej. <code>slug-2</code>, <code>slug-3</code>).
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCheckImportPreview}
                disabled={checkingPreview || executingImport}
                className="btn-secondary"
                style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem' }}
              >
                {checkingPreview
                  ? (importSourceType === 'zip' ? '🔍 Comprobando archivo ZIP...' : '🔍 Comprobando repositorio...')
                  : '🔍 Comprobar / Simular Importación'}
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={checkingPreview || executingImport}
                className="btn-primary"
                style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem' }}
              >
                {executingImport
                  ? (importSourceType === 'zip' ? '🚀 Importando archivo ZIP...' : '🚀 Importando contenidos...')
                  : '🚀 Ejecutar Importación Ahora'}
              </button>
            </div>
          </div>

          {/* Resultado de la Simulación / Comprobación previa */}
          {previewData && (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', fontWeight: 600 }}>
                    Resultados de la Comprobación Previa
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Commit SHA: <code>{previewData.commitHash?.substring(0, 7)}</code> • Estrategia: <strong>{previewData.strategy}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={executingImport}
                  className="btn-primary"
                  style={{ fontSize: '0.875rem' }}
                >
                  {executingImport ? 'Importando...' : 'Confirmar e Importar Ahora'}
                </button>
              </div>

              {/* Tarjetas resumen de métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Ejercicios</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{previewData.totalExercises}</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.375rem', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>Ejercicios Nuevos</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d' }}>{previewData.newExercisesCount}</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '0.375rem', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Ejercicios Existentes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b45309' }}>{previewData.existingExercisesCount}</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Colecciones</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{previewData.totalCollections}</div>
                </div>
              </div>

              {/* Tabla detallada de elementos */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Tipo</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Título</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Slug en Repo</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>En Sistema</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Acción Resultante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span className="badge badge-neutral">
                            {item.type === 'EXERCISE' ? 'Ejercicio' : 'Colección'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>
                          {item.title}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <code>{item.slug}</code>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {item.existsInDb ? (
                            <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ Ya existe</span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>✨ Nuevo</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {item.action === 'CREATE' && (
                            <span className="badge badge-success">Creará {item.targetSlug}</span>
                          )}
                          {item.action === 'OVERWRITE' && (
                            <span className="badge badge-info">Sobrescribirá (v+)</span>
                          )}
                          {item.action === 'SKIP' && (
                            <span className="badge badge-neutral" style={{ color: '#64748b' }}>Ignorará (sin cambios)</span>
                          )}
                          {item.action === 'CREATE_NEW_SLUG' && (
                            <span className="badge badge-success" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                              Nuevo slug: <strong>{item.targetSlug}</strong>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado de Ejecución de Importación */}
          {importResult && (
            <div className="card" style={{
              borderLeft: `4px solid ${importResult.status === 'SUCCESS' ? '#16a34a' : importResult.status === 'WARNING' ? '#d97706' : '#dc2626'}`
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                Resultado de la Importación
              </h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <div>Estado: <strong>{importResult.status}</strong></div>
                <div>Total Procesados: <strong>{importResult.totalProcessed}</strong></div>
                <div>Nuevos: <strong style={{ color: '#16a34a' }}>{importResult.importedNew}</strong></div>
                <div>Sobrescritos: <strong style={{ color: '#2563eb' }}>{importResult.overwritten}</strong></div>
                <div>Renombrados: <strong style={{ color: '#0284c7' }}>{importResult.renamed}</strong></div>
                <div>Omitidos: <strong style={{ color: '#64748b' }}>{importResult.skipped}</strong></div>
                <div>Colecciones: <strong>{importResult.collectionsProcessed}</strong></div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#991b1b' }}>
                  <strong>Errores registrados durante la importación:</strong>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 📤 PESTAÑA 2: EXPORTAR CATÁLOGO (PUSH) */}
      {/* ========================================================= */}
      {mainTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Exportar Catálogo a Repositorio GitHub
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Genera todos los ejercicios (enunciados, tests públicos/privados, templates, imágenes) y colecciones a partir de la base de datos de Benigascode y realiza un <code>git push</code> directo a GitHub.
              <br />
              <strong style={{ color: '#1e293b' }}>Nota:</strong> Los ejercicios que se hayan eliminado en Benigascode desaparecerán de este commit pero se conservarán intactos en los commits anteriores del historial de Git.
            </p>

            <form onSubmit={handleExecuteExport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selector de tipo de destino */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  <input
                    type="radio"
                    name="exportSourceType"
                    value="github"
                    checked={exportSourceType === 'github'}
                    onChange={() => setExportSourceType('github')}
                    disabled={!ghToken}
                  />
                  Repositorio de cuenta GitHub conectada
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  <input
                    type="radio"
                    name="exportSourceType"
                    value="custom"
                    checked={exportSourceType === 'custom'}
                    onChange={() => setExportSourceType('custom')}
                  />
                  Repositorio personalizado / Personal Access Token
                </label>
              </div>

              {exportSourceType === 'github' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Selecciona Repositorio Destino
                  </label>
                  {loadingGhRepos ? (
                    <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Cargando repositorios...</div>
                  ) : ghRepos.length > 0 ? (
                    <select
                      className="input-field"
                      value={exportSelectedRepoUrl}
                      onChange={(e) => {
                        setExportSelectedRepoUrl(e.target.value);
                        const r = ghRepos.find((repo) => repo.clone_url === e.target.value);
                        if (r?.default_branch) setExportBranch(r.default_branch);
                      }}
                      required
                    >
                      {ghRepos.map((r) => (
                        <option key={r.id} value={r.clone_url}>
                          {r.full_name} {r.private ? '🔒 (Privado)' : '🌐 (Público)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
                      No tienes repositorios disponibles. Conecta tu cuenta GitHub primero.
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                      URL del Repositorio Destino
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={exportCustomUrl}
                      onChange={(e) => setExportCustomUrl(e.target.value)}
                      placeholder="https://github.com/usuario/mi-catalogo.git"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                      Token de Acceso Personal (PAT de GitHub)
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      value={exportCustomToken}
                      onChange={(e) => setExportCustomToken(e.target.value)}
                      placeholder="ghp_..."
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Rama Destino (Branch)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={exportBranch}
                    onChange={(e) => setExportBranch(e.target.value)}
                    placeholder="main"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    Carpeta raíz (opcional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={exportRootPath}
                    onChange={(e) => setExportRootPath(e.target.value)}
                    placeholder="ej: catalogo o dejar vacío para raíz /"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  Mensaje del Commit (Opcional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={exportCommitMsg}
                  onChange={(e) => setExportCommitMsg(e.target.value)}
                  placeholder="Exportación del catálogo desde Benigascode"
                />
              </div>

              <button
                type="submit"
                disabled={exporting || (exportSourceType === 'github' && !ghToken)}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.625rem 1.5rem', fontSize: '0.9375rem' }}
              >
                {exporting ? '🚀 Exportando y haciendo Push a GitHub...' : '🚀 Exportar y Hacer Push a GitHub'}
              </button>
            </form>
          </div>

          {exportResult && (
            <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>✅</span>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#166534' }}>
                  Exportación Completada con Éxito
                </h3>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#15803d' }}>
                {exportResult.message}
              </p>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Commit generado: <code>{exportResult.commitSha}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔄 PESTAÑA 3: REPOSITORIO VINCULADO & WEBHOOK */}
      {/* ========================================================= */}
      {mainTab === 'sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tarjeta de Repositorio Actualmente Vinculado */}
          {linkedRepo && (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
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

              {/* Instrucciones de Webhook */}
              <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', fontSize: '0.8125rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>⚡ Sincronización Automática con Webhook (Opcional):</div>
                <p style={{ margin: '0 0 0.5rem', color: '#64748b' }}>
                  Para que Benigascode actualice los ejercicios automáticamente con cada <code>git push</code> en GitHub, configura este Webhook en GitHub (Settings &gt; Webhooks):
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <code style={{ background: '#fff', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', flex: 1, wordBreak: 'break-all' }}>
                    {window.location.origin}/api/v1/webhooks/github/content-sync
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Formulario para Vincular o Cambiar Repositorio Continuo */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
              {linkedRepo ? 'Cambiar Repositorio Vinculado' : 'Vincular un Repositorio Continuo'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Vincula un repositorio permanente para recibir actualizaciones automáticas vía Webhook.
            </p>

            {/* Pestañas de Métodos de Vinculación */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setSyncAuthTab('oauth')}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: syncAuthTab === 'oauth' ? 600 : 400,
                  color: syncAuthTab === 'oauth' ? '#2563eb' : '#64748b',
                  borderBottom: syncAuthTab === 'oauth' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                }}
              >
                🐙 Cuenta GitHub (OAuth)
              </button>
              <button
                type="button"
                onClick={() => setSyncAuthTab('deploy_key')}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: syncAuthTab === 'deploy_key' ? 600 : 400,
                  color: syncAuthTab === 'deploy_key' ? '#2563eb' : '#64748b',
                  borderBottom: syncAuthTab === 'deploy_key' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                }}
              >
                🔑 Deploy Key SSH
              </button>
              <button
                type="button"
                onClick={() => setSyncAuthTab('public')}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: syncAuthTab === 'public' ? 600 : 400,
                  color: syncAuthTab === 'public' ? '#2563eb' : '#64748b',
                  borderBottom: syncAuthTab === 'public' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                }}
              >
                🌐 Repositorio Público (HTTPS)
              </button>
            </div>

            {/* Método 1: OAuth */}
            {syncAuthTab === 'oauth' && (
              <div>
                {!ghToken ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <p style={{ color: '#475569', marginBottom: '1rem', fontSize: '0.9375rem' }}>
                      Conecta con GitHub para elegir un repositorio de tu cuenta sin gestionar claves manualmente.
                    </p>
                    <button onClick={handleStartOAuth} className="btn-primary" disabled={!ghConfig?.oauthEnabled}>
                      Conectar con GitHub
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                        Selecciona Repositorio de GitHub
                      </label>
                      <select
                        className="input-field"
                        value={syncRepoUrl}
                        onChange={(e) => {
                          setSyncRepoUrl(e.target.value);
                          const r = ghRepos.find((repo) => repo.clone_url === e.target.value);
                          if (r) {
                            setSyncRepoName(r.name);
                            setSyncBranch(r.default_branch || 'main');
                          }
                        }}
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
                          value={syncBranch}
                          onChange={(e) => setSyncBranch(e.target.value)}
                          placeholder="main"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                          Carpeta raíz de contenidos
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={syncRootPath}
                          onChange={(e) => setSyncRootPath(e.target.value)}
                          placeholder="ej: ejercicios o /"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLinkRepo('OAUTH_TOKEN')}
                      disabled={syncing}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                    >
                      {syncing ? 'Vinculando y clonando...' : 'Vincular y Sincronizar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Método 2: Deploy Key */}
            {syncAuthTab === 'deploy_key' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Paso 1: Generar Deploy Key</h4>
                    <button type="button" onClick={handleGenerateKey} className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
                      🔑 {generatedKey ? 'Regenerar Clave' : 'Generar Deploy Key'}
                    </button>
                  </div>

                  {generatedKey ? (
                    <div>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
                        Copia esta clave pública y agrégala en GitHub (Settings &gt; Deploy keys):
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    URL SSH del Repositorio
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={syncRepoUrl}
                    onChange={(e) => setSyncRepoUrl(e.target.value)}
                    placeholder="git@github.com:usuario/mi-repositorio.git"
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
                      value={syncRepoName}
                      onChange={(e) => setSyncRepoName(e.target.value)}
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
                      value={syncBranch}
                      onChange={(e) => setSyncBranch(e.target.value)}
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
                      value={syncRootPath}
                      onChange={(e) => setSyncRootPath(e.target.value)}
                      placeholder="ej: ejercicios o /"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLinkRepo('DEPLOY_KEY')}
                  disabled={syncing || !generatedKey}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                >
                  {syncing ? 'Clonando con Deploy Key...' : 'Guardar y Sincronizar'}
                </button>
              </div>
            )}

            {/* Método 3: Repositorio Público */}
            {syncAuthTab === 'public' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    URL HTTPS del Repositorio Público
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={syncRepoUrl}
                    onChange={(e) => setSyncRepoUrl(e.target.value)}
                    placeholder="https://github.com/usuario/mi-repositorio.git"
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
                      value={syncRepoName}
                      onChange={(e) => setSyncRepoName(e.target.value)}
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
                      value={syncBranch}
                      onChange={(e) => setSyncBranch(e.target.value)}
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
                      value={syncRootPath}
                      onChange={(e) => setSyncRootPath(e.target.value)}
                      placeholder="ej: ejercicios o /"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLinkRepo('PUBLIC')}
                  disabled={syncing}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                >
                  {syncing ? 'Clonando repositorio...' : 'Guardar y Sincronizar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
