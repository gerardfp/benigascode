import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TeacherManagementView } from './TeacherManagementView';
import { GitSyncView } from './GitSyncView';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export const TeacherAdminView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'teachers' | 'sync') || 'teachers';

  const setTab = (tab: 'teachers' | 'sync') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1rem' }}>
      {/* Pestañas Principales: Profesores | Importar/exportar */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1rem',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('teachers')}
          style={{
            padding: '0.45rem 0.85rem',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'teachers' ? 700 : 500,
            color: activeTab === 'teachers' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'teachers' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'color 0.15s',
          }}
        >
          <ShieldCheck size={16} />
          Profesores
        </button>

        <button
          type="button"
          onClick={() => setTab('sync')}
          style={{
            padding: '0.45rem 0.85rem',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'sync' ? 700 : 500,
            color: activeTab === 'sync' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'sync' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'color 0.15s',
          }}
        >
          <RefreshCw size={16} />
          Importar / Exportar
        </button>
      </div>

      {activeTab === 'teachers' && (
        <TeacherManagementView embedded={true} />
      )}

      {activeTab === 'sync' && (
        <GitSyncView />
      )}
    </div>
  );
};
