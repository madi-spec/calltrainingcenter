-- =============================================
-- Migration 005: Enhanced Streak System
-- =============================================

-- Streak Tokens (freezes, recoveries, etc.)
CREATE TABLE IF NOT EXISTS streak_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL CHECK (token_type IN ('freeze', 'recovery', 'shield')),
  earned_reason TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak History
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  streak_length INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason TEXT CHECK (end_reason IN ('broken', 'frozen', 'recovered', 'active')),
  was_recovered BOOLEAN DEFAULT false,
  recovery_token_id UUID REFERENCES streak_tokens(id),
  points_earned INTEGER DEFAULT 0,
  badges_earned JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add streak-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_broken_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_before_break INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_recovery_deadline TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shield_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shield_expires_at TIMESTAMPTZ;

-- Streak Milestones Configuration
CREATE TABLE IF NOT EXISTS streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  streak_days INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'badge', 'freeze_token', 'recovery_token')),
  reward_value INTEGER, -- Points amount or badge_id for badge rewards
  badge_id UUID REFERENCES badges(id),
  notification_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, streak_days, reward_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streak_tokens_user ON streak_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_tokens_active ON streak_tokens(user_id, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_streak_history_user ON streak_history(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_org ON streak_milestones(organization_id);

-- RLS Policies
ALTER TABLE streak_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS streak_tokens_user ON streak_tokens;
CREATE POLICY streak_tokens_user ON streak_tokens FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS streak_history_user ON streak_history;
CREATE POLICY streak_history_user ON streak_history FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS streak_milestones_org ON streak_milestones;
CREATE POLICY streak_milestones_org ON streak_milestones FOR ALL
  USING (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

-- Insert default streak milestones (org_id NULL = applies to all orgs)
INSERT INTO streak_milestones (organization_id, streak_days, reward_type, reward_value, notification_message)
VALUES
  (NULL, 3, 'points', 25, 'Great start! 3-day streak achieved!'),
  (NULL, 7, 'points', 75, 'One week strong! Keep it up!'),
  (NULL, 7, 'freeze_token', 1, 'You earned a streak freeze!'),
  (NULL, 14, 'points', 150, 'Two weeks of dedication!'),
  (NULL, 14, 'freeze_token', 1, 'Another streak freeze earned!'),
  (NULL, 30, 'points', 500, 'A full month! Incredible commitment!'),
  (NULL, 30, 'recovery_token', 1, 'You earned a streak recovery token!'),
  (NULL, 60, 'points', 1000, '60 days! You are unstoppable!'),
  (NULL, 90, 'points', 2000, '90-day streak! Legendary dedication!')
ON CONFLICT DO NOTHING;
