-- =============================================
-- PHASE 1: Database Schema & Seed Data
-- Run this in Supabase SQL Editor
-- =============================================

-- 1.1 System Reference Tables
-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pest Types
CREATE TABLE IF NOT EXISTS pest_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  is_common BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Templates
CREATE TABLE IF NOT EXISTS package_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category_slug TEXT NOT NULL,
  template_name TEXT NOT NULL,
  tier TEXT,
  suggested_name TEXT,
  suggested_internal_name TEXT,
  suggested_description TEXT,
  suggested_pricing_model TEXT,
  suggested_initial_price DECIMAL,
  suggested_recurring_price DECIMAL,
  suggested_frequency TEXT,
  suggested_pests JSONB DEFAULT '[]',
  suggested_services JSONB DEFAULT '[]',
  suggested_warranty TEXT,
  suggested_selling_points JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objection Templates
CREATE TABLE IF NOT EXISTS objection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category_slug TEXT,
  objection_category TEXT NOT NULL,
  objection_text TEXT NOT NULL,
  frequency TEXT DEFAULT 'common',
  default_response TEXT NOT NULL,
  response_key_points JSONB DEFAULT '[]',
  common_mistakes JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Team Structure
-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add team_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 1.3 Product Configuration
-- Company Service Lines
CREATE TABLE IF NOT EXISTS company_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id),
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, category_id)
);

-- Service Packages
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  service_line_id UUID REFERENCES company_service_lines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  internal_name TEXT,
  description TEXT,
  pricing_model TEXT CHECK (pricing_model IN ('one_time', 'monthly', 'quarterly', 'annual', 'per_service', 'custom')),
  initial_price DECIMAL,
  recurring_price DECIMAL,
  price_display TEXT,
  included_pests JSONB DEFAULT '[]',
  included_services JSONB DEFAULT '[]',
  service_frequency TEXT,
  warranty_details TEXT,
  target_customer TEXT,
  ideal_situations JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Selling Points
CREATE TABLE IF NOT EXISTS package_selling_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES service_packages(id) ON DELETE CASCADE,
  point TEXT NOT NULL,
  emphasis_level INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Objections
CREATE TABLE IF NOT EXISTS package_objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES service_packages(id) ON DELETE CASCADE,
  objection_text TEXT NOT NULL,
  objection_category TEXT,
  frequency TEXT DEFAULT 'common',
  recommended_response TEXT NOT NULL,
  response_key_points JSONB DEFAULT '[]',
  alternative_responses JSONB DEFAULT '[]',
  avoid_saying JSONB DEFAULT '[]',
  coaching_tip TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Information
CREATE TABLE IF NOT EXISTS competitor_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  typical_pricing TEXT,
  known_weaknesses JSONB DEFAULT '[]',
  their_pitch JSONB DEFAULT '[]',
  our_advantages JSONB DEFAULT '[]',
  response_when_mentioned TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Guidelines
CREATE TABLE IF NOT EXISTS sales_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  guideline_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Course & Module System
-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  product_line TEXT,
  icon TEXT,
  badge_name TEXT,
  badge_icon TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Modules
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  name TEXT NOT NULL,
  description TEXT,
  scenario_count INTEGER DEFAULT 10,
  pass_threshold INTEGER DEFAULT 60,
  required_completions INTEGER DEFAULT 1,
  unlock_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario Templates
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id),
  name TEXT NOT NULL,
  category TEXT,
  base_situation TEXT,
  customer_goals TEXT,
  csr_objectives TEXT,
  scoring_focus JSONB DEFAULT '{}',
  escalation_triggers TEXT,
  deescalation_triggers TEXT,
  resolution_conditions TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  gender TEXT,
  age_range TEXT,
  personality_traits JSONB DEFAULT '[]',
  communication_style TEXT,
  pain_points JSONB DEFAULT '[]',
  buying_motivations JSONB DEFAULT '[]',
  objection_likelihood INTEGER DEFAULT 5,
  close_difficulty INTEGER DEFAULT 5,
  voice_id TEXT,
  is_system BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Scenarios
CREATE TABLE IF NOT EXISTS generated_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  profile_id UUID REFERENCES customer_profiles(id),
  user_id UUID REFERENCES users(id),
  module_id UUID REFERENCES course_modules(id),
  situation_text TEXT,
  opening_line TEXT,
  will_close BOOLEAN,
  close_stage INTEGER,
  sequence_number INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Module Progress
CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed', 'mastered')),
  scenarios_completed INTEGER DEFAULT 0,
  scenarios_won INTEGER DEFAULT 0,
  best_close_rate DECIMAL,
  attempts INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- User Course Progress
CREATE TABLE IF NOT EXISTS user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  modules_completed INTEGER DEFAULT 0,
  badge_earned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 1.5 Practice Requirements
-- Practice Requirements Configuration
CREATE TABLE IF NOT EXISTS practice_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  required_calls INTEGER DEFAULT 5,
  required_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Practice Log
CREATE TABLE IF NOT EXISTS practice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_completed INTEGER DEFAULT 0,
  minutes_practiced DECIMAL DEFAULT 0,
  met_requirement BOOLEAN DEFAULT false,
  excused BOOLEAN DEFAULT false,
  excuse_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Session Feedback
CREATE TABLE IF NOT EXISTS session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id),
  feedback_type TEXT CHECK (feedback_type IN ('praise', 'coaching', 'badge_award', 'comment')),
  content TEXT,
  badge_id UUID REFERENCES badges(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Alter Existing Tables
-- Add to training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES course_modules(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS generated_scenario_id UUID REFERENCES generated_scenarios(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS customer_profile_id UUID REFERENCES customer_profiles(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS call_outcome TEXT CHECK (call_outcome IN ('won', 'lost', 'abandoned'));

-- Add to badges
ALTER TABLE badges ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);

-- Add to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS products_configured BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS service_areas JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS value_propositions JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline TEXT;

-- 1.7 Indexes
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_org ON service_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_org ON courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_log_user_date ON practice_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_generated_scenarios_user ON generated_scenarios(user_id);

-- 1.8 RLS Policies
-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public reference tables (anyone can read)
DROP POLICY IF EXISTS service_categories_read ON service_categories;
CREATE POLICY service_categories_read ON service_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS pest_types_read ON pest_types;
CREATE POLICY pest_types_read ON pest_types FOR SELECT USING (true);

DROP POLICY IF EXISTS package_templates_read ON package_templates;
CREATE POLICY package_templates_read ON package_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS objection_templates_read ON objection_templates;
CREATE POLICY objection_templates_read ON objection_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS customer_profiles_read ON customer_profiles;
CREATE POLICY customer_profiles_read ON customer_profiles FOR SELECT USING (is_system = true OR organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

-- Org-scoped policies
DROP POLICY IF EXISTS teams_org_isolation ON teams;
CREATE POLICY teams_org_isolation ON teams FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS service_lines_org ON company_service_lines;
CREATE POLICY service_lines_org ON company_service_lines FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS packages_org ON service_packages;
CREATE POLICY packages_org ON service_packages FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS courses_access ON courses;
CREATE POLICY courses_access ON courses FOR ALL
  USING (is_system = true OR organization_id IN (SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS user_module_progress_user ON user_module_progress;
CREATE POLICY user_module_progress_user ON user_module_progress FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

DROP POLICY IF EXISTS practice_log_user ON practice_log;
CREATE POLICY practice_log_user ON practice_log FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));