-- Benigascode Initial Database Schema
-- Compatible with PostgreSQL 16+ / 18

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. IDENTIDAD
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_access TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. APRENDIZAJE: CURSOS Y GRUPOS
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, name)
);

CREATE TABLE course_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

-- 3. CONTENIDO: EJERCICIOS Y COLECCIONES
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exercise_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    statement TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    runtime_id VARCHAR(50) NOT NULL,
    compile_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    run_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    scoring_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    comparator_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    tests_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash CHAR(64) NOT NULL,
    git_commit CHAR(40),
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exercise_id, version_number)
);

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    visibility VARCHAR(30) NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collection_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (collection_id, version_number)
);

CREATE TABLE access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    key_hash CHAR(64) NOT NULL UNIQUE,
    created_by_id UUID NOT NULL REFERENCES users(id),
    max_uses INT,
    current_uses INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    mechanism VARCHAR(30) NOT NULL CHECK (mechanism IN ('KEY', 'ASSIGNED', 'PUBLIC')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, collection_id)
);

-- 4. ACTIVIDADES DOCENTES
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('PRACTICE', 'EXAM', 'ASSIGNMENT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    exercise_version_id UUID NOT NULL REFERENCES exercise_versions(id),
    max_attempts INT, -- NULL significa ilimitados
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    feedback_policy JSONB NOT NULL DEFAULT '{"level": "DETAILED"}'::jsonb,
    scoring_rules JSONB NOT NULL DEFAULT '{"scale": 100}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (activity_id, version_number)
);

-- 5. ENTREGAS, INTENTOS Y EVALUACIONES
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_version_id UUID NOT NULL REFERENCES activity_versions(id),
    exercise_version_id UUID NOT NULL REFERENCES exercise_versions(id),
    source_code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    delivery_channel VARCHAR(30) NOT NULL DEFAULT 'WEB' CHECK (delivery_channel IN ('WEB', 'GITHUB')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'EVALUATING', 'FINISHED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attempt_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_version_id UUID NOT NULL REFERENCES activity_versions(id),
    attempt_number INT NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('RESERVED', 'CONSUMED', 'REFUNDED')),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, activity_version_id, attempt_number)
);

CREATE TABLE evaluation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'CLAIMED', 'FINISHED', 'FAILED', 'CANCELLED')),
    priority INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    worker_id VARCHAR(100),
    lease_until TIMESTAMPTZ,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    exercise_version_id UUID NOT NULL REFERENCES exercise_versions(id),
    activity_version_id UUID NOT NULL REFERENCES activity_versions(id),
    runtime_id VARCHAR(50) NOT NULL,
    runtime_image_digest VARCHAR(100),
    evaluator_version VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('CORRECT', 'INCORRECT', 'COMPILE_ERROR', 'TIMEOUT', 'RUNTIME_ERROR', 'SYSTEM_ERROR', 'CANCELLED')),
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(50) NOT NULL DEFAULT 'INITIAL_SUBMISSION',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    test_id VARCHAR(50) NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'TIMEOUT', 'RUNTIME_ERROR')),
    duration_ms INT NOT NULL DEFAULT 0,
    stdout TEXT,
    stderr TEXT,
    expected_output TEXT,
    actual_output TEXT,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUDITORÍA Y SINCRONIZACIÓN DE CONTENIDO
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    git_commit CHAR(40),
    status VARCHAR(30) NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_versions JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- 7. ÍNDICES DE RENDIMIENTO Y CONCURRENCIA
CREATE INDEX idx_eval_jobs_queue ON evaluation_jobs (priority DESC, created_at ASC) WHERE status = 'QUEUED';
CREATE INDEX idx_submissions_student_act ON submissions (student_id, activity_version_id);
CREATE INDEX idx_evaluations_submission ON evaluations (submission_id);
CREATE INDEX idx_test_results_evaluation ON test_results (evaluation_id);
CREATE INDEX idx_access_grants_lookup ON access_grants (user_id, collection_id);
CREATE INDEX idx_attempt_ledger_lookup ON attempt_ledger (student_id, activity_version_id);
CREATE INDEX idx_audit_events_created ON audit_events (created_at DESC);

