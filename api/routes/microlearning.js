import express from 'express';
import { requireAuth } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/microlearning
 * Get available micro scenarios
 */
router.get('/', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId } = req.user;
    const { skill, difficulty, limit = 10 } = req.query;

    let query = supabase
      .from(TABLES.MICRO_SCENARIOS)
      .select('*')
      .eq('is_active', true)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .limit(parseInt(limit));

    if (skill) {
      query = query.eq('target_skill', skill);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    query = query.order('times_played', { ascending: true });

    const { data: scenarios, error } = await query;

    if (error) throw error;

    res.json({ scenarios: scenarios || [] });
  } catch (error) {
    console.error('Error fetching micro scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

/**
 * GET /api/microlearning/daily
 * Get today's daily micro challenge
 */
router.get('/daily', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Try to get org-specific daily challenge
    let { data: challenge, error } = await supabase
      .from(TABLES.MICRO_DAILY_CHALLENGES)
      .select(`
        *,
        micro_scenario:micro_scenarios(*)
      `)
      .eq('date', today)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .order('org_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no daily challenge, pick a random one
    if (!challenge) {
      const { data: randomScenario, error: randomError } = await supabase
        .from(TABLES.MICRO_SCENARIOS)
        .select('*')
        .eq('is_active', true)
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .limit(1)
        .single();

      if (randomError) throw randomError;

      challenge = {
        micro_scenario: randomScenario,
        bonus_points: 50,
        date: today
      };
    }

    res.json({ challenge });
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    res.status(500).json({ error: 'Failed to fetch daily challenge' });
  }
});

/**
 * GET /api/microlearning/:id
 * Get a specific micro scenario
 */
router.get('/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id } = req.params;

    const { data: scenario, error } = await supabase
      .from(TABLES.MICRO_SCENARIOS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json({ scenario });
  } catch (error) {
    console.error('Error fetching micro scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

/**
 * POST /api/microlearning/session/start
 * Start a micro learning session
 */
router.post('/session/start', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, org_id: orgId } = req.user;
    const { micro_scenario_id } = req.body;

    if (!micro_scenario_id) {
      return res.status(400).json({ error: 'micro_scenario_id is required' });
    }

    const { data: session, error } = await supabase
      .from(TABLES.MICRO_SESSIONS)
      .insert({
        user_id: userId,
        micro_scenario_id,
        org_id: orgId
      })
      .select()
      .single();

    if (error) throw error;

    // Increment times_played on the scenario
    await supabase
      .from(TABLES.MICRO_SCENARIOS)
      .update({ times_played: supabase.raw('times_played + 1') })
      .eq('id', micro_scenario_id);

    res.json({ session });
  } catch (error) {
    console.error('Error starting micro session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/microlearning/session/:sessionId/complete
 * Complete a micro learning session
 */
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, org_id: orgId } = req.user;
    const { sessionId } = req.params;
    const {
      score,
      passed,
      time_taken_seconds,
      exchanges_count,
      transcript,
      feedback_summary,
      criteria_results
    } = req.body;

    // Calculate points
    let pointsEarned = 0;
    if (passed) {
      pointsEarned = 25; // Base points for passing
      if (score >= 90) pointsEarned += 25; // Bonus for excellence
      else if (score >= 80) pointsEarned += 15;
      else if (score >= 70) pointsEarned += 10;
    } else {
      pointsEarned = 10; // Participation points
    }

    // Update session
    const { data: session, error } = await supabase
      .from(TABLES.MICRO_SESSIONS)
      .update({
        score,
        passed,
        time_taken_seconds,
        exchanges_count,
        transcript: transcript || [],
        feedback_summary,
        criteria_results: criteria_results || [],
        points_earned: pointsEarned,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Award points
    await supabase.from('point_transactions').insert({
      user_id: userId,
      organization_id: orgId,
      points: pointsEarned,
      reason: passed ? 'Passed micro-learning drill' : 'Completed micro-learning drill',
      reference_type: 'micro_session',
      reference_id: sessionId
    });

    // Update scenario avg_score
    const { data: allScores } = await supabase
      .from(TABLES.MICRO_SESSIONS)
      .select('score')
      .eq('micro_scenario_id', session.micro_scenario_id)
      .not('score', 'is', null);

    if (allScores && allScores.length > 0) {
      const avgScore = allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length;
      await supabase
        .from(TABLES.MICRO_SCENARIOS)
        .update({ avg_score: Math.round(avgScore) })
        .eq('id', session.micro_scenario_id);
    }

    res.json({
      session,
      points_earned: pointsEarned,
      passed
    });
  } catch (error) {
    console.error('Error completing micro session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * GET /api/microlearning/stats
 * Get user's micro-learning stats
 */
router.get('/user/stats', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data: sessions, error } = await supabase
      .from(TABLES.MICRO_SESSIONS)
      .select('passed, score, time_taken_seconds, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    if (error) throw error;

    const totalSessions = sessions?.length || 0;
    const passedSessions = sessions?.filter(s => s.passed).length || 0;
    const avgScore = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalSessions)
      : 0;
    const totalTime = sessions?.reduce((sum, s) => sum + (s.time_taken_seconds || 0), 0) || 0;

    // Get streak for today
    const today = new Date().toISOString().split('T')[0];
    const todaySession = sessions?.find(s => s.completed_at?.startsWith(today));

    res.json({
      total_sessions: totalSessions,
      passed_sessions: passedSessions,
      pass_rate: totalSessions > 0 ? Math.round((passedSessions / totalSessions) * 100) : 0,
      avg_score: avgScore,
      total_time_seconds: totalTime,
      completed_today: !!todaySession
    });
  } catch (error) {
    console.error('Error fetching micro stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/microlearning/skills
 * Get available skill categories
 */
router.get('/meta/skills', async (req, res) => {
  const skills = [
    { id: 'empathy', name: 'Empathy', description: 'Understanding and acknowledging customer feelings' },
    { id: 'problem_solving', name: 'Problem Solving', description: 'Finding effective solutions quickly' },
    { id: 'product_knowledge', name: 'Product Knowledge', description: 'Demonstrating expertise about products/services' },
    { id: 'communication', name: 'Communication', description: 'Clear and effective messaging' },
    { id: 'objection_handling', name: 'Objection Handling', description: 'Addressing concerns professionally' },
    { id: 'closing', name: 'Closing', description: 'Reaching satisfactory resolutions' },
    { id: 'time_management', name: 'Time Management', description: 'Efficient call handling' }
  ];

  res.json({ skills });
});

export default router;
