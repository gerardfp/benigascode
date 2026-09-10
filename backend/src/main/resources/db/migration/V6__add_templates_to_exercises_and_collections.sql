-- V6: Añadir soporte para plantillas de código por runtime en ejercicios y colecciones
ALTER TABLE exercise_versions
ADD COLUMN templates_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE collection_versions
ADD COLUMN templates_config JSONB NOT NULL DEFAULT '{}'::jsonb;

