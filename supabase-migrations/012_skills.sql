-- Migration: 012_skills.sql
-- Description: Skill profiles, tracking, and recommendation engine

-- Skill categories enum-like reference
-- Categories: empathy, problem_solving, product_knowledge, communication, objection_handling, closing, time_management

-- User skill profiles (aggregated skill scores)
CREATE TABLE IF NOT EXISTS skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Category averages (0-100 scale)
  category_scores JSONB DEFAULT '{
    "empathy": null,
    "problem_solving": null,
    "product_knowledge": null,
    "communication": null,
    "objection_handling": null,
    "closing": null,
    "time_management": null
  }',

  -- Derived insights
  strongest_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  weakest_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  improving_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  declining_skills TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Stats
  total_sessions_analyzed INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical skill scores (for trend tracking)
CREATE TABLE IF NOT EXISTS skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario skill tags (which skills each scenario tests)
CREATE TABLE IF NOT EXISTS scenario_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  primary_skill TEXT NOT NULL,
  secondary_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_by_skill JSONB DEFAULT '{}', -- {"empathy": "medium", "closing": "hard"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id)
);

-- Personalized recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,

  -- Recommendation details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('scenario', 'course', 'skill_focus', 'warmup')),
  reason TEXT NOT NULL,
  target_skill TEXT,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed')),
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Validity
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill benchmarks (org/team targets)
CREATE TABLE IF NOT EXISTS skill_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  skill_category TEXT NOT NULL,
  target_score NUMERIC NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  minimum_score NUMERIC CHECK (minimum_score >= 0 AND minimum_score <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, team_id, skill_category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_profiles_user ON skill_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_profiles_org ON skill_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_skill_history_user ON skill_history(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_history_category ON skill_history(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_history_recorded ON skill_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_scenario_skill_tags_scenario ON scenario_skill_tags(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_skill_tags_primary ON scenario_skill_tags(primary_skill);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);

-- RLS Policies
ALTER TABLE skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_benchmarks ENABLE ROW LEVEL SECURITY;

-- Skill profiles: users see their own, managers see team's
CREATE POLICY skill_profiles_policy ON skill_profiles
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY skill_profiles_user_update ON skill_profiles
  FOR ALL USING (user_id = auth.uid());

-- Skill history: users see their own
CREATE POLICY skill_history_user_policy ON skill_history
  FOR ALL USING (user_id = auth.uid());

-- Scenario skill tags: viewable by all org members
CREATE POLICY scenario_skill_tags_policy ON scenario_skill_tags
  FOR SELECT USING (
    scenario_id IN (
      SELECT id FROM scenarios WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ) OR org_id IS NULL
    )
  );

-- Recommendations: users see their own
CREATE POLICY recommendations_user_policy ON recommendations
  FOR ALL USING (user_id = auth.uid());

-- Benchmarks: viewable by org members
CREATE POLICY skill_benchmarks_policy ON skill_benchmarks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Add skill tracking to training sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS skill_scores JSONB;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS primary_skill_tested TEXT;
