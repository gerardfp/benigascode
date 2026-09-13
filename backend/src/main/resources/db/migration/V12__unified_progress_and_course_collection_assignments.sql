-- V12: Progreso global unificado, asignación selectiva de colecciones a alumnos y contexto de submissions

-- 1. Modificar course_collections para soportar asignación a todos o selectiva
ALTER TABLE course_collections
ADD COLUMN IF NOT EXISTS assigned_all_students BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Crear tabla intermedia course_collection_students
CREATE TABLE IF NOT EXISTS course_collection_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_collection_id UUID NOT NULL REFERENCES course_collections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_collection_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_col_students_col ON course_collection_students(course_collection_id);
CREATE INDEX IF NOT EXISTS idx_course_col_students_student ON course_collection_students(student_id);

-- 3. Añadir columnas de contexto pedagógico a submissions
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS course_collection_id UUID REFERENCES course_collections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_course_id ON submissions(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_course_collection_id ON submissions(course_collection_id);
CREATE INDEX IF NOT EXISTS idx_submissions_collection_id ON submissions(collection_id);

-- 4. Actualizar student_progress hacia el estado global unificado
ALTER TABLE student_progress
ADD COLUMN IF NOT EXISTS first_submission_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_solved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS first_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Consolidar duplicados por (student_id, exercise_id) si existiesen antes de crear el índice único
WITH ranked_progress AS (
    SELECT id, student_id, exercise_id,
           ROW_NUMBER() OVER (
               PARTITION BY student_id, exercise_id
               ORDER BY
                   CASE status
                       WHEN 'MASTERED' THEN 5
                       WHEN 'PASSED' THEN 4
                       WHEN 'ATTEMPTED' THEN 3
                       WHEN 'IN_PROGRESS' THEN 2
                       ELSE 1
                   END DESC,
                   best_score DESC,
                   updated_at DESC
           ) as rn
    FROM student_progress
)
DELETE FROM student_progress
WHERE id IN (
    SELECT id FROM ranked_progress WHERE rn > 1
);

-- Rellenar fechas iniciales de progreso existente
UPDATE student_progress
SET first_submission_at = COALESCE(first_submission_at, updated_at),
    first_solved_at = COALESCE(first_solved_at, completed_at);

-- Eliminar índices antiguos dependientes de activity_id
DROP INDEX IF EXISTS idx_student_progress_unique_with_act;
DROP INDEX IF EXISTS idx_student_progress_unique_no_act;

-- Crear el índice único estricto (student_id, exercise_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_progress_student_exercise_unique ON student_progress (student_id, exercise_id);

