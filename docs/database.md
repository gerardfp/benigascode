# Modelo de Base de Datos — PostgreSQL 18

El esquema de base de datos de Benigascode es estrictamente relacional con claves primarias UUID, claves foráneas e integridad referencial garantizada. Se utiliza `jsonb` de forma selectiva para configuraciones variables de compilación, ejecución y feedback sin desnaturalizar las relaciones fundamentales.

---

## 1. Diagrama Entidad-Relación Conceptual

```text
users
  │ 1:N
  ├── course_memberships ── N:1 ── courses ── 1:N ── groups
  │                                   │ 1:N
  │                               activities ── 1:N ── activity_versions
  │                                                         │ 1:N
  ├── access_grants ── N:1 ── collections                   │
  │                                 │ 1:N                   │
  │                           collection_versions           │
  │                                                         │
  │                                                         │
  ├── submissions ──────────────────────────────────────────┘
  │      │ 1:N
  │      ├── evaluations ── 1:N ── test_results
  │      │
  │      └── evaluation_jobs (Cola con SKIP LOCKED)
  │
  └── audit_events
```

---

## 2. Tablas Principales

### Identidad
- `users`: `id (UUID PK)`, `username (VARCHAR UNIQUE)`, `password_hash (VARCHAR)`, `full_name (VARCHAR)`, `role (VARCHAR: STUDENT, TEACHER, ADMIN)`, `created_at`, `updated_at`.
- `sessions`: Gestión de sesiones activas del usuario (para invalidación instantánea).

### Formación y Aprendizaje
- `courses`: `id (UUID PK)`, `name`, `code`, `academic_year`, `created_at`.
- `groups`: `id (UUID PK)`, `course_id (FK)`, `name`.
- `course_memberships`: `id (UUID PK)`, `user_id (FK)`, `course_id (FK)`, `group_id (FK NULLABLE)`, `role (STUDENT, TEACHER)`.

### Contenido Docente
- `exercises`: `id (UUID PK)`, `slug (VARCHAR UNIQUE)`, `created_at`.
- `exercise_versions`: `id (UUID PK)`, `exercise_id (FK)`, `version_number (INT)`, `title`, `statement (TEXT)`, `language (VARCHAR)`, `runtime_id`, `compile_config (JSONB)`, `run_config (JSONB)`, `scoring_config (JSONB)`, `content_hash (CHAR 64)`, `git_commit (CHAR 40)`, `created_at`.
- `collections`: `id (UUID PK)`, `slug (VARCHAR UNIQUE)`, `visibility (VARCHAR: PUBLIC, PRIVATE)`, `created_at`.
- `collection_versions`: `id (UUID PK)`, `collection_id (FK)`, `version_number (INT)`, `title`, `description (TEXT)`, `items (JSONB)`, `created_at`.
- `access_keys`: `id (UUID PK)`, `collection_id (FK)`, `key_hash (CHAR 64)`, `created_by (FK)`, `expires_at`, `revoked_at`, `max_uses`, `current_uses`.
- `access_grants`: `id (UUID PK)`, `user_id (FK)`, `collection_id (FK)`, `granted_by_mechanism (KEY, DIRECT, PUBLIC)`, `created_at`.

### Actividades Docentes
- `activities`: `id (UUID PK)`, `course_id (FK)`, `name`, `type (PRACTICE, EXAM, ASSIGNMENT)`, `created_at`.
- `activity_versions`: `id (UUID PK)`, `activity_id (FK)`, `version_number (INT)`, `exercise_version_id (FK)`, `max_attempts (INT NULLABLE: null=ilimitado)`, `available_from (TIMESTAMPTZ)`, `available_until (TIMESTAMPTZ)`, `due_at (TIMESTAMPTZ)`, `feedback_policy (JSONB)`, `scoring_rules (JSONB)`, `created_at`.

### Entregas y Cola de Evaluación
- `submissions`: `id (UUID PK)`, `student_id (FK)`, `activity_version_id (FK)`, `exercise_version_id (FK)`, `source_code (TEXT)`, `language (VARCHAR)`, `channel (WEB, GITHUB)`, `created_at`.
- `attempt_ledger`: `id (UUID PK)`, `student_id (FK)`, `activity_version_id (FK)`, `attempt_number (INT)`, `status (RESERVED, CONSUMED, REFUNDED)`, `submission_id (FK)`, `created_at`.
- `evaluation_jobs`: `id (UUID PK)`, `submission_id (FK)`, `status (QUEUED, CLAIMED, FINISHED, FAILED, CANCELLED)`, `priority (INT)`, `attempts (INT)`, `worker_id (VARCHAR)`, `lease_until (TIMESTAMPTZ)`, `available_at (TIMESTAMPTZ)`, `created_at`.
- `evaluations`: `id (UUID PK)`, `submission_id (FK)`, `exercise_version_id (FK)`, `activity_version_id (FK)`, `runtime_id`, `runtime_image_digest`, `evaluator_version`, `status (SUCCESS, COMPILE_ERROR, RUNTIME_ERROR, TIMEOUT, SYSTEM_ERROR, CANCELLED)`, `score (NUMERIC(5,2))`, `reason (INITIAL, REEVALUATION_TEST_FIX, etc.)`, `created_at`.
- `test_results`: `id (UUID PK)`, `evaluation_id (FK)`, `test_id (VARCHAR)`, `is_public (BOOLEAN)`, `status (PASSED, FAILED, TIMEOUT, RUNTIME_ERROR)`, `duration_ms (INT)`, `stdout (TEXT)`, `stderr (TEXT)`, `expected_output (TEXT)`, `actual_output (TEXT)`, `score (NUMERIC(5,2))`.

### Auditoría y Sincronización
- `audit_events`: `id (UUID PK)`, `user_id (FK NULLABLE)`, `action (VARCHAR)`, `resource_type (VARCHAR)`, `resource_id (UUID NULLABLE)`, `metadata (JSONB)`, `ip_address (VARCHAR)`, `created_at`.
- `content_syncs`: `id (UUID PK)`, `git_commit (CHAR 40)`, `status (RUNNING, SUCCESS, FAILED)`, `details (JSONB)`, `started_at`, `finished_at`.

---

## 3. Índices Críticos de Rendimiento y Concurrencia

```sql
CREATE INDEX idx_eval_jobs_queue ON evaluation_jobs (priority DESC, created_at ASC) 
  WHERE status = 'QUEUED';
CREATE INDEX idx_submissions_student_act ON submissions (student_id, activity_version_id);
CREATE INDEX idx_evaluations_submission ON evaluations (submission_id);
CREATE INDEX idx_access_grants_user_col ON access_grants (user_id, collection_id);
CREATE INDEX idx_attempt_ledger_student_act ON attempt_ledger (student_id, activity_version_id);
```

