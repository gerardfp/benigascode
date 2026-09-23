import { User, Collection, Exercise, PublicTest, Activity, Course, Group, Submission, Evaluation, PreviewRunResult, GitRepository, GitHubRepo, GitHubConfig, GitHubUserProfile, DeployKey, StudentWorkspace, StudentProgress, AssetDTO, TeacherExerciseDetail, SaveExerciseRequest, TeacherCollectionDetail, SaveCollectionRequest, CollectionProgressDTO, StudentInsightsDTO, TeacherInsightsDTO, TeacherSubmissionItem, TeacherSubmissionDetail, InvitationCode, ValidateInvitationResponse, TeacherStudent, CatalogConflictStrategy, CatalogImportRequest, CatalogImportPreviewDTO, CatalogImportResultDTO, CatalogExportPushRequest, CatalogExportPushResultDTO, CourseCollectionDTO, AuthorizedTeacherDTO, Tag, StudentTag, TeachingSpace, ContextPreviewDTO, BulkCreateStudentItem, BulkCreateStudentResponse, BulkAddTeacherResponse } from '../types';



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
    // Si la llamada es a /me (comprobación inicial de estado de sesión), nunca redirigir
    if (endpoint === '/me') {
      throw new Error('No autenticado');
    }

    // Si la sesión ha caducado y no estamos en la página de login, registro o callbacks OAuth, redirigir
    const pathname = window.location.pathname;
    const isAuthRoute =
      pathname.includes('/login') ||
      pathname.includes('/register') ||
      pathname.includes('/callback') ||
      pathname.includes('/github');

    if (!isAuthRoute) {
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

  const text = await response.text();
  if (!text || !text.trim()) {
    return {} as T;
  }

  return JSON.parse(text);
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

  getPublicCollections: (): Promise<Collection[]> =>
    request<Collection[]>('/collections/public'),

  getMySpaces: (): Promise<TeachingSpace[]> =>
    request<TeachingSpace[]>('/student/spaces'),

  getMySpace: (id: string): Promise<TeachingSpace> =>
    request<TeachingSpace>(`/student/spaces/${id}`),

  claimCollectionAccess: (accessKey: string): Promise<Collection> =>
    request<Collection>('/collections/access', {
      method: 'POST',
      body: JSON.stringify({ accessKey }),
    }),

  getCollection: (id: string): Promise<Collection> =>
    request<Collection>(`/collections/${id}`),

  getCollectionExercises: (id: string): Promise<Exercise[]> =>
    request<Exercise[]>(`/collections/${id}/exercises`),

  setCollectionPreference: (collectionId: string, language: string): Promise<void> =>
    request<void>(`/collections/${collectionId}/preference`, {
      method: 'PUT',
      body: JSON.stringify({ language }),
    }),

  getExercise: (id: string, collectionId?: string): Promise<Exercise> =>
    request<Exercise>(`/exercises/${id}${collectionId ? `?collectionId=${collectionId}` : ''}`),

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

  submitPracticeSolution: (
    exerciseId: string,
    sourceCode: string,
    language: string,
    context?: { courseId?: string; courseCollectionId?: string; collectionId?: string }
  ): Promise<Submission> =>
    request<Submission>(`/exercises/${exerciseId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ sourceCode, language, ...context }),
    }),

  getExerciseSubmissions: (exerciseId: string): Promise<Submission[]> =>
    request<Submission[]>(`/exercises/${exerciseId}/submissions`),

  getWorkspace: (exerciseId: string): Promise<StudentWorkspace> =>
    request<StudentWorkspace>(`/exercises/${exerciseId}/workspace`),

  saveWorkspace: (exerciseId: string, sourceCode: string, language?: string): Promise<StudentWorkspace> =>
    request<StudentWorkspace>(`/exercises/${exerciseId}/workspace`, {
      method: 'PUT',
      body: JSON.stringify({ sourceCode, language }),
    }),

  getMyProgress: (): Promise<StudentProgress[]> =>
    request<StudentProgress[]>('/me/progress'),

  getExerciseProgress: (exerciseId: string): Promise<StudentProgress> =>
    request<StudentProgress>(`/me/progress/exercises/${exerciseId}`),

  getMySubmissions: (): Promise<Submission[]> =>
    request<Submission[]>('/me/submissions'),

  getSubmission: (id: string): Promise<Submission> =>
    request<Submission>(`/submissions/${id}`),

  getEvaluations: (submissionId: string): Promise<Evaluation[]> =>
    request<Evaluation[]>(`/submissions/${submissionId}/evaluations`),

  // Profesor - Espacios Docentes
  listSpaces: (): Promise<TeachingSpace[]> =>
    request<TeachingSpace[]>('/teacher/spaces'),

  getSpace: (id: string): Promise<TeachingSpace> =>
    request<TeachingSpace>(`/teacher/spaces/${id}`),

  createSpace: (space: { name: string; description?: string; contextTagIds?: string[]; requiredTagIds?: string[]; collectionIds?: string[]; teacherIds?: string[] }): Promise<TeachingSpace> =>
    request<TeachingSpace>('/teacher/spaces', {
      method: 'POST',
      body: JSON.stringify({
        ...space,
        contextTagIds: space.contextTagIds || space.requiredTagIds,
        requiredTagIds: space.requiredTagIds || space.contextTagIds,
      }),
    }),

  updateSpace: (id: string, space: { name: string; description?: string; contextTagIds?: string[]; requiredTagIds?: string[]; collectionIds?: string[]; teacherIds?: string[] }): Promise<TeachingSpace> =>
    request<TeachingSpace>(`/teacher/spaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...space,
        contextTagIds: space.contextTagIds || space.requiredTagIds,
        requiredTagIds: space.requiredTagIds || space.contextTagIds,
      }),
    }),

  deleteSpace: (id: string): Promise<void> =>
    request<void>(`/teacher/spaces/${id}`, { method: 'DELETE' }),

  getSpaceTeachers: (id: string): Promise<User[]> =>
    request<User[]>(`/teacher/spaces/${id}/teachers`),

  addSpaceTeacher: (id: string, teacherId: string): Promise<void> =>
    request<void>(`/teacher/spaces/${id}/teachers/${teacherId}`, { method: 'POST' }),

  removeSpaceTeacher: (id: string, teacherId: string): Promise<void> =>
    request<void>(`/teacher/spaces/${id}/teachers/${teacherId}`, { method: 'DELETE' }),

  getSpaceCollections: (id: string): Promise<Collection[]> =>
    request<Collection[]>(`/teacher/spaces/${id}/collections`),

  addSpaceCollection: (id: string, collectionId: string): Promise<void> =>
    request<void>(`/teacher/spaces/${id}/collections/${collectionId}`, { method: 'POST' }),

  removeSpaceCollection: (id: string, collectionId: string): Promise<void> =>
    request<void>(`/teacher/spaces/${id}/collections/${collectionId}`, { method: 'DELETE' }),

  getSpaceStudents: (id: string): Promise<TeacherStudent[]> =>
    request<TeacherStudent[]>(`/teacher/spaces/${id}/students`),

  getSubmissionsForSpace: (spaceId: string): Promise<Submission[]> =>
    request<Submission[]>(`/teacher/spaces/${spaceId}/submissions`),

  // Profesor - Etiquetas y Contextos
  listTags: (category?: string): Promise<Tag[]> =>
    request<Tag[]>(`/teacher/tags${category ? `?category=${encodeURIComponent(category)}` : ''}`),

  createTag: (tag: { category: string; value: string; description?: string; color?: string | null }): Promise<Tag> =>
    request<Tag>('/teacher/tags', {
      method: 'POST',
      body: JSON.stringify(tag),
    }),

  updateTag: (id: string, data: { description?: string; color?: string | null }): Promise<Tag> =>
    request<Tag>(`/teacher/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTag: (id: string): Promise<void> =>
    request<void>(`/teacher/tags/${id}`, { method: 'DELETE' }),

  getStudentTags: (studentId: string, activeOnly = true): Promise<StudentTag[]> =>
    request<StudentTag[]>(`/teacher/tags/students/${studentId}?activeOnly=${activeOnly}`),

  assignStudentTag: (studentId: string, tagId: string, validUntil?: string): Promise<StudentTag> =>
    request<StudentTag>(`/teacher/tags/students/${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ tagId, validUntil }),
    }),

  revokeStudentTag: (assignmentId: string): Promise<void> =>
    request<void>(`/teacher/tags/assignments/${assignmentId}`, { method: 'DELETE' }),

  batchAssignTag: (studentIds: string[], tagId: string, validUntil?: string): Promise<void> =>
    request<void>('/teacher/tags/students/batch-assign', {
      method: 'POST',
      body: JSON.stringify({ studentIds, tagId, validUntil }),
    }),

  batchRevokeTag: (studentIds: string[], tagId: string): Promise<void> =>
    request<void>('/teacher/tags/students/batch-revoke', {
      method: 'POST',
      body: JSON.stringify({ studentIds, tagId }),
    }),

  previewContext: (tagIds: string[]): Promise<ContextPreviewDTO> =>
    request<ContextPreviewDTO>('/teacher/tags/context/preview', {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    }),

  // Compatibilidad con Cursos
  listCourses: (): Promise<Course[]> =>
    request<Course[]>('/teacher/courses'),

  listGroups: (courseId: string): Promise<Group[]> =>
    request<Group[]>(`/teacher/courses/${courseId}/groups`),

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

  // Git Repositories & GitHub OAuth
  getGitHubConfig: (): Promise<GitHubConfig> =>
    request<GitHubConfig>('/teacher/github/config'),

  getGitHubSyncAuthUrl: (): Promise<{ url: string }> =>
    request<{ url: string }>('/teacher/github/auth-url'),

  exchangeGitHubCode: (code: string): Promise<{ accessToken: string }> =>
    request<{ accessToken: string }>('/teacher/github/exchange-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getGitHubRepos: (token: string): Promise<GitHubRepo[]> =>
    request<GitHubRepo[]>(`/teacher/github/repos?token=${encodeURIComponent(token)}`),

  getGitHubUserProfile: (token: string): Promise<GitHubUserProfile> =>
    request<GitHubUserProfile>(`/teacher/github/user?token=${encodeURIComponent(token)}`),

  generateDeployKey: (): Promise<DeployKey> =>
    request<DeployKey>('/teacher/github/generate-deploy-key', { method: 'POST' }),

  getLinkedRepository: (): Promise<GitRepository | null> =>
    request<GitRepository | null>('/teacher/github/repository'),

  linkRepository: (data: {
    name: string;
    repositoryUrl: string;
    branch?: string;
    rootPath?: string;
    authType: string;
    authToken?: string;
    publicKey?: string;
    privateKey?: string;
  }): Promise<GitRepository> =>
    request<GitRepository>('/teacher/github/link-repo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  syncLinkedRepository: (id: string): Promise<any> =>
    request<any>(`/teacher/github/repository/${id}/sync`, { method: 'POST' }),

  unlinkRepository: (id: string): Promise<void> =>
    request<void>(`/teacher/github/repository/${id}`, { method: 'DELETE' }),

  // Teacher - Ejercicios & Colecciones CRUD (Web-First)
  teacherGetExercises: (): Promise<Exercise[]> =>
    request<Exercise[]>('/teacher/exercises'),

  teacherGetExercise: (id: string): Promise<TeacherExerciseDetail> =>
    request<TeacherExerciseDetail>(`/teacher/exercises/${id}`),

  teacherSaveExercise: (data: SaveExerciseRequest, id?: string): Promise<TeacherExerciseDetail> =>
    request<TeacherExerciseDetail>(id ? `/teacher/exercises/${id}` : '/teacher/exercises', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),

  teacherSaveExerciseDraft: (id: string, markdown: string): Promise<{ id: string; exerciseId: string; markdown: string; updatedAt: string }> =>
    request<{ id: string; exerciseId: string; markdown: string; updatedAt: string }>(`/teacher/exercises/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ markdown }),
    }),

  teacherDeleteExerciseDraft: (id: string): Promise<void> =>
    request<void>(`/teacher/exercises/${id}/draft`, { method: 'DELETE' }),

  teacherDeleteExercise: (id: string): Promise<void> =>
    request<void>(`/teacher/exercises/${id}`, { method: 'DELETE' }),

  batchAssignExerciseTag: (exerciseIds: string[], tag: string): Promise<void> =>
    request<void>('/teacher/exercises/batch-assign-tag', {
      method: 'POST',
      body: JSON.stringify({ exerciseIds, tag }),
    }),

  batchRevokeExerciseTag: (exerciseIds: string[], tag: string): Promise<void> =>
    request<void>('/teacher/exercises/batch-revoke-tag', {
      method: 'POST',
      body: JSON.stringify({ exerciseIds, tag }),
    }),

  teacherUploadAsset: async (exerciseId: string, file: File): Promise<AssetDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<AssetDTO>(`/teacher/exercises/${exerciseId}/assets`, {
      method: 'POST',
      body: formData,
    });
  },

  teacherDeleteAsset: (exerciseId: string, filename: string): Promise<void> =>
    request<void>(`/teacher/exercises/${exerciseId}/assets/${encodeURIComponent(filename)}`, { method: 'DELETE' }),

  teacherExportExerciseZipUrl: (exerciseId: string): string =>
    `${API_BASE}/teacher/exercises/${exerciseId}/export.zip`,

  teacherGetCollections: (): Promise<Collection[]> =>
    request<Collection[]>('/teacher/collections'),

  teacherGetCollection: (id: string): Promise<TeacherCollectionDetail> =>
    request<TeacherCollectionDetail>(`/teacher/collections/${id}`),

  teacherSaveCollection: (data: SaveCollectionRequest, id?: string): Promise<TeacherCollectionDetail> =>
    request<TeacherCollectionDetail>(id ? `/teacher/collections/${id}` : '/teacher/collections', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),

  teacherDeleteCollection: (id: string): Promise<void> =>
    request<void>(`/teacher/collections/${id}`, { method: 'DELETE' }),

  teacherExportCollectionZipUrl: (collectionId: string): string =>
    `${API_BASE}/teacher/collections/${collectionId}/export.zip`,

  // Progreso & Insights (Alumno)
  getCollectionProgress: (collectionId: string): Promise<CollectionProgressDTO> =>
    request<CollectionProgressDTO>(`/collections/${collectionId}/progress`),

  getMyInsights: (): Promise<StudentInsightsDTO> =>
    request<StudentInsightsDTO>('/me/insights'),

  // Insights y Envíos (Profesor)
  getTeacherInsights: (params?: {
    spaceId?: string;
    teachingSpaceId?: string;
    courseId?: string;
    groupId?: string;
    studentId?: string;
    tagId?: string;
  }): Promise<TeacherInsightsDTO> => {
    const sp = new URLSearchParams();
    const sId = params?.spaceId || params?.teachingSpaceId || params?.courseId;
    if (sId) sp.set('spaceId', sId);
    if (params?.groupId) sp.set('groupId', params.groupId);
    if (params?.studentId) sp.set('studentId', params.studentId);
    if (params?.tagId) sp.set('tagId', params.tagId);
    const qs = sp.toString();
    return request<TeacherInsightsDTO>(`/teacher/insights${qs ? `?${qs}` : ''}`);
  },

  getTeacherSubmissions: (params?: {
    spaceId?: string;
    teachingSpaceId?: string;
    courseId?: string;
    groupId?: string;
    studentId?: string;
    exerciseId?: string;
    status?: string;
    search?: string;
    tag?: string;
  }): Promise<TeacherSubmissionItem[]> => {
    const sp = new URLSearchParams();
    const sId = params?.spaceId || params?.teachingSpaceId || params?.courseId;
    if (sId) sp.set('spaceId', sId);
    if (params?.groupId) sp.set('groupId', params.groupId);
    if (params?.studentId) sp.set('studentId', params.studentId);
    if (params?.exerciseId) sp.set('exerciseId', params.exerciseId);
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    if (params?.tag) sp.set('tag', params.tag);
    const qs = sp.toString();
    return request<TeacherSubmissionItem[]>(`/teacher/submissions${qs ? `?${qs}` : ''}`);
  },

  getTeacherSubmissionDetail: (id: string): Promise<TeacherSubmissionDetail> =>
    request<TeacherSubmissionDetail>(`/teacher/submissions/${id}`),

  // ==================== INVITACIONES Y REGISTRO ALUMNO ====================
  validateInvitation: (code: string): Promise<ValidateInvitationResponse> =>
    request<ValidateInvitationResponse>('/auth/invitation/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getGitHubAuthUrl: (state?: string, redirectUri?: string): Promise<{ configured: boolean; url: string; redirectUri?: string }> => {
    const sp = new URLSearchParams();
    if (state) sp.set('state', state);
    if (redirectUri) sp.set('redirectUri', redirectUri);
    const qs = sp.toString();
    return request<{ configured: boolean; url: string; redirectUri?: string }>(`/auth/github/url${qs ? `?${qs}` : ''}`);
  },

  authenticateWithGitHub: (code: string, invitationCode?: string, redirectUri?: string): Promise<User> =>
    request<User>('/auth/github/authenticate', {
      method: 'POST',
      body: JSON.stringify({ code, invitationCode, redirectUri }),
    }),

  // Profesores autorizados mediante GitHub
  listAuthorizedTeachers: (): Promise<AuthorizedTeacherDTO[]> =>
    request<AuthorizedTeacherDTO[]>('/teacher/teachers'),

  addAuthorizedTeacher: (githubUsername: string, notes?: string): Promise<AuthorizedTeacherDTO> =>
    request<AuthorizedTeacherDTO>('/teacher/teachers', {
      method: 'POST',
      body: JSON.stringify({ githubUsername, notes }),
    }),

  bulkAddTeachers: (items: { githubUsername: string; notes?: string }[]): Promise<BulkAddTeacherResponse> =>
    request<BulkAddTeacherResponse>('/teacher/teachers/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    }),

  removeAuthorizedTeacher: (id: string): Promise<void> =>
    request<void>(`/teacher/teachers/${id}`, {
      method: 'DELETE',
    }),

  // Claves de invitación (Profesor)
  listTeacherInvitations: (): Promise<InvitationCode[]> =>
    request<InvitationCode[]>('/teacher/invitations'),

  createTeacherInvitation: (code: string, description?: string, active?: boolean): Promise<InvitationCode> =>
    request<InvitationCode>('/teacher/invitations', {
      method: 'POST',
      body: JSON.stringify({ code, description, active }),
    }),

  toggleTeacherInvitation: (id: string): Promise<InvitationCode> =>
    request<InvitationCode>(`/teacher/invitations/${id}/toggle`, {
      method: 'PUT',
    }),

  deleteTeacherInvitation: (id: string): Promise<void> =>
    request<void>(`/teacher/invitations/${id}`, {
      method: 'DELETE',
    }),

  createStudentAccount: (data: { username: string; fullName: string; password: string }): Promise<User> =>
    request<User>('/teacher/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkCreateStudents: (items: BulkCreateStudentItem[]): Promise<BulkCreateStudentResponse> =>
    request<BulkCreateStudentResponse>('/teacher/students/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    }),

  deleteStudentAccount: (studentId: string): Promise<void> =>
    request<void>(`/teacher/students/${studentId}`, {
      method: 'DELETE',
    }),

  // Gestión de Alumnos y Etiquetas (Profesor)
  listTeacherStudents: (
    paramsOrCourseId?: { spaceId?: string; courseId?: string; tag?: string; search?: string; category?: string; value?: string } | string,
    tag?: string,
    search?: string
  ): Promise<TeacherStudent[]> => {
    const sp = new URLSearchParams();
    if (typeof paramsOrCourseId === 'object' && paramsOrCourseId !== null) {
      if (paramsOrCourseId.spaceId) sp.set('spaceId', paramsOrCourseId.spaceId);
      if (paramsOrCourseId.courseId) sp.set('courseId', paramsOrCourseId.courseId);
      if (paramsOrCourseId.tag) sp.set('tag', paramsOrCourseId.tag);
      if (paramsOrCourseId.search) sp.set('search', paramsOrCourseId.search);
      if (paramsOrCourseId.category) sp.set('category', paramsOrCourseId.category);
      if (paramsOrCourseId.value) sp.set('value', paramsOrCourseId.value);
    } else {
      if (paramsOrCourseId) sp.set('courseId', paramsOrCourseId);
      if (tag) sp.set('tag', tag);
      if (search) sp.set('search', search);
    }
    const qs = sp.toString();
    return request<TeacherStudent[]>(`/teacher/students${qs ? `?${qs}` : ''}`);
  },

  assignStudentCourse: (studentId: string, courseId: string, groupId?: string): Promise<void> => {
    const sp = new URLSearchParams();
    if (groupId) sp.set('groupId', groupId);
    const qs = sp.toString();
    return request<void>(`/teacher/students/${studentId}/courses/${courseId}${qs ? `?${qs}` : ''}`, {
      method: 'POST',
    });
  },

  unassignStudentCourse: (studentId: string, courseId: string): Promise<void> =>
    request<void>(`/teacher/students/${studentId}/courses/${courseId}`, {
      method: 'DELETE',
    }),

  addStudentTag: (studentId: string, tag: string): Promise<void> =>
    request<void>(`/teacher/students/${studentId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    }),

  removeStudentTag: (studentId: string, tag: string): Promise<void> =>
    request<void>(`/teacher/students/${studentId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    }),

  listAllStudentTags: (): Promise<string[]> =>
    request<string[]>('/teacher/students/tags'),

  // Profesores del curso
  getCourseTeachers: (courseId: string): Promise<User[]> =>
    request<User[]>(`/teacher/courses/${courseId}/teachers`),

  getAvailableTeachers: (courseId: string): Promise<User[]> =>
    request<User[]>(`/teacher/courses/${courseId}/available-teachers`),

  addCourseTeacher: (courseId: string, teacherId: string): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/teachers/${teacherId}`, {
      method: 'POST',
    }),

  removeCourseTeacher: (courseId: string, teacherId: string): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/teachers/${teacherId}`, {
      method: 'DELETE',
    }),

  // Alumnos del curso
  getCourseStudents: (courseId: string): Promise<TeacherStudent[]> =>
    request<TeacherStudent[]>(`/teacher/courses/${courseId}/students`),

  enrollCourseStudent: (courseId: string, userId: string, groupId?: string): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/students`, {
      method: 'POST',
      body: JSON.stringify({ userId, groupId }),
    }),

  unenrollCourseStudent: (courseId: string, studentId: string): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/students/${studentId}`, {
      method: 'DELETE',
    }),

  // Colecciones asociadas a cursos y asignaciones selectivas
  getCourseCollections: (courseId: string): Promise<CourseCollectionDTO[]> =>
    request<CourseCollectionDTO[]>(`/teacher/courses/${courseId}/collections`),

  assignCollectionToCourse: (
    courseId: string,
    collectionId: string,
    data?: { assignedAllStudents?: boolean; studentIds?: string[] }
  ): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/collections/${collectionId}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  updateCollectionAssignments: (
    courseId: string,
    collectionId: string,
    data: { assignedAllStudents: boolean; studentIds: string[] }
  ): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/collections/${collectionId}/assignments`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeCollectionFromCourse: (courseId: string, collectionId: string): Promise<void> =>
    request<void>(`/teacher/courses/${courseId}/collections/${collectionId}`, {
      method: 'DELETE',
    }),

  // ==================== CATÁLOGO IMPORT / EXPORT ====================
  previewCatalogImport: (data: CatalogImportRequest): Promise<CatalogImportPreviewDTO> =>
    request<CatalogImportPreviewDTO>('/teacher/catalog/import/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executeCatalogImport: (data: CatalogImportRequest): Promise<CatalogImportResultDTO> =>
    request<CatalogImportResultDTO>('/teacher/catalog/import/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  previewCatalogZipImport: (file: File, conflictStrategy: CatalogConflictStrategy): Promise<CatalogImportPreviewDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conflictStrategy', conflictStrategy);
    return request<CatalogImportPreviewDTO>('/teacher/catalog/import/zip/preview', {
      method: 'POST',
      body: formData,
    });
  },

  executeCatalogZipImport: (file: File, conflictStrategy: CatalogConflictStrategy): Promise<CatalogImportResultDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conflictStrategy', conflictStrategy);
    return request<CatalogImportResultDTO>('/teacher/catalog/import/zip/execute', {
      method: 'POST',
      body: formData,
    });
  },

  pushCatalogExport: (data: CatalogExportPushRequest): Promise<CatalogExportPushResultDTO> =>
    request<CatalogExportPushResultDTO>('/teacher/catalog/export/push', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


