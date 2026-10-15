-- V27: Preservar envios de los alumnos al eliminar ejercicios y permitir reasociacion por slug

-- 1. Añadir columna exercise_slug a submissions para conservar la identidad del ejercicio aunque este sea eliminado
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS exercise_slug VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise_slug ON submissions(exercise_slug);

-- 2. Poblar exercise_slug para todos los envíos existentes a partir de sus versiones de ejercicio
UPDATE submissions s
SET exercise_slug = e.slug
FROM exercise_versions ev
JOIN exercises e ON ev.exercise_id = e.id
WHERE s.exercise_version_id = ev.id
  AND (s.exercise_slug IS NULL OR s.exercise_slug = '');

-- 3. Hacer opcional exercise_version_id en submissions y configurar ON DELETE SET NULL
ALTER TABLE submissions ALTER COLUMN exercise_version_id DROP NOT NULL;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_exercise_version_id_fkey;
ALTER TABLE submissions
ADD CONSTRAINT submissions_exercise_version_id_fkey
FOREIGN KEY (exercise_version_id) REFERENCES exercise_versions(id) ON DELETE SET NULL;

-- 4. Hacer opcional exercise_version_id en evaluations y configurar ON DELETE SET NULL
ALTER TABLE evaluations ALTER COLUMN exercise_version_id DROP NOT NULL;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_exercise_version_id_fkey;
ALTER TABLE evaluations
ADD CONSTRAINT evaluations_exercise_version_id_fkey
FOREIGN KEY (exercise_version_id) REFERENCES exercise_versions(id) ON DELETE SET NULL;

-- 5. Hacer opcional exercise_version_id en activity_versions y configurar ON DELETE SET NULL
ALTER TABLE activity_versions ALTER COLUMN exercise_version_id DROP NOT NULL;
ALTER TABLE activity_versions DROP CONSTRAINT IF EXISTS activity_versions_exercise_version_id_fkey;
ALTER TABLE activity_versions
ADD CONSTRAINT activity_versions_exercise_version_id_fkey
FOREIGN KEY (exercise_version_id) REFERENCES exercise_versions(id) ON DELETE SET NULL;

-- 6. Configurar ON DELETE SET NULL en attempt_ledger para no perder los intentos al eliminar la version del ejercicio
ALTER TABLE attempt_ledger DROP CONSTRAINT IF EXISTS attempt_ledger_exercise_version_id_fkey;
ALTER TABLE attempt_ledger
ADD CONSTRAINT attempt_ledger_exercise_version_id_fkey
FOREIGN KEY (exercise_version_id) REFERENCES exercise_versions(id) ON DELETE SET NULL;
