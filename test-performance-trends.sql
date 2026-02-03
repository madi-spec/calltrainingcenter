-- Test script to create training sessions with trending data
-- This script creates sessions over multiple weeks with improving and declining categories
-- Run this in Supabase SQL Editor

-- First, let's get a test user ID (replace with your actual user ID)
-- You can get your user ID from: SELECT id FROM users WHERE email = 'your-email@example.com';

DO $$
DECLARE
  test_user_id UUID := (SELECT id FROM users LIMIT 1);
  test_org_id UUID := (SELECT organization_id FROM users WHERE id = test_user_id);
  session_date TIMESTAMP;
  day_offset INTEGER;
  base_empathy DECIMAL;
  base_product DECIMAL;
  base_resolution DECIMAL;
  base_professionalism DECIMAL;
  base_closing DECIMAL;
  overall_score DECIMAL;
BEGIN
  -- Delete existing test sessions if needed
  -- DELETE FROM training_sessions WHERE user_id = test_user_id AND created_at > NOW() - INTERVAL '60 days';

  -- Create 30 sessions over the last 30 days
  FOR i IN 1..30 LOOP
    day_offset := 30 - i;
    session_date := NOW() - (day_offset || ' days')::INTERVAL;

    -- Create improving trend in empathy & rapport (60% -> 85%)
    base_empathy := 60 + (i * 0.8);

    -- Create improving trend in closing (55% -> 80%)
    base_closing := 55 + (i * 0.8);

    -- Create declining trend in product knowledge (85% -> 70%)
    base_product := 85 - (i * 0.5);

    -- Stable performance in resolution
    base_resolution := 75 + (RANDOM() * 10 - 5);

    -- Slight decline in professionalism (80% -> 75%)
    base_professionalism := 80 - (i * 0.15);

    -- Calculate overall score
    overall_score := (base_empathy + base_product + base_resolution + base_professionalism + base_closing) / 5;

    -- Add some randomness
    overall_score := overall_score + (RANDOM() * 6 - 3);
    base_empathy := base_empathy + (RANDOM() * 5 - 2.5);
    base_product := base_product + (RANDOM() * 5 - 2.5);
    base_resolution := base_resolution + (RANDOM() * 5 - 2.5);
    base_professionalism := base_professionalism + (RANDOM() * 5 - 2.5);
    base_closing := base_closing + (RANDOM() * 5 - 2.5);

    -- Clamp values between 0 and 100
    overall_score := GREATEST(0, LEAST(100, overall_score));
    base_empathy := GREATEST(0, LEAST(100, base_empathy));
    base_product := GREATEST(0, LEAST(100, base_product));
    base_resolution := GREATEST(0, LEAST(100, base_resolution));
    base_professionalism := GREATEST(0, LEAST(100, base_professionalism));
    base_closing := GREATEST(0, LEAST(100, base_closing));

    INSERT INTO training_sessions (
      id,
      user_id,
      organization_id,
      scenario_id,
      scenario_name,
      status,
      overall_score,
      category_scores,
      points_earned,
      duration_seconds,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      test_org_id,
      'test-scenario-' || i,
      'Performance Trend Test ' || i,
      'completed',
      ROUND(overall_score),
      jsonb_build_object(
        'empathyRapport', ROUND(base_empathy),
        'productKnowledge', ROUND(base_product),
        'problemResolution', ROUND(base_resolution),
        'professionalism', ROUND(base_professionalism),
        'closing', ROUND(base_closing)
      ),
      ROUND(overall_score * 10),
      180 + FLOOR(RANDOM() * 240),
      session_date,
      session_date
    );
  END LOOP;

  RAISE NOTICE 'Created 30 test sessions for user % with trending data', test_user_id;
END $$;

-- Verify the data
SELECT
  DATE(created_at) as date,
  COUNT(*) as sessions,
  ROUND(AVG(overall_score)) as avg_score,
  ROUND(AVG((category_scores->>'empathyRapport')::numeric)) as avg_empathy,
  ROUND(AVG((category_scores->>'productKnowledge')::numeric)) as avg_product,
  ROUND(AVG((category_scores->>'closing')::numeric)) as avg_closing
FROM training_sessions
WHERE created_at > NOW() - INTERVAL '35 days'
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date;
