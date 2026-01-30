import express from 'express';
import { requireAuth } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/warmups
 * Get warmup exercises, optionally filtered by scenario or type
 */
router.get('/', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId } = req.user;
    const { scenario_id, type, limit = 5 } = req.query;

    let query = supabase
      .from(TABLES.WARMUP_EXERCISES)
      .select('*')
      .eq('is_active', true)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .limit(parseInt(limit));

    if (scenario_id) {
      query = query.or(`scenario_id.eq.${scenario_id},scenario_id.is.null`);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Randomize order
    query = query.order('created_at', { ascending: false });

    const { data: exercises, error } = await query;

    if (error) throw error;

    // Shuffle exercises for variety
    const shuffled = exercises.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    res.json({ exercises: shuffled });
  } catch (error) {
    console.error('Error fetching warmup exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

/**
 * GET /api/warmups/scenario/:scenarioId
 * Get warmup exercises specifically for a scenario
 */
router.get('/scenario/:scenarioId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId } = req.user;
    const { scenarioId } = req.params;
    const { limit = 3 } = req.query;

    // Get scenario-specific exercises
    const { data: scenarioExercises, error: scenarioError } = await supabase
      .from(TABLES.WARMUP_EXERCISES)
      .select('*')
      .eq('scenario_id', scenarioId)
      .eq('is_active', true)
      .limit(parseInt(limit));

    if (scenarioError) throw scenarioError;

    // If not enough scenario-specific, get general exercises
    let exercises = scenarioExercises || [];

    if (exercises.length < parseInt(limit)) {
      const remaining = parseInt(limit) - exercises.length;
      const { data: generalExercises, error: generalError } = await supabase
        .from(TABLES.WARMUP_EXERCISES)
        .select('*')
        .is('scenario_id', null)
        .eq('is_active', true)
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .limit(remaining);

      if (!generalError && generalExercises) {
        exercises = [...exercises, ...generalExercises];
      }
    }

    // Shuffle
    exercises = exercises.sort(() => Math.random() - 0.5);

    res.json({ exercises });
  } catch (error) {
    console.error('Error fetching scenario warmups:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

/**
 * POST /api/warmups/attempt
 * Submit an answer for a warmup exercise
 */
router.post('/attempt', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { exercise_id, selected_answer, selected_option_index, time_taken_seconds } = req.body;

    if (!exercise_id) {
      return res.status(400).json({ error: 'exercise_id is required' });
    }

    // Get the exercise to check the answer
    const { data: exercise, error: exerciseError } = await supabase
      .from(TABLES.WARMUP_EXERCISES)
      .select('*')
      .eq('id', exercise_id)
      .single();

    if (exerciseError || !exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Determine if answer is correct
    let isCorrect = false;

    if (exercise.options && exercise.options.length > 0 && selected_option_index !== undefined) {
      // Multiple choice
      const selectedOption = exercise.options[selected_option_index];
      isCorrect = selectedOption?.is_correct === true;
    } else if (exercise.correct_answer && selected_answer) {
      // Text answer
      isCorrect = selected_answer.toLowerCase().trim() === exercise.correct_answer.toLowerCase().trim();
    }

    // Record the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from(TABLES.WARMUP_ATTEMPTS)
      .insert({
        user_id: userId,
        exercise_id,
        selected_answer: selected_answer || null,
        selected_option_index: selected_option_index !== undefined ? selected_option_index : null,
        is_correct: isCorrect,
        time_taken_seconds: time_taken_seconds || null
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    res.json({
      attempt,
      is_correct: isCorrect,
      explanation: exercise.explanation,
      correct_option_index: exercise.options?.findIndex(o => o.is_correct)
    });
  } catch (error) {
    console.error('Error submitting warmup attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

/**
 * POST /api/warmups/session/start
 * Start a warmup session before training
 */
router.post('/session/start', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, org_id: orgId } = req.user;
    const { scenario_id } = req.body;

    const { data: session, error } = await supabase
      .from(TABLES.WARMUP_SESSIONS)
      .insert({
        user_id: userId,
        org_id: orgId,
        scenario_id: scenario_id || null
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error) {
    console.error('Error starting warmup session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/warmups/session/:sessionId/complete
 * Complete a warmup session
 */
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, org_id: orgId } = req.user;
    const { sessionId } = req.params;
    const { exercises_completed, exercises_correct, total_time_seconds, training_session_id } = req.body;

    const { data: session, error } = await supabase
      .from(TABLES.WARMUP_SESSIONS)
      .update({
        exercises_completed: exercises_completed || 0,
        exercises_correct: exercises_correct || 0,
        total_time_seconds: total_time_seconds || 0,
        training_session_id: training_session_id || null,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Award bonus points for completing warmup
    const accuracy = exercises_completed > 0 ? (exercises_correct / exercises_completed) * 100 : 0;
    let bonusPoints = 10; // Base points for completing warmup

    if (accuracy >= 80) bonusPoints += 15; // Perfect or near-perfect
    else if (accuracy >= 60) bonusPoints += 10; // Good performance
    else if (accuracy >= 40) bonusPoints += 5; // Some correct

    await supabase.from('point_transactions').insert({
      user_id: userId,
      organization_id: orgId,
      points: bonusPoints,
      reason: `Completed pre-call warmup (${exercises_correct}/${exercises_completed} correct)`,
      reference_type: 'warmup_session',
      reference_id: sessionId
    });

    res.json({
      session,
      points_earned: bonusPoints,
      accuracy: Math.round(accuracy)
    });
  } catch (error) {
    console.error('Error completing warmup session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * GET /api/warmups/stats
 * Get user's warmup statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    // Get attempt stats
    const { data: attempts, error: attemptsError } = await supabase
      .from(TABLES.WARMUP_ATTEMPTS)
      .select('is_correct, created_at')
      .eq('user_id', userId);

    if (attemptsError) throw attemptsError;

    // Get session stats
    const { data: sessions, error: sessionsError } = await supabase
      .from(TABLES.WARMUP_SESSIONS)
      .select('exercises_completed, exercises_correct, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    if (sessionsError) throw sessionsError;

    const totalAttempts = attempts?.length || 0;
    const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    const totalSessions = sessions?.length || 0;
    const totalExercisesCompleted = sessions?.reduce((sum, s) => sum + (s.exercises_completed || 0), 0) || 0;

    res.json({
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      accuracy_percentage: accuracy,
      total_sessions: totalSessions,
      total_exercises_completed: totalExercisesCompleted
    });
  } catch (error) {
    console.error('Error fetching warmup stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/warmups (admin)
 * Create a new warmup exercise
 */
router.post('/', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId, role } = req.user;

    if (!['admin', 'owner', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { type, question, options, correct_answer, explanation, difficulty, category, scenario_id, tags } = req.body;

    if (!type || !question) {
      return res.status(400).json({ error: 'type and question are required' });
    }

    const { data: exercise, error } = await supabase
      .from(TABLES.WARMUP_EXERCISES)
      .insert({
        org_id: orgId,
        scenario_id: scenario_id || null,
        type,
        question,
        options: options || [],
        correct_answer: correct_answer || null,
        explanation: explanation || null,
        difficulty: difficulty || 'medium',
        category: category || null,
        tags: tags || []
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ exercise });
  } catch (error) {
    console.error('Error creating warmup exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

export default router;
