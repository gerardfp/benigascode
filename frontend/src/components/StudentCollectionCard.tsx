import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Collection, CollectionProgressDTO } from '../types';

export const isCollectionStarted = (progress?: CollectionProgressDTO): boolean => {
  if (!progress || !progress.items || progress.items.length === 0) return false;
  return progress.items.some(
    (item) =>
      item.bestScore > 0 ||
      item.testsPassed > 0 ||
      item.totalSubmissions > 0 ||
      item.status === 'PASSED' ||
      item.status === 'MASTERED' ||
      item.status === 'ATTEMPTED' ||
      item.status === 'IN_PROGRESS'
  );
};

export const CollectionProgressBar: React.FC<{ progress?: CollectionProgressDTO }> = ({ progress }) => {
  if (!progress || !progress.items || progress.items.length === 0) {
    return null;
  }

  const items = progress.items;
  const total = items.length;

  let passed = 0;
  let partial = 0;
  let attemptedFailed = 0;

  for (const item of items) {
    const isPassed =
      item.bestScore >= 100 ||
      item.status === 'PASSED' ||
      item.status === 'MASTERED' ||
      (item.totalTests > 0 && item.testsPassed === item.totalTests);

    if (isPassed) {
      passed++;
    } else if (item.testsPassed > 0 || item.bestScore > 0) {
      partial++;
    } else if (
      item.totalSubmissions > 0 ||
      item.status === 'ATTEMPTED' ||
      item.status === 'IN_PROGRESS'
    ) {
      attemptedFailed++;
    }
  }

  // Si no ha iniciado ningún ejercicio, no mostrar barra de progreso
  if (passed === 0 && partial === 0 && attemptedFailed === 0) {
    return null;
  }

  const notStarted = Math.max(0, total - passed - partial - attemptedFailed);

  const passedPct = (passed / total) * 100;
  const partialPct = (partial / total) * 100;
  const attemptedFailedPct = (attemptedFailed / total) * 100;
  const notStartedPct = (notStarted / total) * 100;

  return (
    <div
      style={{
        width: '6em',
        height: '5px',
        backgroundColor: '#e2e8f0',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '0.625rem',
      }}
      title={`Superados: ${passed}, Con casos conseguidos: ${partial}, Intentados sin éxito: ${attemptedFailed}, Sin empezar: ${notStarted}`}
    >
      {passedPct > 0 && (
        <div style={{ width: `${passedPct}%`, backgroundColor: '#16a34a', height: '100%' }} />
      )}
      {partialPct > 0 && (
        <div style={{ width: `${partialPct}%`, backgroundColor: '#eab308', height: '100%' }} />
      )}
      {attemptedFailedPct > 0 && (
        <div style={{ width: `${attemptedFailedPct}%`, backgroundColor: '#ea580c', height: '100%' }} />
      )}
      {notStartedPct > 0 && (
        <div style={{ width: `${notStartedPct}%`, backgroundColor: '#e2e8f0', height: '100%' }} />
      )}
    </div>
  );
};

export interface StudentCollectionCardProps {
  collection: Collection;
  progress?: CollectionProgressDTO;
  onClick?: () => void;
}

export const StudentCollectionCard: React.FC<StudentCollectionCardProps> = ({
  collection,
  progress,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/collections/${collection.id}`);
    }
  };

  return (
    <div
      className="card"
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#93c5fd';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div>
        <CollectionProgressBar progress={progress} />
        <h4 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
          {collection.title}
        </h4>
        {collection.description && (
          <p
            style={{
              margin: 0,
              color: '#64748b',
              fontSize: '0.8125rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {collection.description}
          </p>
        )}
        {progress?.usedLanguages && (progress.usedLanguages.length ?? 0) > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
            {progress.usedLanguages.map((lang) => (
              <span
                key={lang}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '0.25rem',
                  backgroundColor: lang.toLowerCase() === 'python' ? '#fef3c7' : '#e0e7ff',
                  color: lang.toLowerCase() === 'python' ? '#92400e' : '#3730a3',
                  border: `1px solid ${lang.toLowerCase() === 'python' ? '#fde68a' : '#c7d2fe'}`,
                  fontWeight: 600,
                }}
              >
                {lang.toLowerCase() === 'python' ? '🐍 Python' : '☕ Java'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

