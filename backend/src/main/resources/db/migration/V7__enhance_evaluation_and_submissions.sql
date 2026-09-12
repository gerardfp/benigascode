-- V7: Java 26 runtime tracking, compilation output, student workspaces, student progress, and practice submissions

-- 1. Actualizar tabla evaluations para registrar actual_runtime y detalle de compilación
ALTER TABLE evaluations
ADD COLUMN actual_runtime VARCHAR(50) NOT NULL DEFAULT 'java-26',
ADD COLUMN compile_success BOOLEAN,
ADD COLUMN compile_stdout TEXT,
ADD COLUMN compile_stderr TEXT,
ALTER COLUMN activity_version_id DROP NOT NULL;

-- 2. Actualizar tabla submissions para reproducibilidad y entregas directas
ALTER TABLE submissions
ALTER COLUMN activity_version_id DROP NOT NULL,
ADD COLUMN source_hash CHAR(64),
ADD COLUMN attempt_number INT NOT NULL DEFAULT 1,
ADD COLUMN runtime_id VARCHAR(50) NOT NULL DEFAULT 'java-26',
ADD COLUMN tests_hash CHAR(64);

-- 3. Actualizar tabla attempt_ledger para permitir entregas de práctica directa
ALTER TABLE attempt_ledger
ALTER COLUMN activity_version_id DROP NOT NULL,
ADD COLUMN exercise_version_id UUID REFERENCES exercise_versions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_attempt_ledger_unique_exercise
ON attempt_ledger (student_id, exercise_version_id, attempt_number)
WHERE activity_version_id IS NULL;

-- 4. Workspaces mutables de los alumnos (separados del snapshot inmutable de entrega)
CREATE TABLE student_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    source_code TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, exercise_id)
);

CREATE INDEX idx_student_workspaces_lookup ON student_workspaces (student_id, exercise_id);

-- 5. Seguimiento persistente y trazable del progreso de los alumnos
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'ATTEMPTED', 'PASSED', 'MASTERED')),
    best_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    total_submissions INT NOT NULL DEFAULT 0,
    consumed_attempts INT NOT NULL DEFAULT 0,
    last_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    last_evaluation_id UUID REFERENCES evaluations(id) ON DELETE SET NULL,
    last_status VARCHAR(30),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_student_progress_unique_with_act ON student_progress (student_id, exercise_id, activity_id) WHERE activity_id IS NOT NULL;
CREATE UNIQUE INDEX idx_student_progress_unique_no_act ON student_progress (student_id, exercise_id) WHERE activity_id IS NULL;

CREATE INDEX idx_student_progress_student ON student_progress (student_id);
CREATE INDEX idx_student_progress_exercise ON student_progress (exercise_id);
CREATE INDEX idx_student_progress_activity ON student_progress (activity_id);

