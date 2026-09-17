-- V18: Multi-language tracking and collection preferences

-- 1. Preferencias de lenguaje del alumno por colección
CREATE TABLE IF NOT EXISTS student_collection_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    last_used_language VARCHAR(30) NOT NULL DEFAULT 'java',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_student_col_pref_lookup ON student_collection_preferences (student_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_student_col_pref_student ON student_collection_preferences (student_id);

-- 2. Añadir lenguaje al borrador de trabajo del alumno
ALTER TABLE student_workspaces ADD COLUMN IF NOT EXISTS language VARCHAR(30) NOT NULL DEFAULT 'java';

-- 3. Añadir último lenguaje utilizado al progreso agregado del alumno
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS last_language VARCHAR(30);

