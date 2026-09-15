-- V16: Migración del modelo académico a Tags, Contexts y TeachingSpaces

-- 1. Tabla de etiquetas estructuradas (Tags)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    value VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tags_category_value UNIQUE (category, value)
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_value ON tags(value);

-- 2. Tabla de Espacios Docentes (TeachingSpaces)
CREATE TABLE IF NOT EXISTS teaching_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    context_config JSONB NOT NULL DEFAULT '{"tagIds": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teaching_spaces_name ON teaching_spaces(name);

-- 3. Tabla intermedia de profesores en Espacios Docentes
CREATE TABLE IF NOT EXISTS teaching_space_teachers (
    teaching_space_id UUID NOT NULL REFERENCES teaching_spaces(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (teaching_space_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_ts_teachers_space ON teaching_space_teachers(teaching_space_id);
CREATE INDEX IF NOT EXISTS idx_ts_teachers_teacher ON teaching_space_teachers(teacher_id);

-- 4. Tabla intermedia de colecciones asignadas a Espacios Docentes
CREATE TABLE IF NOT EXISTS teaching_space_collections (
    teaching_space_id UUID NOT NULL REFERENCES teaching_spaces(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (teaching_space_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_ts_collections_space ON teaching_space_collections(teaching_space_id);
CREATE INDEX IF NOT EXISTS idx_ts_collections_collection ON teaching_space_collections(collection_id);

-- 5. Migrar cursos existentes a teaching_spaces si la tabla courses existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courses') THEN
        INSERT INTO teaching_spaces (id, name, description, context_config, created_at, updated_at)
        SELECT id, name, description, '{"tagIds": []}'::jsonb, created_at, created_at
        FROM courses
        ON CONFLICT (id) DO NOTHING;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_memberships') THEN
            INSERT INTO teaching_space_teachers (teaching_space_id, teacher_id, created_at)
            SELECT course_id, user_id, created_at
            FROM course_memberships
            WHERE role = 'TEACHER'
            ON CONFLICT DO NOTHING;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_collections') THEN
            INSERT INTO teaching_space_collections (teaching_space_id, collection_id, created_at)
            SELECT course_id, collection_id, created_at
            FROM course_collections
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 6. Actualizar activities para asociarse a teaching_spaces
ALTER TABLE activities ADD COLUMN IF NOT EXISTS teaching_space_id UUID REFERENCES teaching_spaces(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'course_id') THEN
        UPDATE activities SET teaching_space_id = course_id WHERE teaching_space_id IS NULL AND course_id IS NOT NULL;
        ALTER TABLE activities DROP COLUMN course_id;
    END IF;
END $$;

ALTER TABLE activities ALTER COLUMN teaching_space_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_teaching_space ON activities(teaching_space_id);

-- 7. Actualizar submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teaching_space_id UUID REFERENCES teaching_spaces(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'course_id') THEN
        UPDATE submissions SET teaching_space_id = course_id WHERE teaching_space_id IS NULL AND course_id IS NOT NULL;
        ALTER TABLE submissions DROP COLUMN course_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'course_collection_id') THEN
        ALTER TABLE submissions DROP COLUMN course_collection_id;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_teaching_space_id ON submissions(teaching_space_id);

-- 8. Limpiar student_progress
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'student_progress' AND column_name = 'course_id') THEN
        ALTER TABLE student_progress DROP COLUMN course_id;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'student_progress' AND column_name = 'first_course_id') THEN
        ALTER TABLE student_progress DROP COLUMN first_course_id;
    END IF;
END $$;

-- 9. Eliminar tablas del antiguo modelo académico
DROP TABLE IF EXISTS course_collection_students CASCADE;
DROP TABLE IF EXISTS course_collections CASCADE;
DROP TABLE IF EXISTS course_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- 10. Migrar student_tags a modelo estructurado y temporal
ALTER TABLE student_tags ADD COLUMN IF NOT EXISTS tag_id UUID REFERENCES tags(id) ON DELETE CASCADE;
ALTER TABLE student_tags ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE student_tags ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE student_tags ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'student_tags' AND column_name = 'tag') THEN
        -- Insertar tags canónicos a partir de los strings existentes
        INSERT INTO tags (category, value)
        SELECT DISTINCT
            CASE WHEN position(':' in tag) > 0 THEN split_part(tag, ':', 1) ELSE 'general' END,
            CASE WHEN position(':' in tag) > 0 THEN substring(tag from position(':' in tag) + 1) ELSE tag END
        FROM student_tags
        WHERE tag IS NOT NULL AND trim(tag) != ''
        ON CONFLICT (category, value) DO NOTHING;

        -- Enlazar tag_id
        UPDATE student_tags st
        SET tag_id = t.id,
            valid_from = st.created_at
        FROM tags t
        WHERE st.tag IS NOT NULL
          AND t.category = (CASE WHEN position(':' in st.tag) > 0 THEN split_part(st.tag, ':', 1) ELSE 'general' END)
          AND t.value = (CASE WHEN position(':' in st.tag) > 0 THEN substring(st.tag from position(':' in st.tag) + 1) ELSE st.tag END);

        ALTER TABLE student_tags DROP CONSTRAINT IF EXISTS student_tags_student_id_tag_key;
        ALTER TABLE student_tags DROP COLUMN tag;
    END IF;
END $$;

DELETE FROM student_tags WHERE tag_id IS NULL;
ALTER TABLE student_tags ALTER COLUMN tag_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_tags_student_temporal ON student_tags(student_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_student_tags_tag_id ON student_tags(tag_id);

-- 11. Semilla de Tags canónicos para desarrollo y testing
INSERT INTO tags (id, category, value, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'academic_year', '2026-2027', 'Curso académico 2026-2027'),
('a0000000-0000-0000-0000-000000000002', 'education', 'DAM', 'Desarrollo de Aplicaciones Multiplataforma'),
('a0000000-0000-0000-0000-000000000003', 'level', 'Primer curso', '1er curso del ciclo formativo'),
('a0000000-0000-0000-0000-000000000004', 'level', 'Segundo curso', '2º curso del ciclo formativo'),
('a0000000-0000-0000-0000-000000000005', 'group', 'Grupo A', 'Grupo mañana A'),
('a0000000-0000-0000-0000-000000000006', 'group', 'Grupo B', 'Grupo mañana B'),
('a0000000-0000-0000-0000-000000000007', 'support', 'Refuerzo', 'Alumnos con apoyo o refuerzo educativo')
ON CONFLICT (category, value) DO NOTHING;

-- 12. Configurar el espacio docente inicial '1º DAM - Programación' con su contexto
INSERT INTO teaching_spaces (id, name, description, context_config)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '1º DAM - Programación',
    'Fundamentos de programación en Java y estructuras de datos',
    jsonb_build_object('tagIds', jsonb_build_array(
        (SELECT id FROM tags WHERE category = 'academic_year' AND value = '2026-2027'),
        (SELECT id FROM tags WHERE category = 'education' AND value = 'DAM'),
        (SELECT id FROM tags WHERE category = 'level' AND value = 'Primer curso')
    ))
)
ON CONFLICT (id) DO UPDATE SET
    context_config = jsonb_build_object('tagIds', jsonb_build_array(
        (SELECT id FROM tags WHERE category = 'academic_year' AND value = '2026-2027'),
        (SELECT id FROM tags WHERE category = 'education' AND value = 'DAM'),
        (SELECT id FROM tags WHERE category = 'level' AND value = 'Primer curso')
    ));

-- Añadir profesor García al espacio docente
INSERT INTO teaching_space_teachers (teaching_space_id, teacher_id)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT DO NOTHING;

-- Crear un segundo espacio docente: 'Refuerzo Programación DAM 1º'
INSERT INTO teaching_spaces (id, name, description, context_config)
VALUES (
    '44444444-4444-4444-4444-444444444445',
    'Refuerzo Programación DAM 1º',
    'Espacio de apoyo y refuerzo individualizado para alumnos de 1º DAM',
    jsonb_build_object('tagIds', jsonb_build_array(
        (SELECT id FROM tags WHERE category = 'academic_year' AND value = '2026-2027'),
        (SELECT id FROM tags WHERE category = 'education' AND value = 'DAM'),
        (SELECT id FROM tags WHERE category = 'level' AND value = 'Primer curso'),
        (SELECT id FROM tags WHERE category = 'support' AND value = 'Refuerzo')
    ))
)
ON CONFLICT (id) DO UPDATE SET
    context_config = jsonb_build_object('tagIds', jsonb_build_array(
        (SELECT id FROM tags WHERE category = 'academic_year' AND value = '2026-2027'),
        (SELECT id FROM tags WHERE category = 'education' AND value = 'DAM'),
        (SELECT id FROM tags WHERE category = 'level' AND value = 'Primer curso'),
        (SELECT id FROM tags WHERE category = 'support' AND value = 'Refuerzo')
    ));

INSERT INTO teaching_space_teachers (teaching_space_id, teacher_id)
VALUES (
    '44444444-4444-4444-4444-444444444445',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT DO NOTHING;

-- 13. Asignar etiquetas a los alumnos de prueba
-- Alumnos 1, 2, 3, 4, 5 y student@benigascode.local obtienen 2026-2027, DAM, Primer curso
INSERT INTO student_tags (student_id, tag_id, valid_from, valid_until)
SELECT u.id, t.id, NOW() - INTERVAL '30 days', NULL
FROM users u
CROSS JOIN tags t
WHERE u.role = 'STUDENT'
  AND t.category IN ('academic_year', 'education', 'level')
  AND t.value IN ('2026-2027', 'DAM', 'Primer curso')
ON CONFLICT DO NOTHING;

-- Alumnos 1, 2, 3 obtienen Grupo A
INSERT INTO student_tags (student_id, tag_id, valid_from, valid_until)
SELECT u.id, t.id, NOW() - INTERVAL '30 days', NULL
FROM users u
CROSS JOIN tags t
WHERE u.username IN ('alumno1@benigascode.local', 'alumno2@benigascode.local', 'alumno3@benigascode.local')
  AND t.category = 'group' AND t.value = 'Grupo A'
ON CONFLICT DO NOTHING;

-- Alumnos 4 y 5 obtienen Grupo B
INSERT INTO student_tags (student_id, tag_id, valid_from, valid_until)
SELECT u.id, t.id, NOW() - INTERVAL '30 days', NULL
FROM users u
CROSS JOIN tags t
WHERE u.username IN ('alumno4@benigascode.local', 'alumno5@benigascode.local')
  AND t.category = 'group' AND t.value = 'Grupo B'
ON CONFLICT DO NOTHING;

-- Alumno 3 obtiene Refuerzo (para probar multi-espacio)
INSERT INTO student_tags (student_id, tag_id, valid_from, valid_until)
SELECT u.id, t.id, NOW() - INTERVAL '15 days', NULL
FROM users u
CROSS JOIN tags t
WHERE u.username = 'alumno3@benigascode.local'
  AND t.category = 'support' AND t.value = 'Refuerzo'
ON CONFLICT DO NOTHING;

