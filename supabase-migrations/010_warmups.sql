-- Migration: 010_warmups.sql
-- Description: Pre-call warm-up exercises system

-- Warmup exercise types: product_knowledge, objection_response, scenario_prep, policy_check
CREATE TABLE IF NOT EXISTS warmup_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('product_knowledge', 'objection_response', 'scenario_prep', 'policy_check')),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- Array of {text: string, is_correct: boolean}
  correct_answer TEXT, -- For non-multiple choice
  explanation TEXT, -- Shown after answering
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT, -- e.g., 'billing', 'returns', 'technical'
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track user attempts on warmup exercises
CREATE TABLE IF NOT EXISTS warmup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES warmup_exercises(id) ON DELETE CASCADE,
  selected_answer TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warmup sessions (group attempts before a training session)
CREATE TABLE IF NOT EXISTS warmup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  exercises_completed INTEGER DEFAULT 0,
  exercises_correct INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warmup_exercises_org ON warmup_exercises(org_id);
CREATE INDEX IF NOT EXISTS idx_warmup_exercises_scenario ON warmup_exercises(scenario_id);
CREATE INDEX IF NOT EXISTS idx_warmup_exercises_type ON warmup_exercises(type);
CREATE INDEX IF NOT EXISTS idx_warmup_attempts_user ON warmup_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_warmup_attempts_exercise ON warmup_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_warmup_sessions_user ON warmup_sessions(user_id);

-- RLS Policies
ALTER TABLE warmup_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_sessions ENABLE ROW LEVEL SECURITY;

-- Exercises: viewable by org members, editable by admins
CREATE POLICY warmup_exercises_select_policy ON warmup_exercises
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY warmup_exercises_admin_policy ON warmup_exercises
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Attempts: users can only see/create their own
CREATE POLICY warmup_attempts_user_policy ON warmup_attempts
  FOR ALL USING (user_id = auth.uid());

-- Sessions: users can only see/create their own
CREATE POLICY warmup_sessions_user_policy ON warmup_sessions
  FOR ALL USING (user_id = auth.uid());

-- Seed some default warmup exercises (generic, not org-specific)
INSERT INTO warmup_exercises (org_id, type, question, options, explanation, difficulty, category) VALUES
(NULL, 'objection_response', 'A customer says "This is too expensive." What''s the best response?',
 '[{"text": "I understand. Let me explain the value you''re getting...", "is_correct": true}, {"text": "We can''t lower our prices.", "is_correct": false}, {"text": "Other companies charge more.", "is_correct": false}, {"text": "Maybe this isn''t right for you then.", "is_correct": false}]',
 'Acknowledging the concern and pivoting to value is the best approach. It shows empathy while keeping the conversation positive.',
 'easy', 'objections'),

(NULL, 'objection_response', 'Customer: "I want to cancel my account." Best first response?',
 '[{"text": "I''m sorry to hear that. May I ask what''s prompting this decision?", "is_correct": true}, {"text": "Are you sure? You''ll lose all your benefits.", "is_correct": false}, {"text": "Let me process that cancellation for you.", "is_correct": false}, {"text": "Can I offer you a discount to stay?", "is_correct": false}]',
 'Understanding the root cause before offering solutions leads to better retention outcomes.',
 'medium', 'retention'),

(NULL, 'policy_check', 'What''s typically the best practice when a customer asks for a refund outside the return window?',
 '[{"text": "Check for exceptions (first-time buyer, loyalty status, product defect)", "is_correct": true}, {"text": "Always say no - policy is policy", "is_correct": false}, {"text": "Always say yes to avoid conflict", "is_correct": false}, {"text": "Transfer to a supervisor immediately", "is_correct": false}]',
 'Looking for valid exceptions shows customer care while maintaining policy integrity. Many companies allow exceptions for valued customers or special circumstances.',
 'medium', 'refunds'),

(NULL, 'product_knowledge', 'When explaining a product feature, which approach is most effective?',
 '[{"text": "Focus on how the feature solves the customer''s specific problem", "is_correct": true}, {"text": "List all technical specifications", "is_correct": false}, {"text": "Compare it to competitor products", "is_correct": false}, {"text": "Read from the product manual", "is_correct": false}]',
 'Benefit-focused explanations resonate better than feature lists. Connect features to customer needs.',
 'easy', 'communication')
ON CONFLICT DO NOTHING;
