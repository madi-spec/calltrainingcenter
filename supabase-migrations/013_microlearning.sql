-- Migration: 013_microlearning.sql
-- Description: Micro-learning scenarios (2-minute focused drills)

-- Micro scenarios (short, focused practice drills)
CREATE TABLE IF NOT EXISTS micro_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  target_skill TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Scenario setup
  customer_persona JSONB DEFAULT '{}', -- {name, mood, background}
  opening_line TEXT NOT NULL, -- What the customer says first
  context TEXT, -- Brief context for the CSR

  -- Time constraint
  time_limit_seconds INTEGER DEFAULT 120, -- 2 minutes default
  min_exchanges INTEGER DEFAULT 3, -- Minimum back-and-forth required

  -- Success criteria
  success_criteria JSONB DEFAULT '[]', -- [{type: "keyword", value: "apologize"}, {type: "sentiment", value: "positive"}]
  pass_threshold NUMERIC DEFAULT 70, -- Score needed to pass

  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  times_played INTEGER DEFAULT 0,
  avg_score NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Micro sessions (user attempts at micro scenarios)
CREATE TABLE IF NOT EXISTS micro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  micro_scenario_id UUID NOT NULL REFERENCES micro_scenarios(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Results
  passed BOOLEAN,
  score NUMERIC CHECK (score >= 0 AND score <= 100),
  time_taken_seconds INTEGER,
  exchanges_count INTEGER,

  -- Transcript
  transcript JSONB DEFAULT '[]',

  -- Quick feedback
  feedback_summary TEXT,
  criteria_results JSONB DEFAULT '[]', -- [{criterion: string, passed: boolean, note: string}]

  -- Points
  points_earned INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Daily micro challenges
CREATE TABLE IF NOT EXISTS micro_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  micro_scenario_id UUID NOT NULL REFERENCES micro_scenarios(id) ON DELETE CASCADE,
  bonus_points INTEGER DEFAULT 50,
  UNIQUE(org_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_micro_scenarios_org ON micro_scenarios(org_id);
CREATE INDEX IF NOT EXISTS idx_micro_scenarios_skill ON micro_scenarios(target_skill);
CREATE INDEX IF NOT EXISTS idx_micro_scenarios_active ON micro_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_micro_sessions_user ON micro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_sessions_scenario ON micro_sessions(micro_scenario_id);
CREATE INDEX IF NOT EXISTS idx_micro_sessions_completed ON micro_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_micro_daily_challenges_date ON micro_daily_challenges(date);

-- RLS Policies
ALTER TABLE micro_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Micro scenarios: viewable by org members
CREATE POLICY micro_scenarios_select_policy ON micro_scenarios
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY micro_scenarios_admin_policy ON micro_scenarios
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Micro sessions: users see their own
CREATE POLICY micro_sessions_user_policy ON micro_sessions
  FOR ALL USING (user_id = auth.uid());

-- Daily challenges: viewable by org members
CREATE POLICY micro_daily_challenges_policy ON micro_daily_challenges
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Seed some default micro scenarios
INSERT INTO micro_scenarios (org_id, name, target_skill, opening_line, context, success_criteria, difficulty) VALUES
(NULL, 'Quick Empathy Check', 'empathy',
 'I''ve been on hold for 30 minutes and I''m really frustrated!',
 'Customer is upset about wait time. Your goal is to acknowledge their frustration and de-escalate.',
 '[{"type": "sentiment", "value": "acknowledge_frustration"}, {"type": "keyword", "value": "understand"}, {"type": "tone", "value": "calm"}]',
 'easy'),

(NULL, 'Price Objection Sprint', 'objection_handling',
 'This is way too expensive. I can get this cheaper elsewhere.',
 'Customer is comparing prices. Focus on value, not just defending the price.',
 '[{"type": "keyword", "value": "value"}, {"type": "avoid", "value": "cheap"}, {"type": "technique", "value": "reframe"}]',
 'medium'),

(NULL, 'Closing the Deal', 'closing',
 'Hmm, I''m still not sure. Let me think about it.',
 'Customer is hesitant. Use appropriate closing techniques without being pushy.',
 '[{"type": "technique", "value": "assumptive_close"}, {"type": "sentiment", "value": "confident"}, {"type": "avoid", "value": "pressure"}]',
 'hard'),

(NULL, 'Active Listening', 'communication',
 'So basically my order arrived late, the product was damaged, AND customer service was rude last time I called.',
 'Customer has multiple complaints. Demonstrate active listening by acknowledging each issue.',
 '[{"type": "technique", "value": "summarize"}, {"type": "count", "value": "acknowledge_3_issues"}, {"type": "sentiment", "value": "empathetic"}]',
 'medium'),

(NULL, 'Quick Problem Solve', 'problem_solving',
 'My account is locked and I have an important meeting in 10 minutes where I need access.',
 'Time-sensitive issue. Balance urgency with following proper verification procedures.',
 '[{"type": "keyword", "value": "verify"}, {"type": "sentiment", "value": "urgency_acknowledged"}, {"type": "technique", "value": "solution_focused"}]',
 'hard')
ON CONFLICT DO NOTHING;
