-- =============================================
-- Migration 006: Scenario Bookmarks & Favorites
-- =============================================

-- Scenario Bookmarks
CREATE TABLE IF NOT EXISTS scenario_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  folder TEXT DEFAULT 'default',
  is_favorite BOOLEAN DEFAULT false,
  last_practiced_at TIMESTAMPTZ,
  practice_count INTEGER DEFAULT 0,
  best_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, scenario_id)
);

-- Bookmark Folders (for organization)
CREATE TABLE IF NOT EXISTS bookmark_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6B7280',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON scenario_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_scenario ON scenario_bookmarks(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON scenario_bookmarks(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user ON bookmark_folders(user_id);

-- RLS Policies
ALTER TABLE scenario_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scenario_bookmarks_user ON scenario_bookmarks;
CREATE POLICY scenario_bookmarks_user ON scenario_bookmarks FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS bookmark_folders_user ON bookmark_folders;
CREATE POLICY bookmark_folders_user ON bookmark_folders FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
