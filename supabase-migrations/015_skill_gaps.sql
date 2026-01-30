-- Migration: 015_skill_gaps.sql
-- Description: Skill gap analysis and heatmap visualization

-- Team skill assessments (aggregated view)
CREATE TABLE IF NOT EXISTS team_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  -- Aggregated scores by skill
  skill_averages JSONB DEFAULT '{}', -- {empathy: 72, problem_solving: 65, ...}
  skill_distributions JSONB DEFAULT '{}', -- {empathy: {below_60: 2, 60_80: 5, above_80: 3}, ...}

  -- Team size metrics
  total_users INTEGER DEFAULT 0,
  users_with_data INTEGER DEFAULT 0,

  -- Trend data
  previous_averages JSONB DEFAULT '{}',
  trend_direction JSONB DEFAULT '{}', -- {empathy: 'up', problem_solving: 'down', ...}

  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual skill gaps (per user, per skill)
CREATE TABLE IF NOT EXISTS user_skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  skill_category TEXT NOT NULL,
  current_score NUMERIC,
  target_score NUMERIC DEFAULT 70,
  gap_size NUMERIC GENERATED ALWAYS AS (target_score - COALESCE(current_score, 0)) STORED,

  -- Priority calculation
  priority TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (target_score - COALESCE(current_score, 0)) >= 30 THEN 'critical'
      WHEN (target_score - COALESCE(current_score, 0)) >= 20 THEN 'high'
      WHEN (target_score - COALESCE(current_score, 0)) >= 10 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,

  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_category)
);

-- Skill improvement plans
CREATE TABLE IF NOT EXISTS skill_improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

  target_skill TEXT NOT NULL,
  current_score NUMERIC,
  target_score NUMERIC NOT NULL,
  target_date DATE,

  -- Plan details
  recommended_scenarios UUID[] DEFAULT ARRAY[]::UUID[],
  recommended_courses UUID[] DEFAULT ARRAY[]::UUID[],
  notes TEXT,

  -- Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  progress_score NUMERIC,
  last_session_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_skill_assessments_org ON team_skill_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_team_skill_assessments_team ON team_skill_assessments(team_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_gaps_user ON user_skill_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_gaps_skill ON user_skill_gaps(skill_category);
CREATE INDEX IF NOT EXISTS idx_user_skill_gaps_priority ON user_skill_gaps(priority);
CREATE INDEX IF NOT EXISTS idx_skill_improvement_plans_user ON skill_improvement_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_improvement_plans_status ON skill_improvement_plans(status);

-- RLS Policies
ALTER TABLE team_skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_improvement_plans ENABLE ROW LEVEL SECURITY;

-- Team assessments: managers can view their org
CREATE POLICY team_skill_assessments_policy ON team_skill_assessments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

-- User skill gaps: users see their own, managers see their team's
CREATE POLICY user_skill_gaps_user_policy ON user_skill_gaps
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

-- Improvement plans: users see their own, managers see/edit team's
CREATE POLICY skill_improvement_plans_user_policy ON skill_improvement_plans
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

CREATE POLICY skill_improvement_plans_manager_edit ON skill_improvement_plans
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );
