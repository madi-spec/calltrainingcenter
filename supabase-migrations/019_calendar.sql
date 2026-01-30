-- Migration: 019_calendar.sql
-- Description: Calendar integration for scheduled training

-- Calendar integrations (OAuth connections)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'apple')),
  provider_account_id TEXT,
  provider_email TEXT,

  -- OAuth tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,

  -- Settings
  calendar_id TEXT, -- Which calendar to use (default or specific)
  sync_enabled BOOLEAN DEFAULT true,
  reminder_minutes INTEGER DEFAULT 15,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

-- Scheduled training events
CREATE TABLE IF NOT EXISTS training_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What to train
  assignment_id UUID REFERENCES training_assignments(id) ON DELETE SET NULL,
  scenario_id TEXT,
  scenario_name TEXT,
  course_id UUID,

  -- Schedule
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,

  -- Recurrence (optional)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format
  recurrence_end DATE,

  -- Calendar sync
  calendar_integration_id UUID REFERENCES calendar_integrations(id) ON DELETE SET NULL,
  external_event_id TEXT, -- ID in external calendar
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'deleted')),

  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')),
  completed_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training goals (weekly/monthly targets)
CREATE TABLE IF NOT EXISTS training_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Goal definition
  goal_type TEXT NOT NULL CHECK (goal_type IN ('sessions_per_week', 'minutes_per_week', 'sessions_per_month', 'score_target')),
  target_value INTEGER NOT NULL,

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Progress
  current_value INTEGER DEFAULT 0,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMPTZ,

  -- Who set it
  set_by UUID REFERENCES users(id) ON DELETE SET NULL, -- null = self-set
  is_mandatory BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_training_events_user ON training_events(user_id);
CREATE INDEX IF NOT EXISTS idx_training_events_scheduled ON training_events(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_training_events_status ON training_events(status);
CREATE INDEX IF NOT EXISTS idx_training_goals_user ON training_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_training_goals_period ON training_goals(period_start, period_end);

-- RLS Policies
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_goals ENABLE ROW LEVEL SECURITY;

-- Calendar integrations: users manage their own
CREATE POLICY calendar_integrations_policy ON calendar_integrations
  FOR ALL USING (user_id = auth.uid());

-- Training events: users manage their own, managers can see team's
CREATE POLICY training_events_user_policy ON training_events
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY training_events_manager_policy ON training_events
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );

-- Training goals: users see their own, managers can set for team
CREATE POLICY training_goals_user_policy ON training_goals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY training_goals_manager_policy ON training_goals
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
    )
  );
