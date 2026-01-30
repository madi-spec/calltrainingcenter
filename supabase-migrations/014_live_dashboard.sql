-- Migration: 014_live_dashboard.sql
-- Description: Real-time training dashboard for managers

-- Active sessions (ephemeral - cleaned up on session end)
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,

  -- Session info
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  scenario_id TEXT,
  scenario_name TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ending')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- User info for display
  user_name TEXT,
  user_avatar_url TEXT
);

-- Recent completions feed
CREATE TABLE IF NOT EXISTS session_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,

  -- Summary info
  user_name TEXT,
  scenario_name TEXT,
  score INTEGER,
  duration_seconds INTEGER,

  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager dashboard preferences
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Display preferences
  show_active_sessions BOOLEAN DEFAULT true,
  show_recent_completions BOOLEAN DEFAULT true,
  show_team_stats BOOLEAN DEFAULT true,
  refresh_interval_seconds INTEGER DEFAULT 30,

  -- Filters
  filter_team_ids UUID[] DEFAULT ARRAY[]::UUID[],
  filter_branch_ids UUID[] DEFAULT ARRAY[]::UUID[],

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_org ON active_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_team ON active_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_status ON active_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_completions_org ON session_completions(org_id);
CREATE INDEX IF NOT EXISTS idx_session_completions_completed ON session_completions(completed_at);

-- RLS Policies
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Active sessions: managers can see their org's sessions
CREATE POLICY active_sessions_manager_policy ON active_sessions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

-- Users can manage their own active session
CREATE POLICY active_sessions_user_policy ON active_sessions
  FOR ALL USING (user_id = auth.uid());

-- Session completions: managers can see their org's completions
CREATE POLICY session_completions_policy ON session_completions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

-- Dashboard preferences: users manage their own
CREATE POLICY dashboard_preferences_policy ON dashboard_preferences
  FOR ALL USING (user_id = auth.uid());

-- Enable realtime for active_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_completions;
