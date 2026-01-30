-- =============================================
-- Migration 008: Badge Tier System & Practice Again
-- =============================================

-- Add tier support to badges
ALTER TABLE badges ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));
ALTER TABLE badges ADD COLUMN IF NOT EXISTS tier_thresholds JSONB DEFAULT '{"silver": 5, "gold": 15, "platinum": 50}';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS max_tier TEXT DEFAULT 'platinum';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS is_tiered BOOLEAN DEFAULT false;

-- Add tier tracking to user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS current_tier TEXT DEFAULT 'bronze';
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS progress_count INTEGER DEFAULT 1;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS silver_earned_at TIMESTAMPTZ;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS gold_earned_at TIMESTAMPTZ;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS platinum_earned_at TIMESTAMPTZ;

-- Practice Again Enhancement - add tracking columns
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS is_repeat_practice BOOLEAN DEFAULT false;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS original_session_id UUID REFERENCES training_sessions(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scenario_name TEXT;

-- Badge Tier History
CREATE TABLE IF NOT EXISTS badge_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  from_tier TEXT,
  to_tier TEXT NOT NULL,
  progress_count INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_badge_tier_history_user ON badge_tier_history(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_tier_history_badge ON badge_tier_history(badge_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_original ON training_sessions(original_session_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_scenario ON training_sessions(scenario_id, user_id);

-- RLS
ALTER TABLE badge_tier_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS badge_tier_history_user ON badge_tier_history;
CREATE POLICY badge_tier_history_user ON badge_tier_history FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Update existing badges to be tiered where appropriate
UPDATE badges SET
  is_tiered = true,
  tier_thresholds = '{"silver": 5, "gold": 15, "platinum": 50}'
WHERE criteria_type IN ('session_count', 'streak', 'score_threshold');
