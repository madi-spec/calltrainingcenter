-- =============================================
-- Migration 004: Daily Challenges System
-- =============================================

-- Daily Challenges - org-wide challenges that refresh daily
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN (
    'complete_sessions', 'achieve_score', 'complete_difficulty',
    'streak_maintain', 'category_focus', 'time_based', 'perfect_score'
  )),
  criteria_value JSONB NOT NULL DEFAULT '{}',
  bonus_points INTEGER DEFAULT 50,
  badge_reward_id UUID REFERENCES badges(id),
  is_team_challenge BOOLEAN DEFAULT false,
  max_winners INTEGER, -- NULL = unlimited
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date, title)
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 0,
  progress_data JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Team Challenge Progress (for team-based challenges)
CREATE TABLE IF NOT EXISTS team_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  aggregate_progress INTEGER DEFAULT 0,
  contributing_users JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, challenge_id)
);

-- Challenge Templates (for auto-generation)
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title_template TEXT NOT NULL,
  description_template TEXT,
  criteria_type TEXT NOT NULL,
  criteria_config JSONB NOT NULL DEFAULT '{}',
  bonus_points_range JSONB DEFAULT '{"min": 25, "max": 100}',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_team_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  frequency_weight INTEGER DEFAULT 1, -- Higher = more likely to be picked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_org_date ON daily_challenges(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_team_challenge_progress_team ON team_challenge_progress(team_id);

-- RLS Policies
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_challenges_org ON daily_challenges;
CREATE POLICY daily_challenges_org ON daily_challenges FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS user_challenge_progress_user ON user_challenge_progress;
CREATE POLICY user_challenge_progress_user ON user_challenge_progress FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS team_challenge_progress_team ON team_challenge_progress;
CREATE POLICY team_challenge_progress_team ON team_challenge_progress FOR ALL
  USING (team_id IN (SELECT team_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS challenge_templates_org ON challenge_templates;
CREATE POLICY challenge_templates_org ON challenge_templates FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

-- Insert default challenge templates
INSERT INTO challenge_templates (organization_id, title_template, description_template, criteria_type, criteria_config, bonus_points_range, difficulty)
VALUES
  (NULL, 'Speed Demon', 'Complete {count} training sessions today', 'complete_sessions', '{"target_count": 3}', '{"min": 30, "max": 50}', 'easy'),
  (NULL, 'High Achiever', 'Score {score}% or higher on any session', 'achieve_score', '{"min_score": 85}', '{"min": 40, "max": 75}', 'medium'),
  (NULL, 'Challenge Accepted', 'Complete a hard difficulty scenario', 'complete_difficulty', '{"difficulty": "hard"}', '{"min": 50, "max": 100}', 'hard'),
  (NULL, 'Perfectionist', 'Achieve a perfect 100% score', 'perfect_score', '{"target_score": 100}', '{"min": 100, "max": 150}', 'hard'),
  (NULL, 'Consistency King', 'Complete at least {count} sessions', 'complete_sessions', '{"target_count": 5}', '{"min": 50, "max": 75}', 'medium'),
  (NULL, 'Early Bird', 'Complete a session before 10 AM', 'time_based', '{"before_hour": 10}', '{"min": 25, "max": 40}', 'easy')
ON CONFLICT DO NOTHING;
