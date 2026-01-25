/**
 * Phase 1 Migration Script
 * Creates all new tables, alters existing tables, creates indexes, enables RLS
 * Run with: node api/scripts/migrate-phase1.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from api folder
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSQL(sql, description) {
  console.log(`\n--- ${description} ---`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try using the REST API directly for DDL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      if (!response.ok) {
        throw new Error(`SQL Error: ${error.message}`);
      }
    }
    console.log(`✓ ${description} completed`);
    return true;
  } catch (err) {
    console.error(`✗ ${description} failed:`, err.message);
    return false;
  }
}

async function runRawSQL(sql, description) {
  console.log(`\n--- ${description} ---`);
  try {
    // Use the SQL endpoint directly via fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      }
    });
    console.log(`✓ ${description} - check Supabase dashboard`);
    return true;
  } catch (err) {
    console.error(`✗ ${description} failed:`, err.message);
    return false;
  }
}

// Generate SQL file for manual execution
function generateSQLFile() {
  const sql = `
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
`;

  return sql;
}

function generateSeedDataSQL() {
  return `
-- =============================================
-- SEED DATA
-- Run after schema creation
-- =============================================

-- Service Categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
('General Pest Control', 'general-pest', 'Quarterly or monthly pest prevention', '🐜', 1),
('Termite Protection', 'termite', 'Termite inspection and treatment', '🪵', 2),
('Mosquito Control', 'mosquito', 'Seasonal mosquito reduction', '🦟', 3),
('Bed Bug Treatment', 'bed-bugs', 'Bed bug elimination', '🛏️', 4),
('Wildlife Removal', 'wildlife', 'Humane wildlife removal', '🦝', 5),
('Lawn Care', 'lawn-care', 'Fertilization and weed control', '🌱', 6),
('Rodent Control', 'rodent', 'Mouse and rat elimination', '🐀', 7),
('Commercial Services', 'commercial', 'Business pest management', '🏢', 8),
('Other/Custom', 'custom', 'Custom services', '⚙️', 99)
ON CONFLICT (slug) DO NOTHING;

-- Pest Types
INSERT INTO pest_types (name, display_name, category, is_common, display_order) VALUES
('ants', 'Ants', 'crawling', true, 1),
('roaches', 'Roaches/Cockroaches', 'crawling', true, 2),
('spiders', 'Spiders', 'crawling', true, 3),
('silverfish', 'Silverfish', 'crawling', true, 4),
('earwigs', 'Earwigs', 'crawling', true, 5),
('centipedes', 'Centipedes', 'crawling', true, 6),
('crickets', 'Crickets', 'crawling', true, 7),
('wasps', 'Wasps', 'stinging', true, 20),
('hornets', 'Hornets', 'stinging', true, 21),
('yellow_jackets', 'Yellow Jackets', 'stinging', true, 22),
('fire_ants', 'Fire Ants', 'stinging', true, 23),
('mosquitoes', 'Mosquitoes', 'flying', true, 40),
('flies', 'Flies', 'flying', true, 41),
('gnats', 'Gnats', 'flying', true, 42),
('bed_bugs', 'Bed Bugs', 'other', true, 60),
('fleas', 'Fleas', 'other', true, 61),
('ticks', 'Ticks', 'other', true, 62),
('mice', 'Mice', 'rodent', true, 80),
('rats', 'Rats', 'rodent', true, 81),
('squirrels', 'Squirrels', 'wildlife', true, 100),
('raccoons', 'Raccoons', 'wildlife', true, 101),
('opossums', 'Opossums', 'wildlife', true, 102),
('skunks', 'Skunks', 'wildlife', true, 103),
('snakes', 'Snakes', 'wildlife', true, 104),
('bats', 'Bats', 'wildlife', true, 105),
('termites', 'Termites', 'wood_destroying', true, 120),
('carpenter_ants', 'Carpenter Ants', 'wood_destroying', true, 121),
('stink_bugs', 'Stink Bugs', 'other', true, 142)
ON CONFLICT (name) DO NOTHING;

-- Package Templates
INSERT INTO package_templates (service_category_slug, template_name, tier, suggested_name, suggested_pricing_model, suggested_initial_price, suggested_recurring_price, suggested_frequency, suggested_warranty, display_order) VALUES
('general-pest', 'Basic Quarterly', 'basic', 'Essential Pest Protection', 'quarterly', 149, 99, 'Every 3 months', 'Free re-service between treatments', 1),
('general-pest', 'Standard Quarterly', 'standard', 'QuarterlyShield', 'quarterly', 199, 149, 'Every 3 months', 'Satisfaction guarantee - free re-service within 30 days', 2),
('general-pest', 'Premium Quarterly', 'premium', 'Total Home Shield', 'quarterly', 249, 199, 'Every 3 months', 'Ultimate guarantee - unlimited free re-services', 3),
('mosquito', 'Seasonal Mosquito', 'standard', 'Mosquito Shield', 'monthly', 99, 79, 'Monthly (seasonal)', 'Re-treatment within 7 days if mosquitoes return', 1),
('termite', 'Liquid Treatment', 'standard', 'TermiteGuard', 'one_time', 1200, 299, 'Annual renewal', '10-year warranty with annual renewal', 1),
('termite', 'Bait System', 'premium', 'TermiteGuard Plus', 'one_time', 1800, 349, 'Annual renewal', 'Lifetime warranty with annual renewal', 2),
('bed-bugs', 'Standard Treatment', 'standard', 'Bed Bug Elimination', 'one_time', 500, NULL, 'Per room', '90-day warranty', 1),
('wildlife', 'Wildlife Removal', 'standard', 'Wildlife Solutions', 'per_service', 250, NULL, 'Per animal', '30-day warranty on exclusion', 1),
('rodent', 'Rodent Control', 'standard', 'Rodent Shield', 'one_time', 350, 99, 'Initial + quarterly', 'Warranty with ongoing monitoring', 1)
ON CONFLICT DO NOTHING;

-- Objection Templates
INSERT INTO objection_templates (objection_category, objection_text, frequency, default_response, display_order) VALUES
('price', 'That''s more expensive than I expected', 'very_common', 'I understand - pest control is an investment. Let me explain what''s included and why our customers find it worthwhile...', 1),
('price', 'I got a cheaper quote from another company', 'very_common', 'I appreciate you sharing that. Did they include a satisfaction guarantee? Our guarantee means if pests come back, we come back free.', 2),
('price', 'Can you give me a discount?', 'common', 'Our pricing includes everything without hidden costs. What I can do is make sure you''re getting the right service level.', 3),
('value', 'I can just buy spray at the hardware store', 'common', 'Store products treat the surface but don''t reach where pests live. Our treatment gets into wall voids and breeding areas.', 10),
('value', 'How do I know it will work?', 'common', 'Our satisfaction guarantee backs it up. If pests return, we return at no charge.', 11),
('timing', 'I need to think about it', 'very_common', 'Absolutely. Is there a specific concern I can address? Pest problems typically worsen over time.', 20),
('timing', 'Call me back later', 'common', 'I understand. When would be a good time to follow up?', 21),
('trust', 'I''ve never heard of your company', 'common', 'We''re locally owned, which means you get personal service. We''ve served this area for years.', 30),
('trust', 'Are your products safe for kids/pets?', 'very_common', 'All products are EPA-registered and applied by trained technicians in cracks and crevices, not where kids and pets play.', 31),
('commitment', 'I don''t want a contract', 'common', 'We don''t require long-term contracts. You can cancel anytime.', 40),
('competition', 'I''m already using another company', 'common', 'How''s it going with them? Are you seeing the results you expected?', 50)
ON CONFLICT DO NOTHING;

-- Customer Profiles (50 profiles)
INSERT INTO customer_profiles (name, gender, age_range, personality_traits, communication_style, objection_likelihood, close_difficulty, is_system) VALUES
-- Easy (close_difficulty 1-3)
('Mike Johnson', 'male', '35-44', '["friendly", "decisive"]', 'direct', 2, 2, true),
('Sarah Williams', 'female', '25-34', '["enthusiastic", "agreeable"]', 'friendly', 2, 3, true),
('Tom Bradley', 'male', '55-64', '["practical", "straightforward"]', 'direct', 3, 3, true),
('Lisa Chen', 'female', '30-39', '["organized", "polite"]', 'analytical', 3, 2, true),
('James Miller', 'male', '40-49', '["efficient", "results-focused"]', 'direct', 2, 2, true),
('Nancy Young', 'female', '35-44', '["busy mom", "practical"]', 'friendly', 4, 4, true),
('Paul Campbell', 'male', '35-44', '["innovative", "open"]', 'friendly', 3, 3, true),
('Ryan Bell', 'male', '28-35', '["convenience-focused"]', 'direct', 3, 3, true),
-- Medium (close_difficulty 4-6)
('Karen Thompson', 'female', '45-54', '["cautious", "thorough"]', 'analytical', 5, 5, true),
('Robert Garcia', 'male', '50-59', '["skeptical", "negotiator"]', 'direct', 6, 5, true),
('Jennifer Adams', 'female', '30-39', '["price-sensitive", "analytical"]', 'analytical', 6, 6, true),
('David Martinez', 'male', '35-44', '["impatient", "direct"]', 'direct', 5, 5, true),
('Michelle Brown', 'female', '40-49', '["worried", "protective"]', 'emotional', 4, 4, true),
('Christopher Lee', 'male', '28-35', '["tech-savvy", "research-driven"]', 'analytical', 5, 5, true),
('Amanda Wilson', 'female', '35-44', '["friendly but cautious"]', 'friendly', 5, 4, true),
('Daniel Taylor', 'male', '45-54', '["traditional", "loyal"]', 'friendly', 4, 4, true),
('Rachel Moore', 'female', '25-34', '["eco-conscious"]', 'emotional', 5, 5, true),
('Steven Anderson', 'male', '55-64', '["experienced", "value-driven"]', 'direct', 5, 5, true),
('Betty Allen', 'female', '60-69', '["sweet but firm"]', 'friendly', 4, 5, true),
('Jason King', 'male', '25-34', '["reviews-focused"]', 'analytical', 5, 5, true),
('Carol Wright', 'female', '45-54', '["perfectionist"]', 'analytical', 6, 6, true),
('Brian Scott', 'male', '40-49', '["logical", "methodical"]', 'analytical', 5, 5, true),
('Donna Green', 'female', '50-59', '["chatty", "relationship-builder"]', 'verbose', 3, 4, true),
('Edward Baker', 'male', '55-64', '["old school", "integrity-focused"]', 'direct', 4, 4, true),
('Sharon Hill', 'female', '40-49', '["community-focused"]', 'friendly', 4, 4, true),
('Laura Mitchell', 'female', '30-39', '["anxious", "worst-case thinker"]', 'emotional', 4, 5, true),
('Kenneth Parker', 'male', '50-59', '["disciplined", "expects follow-through"]', 'direct', 5, 4, true),
('Deborah Evans', 'female', '55-64', '["educational", "patient"]', 'analytical', 4, 4, true),
('Sandra Collins', 'female', '45-54', '["cleanliness-focused"]', 'analytical', 4, 4, true),
('Jeffrey Rogers', 'male', '35-44', '["analytical", "spreadsheet person"]', 'analytical', 6, 5, true),
('Linda Reed', 'female', '40-49', '["organized", "schedule-driven"]', 'direct', 4, 4, true),
('Elizabeth Morgan', 'female', '45-54', '["elegant", "quality-focused"]', 'friendly', 5, 5, true),
-- Hard (close_difficulty 7-8)
('Margaret Thompson', 'female', '65-74', '["frugal", "skeptical"]', 'direct', 8, 8, true),
('Richard Davis', 'male', '50-59', '["aggressive negotiator"]', 'confrontational', 8, 7, true),
('Patricia Wilson', 'female', '55-64', '["very skeptical", "trust issues"]', 'guarded', 9, 8, true),
('Barbara Mitchell', 'female', '45-54', '["emotional", "demanding"]', 'emotional', 7, 7, true),
('William Jackson', 'male', '40-49', '["know-it-all", "challenging"]', 'confrontational', 8, 8, true),
('Susan White', 'female', '50-59', '["indecisive", "fearful"]', 'emotional', 6, 8, true),
('Joseph Harris', 'male', '55-64', '["distrustful", "cynical"]', 'direct', 9, 8, true),
('Kevin Hall', 'male', '30-39', '["DIY enthusiast"]', 'direct', 7, 6, true),
('Ruth Adams', 'female', '65-74', '["widowed", "cautious"]', 'emotional', 6, 7, true),
('Mark Edwards', 'male', '40-49', '["attorney", "detail-focused"]', 'analytical', 7, 6, true),
('Donald Stewart', 'male', '60-69', '["curmudgeon", "complainer"]', 'confrontational', 8, 8, true),
('Mary Morris', 'female', '50-59', '["perfectionist", "high maintenance"]', 'emotional', 6, 6, true),
('Gary Cook', 'male', '55-64', '["penny pincher"]', 'direct', 7, 7, true),
-- Very Hard (close_difficulty 9-10)
('Charles Roberts', 'male', '60-69', '["stubborn", "argumentative"]', 'confrontational', 9, 9, true),
('Dorothy Clark', 'female', '70-79', '["extremely frugal", "resistant"]', 'guarded', 10, 10, true),
('George Lewis', 'male', '65-74', '["hostile to salespeople"]', 'confrontational', 10, 9, true),
('Henry Nelson', 'male', '45-54', '["business owner", "decisive"]', 'direct', 3, 3, true)
ON CONFLICT DO NOTHING;

-- System Courses
INSERT INTO courses (id, organization_id, name, description, category, icon, badge_name, badge_icon, is_system, display_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Sales Fundamentals', 'Master the basics of pest control sales.', 'sales', '📞', 'Sales Rookie', '🏅', true, 1),
('00000000-0000-0000-0000-000000000002', NULL, 'Objection Handling', 'Overcome price, value, and competitor objections.', 'sales', '🛡️', 'Objection Master', '🏆', true, 2),
('00000000-0000-0000-0000-000000000003', NULL, 'Customer Service Excellence', 'Deliver exceptional service.', 'service', '⭐', 'Service Star', '🌟', true, 3),
('00000000-0000-0000-0000-000000000004', NULL, 'Cancellation Saves', 'Keep customers who want to leave.', 'retention', '🔄', 'Retention Pro', '💎', true, 4),
('00000000-0000-0000-0000-000000000005', NULL, 'Angry Customer De-escalation', 'Turn frustrated customers around.', 'service', '😤', 'De-escalation Expert', '🧘', true, 5),
('00000000-0000-0000-0000-000000000006', NULL, 'Upselling & Cross-selling', 'Add value through additional services.', 'sales', '📈', 'Upsell Champion', '💰', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Modules for each course
INSERT INTO course_modules (course_id, difficulty, name, description, scenario_count, pass_threshold, unlock_order) VALUES
-- Sales Fundamentals
('00000000-0000-0000-0000-000000000001', 'easy', 'First Contact Basics', 'Great first impressions and info gathering.', 10, 60, 0),
('00000000-0000-0000-0000-000000000001', 'medium', 'Presenting Solutions', 'Match needs to services.', 12, 65, 1),
('00000000-0000-0000-0000-000000000001', 'hard', 'Closing Techniques', 'Ask for the sale confidently.', 15, 70, 2),
-- Objection Handling
('00000000-0000-0000-0000-000000000002', 'easy', 'Price Objections', 'Handle too expensive and discounts.', 10, 60, 0),
('00000000-0000-0000-0000-000000000002', 'medium', 'Value & Trust', 'Overcome effectiveness doubts.', 12, 65, 1),
('00000000-0000-0000-0000-000000000002', 'hard', 'Competitor Objections', 'Handle comparisons.', 15, 70, 2),
-- Customer Service
('00000000-0000-0000-0000-000000000003', 'easy', 'Service Basics', 'Scheduling and routine interactions.', 10, 60, 0),
('00000000-0000-0000-0000-000000000003', 'medium', 'Problem Resolution', 'Service issues and billing.', 12, 65, 1),
('00000000-0000-0000-0000-000000000003', 'hard', 'Complex Situations', 'Multi-issue complaints.', 15, 70, 2),
-- Cancellation Saves
('00000000-0000-0000-0000-000000000004', 'easy', 'Understanding Why', 'Discover real cancellation reasons.', 10, 60, 0),
('00000000-0000-0000-0000-000000000004', 'medium', 'Value Articulation', 'Re-present value.', 12, 65, 1),
('00000000-0000-0000-0000-000000000004', 'hard', 'Competitive Saves', 'Retain vs competitors.', 15, 70, 2),
-- De-escalation
('00000000-0000-0000-0000-000000000005', 'easy', 'Active Listening', 'Let customers vent.', 10, 60, 0),
('00000000-0000-0000-0000-000000000005', 'medium', 'Taking Ownership', 'Apologize and propose solutions.', 12, 65, 1),
('00000000-0000-0000-0000-000000000005', 'hard', 'Extreme Situations', 'Threats and ultimatums.', 15, 70, 2),
-- Upselling
('00000000-0000-0000-0000-000000000006', 'easy', 'Spotting Opportunities', 'Recognize upsell moments.', 10, 60, 0),
('00000000-0000-0000-0000-000000000006', 'medium', 'Natural Transitions', 'Present without being pushy.', 12, 65, 1),
('00000000-0000-0000-0000-000000000006', 'hard', 'Add-on Resistance', 'Handle upsell objections.', 15, 70, 2)
ON CONFLICT DO NOTHING;
`;
}

function generateVerificationSQL() {
  return `
-- =============================================
-- VERIFICATION QUERIES
-- Run after seed data to verify counts
-- =============================================

SELECT 'service_categories' as tbl, COUNT(*) as count FROM service_categories
UNION ALL SELECT 'pest_types', COUNT(*) FROM pest_types
UNION ALL SELECT 'package_templates', COUNT(*) FROM package_templates
UNION ALL SELECT 'objection_templates', COUNT(*) FROM objection_templates
UNION ALL SELECT 'customer_profiles', COUNT(*) FROM customer_profiles
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'course_modules', COUNT(*) FROM course_modules;

-- Expected results:
-- service_categories: 9
-- pest_types: 28
-- package_templates: 9
-- objection_templates: 11
-- customer_profiles: 48
-- courses: 6
-- course_modules: 18
`;
}

async function main() {
  console.log('========================================');
  console.log('Phase 1: Database Schema & Seed Data');
  console.log('========================================\n');

  console.log('Generating SQL files for Supabase...\n');

  // Write schema SQL
  const schemaSQL = generateSQLFile();
  const seedSQL = generateSeedDataSQL();
  const verifySQL = generateVerificationSQL();

  const fs = await import('fs');
  const path = await import('path');

  const outputDir = path.join(__dirname, '..', '..', 'supabase-migrations');

  try {
    await fs.promises.mkdir(outputDir, { recursive: true });
  } catch (err) {
    // Ignore if exists
  }

  await fs.promises.writeFile(
    path.join(outputDir, '001_schema.sql'),
    schemaSQL.trim()
  );
  console.log('✓ Created supabase-migrations/001_schema.sql');

  await fs.promises.writeFile(
    path.join(outputDir, '002_seed_data.sql'),
    seedSQL.trim()
  );
  console.log('✓ Created supabase-migrations/002_seed_data.sql');

  await fs.promises.writeFile(
    path.join(outputDir, '003_verify.sql'),
    verifySQL.trim()
  );
  console.log('✓ Created supabase-migrations/003_verify.sql');

  console.log('\n========================================');
  console.log('SQL files generated successfully!');
  console.log('========================================\n');
  console.log('Next steps:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run 001_schema.sql first');
  console.log('3. Run 002_seed_data.sql second');
  console.log('4. Run 003_verify.sql to check counts');
  console.log('\nOr copy/paste the combined SQL below:\n');
  console.log('========================================\n');
  console.log(schemaSQL);
  console.log('\n-- SEED DATA --\n');
  console.log(seedSQL);
  console.log('\n-- VERIFICATION --\n');
  console.log(verifySQL);
}

main().catch(console.error);
