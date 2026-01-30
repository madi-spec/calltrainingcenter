-- =============================================
-- Migration 007: Social Features
-- =============================================

-- Colleague Challenges (head-to-head)
CREATE TABLE IF NOT EXISTS colleague_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenged_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'expired')),
  wager_points INTEGER DEFAULT 0,
  message TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Results
CREATE TABLE IF NOT EXISTS challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES colleague_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  duration_seconds INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Achievement Shares (for social feed)
CREATE TABLE IF NOT EXISTS achievement_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'badge_earned', 'level_up', 'streak_milestone', 'high_score',
    'challenge_won', 'course_completed', 'perfect_score'
  )),
  achievement_id TEXT, -- Badge ID, level number, etc.
  achievement_data JSONB DEFAULT '{}',
  message TEXT,
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'organization')),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement Likes
CREATE TABLE IF NOT EXISTS achievement_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES achievement_shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(share_id, user_id)
);

-- Achievement Comments
CREATE TABLE IF NOT EXISTS achievement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES achievement_shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Notifications (for challenge invites, likes, etc.)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS social_reference_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS social_reference_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_colleague_challenges_challenger ON colleague_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_colleague_challenges_challenged ON colleague_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_colleague_challenges_status ON colleague_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_results_challenge ON challenge_results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_achievement_shares_user ON achievement_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_shares_org ON achievement_shares(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_achievement_likes_share ON achievement_likes(share_id);
CREATE INDEX IF NOT EXISTS idx_achievement_comments_share ON achievement_comments(share_id);

-- RLS Policies
ALTER TABLE colleague_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_comments ENABLE ROW LEVEL SECURITY;

-- Users can see challenges they're involved in
DROP POLICY IF EXISTS colleague_challenges_access ON colleague_challenges;
CREATE POLICY colleague_challenges_access ON colleague_challenges FOR ALL
  USING (
    challenger_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text) OR
    challenged_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS challenge_results_access ON challenge_results;
CREATE POLICY challenge_results_access ON challenge_results FOR ALL
  USING (
    challenge_id IN (
      SELECT id FROM colleague_challenges
      WHERE challenger_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
         OR challenged_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

-- Achievement shares visible based on visibility setting
DROP POLICY IF EXISTS achievement_shares_access ON achievement_shares;
CREATE POLICY achievement_shares_access ON achievement_shares FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text) OR
    (visibility = 'organization' AND organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text)) OR
    (visibility = 'team' AND user_id IN (SELECT id FROM users WHERE team_id IN (SELECT team_id FROM users WHERE clerk_id = auth.uid()::text)))
  );

DROP POLICY IF EXISTS achievement_shares_insert ON achievement_shares;
CREATE POLICY achievement_shares_insert ON achievement_shares FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS achievement_likes_access ON achievement_likes;
CREATE POLICY achievement_likes_access ON achievement_likes FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS achievement_comments_access ON achievement_comments;
CREATE POLICY achievement_comments_access ON achievement_comments FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
