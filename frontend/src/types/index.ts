export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  versionNumber: number;
}

export interface Exercise {
  id: string;
  exerciseId: string;
  slug: string;
  title: string;
  statement: string;
  language: string;
  runtimeId: string;
  versionNumber: number;
  starterCode?: string;
}

export interface PublicTest {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface Activity {
  id: string;
  courseId: string;
  name: string;
  type: 'PRACTICE' | 'EXAM' | 'ASSIGNMENT';
  currentVersionId: string;
  versionNumber: number;
  exerciseVersionId: string;
  exerciseTitle: string;
  maxAttempts: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  dueAt: string | null;
  isAvailableNow: boolean;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  description: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  activityId?: string;
  activityName?: string;
  exerciseId?: string;
  exerciseVersionId: string;
  exerciseTitle: string;
  language: string;
  status: string;
  sourceCode: string;
  sourceHash?: string;
  attemptNumber?: number;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  submissionId: string;
  status: 'CORRECT' | 'INCORRECT' | 'COMPILE_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR' | 'SYSTEM_ERROR' | 'CANCELLED';
  score: number;
  reason: string;
  runtimeId: string;
  actualRuntime?: string;
  runtimeImageDigest: string;
  compileSuccess?: boolean;
  compileStdout?: string;
  compileStderr?: string;
  totalTests?: number;
  passedTests?: number;
  totalPublicTests?: number;
  passedPublicTests?: number;
  totalPrivateTests?: number;
  passedPrivateTests?: number;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  testResults: TestResult[];
}

export interface StudentWorkspace {
  exerciseId: string;
  sourceCode: string;
  updatedAt: string | null;
  isStarter: boolean;
}

export interface StudentProgress {
  exerciseId: string;
  exerciseTitle: string;
  exerciseSlug: string;
  activityId?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ATTEMPTED' | 'PASSED' | 'MASTERED';
  bestScore: number;
  totalSubmissions: number;
  consumedAttempts: number;
  lastSubmissionId?: string;
  lastEvaluationId?: string;
  lastStatus?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface TestResult {
  id: string;
  testId: string;
  isPublic: boolean;
  status: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'RUNTIME_ERROR';
  durationMs: number;
  stdout: string;
  stderr?: string;
  expectedOutput: string;
  actualOutput: string;
  score: number;
}

export interface PreviewRunResult {
  compileSuccess: boolean;
  compileStdout: string;
  compileStderr: string;
  testResults: {
    testId: string;
    testName?: string;
    status: string;
    durationMs: number;
    stdout: string;
    expectedOutput: string;
    passed: boolean;
  }[];
}

export interface GitRepository {
  id: string;
  name: string;
  repositoryUrl: string;
  branch: string;
  rootPath: string;
  authType: 'OAUTH_TOKEN' | 'DEPLOY_KEY' | 'PUBLIC';
  hasToken: boolean;
  publicKey?: string;
  lastCommit?: string;
  lastSyncAt?: string;
  lastSyncStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  lastSyncError?: string;
  createdAt: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  description?: string;
}

export interface GitHubConfig {
  oauthEnabled: boolean;
  clientId: string;
  redirectUri: string;
}

export interface DeployKey {
  publicKey: string;
  privateKey: string;
}

