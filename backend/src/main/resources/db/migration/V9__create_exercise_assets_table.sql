-- V9: Crear tabla para almacenar assets binarios (imágenes, diagramas) de los ejercicios
CREATE TABLE exercise_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    data BYTEA NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_exercise_asset_filename UNIQUE (exercise_id, filename)
);

CREATE INDEX idx_exercise_assets_exercise_id ON exercise_assets(exercise_id);

