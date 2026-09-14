-- V14: Tabla de profesores autorizados mediante GitHub
CREATE TABLE IF NOT EXISTS authorized_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username VARCHAR(100) NOT NULL UNIQUE,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_authorized_teachers_github_username ON authorized_teachers(github_username);

-- Profesor inicial del sistema (gerardfp)
INSERT INTO authorized_teachers (github_username, notes)
VALUES ('gerardfp', 'Profesor inicial del sistema')
ON CONFLICT (github_username) DO NOTHING;

