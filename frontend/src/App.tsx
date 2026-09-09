import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ExerciseView } from './pages/ExerciseView';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherActivityView } from './pages/TeacherActivityView';
import { GitSyncView } from './pages/GitSyncView';
import { GitHubCallbackView } from './pages/GitHubCallbackView';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>Iniciando Benigascode...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={() => setUser(null)} />
      <main>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={setUser} />}
          />

          {/* Rutas de Alumno */}
          <Route
            path="/"
            element={user ? <StudentDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/activity/:activityId/exercise/:exerciseId"
            element={user ? <ExerciseView /> : <Navigate to="/login" replace />}
          />

          {/* Rutas de Profesor */}
          <Route
            path="/teacher"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/courses/:courseId/submissions"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherActivityView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/sync"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <GitSyncView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/sync/github/callback"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <GitHubCallbackView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;

