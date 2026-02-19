-- Knowledge Base uploads table
-- Tracks document uploads, parsing progress, and generation status

CREATE TABLE kb_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','parsing','parsed','reviewing','generating','completed','failed')),
  files JSONB NOT NULL DEFAULT '[]',
  raw_text JSONB DEFAULT '{}',
  parsed_data JSONB DEFAULT '{}',
  parse_progress JSONB DEFAULT '{"total_chunks":0,"parsed_chunks":0}',
  parse_error TEXT,
  generation_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_uploads_org ON kb_uploads(organization_id);
