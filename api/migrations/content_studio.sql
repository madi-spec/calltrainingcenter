-- Content Studio tables
-- Run via Supabase Dashboard SQL Editor or CLI

-- Studio sessions: one per Content Studio conversation
CREATE TABLE IF NOT EXISTS studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'interviewing' CHECK (status IN ('interviewing', 'generating', 'reviewing', 'published', 'archived')),
  interview_context JSONB DEFAULT '{}',
  admin_priorities JSONB DEFAULT '[]',
  published_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_sessions_org ON studio_sessions(organization_id);

-- Studio messages: chat history
CREATE TABLE IF NOT EXISTS studio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'upload', 'generation', 'feedback')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_messages_session ON studio_messages(session_id);

-- KB documents: individual uploaded files
CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url', 'paste', 'transcript')),
  source_url TEXT,
  raw_text TEXT,
  doc_classification TEXT CHECK (doc_classification IN ('pricing', 'playbook', 'handbook', 'sop', 'transcript', 'competitive', 'other')),
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed')),
  parse_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_documents_session ON kb_documents(session_id);
CREATE INDEX idx_kb_documents_org ON kb_documents(organization_id);

-- Knowledge items: atomic knowledge nodes
CREATE TABLE IF NOT EXISTS kb_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES kb_documents(id) ON DELETE SET NULL,
  domain TEXT NOT NULL CHECK (domain IN ('products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge')),
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  confidence FLOAT DEFAULT 1.0,
  admin_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_items_org ON kb_knowledge_items(organization_id);
CREATE INDEX idx_kb_items_domain ON kb_knowledge_items(organization_id, domain);
CREATE INDEX idx_kb_items_document ON kb_knowledge_items(document_id);

-- Knowledge links: graph edges between items
CREATE TABLE IF NOT EXISTS kb_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID NOT NULL REFERENCES kb_knowledge_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES kb_knowledge_items(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_links_source ON kb_knowledge_links(source_item_id);
CREATE INDEX idx_kb_links_target ON kb_knowledge_links(target_item_id);

-- Program versions: versioned generation snapshots
CREATE TABLE IF NOT EXISTS program_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'draft', 'published', 'archived')),
  generation_stats JSONB DEFAULT '{}',
  quality_score FLOAT,
  knowledge_coverage FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_program_versions_org ON program_versions(organization_id);
CREATE INDEX idx_program_versions_session ON program_versions(session_id);

-- Add FK from studio_sessions to program_versions (deferred to avoid circular dep)
ALTER TABLE studio_sessions
  ADD CONSTRAINT fk_studio_sessions_published_version
  FOREIGN KEY (published_version_id) REFERENCES program_versions(id);

-- Generated scripts: talk tracks, reference cards, role-play dialogues
CREATE TABLE IF NOT EXISTS generated_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES program_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  script_type TEXT NOT NULL CHECK (script_type IN ('talk_track', 'reference_card', 'role_play')),
  title TEXT NOT NULL,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  content JSONB NOT NULL DEFAULT '{}',
  knowledge_item_ids UUID[] DEFAULT '{}',
  quality_score FLOAT,
  quality_issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_scripts_version ON generated_scripts(version_id);
CREATE INDEX idx_generated_scripts_org ON generated_scripts(organization_id);

-- Add new columns to existing tables
ALTER TABLE scenario_templates
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES program_versions(id),
  ADD COLUMN IF NOT EXISTS knowledge_item_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_agent_context TEXT,
  ADD COLUMN IF NOT EXISTS scoring_rubric JSONB,
  ADD COLUMN IF NOT EXISTS quality_score FLOAT;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES program_versions(id),
  ADD COLUMN IF NOT EXISTS knowledge_coverage JSONB;

ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS learning_objectives JSONB,
  ADD COLUMN IF NOT EXISTS associated_script_ids UUID[] DEFAULT '{}';
