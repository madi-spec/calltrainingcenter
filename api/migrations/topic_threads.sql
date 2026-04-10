-- Topic threads for Content Studio

CREATE TABLE IF NOT EXISTS studio_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  source TEXT NOT NULL DEFAULT 'default' CHECK (source IN ('default', 'ai_suggested', 'custom')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'interviewing', 'ready', 'generating', 'generated', 'published')),
  interview_context JSONB DEFAULT '{}',
  generated_version_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_topics_session ON studio_topics(session_id);
CREATE INDEX idx_studio_topics_org ON studio_topics(organization_id);

-- Add topic_id to messages (nullable — null = session-level/general)
ALTER TABLE studio_messages
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES studio_topics(id) ON DELETE CASCADE;

-- Add topic_id to program versions (nullable — null = batch/full-program)
ALTER TABLE program_versions
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES studio_topics(id) ON DELETE SET NULL;

-- Add FK for generated_version_id (deferred)
ALTER TABLE studio_topics
  ADD CONSTRAINT fk_studio_topics_generated_version
  FOREIGN KEY (generated_version_id) REFERENCES program_versions(id) ON DELETE SET NULL;
