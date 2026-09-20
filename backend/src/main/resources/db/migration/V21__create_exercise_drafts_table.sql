-- V21: Crear tabla para almacenar borradores de ejercicios de profesores
CREATE TABLE exercise_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    markdown TEXT NOT NULL,
    updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_exercise_drafts_exercise UNIQUE (exercise_id)
);

CREATE INDEX idx_exercise_drafts_exercise_id ON exercise_drafts(exercise_id);
