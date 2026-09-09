import { User, Collection, Exercise, PublicTest, Activity, Course, Submission, Evaluation, PreviewRunResult } from '../types';

const API_BASE = '/api/v1';

function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && ['POST', 'PUT', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-XSRF-TOKEN', csrfToken);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Para incluir cookie JSESSIONID
  });

  if (response.status === 401) {
    // Si la sesión ha caducado y no estamos en la página de login, redirigir
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sesión no válida o caducada');
  }

  if (!response.ok) {
    let errorMsg = `Error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errorMsg;
    } catch {
      // Ignorar error al parsear JSON
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Autenticación
  login: (username: string, password: string): Promise<User> =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: (): Promise<void> =>
    request<void>('/auth/logout', { method: 'POST' }),

  getMe: (): Promise<User> =>
    request<User>('/me'),

  // Alumno - Colecciones y Ejercicios
  getMyCollections: (): Promise<Collection[]> =>
    request<Collection[]>('/me/collections'),

  claimCollectionAccess: (accessKey: string): Promise<Collection> =>
    request<Collection>('/collections/access', {
      method: 'POST',
      body: JSON.stringify({ accessKey }),
    }),

  getCollection: (id: string): Promise<Collection> =>
    request<Collection>(`/collections/${id}`),

  getCollectionExercises: (id: string): Promise<Exercise[]> =>
    request<Exercise[]>(`/collections/${id}/exercises`),

  getExercise: (id: string): Promise<Exercise> =>
    request<Exercise>(`/exercises/${id}`),

  getPublicTests: (id: string): Promise<PublicTest[]> =>
    request<PublicTest[]>(`/exercises/${id}/public-tests`),

  previewRun: (exerciseVersionId: string, sourceCode: string, language: string): Promise<PreviewRunResult> =>
    request<PreviewRunResult>(`/exercises/${exerciseVersionId}/preview-runs`, {
      method: 'POST',
      body: JSON.stringify({ sourceCode, language }),
    }),

  // Alumno - Actividades y Entregas
  getMyActivities: (): Promise<Activity[]> =>
    request<Activity[]>('/me/activities'),

  getActivity: (id: string): Promise<Activity> =>
    request<Activity>(`/activities/${id}`),

  submitSolution: (activityId: string, exerciseId: string, sourceCode: string, language: string): Promise<Submission> =>
    request<Submission>(`/activities/${activityId}/exercises/${exerciseId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ sourceCode, language }),
    }),

  getMySubmissions: (): Promise<Submission[]> =>
    request<Submission[]>('/me/submissions'),

  getSubmission: (id: string): Promise<Submission> =>
    request<Submission>(`/submissions/${id}`),

  getEvaluations: (submissionId: string): Promise<Evaluation[]> =>
    request<Evaluation[]>(`/submissions/${submissionId}/evaluations`),

  // Profesor
  listCourses: (): Promise<Course[]> =>
    request<Course[]>('/teacher/courses'),

  createCourse: (course: { name: string; code: string; academicYear: string; description?: string }): Promise<Course> =>
    request<Course>('/teacher/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    }),

  listActivities: (): Promise<Activity[]> =>
    request<Activity[]>('/teacher/activities'),

  createActivity: (activity: {
    courseId: string;
    name: string;
    type: string;
    exerciseVersionId: string;
    maxAttempts?: number | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
    dueAt?: string | null;
  }): Promise<Activity> =>
    request<Activity>('/teacher/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    }),

  syncContent: (): Promise<any> =>
    request<any>('/teacher/content/sync', { method: 'POST' }),

  getSyncStatus: (): Promise<any[]> =>
    request<any[]>('/teacher/content/sync-status'),

  generateAccessKey: (collectionId: string, maxUses?: number, expiresAt?: string): Promise<{ rawKey: string }> =>
    request<{ rawKey: string }>(`/teacher/content/collections/${collectionId}/access-keys?maxUses=${maxUses || ''}&expiresAt=${expiresAt || ''}`, {
      method: 'POST',
    }),

  getSubmissionsForCourse: (courseId: string): Promise<Submission[]> =>
    request<Submission[]>(`/teacher/courses/${courseId}/submissions`),

  reevaluate: (submissionId: string, reason: string): Promise<Evaluation> =>
    request<Evaluation>(`/teacher/evaluations/${submissionId}/reevaluate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

