import express from 'express';
import { createAdminClient } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = express.Router();

// All routes require manager or higher role
router.use(requireAuth);
router.use(requireRole(['manager', 'admin', 'owner']));

/**
 * GET /api/live/active-sessions
 * Get all active training sessions for the organization
 */
router.get('/active-sessions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { teamId, branchId } = req.query;

    let query = supabase
      .from('active_sessions')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      sessions: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

/**
 * GET /api/live/recent-completions
 * Get recent training completions feed
 */
router.get('/recent-completions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { limit = 20, teamId, branchId } = req.query;

    let query = supabase
      .from('session_completions')
      .select('*')
      .eq('org_id', orgId)
      .order('completed_at', { ascending: false })
      .limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      completions: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching recent completions:', error);
    res.status(500).json({ error: 'Failed to fetch recent completions' });
  }
});

/**
 * GET /api/live/stats
 * Get real-time dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    // Get active session count
    const { count: activeCount } = await supabase
      .from('active_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active');

    // Get today's completions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCompletions } = await supabase
      .from('session_completions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('completed_at', today.toISOString());

    // Get today's average score
    const { data: scoreData } = await supabase
      .from('session_completions')
      .select('score')
      .eq('org_id', orgId)
      .gte('completed_at', today.toISOString())
      .not('score', 'is', null);

    const avgScore = scoreData && scoreData.length > 0
      ? Math.round(scoreData.reduce((sum, s) => sum + s.score, 0) / scoreData.length)
      : null;

    // Get total training time today (in minutes)
    const { data: durationData } = await supabase
      .from('session_completions')
      .select('duration_seconds')
      .eq('org_id', orgId)
      .gte('completed_at', today.toISOString());

    const totalMinutes = durationData
      ? Math.round(durationData.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60)
      : 0;

    res.json({
      activeSessionCount: activeCount || 0,
      todayCompletions: todayCompletions || 0,
      averageScore: avgScore,
      totalTrainingMinutes: totalMinutes
    });
  } catch (error) {
    console.error('Error fetching live stats:', error);
    res.status(500).json({ error: 'Failed to fetch live stats' });
  }
});

/**
 * GET /api/live/preferences
 * Get manager's dashboard preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data, error } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      preferences: data || {
        show_active_sessions: true,
        show_recent_completions: true,
        show_team_stats: true,
        refresh_interval_seconds: 30,
        filter_team_ids: [],
        filter_branch_ids: []
      }
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/live/preferences
 * Update manager's dashboard preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const updates = req.body;

    const { data, error } = await supabase
      .from('dashboard_preferences')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ preferences: data });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/live/session/start
 * Register an active session (called when training starts)
 */
router.post('/session/start', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { trainingSessionId, scenarioId, scenarioName, teamId, branchId, userName, userAvatarUrl } = req.body;

    // Remove any existing active session for this user
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', userId);

    // Insert new active session
    const { data, error } = await supabase
      .from('active_sessions')
      .insert({
        user_id: userId,
        org_id: orgId,
        team_id: teamId || null,
        branch_id: branchId || null,
        training_session_id: trainingSessionId,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        user_name: userName,
        user_avatar_url: userAvatarUrl,
        status: 'active',
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ session: data });
  } catch (error) {
    console.error('Error starting active session:', error);
    res.status(500).json({ error: 'Failed to start active session' });
  }
});

/**
 * POST /api/live/session/end
 * End an active session and record completion
 */
router.post('/session/end', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { trainingSessionId, scenarioName, score, durationSeconds, userName } = req.body;

    // Remove active session
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', userId);

    // Record completion
    const { data, error } = await supabase
      .from('session_completions')
      .insert({
        org_id: orgId,
        user_id: userId,
        training_session_id: trainingSessionId,
        user_name: userName,
        scenario_name: scenarioName,
        score: score,
        duration_seconds: durationSeconds,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ completion: data });
  } catch (error) {
    console.error('Error ending active session:', error);
    res.status(500).json({ error: 'Failed to end active session' });
  }
});

/**
 * POST /api/live/session/heartbeat
 * Update last activity timestamp for active session
 */
router.post('/session/heartbeat', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { error } = await supabase
      .from('active_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

export default router;
