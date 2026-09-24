-- V22: Asociar etiquetas a claves de invitación

CREATE TABLE IF NOT EXISTS invitation_code_tags (
    invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (invitation_code_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_code_tags_invitation_id ON invitation_code_tags(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_code_tags_tag_id ON invitation_code_tags(tag_id);

