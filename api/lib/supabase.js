import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
function validateEnvVars() {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    console.warn(`Missing Supabase environment variables: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

/**
 * Create a Supabase client for server-side operations with the service role key
 * This bypasses Row Level Security and should only be used for admin operations
 */
export function createAdminClient() {
  console.log('[Supabase] Creating admin client, URL exists:', !!supabaseUrl, 'Service key exists:', !!supabaseServiceRoleKey);

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client scoped to a user's JWT token
 * This client respects Row Level Security policies
 * @param {string} accessToken - The user's JWT access token
 */
export function createUserClient(accessToken) {
  if (!validateEnvVars()) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client from Express request
 * Extracts the JWT from the Authorization header
 * @param {Request} req - Express request object
 */
export function createSupabaseClient(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  return createUserClient(token);
}

/**
 * Get the anonymous Supabase client for public operations
 */
export function getAnonClient() {
  if (!validateEnvVars()) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Verify a JWT token and get the user data
 * @param {string} token - JWT access token
 */
export async function verifyToken(token) {
  if (!token) return null;

  const adminClient = createAdminClient();

  try {
    const { data: { user }, error } = await adminClient.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Database table names for easy reference
 */
export const TABLES = {
  ORGANIZATIONS: 'organizations',
  BRANCHES: 'branches',
  USERS: 'users',
  TRAINING_SESSIONS: 'training_sessions',
  TRAINING_SUITES: 'training_suites',
  TRAINING_ASSIGNMENTS: 'training_assignments',
  USAGE_RECORDS: 'usage_records',
  INVOICES: 'invoices',
  BADGES: 'badges',
  USER_BADGES: 'user_badges',
  POINT_TRANSACTIONS: 'point_transactions',
  NOTIFICATIONS: 'notifications',
  // Phase 1: Engagement & Retention
  DAILY_CHALLENGES: 'daily_challenges',
  USER_CHALLENGE_PROGRESS: 'user_challenge_progress',
  TEAM_CHALLENGE_PROGRESS: 'team_challenge_progress',
  CHALLENGE_TEMPLATES: 'challenge_templates',
  STREAK_TOKENS: 'streak_tokens',
  STREAK_HISTORY: 'streak_history',
  STREAK_MILESTONES: 'streak_milestones',
  SCENARIO_BOOKMARKS: 'scenario_bookmarks',
  BOOKMARK_FOLDERS: 'bookmark_folders',
  COLLEAGUE_CHALLENGES: 'colleague_challenges',
  CHALLENGE_RESULTS: 'challenge_results',
  ACHIEVEMENT_SHARES: 'achievement_shares',
  ACHIEVEMENT_LIKES: 'achievement_likes',
  ACHIEVEMENT_COMMENTS: 'achievement_comments',
  BADGE_TIER_HISTORY: 'badge_tier_history',
  // Phase 2: Training Effectiveness
  TUTORIAL_COMPLETIONS: 'tutorial_completions',
  FEATURE_TOURS: 'feature_tours',
  FEATURE_TOUR_VIEWS: 'feature_tour_views',
  WARMUP_EXERCISES: 'warmup_exercises',
  WARMUP_ATTEMPTS: 'warmup_attempts',
  WARMUP_SESSIONS: 'warmup_sessions',
  CALL_RECORDINGS: 'call_recordings',
  RECORDING_BOOKMARKS: 'recording_bookmarks',
  RECORDING_SHARES: 'recording_shares',
  SKILL_PROFILES: 'skill_profiles',
  SKILL_HISTORY: 'skill_history',
  SCENARIO_SKILL_TAGS: 'scenario_skill_tags',
  RECOMMENDATIONS: 'recommendations',
  SKILL_BENCHMARKS: 'skill_benchmarks',
  MICRO_SCENARIOS: 'micro_scenarios',
  MICRO_SESSIONS: 'micro_sessions',
  MICRO_DAILY_CHALLENGES: 'micro_daily_challenges',
  // Phase 3: Management Value
  ACTIVE_SESSIONS: 'active_sessions',
  SESSION_COMPLETIONS: 'session_completions',
  DASHBOARD_PREFERENCES: 'dashboard_preferences',
  TEAM_SKILL_ASSESSMENTS: 'team_skill_assessments',
  USER_SKILL_GAPS: 'user_skill_gaps',
  SKILL_IMPROVEMENT_PLANS: 'skill_improvement_plans',
  BUSINESS_METRICS: 'business_metrics',
  ROI_CALCULATIONS: 'roi_calculations',
  ROI_CONFIG: 'roi_config',
  ANALYSIS_QUEUE: 'analysis_queue',
  ANALYSIS_CACHE: 'analysis_cache',
  // Phase 4: Platform Maturity
  PUSH_SUBSCRIPTIONS: 'push_subscriptions',
  NOTIFICATION_DELIVERY: 'notification_delivery',
  OFFLINE_SYNC_QUEUE: 'offline_sync_queue',
  CALENDAR_INTEGRATIONS: 'calendar_integrations',
  TRAINING_EVENTS: 'training_events',
  TRAINING_GOALS: 'training_goals'
};

/**
 * SQL Schema for Supabase (reference - run this in Supabase SQL Editor)
 *
 * -- Organizations (tenants)
 * CREATE TABLE organizations (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name TEXT NOT NULL,
 *   slug TEXT UNIQUE NOT NULL,
 *   phone TEXT,
 *   website TEXT,
 *   logo_url TEXT,
 *   colors JSONB DEFAULT '{"primary": "#2563eb", "secondary": "#1e40af", "accent": "#3b82f6"}',
 *   services TEXT[],
 *   pricing JSONB DEFAULT '{}',
 *   stripe_customer_id TEXT,
 *   subscription_status TEXT DEFAULT 'trialing',
 *   subscription_plan TEXT DEFAULT 'starter',
 *   training_hours_included INTEGER DEFAULT 10,
 *   training_hours_used DECIMAL(10,2) DEFAULT 0,
 *   settings JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Branches
 * CREATE TABLE branches (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   address TEXT,
 *   phone TEXT,
 *   timezone TEXT DEFAULT 'America/New_York',
 *   is_primary BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Users (extends Supabase auth.users)
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   full_name TEXT NOT NULL,
 *   role TEXT NOT NULL DEFAULT 'trainee' CHECK (role IN ('trainee', 'manager', 'admin', 'owner')),
 *   status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
 *   total_points INTEGER DEFAULT 0,
 *   current_streak INTEGER DEFAULT 0,
 *   longest_streak INTEGER DEFAULT 0,
 *   level INTEGER DEFAULT 1,
 *   last_training_at TIMESTAMPTZ,
 *   preferences JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Training Sessions
 * CREATE TABLE training_sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   scenario_id TEXT NOT NULL,
 *   assignment_id UUID REFERENCES training_assignments(id) ON DELETE SET NULL,
 *   retell_call_id TEXT,
 *   started_at TIMESTAMPTZ DEFAULT NOW(),
 *   ended_at TIMESTAMPTZ,
 *   duration_seconds INTEGER,
 *   transcript_raw TEXT,
 *   transcript_formatted JSONB,
 *   overall_score INTEGER,
 *   category_scores JSONB,
 *   strengths JSONB,
 *   improvements JSONB,
 *   points_earned INTEGER DEFAULT 0,
 *   badges_earned TEXT[],
 *   billable_minutes DECIMAL(10,2) DEFAULT 0,
 *   status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Training Suites
 * CREATE TABLE training_suites (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   type TEXT DEFAULT 'custom' CHECK (type IN ('onboarding', 'retraining', 'certification', 'custom')),
 *   scenario_order TEXT[],
 *   passing_score INTEGER DEFAULT 70,
 *   required_completions INTEGER DEFAULT 1,
 *   created_by UUID REFERENCES users(id),
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Training Assignments
 * CREATE TABLE training_assignments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
 *   suite_id UUID REFERENCES training_suites(id) ON DELETE SET NULL,
 *   scenario_id TEXT,
 *   assigned_by UUID REFERENCES users(id),
 *   due_date TIMESTAMPTZ,
 *   status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
 *   progress JSONB DEFAULT '{"completed": 0, "total": 1}',
 *   completed_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Usage Records (for billing)
 * CREATE TABLE usage_records (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
 *   user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 *   usage_type TEXT NOT NULL CHECK (usage_type IN ('training_minutes', 'ai_analysis', 'voice_call')),
 *   quantity DECIMAL(10,4) NOT NULL,
 *   unit TEXT NOT NULL,
 *   billing_period_start DATE NOT NULL,
 *   billing_period_end DATE NOT NULL,
 *   reported_to_stripe BOOLEAN DEFAULT false,
 *   stripe_usage_record_id TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Invoices
 * CREATE TABLE invoices (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   stripe_invoice_id TEXT UNIQUE NOT NULL,
 *   period_start DATE,
 *   period_end DATE,
 *   amount_due INTEGER,
 *   amount_paid INTEGER,
 *   currency TEXT DEFAULT 'usd',
 *   usage_summary JSONB,
 *   status TEXT DEFAULT 'draft',
 *   invoice_url TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Badges
 * CREATE TABLE badges (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   icon TEXT,
 *   criteria_type TEXT NOT NULL,
 *   criteria_value JSONB NOT NULL,
 *   rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
 *   points_value INTEGER DEFAULT 0,
 *   is_system BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- User Badges
 * CREATE TABLE user_badges (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
 *   session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
 *   earned_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(user_id, badge_id)
 * );
 *
 * -- Point Transactions
 * CREATE TABLE point_transactions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   points INTEGER NOT NULL,
 *   reason TEXT NOT NULL,
 *   reference_type TEXT,
 *   reference_id UUID,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Notifications
 * CREATE TABLE notifications (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   type TEXT NOT NULL CHECK (type IN ('assignment', 'reminder', 'achievement', 'report', 'system')),
 *   title TEXT NOT NULL,
 *   message TEXT,
 *   data JSONB DEFAULT '{}',
 *   channels TEXT[] DEFAULT '{"in_app"}',
 *   sent_at TIMESTAMPTZ DEFAULT NOW(),
 *   read_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Indexes for performance
 * CREATE INDEX idx_users_org ON users(organization_id);
 * CREATE INDEX idx_users_branch ON users(branch_id);
 * CREATE INDEX idx_branches_org ON branches(organization_id);
 * CREATE INDEX idx_sessions_org ON training_sessions(organization_id);
 * CREATE INDEX idx_sessions_user ON training_sessions(user_id);
 * CREATE INDEX idx_assignments_org ON training_assignments(organization_id);
 * CREATE INDEX idx_assignments_user ON training_assignments(user_id);
 * CREATE INDEX idx_usage_org ON usage_records(organization_id);
 * CREATE INDEX idx_notifications_user ON notifications(user_id);
 * CREATE INDEX idx_point_transactions_user ON point_transactions(user_id);
 *
 * -- Row Level Security Policies
 * ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE training_suites ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
 *
 * -- Users can only see their own organization's data
 * CREATE POLICY "Users see own org data" ON organizations
 *   FOR SELECT USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
 *
 * CREATE POLICY "Users see own org branches" ON branches
 *   FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
 *
 * CREATE POLICY "Users see own org users" ON users
 *   FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
 *
 * CREATE POLICY "Users see own org sessions" ON training_sessions
 *   FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
 *
 * CREATE POLICY "Users insert own sessions" ON training_sessions
 *   FOR INSERT WITH CHECK (user_id = auth.uid());
 *
 * CREATE POLICY "Users update own sessions" ON training_sessions
 *   FOR UPDATE USING (user_id = auth.uid());
 *
 * CREATE POLICY "Users see own notifications" ON notifications
 *   FOR SELECT USING (user_id = auth.uid());
 *
 * CREATE POLICY "Users update own notifications" ON notifications
 *   FOR UPDATE USING (user_id = auth.uid());
 */

export default {
  createAdminClient,
  createUserClient,
  createSupabaseClient,
  getAnonClient,
  verifyToken,
  TABLES
};
