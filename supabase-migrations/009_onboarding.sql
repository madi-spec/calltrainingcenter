-- Migration: 009_onboarding.sql
-- Description: Add onboarding and tutorial tracking for guided first experience

-- Add onboarding fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{"steps_completed": [], "current_step": null, "started_at": null, "completed_at": null}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT false;

-- Tutorial steps completion tracking
CREATE TABLE IF NOT EXISTS tutorial_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_user ON tutorial_completions(user_id);

-- Feature tours (for announcing new features)
CREATE TABLE IF NOT EXISTS feature_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  target_roles TEXT[] DEFAULT ARRAY['agent'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which users have seen which feature tours
CREATE TABLE IF NOT EXISTS feature_tour_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES feature_tours(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, tour_id)
);

-- RLS Policies
ALTER TABLE tutorial_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_tour_views ENABLE ROW LEVEL SECURITY;

-- Tutorial completions: users can only see/manage their own
CREATE POLICY tutorial_completions_user_policy ON tutorial_completions
  FOR ALL USING (user_id = auth.uid());

-- Feature tours: viewable by org members
CREATE POLICY feature_tours_org_policy ON feature_tours
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Feature tour views: users can only see/manage their own
CREATE POLICY feature_tour_views_user_policy ON feature_tour_views
  FOR ALL USING (user_id = auth.uid());
