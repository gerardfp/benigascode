-- Benigascode Git Repositories Table for GitHub OAuth & Deploy Key Integration
CREATE TABLE git_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    branch VARCHAR(100) NOT NULL DEFAULT 'main',
    root_path VARCHAR(255) NOT NULL DEFAULT '',
    auth_type VARCHAR(30) NOT NULL CHECK (auth_type IN ('OAUTH_TOKEN', 'DEPLOY_KEY', 'PUBLIC')),
    auth_token TEXT,
    public_key TEXT,
    private_key TEXT,
    webhook_secret VARCHAR(100),
    last_commit VARCHAR(40),
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(30) DEFAULT 'PENDING' CHECK (last_sync_status IN ('PENDING', 'SUCCESS', 'FAILED', 'IN_PROGRESS')),
    last_sync_error TEXT,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_git_repositories_created_by ON git_repositories(created_by_id);
