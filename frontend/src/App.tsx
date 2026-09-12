import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
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
import { TeacherExercisesView } from './pages/TeacherExercisesView';
import { TeacherCollectionsView } from './pages/TeacherCollectionsView';

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
            path="/teacher/collections"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherCollectionsView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/exercises"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherExercisesView />
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

          {/* Ruta no encontrada */}
          <Route
            path="*"
            element={
              <div className="app-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div className="card" style={{ maxWidth: 500, margin: '0 auto', padding: '2rem' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.75rem' }}>
                    404 — Página no encontrada
                  </h1>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                    La ruta a la que intentas acceder no existe o no está disponible.
                  </p>
                  <Link
                    to={user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? "/teacher" : "/"}
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                  >
                    Volver al Panel Principal
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;

