-- =============================================
-- BRANCHING DECISION TREE SYSTEM
-- Interactive scenarios with multiple choice paths
-- =============================================

-- Add branching_points to scenario_templates
ALTER TABLE scenario_templates
ADD COLUMN IF NOT EXISTS branching_points JSONB DEFAULT '{"nodes": []}';

-- Create session_branch_choices table to track user decisions
CREATE TABLE IF NOT EXISTS session_branch_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  choice_text TEXT,
  score_modifier DECIMAL DEFAULT 1.0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branching-related columns to training_sessions
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS branch_path_score DECIMAL,
ADD COLUMN IF NOT EXISTS branch_path_quality TEXT,
ADD COLUMN IF NOT EXISTS branches_taken INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_branch_choices_session ON session_branch_choices(session_id);
CREATE INDEX IF NOT EXISTS idx_session_branch_choices_node ON session_branch_choices(node_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_branch_score ON training_sessions(branch_path_score);

-- Enable RLS
ALTER TABLE session_branch_choices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own branch choices
DROP POLICY IF EXISTS session_branch_choices_user ON session_branch_choices;
CREATE POLICY session_branch_choices_user ON session_branch_choices
FOR ALL USING (
  session_id IN (
    SELECT id FROM training_sessions
    WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  )
);

-- Add comment to explain structure
COMMENT ON COLUMN scenario_templates.branching_points IS
'JSONB structure: {
  "nodes": [
    {
      "id": "node_id",
      "trigger": "keyword or phrase to trigger this branch",
      "trigger_type": "keyword|time|score",
      "trigger_value": "value for trigger",
      "description": "What decision point is this?",
      "choices": [
        {
          "id": "choice_id",
          "text": "Choice text shown to user",
          "next_node": "next_node_id or null",
          "score_modifier": 1.0,
          "ai_context": "Additional context to send to AI",
          "outcome_type": "optimal|acceptable|poor"
        }
      ]
    }
  ]
}';

-- Sample branching scenario data (for testing)
INSERT INTO scenario_templates (
  name,
  category,
  base_situation,
  customer_goals,
  csr_objectives,
  branching_points,
  is_system,
  is_active
) VALUES (
  'Price Objection Decision Tree',
  'sales',
  'Customer is interested in pest control service but concerned about price.',
  'Get pest control at lowest price possible',
  'Close the sale while maintaining value and avoiding excessive discounting',
  '{
    "nodes": [
      {
        "id": "price_objection",
        "trigger": "too expensive|too much|cheaper",
        "trigger_type": "keyword",
        "description": "Customer expresses price concern",
        "choices": [
          {
            "id": "empathize_value",
            "text": "Empathize and explain value proposition",
            "next_node": "value_discussion",
            "score_modifier": 1.0,
            "ai_context": "Customer chose to emphasize value. Be prepared to discuss ROI, warranty, and service quality.",
            "outcome_type": "optimal"
          },
          {
            "id": "immediate_discount",
            "text": "Offer an immediate discount",
            "next_node": "discount_negotiation",
            "score_modifier": 0.7,
            "ai_context": "Customer immediately offered discount without building value. Show some hesitation but accept.",
            "outcome_type": "acceptable"
          },
          {
            "id": "dismiss_concern",
            "text": "Dismiss the price concern",
            "next_node": "customer_resistant",
            "score_modifier": 0.4,
            "ai_context": "Customer dismissed price concern. Become more resistant and skeptical.",
            "outcome_type": "poor"
          },
          {
            "id": "compare_competitors",
            "text": "Ask about competitor quotes",
            "next_node": "competitive_analysis",
            "score_modifier": 0.9,
            "ai_context": "Customer asked about other quotes. Mention you got one for $50 less but it didn''t include warranty.",
            "outcome_type": "optimal"
          }
        ]
      },
      {
        "id": "value_discussion",
        "trigger": "warranty|guarantee|quality",
        "trigger_type": "keyword",
        "description": "Customer is discussing value and quality",
        "choices": [
          {
            "id": "emphasize_warranty",
            "text": "Focus on warranty and guarantee",
            "next_node": null,
            "score_modifier": 1.0,
            "ai_context": "Customer emphasized warranty. Be impressed and ask about specifics.",
            "outcome_type": "optimal"
          },
          {
            "id": "request_payment_plan",
            "text": "Offer payment plan options",
            "next_node": null,
            "score_modifier": 0.9,
            "ai_context": "Customer offered payment plan. Show interest and ask for details.",
            "outcome_type": "optimal"
          },
          {
            "id": "rush_to_close",
            "text": "Try to close immediately",
            "next_node": null,
            "score_modifier": 0.6,
            "ai_context": "Customer rushed to close before addressing all concerns. Hesitate and ask more questions.",
            "outcome_type": "acceptable"
          }
        ]
      },
      {
        "id": "discount_negotiation",
        "trigger": "discount|savings|deal",
        "trigger_type": "keyword",
        "description": "Negotiating discount terms",
        "choices": [
          {
            "id": "conditional_discount",
            "text": "Offer discount with condition (e.g., sign today)",
            "next_node": null,
            "score_modifier": 0.8,
            "ai_context": "Customer offered conditional discount. Consider the condition and likely accept.",
            "outcome_type": "acceptable"
          },
          {
            "id": "larger_discount",
            "text": "Offer larger discount to close",
            "next_node": null,
            "score_modifier": 0.5,
            "ai_context": "Customer offered large discount. Accept immediately but note concern about sustainability.",
            "outcome_type": "poor"
          }
        ]
      },
      {
        "id": "competitive_analysis",
        "trigger": "better|different|includes",
        "trigger_type": "keyword",
        "description": "Comparing services with competitors",
        "choices": [
          {
            "id": "differentiate_value",
            "text": "Highlight unique service features",
            "next_node": null,
            "score_modifier": 1.0,
            "ai_context": "Customer differentiated their service well. Be impressed and show strong interest.",
            "outcome_type": "optimal"
          },
          {
            "id": "match_price",
            "text": "Offer to match competitor price",
            "next_node": null,
            "score_modifier": 0.7,
            "ai_context": "Customer matched competitor price. Accept but express concern about margins.",
            "outcome_type": "acceptable"
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Create function to calculate branch path quality
CREATE OR REPLACE FUNCTION calculate_branch_path_quality(session_uuid UUID)
RETURNS TABLE(
  path_score DECIMAL,
  path_quality TEXT,
  branch_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(score_modifier)::DECIMAL as path_score,
    CASE
      WHEN AVG(score_modifier) >= 0.9 THEN 'optimal'
      WHEN AVG(score_modifier) >= 0.7 THEN 'acceptable'
      ELSE 'poor'
    END as path_quality,
    COUNT(*)::INTEGER as branch_count
  FROM session_branch_choices
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get branch history for visualization
CREATE OR REPLACE FUNCTION get_branch_history(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  branch_data JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'nodeId', node_id,
      'choiceId', choice_id,
      'choiceText', choice_text,
      'scoreModifier', score_modifier,
      'timestamp', timestamp
    ) ORDER BY timestamp
  )
  INTO branch_data
  FROM session_branch_choices
  WHERE session_id = session_uuid;

  RETURN COALESCE(branch_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_branch_path_quality TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_history TO authenticated;
