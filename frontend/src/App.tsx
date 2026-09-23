import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentSpaceDetailView } from './pages/StudentSpaceDetailView';
import { StudentCollectionsView } from './pages/StudentCollectionsView';
import { StudentHistoryView } from './pages/StudentHistoryView';
import { ExerciseView } from './pages/ExerciseView';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherActivityView } from './pages/TeacherActivityView';
import { TeacherSpacesView } from './pages/TeacherSpacesView';
import { TeacherActivitiesView } from './pages/TeacherActivitiesView';
import { CollectionDetailView } from './pages/CollectionDetailView';
import { GitHubCallbackView } from './pages/GitHubCallbackView';
import { TeacherExercisesView } from './pages/TeacherExercisesView';
import { TeacherCollectionsView } from './pages/TeacherCollectionsView';
import { StudentInsightsView } from './pages/StudentInsightsView';
import { TeacherInsightsView } from './pages/TeacherInsightsView';
import { TeacherSubmissionsView } from './pages/TeacherSubmissionsView';
import { RegisterPage } from './pages/RegisterPage';
import { TeacherStudentsView } from './pages/TeacherStudentsView';
import { TeacherAdminView } from './pages/TeacherAdminView';

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
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to={user.role === 'TEACHER' || user.role === 'ADMIN' ? "/teacher" : "/"} replace />
              ) : (
                <RegisterPage />
              )
            }
          />
          <Route
            path="/auth/github/callback"
            element={<GitHubCallbackView onAuthSuccess={setUser} />}
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
            path="/spaces/:spaceId"
            element={user ? <StudentSpaceDetailView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/collections"
            element={user ? <StudentCollectionsView /> : <Navigate to="/login" replace />}
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
            element={user ? <StudentHistoryView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/progress"
            element={user ? <StudentInsightsView /> : <Navigate to="/login" replace />}
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
            path="/teacher/spaces"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherSpacesView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/courses"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <Navigate to="/teacher/spaces" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/students"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherStudentsView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/admin"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherAdminView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/teachers"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <Navigate to="/teacher/admin?tab=accounts&subtab=teachers" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/invitations"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <Navigate to="/teacher/admin?tab=accounts&subtab=students&section=invitations" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/sync"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <Navigate to="/teacher/admin?tab=sync" replace />
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
            path="/teacher/sync/github/callback"
            element={<GitHubCallbackView onAuthSuccess={setUser} />}
          />
          <Route
            path="/teacher/insights"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherInsightsView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/teacher/submissions"
            element={
              user && (user.role === 'TEACHER' || user.role === 'ADMIN') ? (
                <TeacherSubmissionsView />
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

