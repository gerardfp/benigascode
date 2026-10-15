-- V25: Añadir metadato dificultad (decimal de 0 a 10) a las versiones de ejercicios
ALTER TABLE exercise_versions
ADD COLUMN IF NOT EXISTS difficulty DOUBLE PRECISION;

ALTER TABLE exercise_versions
DROP CONSTRAINT IF EXISTS chk_exercise_difficulty;

ALTER TABLE exercise_versions
ADD CONSTRAINT chk_exercise_difficulty
CHECK (difficulty IS NULL OR (difficulty >= 0.0 AND difficulty <= 10.0));
