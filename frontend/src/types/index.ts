export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  githubUsername?: string | null;
  avatarUrl?: string | null;
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
  tags?: string[];
  collections?: string[];
  createdAt?: string;
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

export interface Group {
  id: string;
  courseId: string;
  name: string;
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
  testName?: string;
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

export interface GitHubUserProfile {
  id: string;
  login: string;
  name: string;
  email?: string;
  avatarUrl?: string;
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

export interface TestCaseDTO {
  id?: string;
  isPublic: boolean;
  orderIndex: number;
  weight: number;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface AssetDTO {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

export interface TeacherExerciseDetail {
  id: string;
  slug: string;
  title: string;
  statement: string;
  language: string;
  runtimeId: string;
  versionNumber: number;
  starterCode?: string;
  templates?: Record<string, string>;
  tags?: string[];
  testCases: TestCaseDTO[];
  assets: AssetDTO[];
}

export interface SaveExerciseRequest {
  title: string;
  slug: string;
  statement: string;
  language: string;
  runtimeId: string;
  starterCode?: string;
  templates?: Record<string, string>;
  tags?: string[];
  testCases: TestCaseDTO[];
}

export interface CollectionItemDTO {
  exerciseId: string;
  exerciseTitle: string;
  exerciseSlug: string;
  orderIndex: number;
}

export interface TeacherCollectionDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  versionNumber: number;
  exercises: CollectionItemDTO[];
}

export interface SaveCollectionRequest {
  title: string;
  slug: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  exerciseIds: string[];
}

export interface ExerciseProgressItem {
  exerciseId: string;
  exerciseVersionId: string;
  slug: string;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ATTEMPTED' | 'PASSED' | 'MASTERED';
  bestScore: number;
  testsPassed: number;
  totalTests: number;
  passPercentage: number;
  totalSubmissions: number;
}

export interface CollectionProgressDTO {
  collectionId: string;
  collectionTitle: string;
  totalExercises: number;
  completedExercises: number;
  attemptedExercises: number;
  notStartedExercises: number;
  completionPercentage: number;
  averageScore: number;
  items: ExerciseProgressItem[];
}

export interface CollectionProgressSummary {
  collectionId: string;
  slug: string;
  title: string;
  totalExercises: number;
  completedExercises: number;
  attemptedExercises: number;
  completionPercentage: number;
  averageScore: number;
}

export interface TagProgressSummary {
  tag: string;
  totalExercises: number;
  completedExercises: number;
  attemptedExercises: number;
  completionPercentage: number;
}

export interface DailyActivityItem {
  date: string;
  submissionsCount: number;
  passedCount: number;
}

export interface StudentExerciseDetailItem {
  exerciseId: string;
  exerciseVersionId: string;
  slug: string;
  title: string;
  collectionId: string;
  collectionTitle: string;
  tags: string[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ATTEMPTED' | 'PASSED' | 'MASTERED';
  bestScore: number;
  testsPassed: number;
  totalTests: number;
  passPercentage: number;
  totalSubmissions: number;
  lastSubmissionAt?: string;
}

export interface StudentInsightsDTO {
  totalExercises: number;
  completedExercises: number;
  attemptedExercises: number;
  notStartedExercises: number;
  totalSubmissions: number;
  completionPercentage: number;
  averageScore: number;
  collections: CollectionProgressSummary[];
  tags: TagProgressSummary[];
  activityTimeline: DailyActivityItem[];
  exercises: StudentExerciseDetailItem[];
}

export interface DifficultExerciseItem {
  exerciseId: string;
  slug: string;
  title: string;
  totalSubmissions: number;
  passedSubmissions: number;
  passRate: number;
}

export interface GroupSummaryItem {
  groupId: string;
  groupName: string;
  courseId: string;
  courseName: string;
  studentCount: number;
  totalSubmissions: number;
  averageScore: number;
  passRate: number;
}

export interface StudentLeaderboardItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  groupId?: string;
  groupName?: string;
  exercisesSolved: number;
  exercisesAttempted: number;
  averageScore: number;
  totalSubmissions: number;
  lastActiveAt?: string;
}

export interface TeacherInsightsDTO {
  scope: 'GENERAL' | 'GROUP' | 'STUDENT';
  courseId?: string;
  courseName?: string;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  totalStudents: number;
  totalSubmissions: number;
  totalExercisesSolved: number;
  overallPassRate: number;
  overallAverageScore: number;
  difficultExercises: DifficultExerciseItem[];
  scoreDistribution: Record<string, number>;
  activityTimeline: DailyActivityItem[];
  groups: GroupSummaryItem[];
  students: StudentLeaderboardItem[];
  studentDetail?: StudentInsightsDTO;
}

export interface TeacherSubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  groupName: string;
  activityId?: string;
  activityName?: string;
  exerciseId?: string;
  exerciseSlug: string;
  exerciseTitle: string;
  language: string;
  status: string;
  evaluationStatus: string;
  score: number;
  testsPassed: number;
  totalTests: number;
  compileSuccess?: boolean;
  attemptNumber: number;
  createdAt: string;
}

export interface TeacherSubmissionDetail {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  groupName: string;
  activityId?: string;
  activityName?: string;
  exerciseId?: string;
  exerciseSlug: string;
  exerciseTitle: string;
  language: string;
  sourceCode: string;
  status: string;
  attemptNumber: number;
  createdAt: string;
  evaluation?: Evaluation;
}

export interface InvitationCode {
  id: string;
  code: string;
  description: string | null;
  active: boolean;
  createdByUsername: string | null;
  createdByFullName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateInvitationResponse {
  valid: boolean;
  code: string;
  description: string | null;
  message: string;
}

export interface StudentCourseMembership {
  courseId: string;
  courseName: string;
  courseCode: string;
  academicYear: string;
  groupId: string | null;
  groupName: string | null;
}

export interface TeacherStudent {
  id: string;
  username: string;
  fullName: string;
  githubUsername: string | null;
  avatarUrl: string | null;
  createdAt: string;
  courses: StudentCourseMembership[];
  tags: string[];
}

export type CatalogConflictStrategy = 'OVERWRITE' | 'SKIP' | 'NEW_SLUG';

export interface CatalogImportRequest {
  repositoryUrl: string;
  branch?: string;
  rootPath?: string;
  authType?: 'OAUTH_TOKEN' | 'PUBLIC';
  authToken?: string;
  conflictStrategy: CatalogConflictStrategy;
}

export interface CatalogImportItemDTO {
  slug: string;
  title: string;
  type: 'EXERCISE' | 'COLLECTION';
  existsInDb: boolean;
  action: 'CREATE' | 'OVERWRITE' | 'SKIP' | 'CREATE_NEW_SLUG';
  targetSlug: string;
}

export interface CatalogImportPreviewDTO {
  repositoryUrl: string;
  branch: string;
  commitHash: string;
  totalExercises: number;
  totalCollections: number;
  existingExercisesCount: number;
  newExercisesCount: number;
  existingCollectionsCount: number;
  newCollectionsCount: number;
  strategy: CatalogConflictStrategy;
  items: CatalogImportItemDTO[];
}

export interface CatalogImportResultDTO {
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  totalProcessed: number;
  importedNew: number;
  overwritten: number;
  skipped: number;
  renamed: number;
  collectionsProcessed: number;
  commitHash?: string;
  errors: string[];
}

export interface CatalogExportPushRequest {
  repositoryUrl: string;
  branch?: string;
  rootPath?: string;
  authToken?: string;
  commitMessage?: string;
}

export interface CatalogExportPushResultDTO {
  success: boolean;
  commitSha: string;
  exercisesCount: number;
  collectionsCount: number;
  message: string;
  repositoryUrl: string;
}

export interface CourseCollectionDTO {
  id: string;
  courseId: string;
  collectionId: string;
  slug: string;
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  assignedAllStudents: boolean;
  assignedStudentIds: string[];
  assignedStudentsCount: number;
  totalCourseStudents: number;
}

export interface AuthorizedTeacherDTO {
  id: string | null;
  githubUsername: string;
  notes?: string | null;
  createdAt: string;
  createdByName?: string | null;
  registered: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
  isPrimary: boolean;
}

export interface AddAuthorizedTeacherRequest {
  githubUsername: string;
  notes?: string;
}

