-- V10: Tags en ejercicios, tests_passed/total_tests en progreso de alumno, y datos seed para insights y envíos

-- 1. Añadir columna tags a exercise_versions
ALTER TABLE exercise_versions
ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_exercise_versions_tags ON exercise_versions USING gin (tags);

-- 2. Añadir columnas de conteo de tests a student_progress
ALTER TABLE student_progress
ADD COLUMN tests_passed INT NOT NULL DEFAULT 0,
ADD COLUMN total_tests INT NOT NULL DEFAULT 0;

-- 3. Clasificar ejercicios existentes con tags representativos basados en título y slug
UPDATE exercise_versions
SET tags = CASE
    WHEN slug ILIKE '%array%' OR slug ILIKE '%vector%' OR title ILIKE '%array%' OR title ILIKE '%vector%' OR title ILIKE '%lista%'
        THEN '["arrays", "estructuras-de-datos"]'::jsonb
    WHEN slug ILIKE '%bucle%' OR slug ILIKE '%for%' OR slug ILIKE '%while%' OR title ILIKE '%bucle%' OR title ILIKE '%repet%' OR slug ILIKE '%banderas%'
        THEN '["bucles", "control-de-flujo"]'::jsonb
    WHEN slug ILIKE '%string%' OR slug ILIKE '%cadena%' OR slug ILIKE '%texto%' OR slug ILIKE '%palindromo%' OR slug ILIKE '%acronimo%' OR title ILIKE '%texto%' OR title ILIKE '%letra%'
        THEN '["cadenas", "strings"]'::jsonb
    WHEN slug ILIKE '%scanner%' OR slug ILIKE '%hello%' OR slug ILIKE '%io%' OR title ILIKE '%hello%' OR title ILIKE '%saludo%'
        THEN '["entrada-salida", "scanner"]'::jsonb
    WHEN slug ILIKE '%math%' OR slug ILIKE '%fibonacci%' OR slug ILIKE '%primo%' OR slug ILIKE '%media%' OR slug ILIKE '%calcul%' OR slug ILIKE '%suma%' OR slug ILIKE '%multiplic%'
        THEN '["matemáticas", "algoritmos"]'::jsonb
    WHEN slug ILIKE '%sort%' OR slug ILIKE '%ordenar%' OR slug ILIKE '%buscar%' OR slug ILIKE '%binary%'
        THEN '["algoritmos", "ordenación"]'::jsonb
    WHEN slug ILIKE '%condic%' OR slug ILIKE '%if%' OR slug ILIKE '%switch%' OR slug ILIKE '%par%' OR slug ILIKE '%fizzbuzz%'
        THEN '["condicionales", "control-de-flujo"]'::jsonb
    ELSE '["fundamentos", "java"]'::jsonb
END
FROM exercises e
WHERE exercise_versions.exercise_id = e.id;

-- 4. Actualizar student_progress existente calculando tests superados a partir de evaluations y test_results
UPDATE student_progress sp
SET tests_passed = COALESCE(tr_sub.passed_count, CASE WHEN sp.best_score >= 100 THEN 2 ELSE 0 END),
    total_tests = COALESCE(tr_sub.total_count, 2)
FROM (
    SELECT evaluation_id,
           COUNT(*) AS total_count,
           COUNT(*) FILTER (WHERE status = 'PASSED') AS passed_count
    FROM test_results
    GROUP BY evaluation_id
) tr_sub
WHERE sp.last_evaluation_id = tr_sub.evaluation_id;

-- Para registros sin test_results explícitos
UPDATE student_progress
SET tests_passed = 2, total_tests = 2
WHERE status = 'MASTERED' AND total_tests = 0;

UPDATE student_progress
SET tests_passed = 0, total_tests = 2
WHERE status = 'ATTEMPTED' AND total_tests = 0;

-- 5. Añadir Grupo B para 1º DAM
INSERT INTO groups (id, course_id, name) VALUES
('55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444444', 'Grupo B')
ON CONFLICT DO NOTHING;

-- 6. Añadir Alumnos adicionales para pruebas e insights
INSERT INTO users (id, username, password_hash, full_name, role, enabled) VALUES
('33333333-3333-3333-3333-333333333334', 'lucia@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Lucía Martín', 'STUDENT', true),
('33333333-3333-3333-3333-333333333335', 'carlos@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Carlos Vega', 'STUDENT', true),
('33333333-3333-3333-3333-333333333336', 'maria@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'María López', 'STUDENT', true)
ON CONFLICT (username) DO NOTHING;

-- Matricular en grupos: Lucía en Grupo A, Carlos y María en Grupo B
INSERT INTO course_memberships (user_id, course_id, group_id, role) VALUES
('33333333-3333-3333-3333-333333333334', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'STUDENT'),
('33333333-3333-3333-3333-333333333335', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555556', 'STUDENT'),
('33333333-3333-3333-3333-333333333336', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555556', 'STUDENT')
ON CONFLICT DO NOTHING;

-- Dar acceso a las colecciones a los nuevos alumnos
INSERT INTO access_grants (user_id, collection_id, mechanism)
SELECT u.id, c.id, 'PUBLIC'
FROM users u
CROSS JOIN collections c
WHERE u.id IN (
    '33333333-3333-3333-3333-333333333334',
    '33333333-3333-3333-3333-333333333335',
    '33333333-3333-3333-3333-333333333336'
)
ON CONFLICT DO NOTHING;
