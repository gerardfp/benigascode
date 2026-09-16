import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Submission, Evaluation } from '../types';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  ExternalLink,
  Search,
  Filter,
  Copy,
  Check,
  AlertTriangle,
  X,
  FileCode2,
} from 'lucide-react';

export const StudentHistoryView: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de inspección de entrega
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [evaluationDetail, setEvaluationDetail] = useState<Evaluation | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.getMySubmissions()
      .then((data) => {
        setSubmissions(data);
      })
      .catch((err) => {
        console.error('Error al cargar historial de entregas:', err);
        setError(err.message || 'No se pudo cargar el historial de entregas.');
      })
      .finally(() => setLoading(false));
  }, []);

  const openInspectionModal = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setEvaluationDetail(null);
    setCopiedCode(false);
    setLoadingEval(true);

    try {
      const evals = await api.getEvaluations(sub.id);
      if (evals && evals.length > 0) {
        setEvaluationDetail(evals[0]);
      }
    } catch (e) {
      console.warn('No se pudo cargar la evaluación detallada:', e);
    } finally {
      setLoadingEval(false);
    }
  };

  const handleCopyCode = () => {
    if (!selectedSubmission?.sourceCode) return;
    navigator.clipboard.writeText(selectedSubmission.sourceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtrado de entregas
  const filteredSubmissions = submissions.filter((sub) => {
    // Filtro por estado
    const status = (sub.evaluationStatus || sub.status || '').toUpperCase();
    if (statusFilter === 'CORRECT' && status !== 'CORRECT') return false;
    if (statusFilter === 'INCORRECT' && status !== 'INCORRECT') return false;
    if (statusFilter === 'COMPILE_ERROR' && status !== 'COMPILE_ERROR') return false;
    if (statusFilter === 'PENDING' && !['PENDING', 'QUEUED', 'EVALUATING'].includes(status)) return false;

    // Filtro por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const exTitle = (sub.exerciseTitle || '').toLowerCase();
      const actName = (sub.activityName || '').toLowerCase();
      const lang = (sub.language || '').toLowerCase();
      return exTitle.includes(term) || actName.includes(term) || lang.includes(term);
    }

    return true;
  });

  // Métricas rápidas
  const totalCount = submissions.length;
  const correctCount = submissions.filter(
    (s) => (s.evaluationStatus || s.status) === 'CORRECT' || (s.score !== undefined && s.score >= 100)
  ).length;
  const successRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="app-container">
        <p style={{ color: '#64748b' }}>Cargando historial de entregas...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
            <History size={26} style={{ color: '#2563eb' }} />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Historial de Entregas
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Registro cronológico de tus intentos, pruebas ejecutadas y evaluaciones obtenidas.
          </p>
        </div>

        {/* Métricas resumidas */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '0.75rem 1.25rem', minWidth: 100, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas totales</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1.25rem', minWidth: 100, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{correctCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Completadas</div>
          </div>
          <div className="card" style={{ padding: '0.75rem 1.25rem', minWidth: 100, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{successRate}%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tasa de éxito</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Filtro por estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Estado:</span>
          {(['ALL', 'CORRECT', 'INCORRECT', 'COMPILE_ERROR', 'PENDING'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '9999px',
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                backgroundColor: statusFilter === st ? '#2563eb' : '#f8fafc',
                color: statusFilter === st ? '#ffffff' : '#475569',
                borderColor: statusFilter === st ? '#2563eb' : '#cbd5e1',
              }}
            >
              {st === 'ALL'
                ? 'Todas'
                : st === 'CORRECT'
                ? 'Correctas'
                : st === 'INCORRECT'
                ? 'Con fallos'
                : st === 'COMPILE_ERROR'
                ? 'Error comp.'
                : 'En cola'}
            </button>
          ))}
        </div>

        {/* Búsqueda por texto */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Filtrar por ejercicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.1rem', fontSize: '0.8125rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <p>{error}</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <History size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 0.5rem', color: '#334155', fontSize: '1.125rem' }}>
            {submissions.length === 0 ? 'Aún no tienes entregas registradas' : 'No hay entregas con los filtros aplicados'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {submissions.length === 0
              ? 'Cuando envíes una solución a un ejercicio de una colección o actividad, aparecerá registrada aquí.'
              : 'Prueba a cambiar el filtro de estado o el término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filteredSubmissions.map((sub) => {
            const rawStatus = (sub.evaluationStatus || sub.status || 'PENDING').toUpperCase();
            const isCorrect = rawStatus === 'CORRECT' || (sub.score !== undefined && sub.score >= 100);
            const isCompileError = rawStatus === 'COMPILE_ERROR';
            const isIncorrect = rawStatus === 'INCORRECT';
            const isPending = ['PENDING', 'QUEUED', 'EVALUATING'].includes(rawStatus);

            // Enlace al ejercicio
            const targetUrl = sub.activityId
              ? `/activity/${sub.activityId}/exercise/${sub.exerciseVersionId}`
              : sub.collectionId
              ? `/collections/${sub.collectionId}/exercise/${sub.exerciseId || sub.exerciseVersionId}`
              : `/exercise/${sub.exerciseId || sub.exerciseVersionId}`;

            return (
              <div
                key={sub.id}
                className="card"
                style={{
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Lado izquierdo: Ejercicio, contexto y resultado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Icono de Estado */}
                  <div style={{ flexShrink: 0 }}>
                    {isCorrect ? (
                      <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
                    ) : isCompileError ? (
                      <AlertTriangle size={32} style={{ color: '#ea580c' }} />
                    ) : isIncorrect ? (
                      <XCircle size={32} style={{ color: '#dc2626' }} />
                    ) : (
                      <Clock size={32} style={{ color: '#0284c7' }} />
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                        {sub.exerciseTitle || 'Ejercicio sin título'}
                      </h3>

                      {/* Badge de estado */}
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: isCorrect
                            ? '#dcfce7'
                            : isCompileError
                            ? '#fee2e2'
                            : isIncorrect
                            ? '#fef2f2'
                            : '#e0f2fe',
                          color: isCorrect
                            ? '#15803d'
                            : isCompileError
                            ? '#991b1b'
                            : isIncorrect
                            ? '#b91c1c'
                            : '#0369a1',
                        }}
                      >
                        {isCorrect
                          ? 'CORRECTA (100%)'
                          : isCompileError
                          ? 'ERROR DE COMPILACIÓN'
                          : isIncorrect
                          ? 'PRUEBAS NO SUPERADAS'
                          : isPending
                          ? 'EVALUANDO...'
                          : rawStatus}
                      </span>

                      {/* Intentos */}
                      {sub.attemptNumber && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                          Intento #{sub.attemptNumber}
                        </span>
                      )}
                    </div>

                    {/* Contexto y detalles */}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <span>
                        Contexto: <strong>{sub.activityName || 'Práctica directa'}</strong>
                      </span>
                      {sub.totalTests !== undefined && sub.totalTests > 0 && (
                        <span>
                          Pruebas: <strong>{sub.testsPassed}/{sub.totalTests} superadas</strong>
                        </span>
                      )}
                      <span>
                        Lenguaje: <strong>{sub.language || 'Java'}</strong>
                      </span>
                      <span>
                        Fecha: {new Date(sub.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  <button
                    onClick={() => openInspectionModal(sub)}
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8125rem',
                      padding: '0.45rem 0.75rem',
                    }}
                  >
                    <Code2 size={15} /> Ver código
                  </button>

                  <Link
                    to={targetUrl}
                    className="btn-primary"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8125rem',
                      padding: '0.45rem 0.75rem',
                    }}
                  >
                    Ir al ejercicio <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Inspección de Código y Evaluación */}
      {selectedSubmission && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedSubmission.exerciseTitle || 'Detalle de la entrega'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Enviado el {new Date(selectedSubmission.createdAt).toLocaleString()} • Lenguaje: {selectedSubmission.language || 'Java'}
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Información de evaluación */}
              {loadingEval ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando detalles de evaluación...</p>
              ) : evaluationDetail ? (
                <div
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.375rem',
                    backgroundColor: evaluationDetail.status === 'CORRECT' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${evaluationDetail.status === 'CORRECT' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: evaluationDetail.status === 'CORRECT' ? '#166534' : '#991b1b' }}>
                      Estado: {evaluationDetail.status} • Puntuación: {evaluationDetail.score}%
                    </span>
                    {evaluationDetail.totalTests !== undefined && (
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        Pruebas: {evaluationDetail.passedTests} de {evaluationDetail.totalTests} pasadas
                      </span>
                    )}
                  </div>
                  {evaluationDetail.reason && (
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>
                      {evaluationDetail.reason}
                    </div>
                  )}

                  {/* Error de compilación si existe */}
                  {evaluationDetail.compileStderr && (
                    <pre
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#1e293b',
                        color: '#f87171',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                      }}
                    >
                      {evaluationDetail.compileStderr}
                    </pre>
                  )}
                </div>
              ) : null}

              {/* Código fuente */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <FileCode2 size={16} /> Código enviado
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {copiedCode ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
                    {copiedCode ? '¡Copiado!' : 'Copiar código'}
                  </button>
                </div>

                <pre
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    margin: 0,
                    maxHeight: 350,
                  }}
                >
                  <code>{selectedSubmission.sourceCode || '// Sin código fuente disponible'}</code>
                </pre>
              </div>
            </div>

            {/* Pie del modal */}
            <div
              style={{
                padding: '0.875rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#f8fafc',
              }}
            >
              <button onClick={() => setSelectedSubmission(null)} className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

