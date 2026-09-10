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
import { TeacherCoursesView } from './pages/TeacherCoursesView';
import { TeacherActivitiesView } from './pages/TeacherActivitiesView';
import { CollectionDetailView } from './pages/CollectionDetailView';
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
            element={
              user ? (
                <Navigate to={user.role === 'TEACHER' || user.role === 'ADMIN' ? "/teacher" : "/"} replace />
              ) : (
                <LoginPage onLoginSuccess={setUser} />
              )
            }
          />

          {/* Rutas de Alumno */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === 'TEACHER' || user.role === 'ADMIN' ? (
                <Navigate to="/teacher" replace />
              ) : (
                <StudentDashboard />
              )
            }
          />
          <Route
            path="/collections"
            element={user ? <StudentDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/collections/:collectionId"
            element={user ? <CollectionDetailView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/collections/:collectionId/exercise/:exerciseId"
            element={user ? <ExerciseView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/exercise/:exerciseId"
            element={user ? <ExerciseView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/history"
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
            path="/teacher/courses"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherCoursesView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/activities"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherActivitiesView />
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
          <Route
            path="*"
            element={
              <Navigate
                to={user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? "/teacher" : "/"}
                replace
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;

