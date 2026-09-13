-- V11: Claves de invitación, etiquetas de alumnos, colecciones en cursos y campos de GitHub OAuth

-- 1. Campos de GitHub OAuth en la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Claves de invitación
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(active);

-- 3. Etiquetas privadas de alumnos (solo profesorado)
CREATE TABLE IF NOT EXISTS student_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_student_tags_student_id ON student_tags(student_id);
CREATE INDEX IF NOT EXISTS idx_student_tags_tag ON student_tags(tag);

-- 4. Asociación de colecciones a cursos
CREATE TABLE IF NOT EXISTS course_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_course_collections_course ON course_collections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_collections_collection ON course_collections(collection_id);

