import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { recordUsage } from '../lib/stripe.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/training/recent
 * Get recent training sessions for current user
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const adminClient = createAdminClient();

    const { data: sessions, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training/history
 * Get full training history for current user
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const adminClient = createAdminClient();

    const { data: sessions, error, count } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training/session/:id
 * Get a specific training session
 */
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user can view this session
    if (session.user_id !== req.user.id && !['manager', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/training/session
 * Create a new training session
 */
router.post('/session', async (req, res) => {
  try {
    const { scenario_id, retell_call_id, assignment_id, scenario_name } = req.body;
    const adminClient = createAdminClient();

    // Get attempt number for this scenario
    const { count } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenario_id);

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .insert({
        organization_id: req.organization.id,
        user_id: req.user.id,
        scenario_id,
        scenario_name: scenario_name || null,
        retell_call_id,
        assignment_id,
        attempt_number: (count || 0) + 1,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/training/repeat
 * Create a repeat practice session from an existing session
 */
router.post('/repeat', async (req, res) => {
  try {
    const { session_id, retell_call_id } = req.body;
    const adminClient = createAdminClient();

    // Get original session
    const { data: original } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*')
      .eq('id', session_id)
      .eq('user_id', req.user.id)
      .single();

    if (!original) {
      return res.status(404).json({ error: 'Original session not found' });
    }

    // Get attempt number for this scenario
    const { count } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('scenario_id', original.scenario_id);

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .insert({
        organization_id: req.organization.id,
        user_id: req.user.id,
        scenario_id: original.scenario_id,
        scenario_name: original.scenario_name,
        retell_call_id,
        is_repeat_practice: true,
        original_session_id: session_id,
        attempt_number: (count || 0) + 1,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      session,
      original_score: original.overall_score,
      attempt_number: session.attempt_number
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/training/session/:id/transcript
 * Save transcript immediately after call ends (before analysis)
 */
router.put('/session/:id/transcript', async (req, res) => {
  try {
    const { id } = req.params;
    const { transcript_raw, transcript_formatted, duration_seconds } = req.body;

    const adminClient = createAdminClient();

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        transcript_raw: transcript_raw || '',
        transcript_formatted: transcript_formatted || [],
        duration_seconds: duration_seconds || 0,
        ended_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/training/session/:id
 * Update a training session (complete it with results)
 */
router.patch('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transcript_raw,
      transcript_formatted,
      overall_score,
      category_scores,
      strengths,
      improvements,
      duration_seconds,
      points_earned,
      badges_earned
    } = req.body;

    const adminClient = createAdminClient();

    // Calculate billable minutes
    const billableMinutes = Math.ceil((duration_seconds || 0) / 60);

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        transcript_raw,
        transcript_formatted,
        overall_score,
        category_scores,
        strengths,
        improvements,
        duration_seconds,
        points_earned: points_earned || 0,
        badges_earned: badges_earned || [],
        billable_minutes: billableMinutes,
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Update user stats
    await adminClient
      .from(TABLES.USERS)
      .update({
        total_points: req.user.total_points + (points_earned || 0),
        last_training_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    // Record usage for billing
    if (billableMinutes > 0) {
      await recordUsage(req.organization.id, billableMinutes, id, req.user.id);
    }

    // Update assignment if applicable
    if (session.assignment_id) {
      const { data: assignment } = await adminClient
        .from(TABLES.TRAINING_ASSIGNMENTS)
        .select('progress')
        .eq('id', session.assignment_id)
        .single();

      if (assignment) {
        const progress = assignment.progress || { completed: 0, total: 1 };
        progress.completed += 1;

        const newStatus = progress.completed >= progress.total ? 'completed' : 'in_progress';

        await adminClient
          .from(TABLES.TRAINING_ASSIGNMENTS)
          .update({
            progress,
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null
          })
          .eq('id', session.assignment_id);
      }
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training/team-recent
 * Get recent team training sessions (for managers)
 */
router.get('/team-recent', async (req, res) => {
  try {
    if (!['manager', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 10 } = req.query;
    const adminClient = createAdminClient();

    // Get user IDs for the manager's teams
    let userQuery = adminClient
      .from(TABLES.USERS)
      .select('id')
      .eq('organization_id', req.organization.id)
      .eq('status', 'active');

    // Managers only see their team's users
    if (req.user.role === 'manager') {
      const { data: teams } = await adminClient
        .from('teams')
        .select('id')
        .eq('manager_id', req.user.id);

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        userQuery = userQuery.in('team_id', teamIds);
      } else {
        return res.json({ sessions: [] });
      }
    }

    const { data: users } = await userQuery;
    const userIds = users?.map(u => u.id) || [];

    if (userIds.length === 0) {
      return res.json({ sessions: [] });
    }

    const { data: sessions, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .in('user_id', userIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Format for frontend
    const formattedSessions = sessions?.map(s => ({
      id: s.id,
      user_id: s.user_id,
      user_name: s.user?.full_name || 'Unknown',
      scenario_name: s.scenario_name || 'Practice Session',
      overall_score: s.overall_score,
      duration_seconds: s.duration_seconds,
      points_earned: s.points_earned,
      created_at: s.created_at
    })) || [];

    res.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Error fetching team recent sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training/team
 * Get team training sessions (for managers)
 */
router.get('/team', async (req, res) => {
  try {
    if (!['manager', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select(`
        *,
        user:users(full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false });

    // Managers only see their branch
    if (req.user.role === 'manager' && req.user.branch_id) {
      const { data: branchUsers } = await adminClient
        .from(TABLES.USERS)
        .select('id')
        .eq('branch_id', req.user.branch_id);

      const userIds = branchUsers?.map(u => u.id) || [];
      query = query.in('user_id', userIds);
    }

    const { data: sessions, error, count } = await query
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/training/session/:id/branch-choice
 * Record a branch choice during a training session
 */
router.post('/session/:id/branch-choice', async (req, res) => {
  try {
    const { id } = req.params;
    const { node_id, choice_id, choice_text, score_modifier } = req.body;

    if (!node_id || !choice_id) {
      return res.status(400).json({ error: 'node_id and choice_id are required' });
    }

    const adminClient = createAdminClient();

    // Verify session belongs to user
    const { data: session } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Insert branch choice
    const { data: choice, error } = await adminClient
      .from('session_branch_choices')
      .insert({
        session_id: id,
        node_id,
        choice_id,
        choice_text: choice_text || null,
        score_modifier: score_modifier || 1.0
      })
      .select()
      .single();

    if (error) throw error;

    // Update session branches_taken count
    await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        branches_taken: adminClient.raw('branches_taken + 1')
      })
      .eq('id', id);

    res.json({ choice });
  } catch (error) {
    console.error('Error recording branch choice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training/session/:id/branch-choices
 * Get all branch choices for a session
 */
router.get('/session/:id/branch-choices', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Verify session access
    const { data: session } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('id, user_id')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check access permissions
    if (session.user_id !== req.user.id && !['manager', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all branch choices for this session
    const { data: choices, error } = await adminClient
      .from('session_branch_choices')
      .select('*')
      .eq('session_id', id)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Calculate path score and quality
    const pathScore = choices && choices.length > 0
      ? choices.reduce((sum, c) => sum + (c.score_modifier || 1.0), 0) / choices.length
      : null;

    const pathQuality = pathScore >= 0.9 ? 'optimal'
      : pathScore >= 0.7 ? 'acceptable'
      : 'poor';

    res.json({
      choices: choices || [],
      pathScore,
      pathQuality
    });
  } catch (error) {
    console.error('Error fetching branch choices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/training/session/:id/branch-path
 * Update session with final branch path score
 */
router.patch('/session/:id/branch-path', async (req, res) => {
  try {
    const { id } = req.params;
    const { path_score, path_quality } = req.body;

    const adminClient = createAdminClient();

    const { data: session, error } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        branch_path_score: path_score,
        branch_path_quality: path_quality
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error) {
    console.error('Error updating branch path:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
