-- V26: Añadir soporte para soluciones de referencia en versiones de ejercicios
ALTER TABLE exercise_versions
ADD COLUMN IF NOT EXISTS solutions_config JSONB NOT NULL DEFAULT '{}'::jsonb;
