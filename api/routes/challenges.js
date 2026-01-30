/**
 * Daily Challenges API Routes
 *
 * Handles daily challenges, progress tracking, and challenge generation
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/challenges/today
 * Get today's challenges for the user's organization
 */
router.get('/today', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's challenges
    let { data: challenges } = await adminClient
      .from(TABLES.DAILY_CHALLENGES)
      .select('*')
      .eq('organization_id', req.organization.id)
      .eq('date', today);

    // If no challenges for today, generate them
    if (!challenges || challenges.length === 0) {
      challenges = await generateDailyChallenges(req.organization.id, today);
    }

    // Get user's progress on each challenge
    const challengeIds = challenges.map(c => c.id);
    const { data: progress } = await adminClient
      .from(TABLES.USER_CHALLENGE_PROGRESS)
      .select('*')
      .eq('user_id', req.user.id)
      .in('challenge_id', challengeIds);

    const progressMap = {};
    progress?.forEach(p => {
      progressMap[p.challenge_id] = p;
    });

    // Combine challenges with progress
    const challengesWithProgress = challenges.map(c => ({
      ...c,
      progress: progressMap[c.id] || { progress_value: 0, is_completed: false },
      target_value: c.criteria_value?.target_count || c.criteria_value?.min_score || 1
    }));

    res.json({
      success: true,
      date: today,
      challenges: challengesWithProgress
    });
  } catch (error) {
    console.error('Error fetching today\'s challenges:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/challenges/history
 * Get challenge history for the user
 */
router.get('/history', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const adminClient = createAdminClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data: progress } = await adminClient
      .from(TABLES.USER_CHALLENGE_PROGRESS)
      .select(`
        *,
        challenge:daily_challenges(*)
      `)
      .eq('user_id', req.user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Calculate summary stats
    const completed = progress?.filter(p => p.is_completed) || [];
    const totalPoints = completed.reduce((sum, p) => sum + (p.points_awarded || 0), 0);

    res.json({
      success: true,
      history: progress || [],
      summary: {
        totalCompleted: completed.length,
        totalAttempted: progress?.length || 0,
        totalPointsEarned: totalPoints,
        completionRate: progress?.length > 0
          ? Math.round(completed.length / progress.length * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching challenge history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challenges/:id/progress
 * Update progress on a challenge (called after session completion)
 */
router.post('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { increment = 1, session_data } = req.body;
    const adminClient = createAdminClient();

    // Get the challenge
    const { data: challenge } = await adminClient
      .from(TABLES.DAILY_CHALLENGES)
      .select('*')
      .eq('id', id)
      .single();

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Get or create progress record
    let { data: progress } = await adminClient
      .from(TABLES.USER_CHALLENGE_PROGRESS)
      .select('*')
      .eq('user_id', req.user.id)
      .eq('challenge_id', id)
      .single();

    const targetValue = challenge.criteria_value?.target_count ||
                       challenge.criteria_value?.min_score || 1;

    if (!progress) {
      // Create new progress record
      const { data: newProgress, error } = await adminClient
        .from(TABLES.USER_CHALLENGE_PROGRESS)
        .insert({
          user_id: req.user.id,
          challenge_id: id,
          progress_value: increment,
          progress_data: session_data ? { sessions: [session_data] } : {}
        })
        .select()
        .single();

      if (error) throw error;
      progress = newProgress;
    } else if (!progress.is_completed) {
      // Update existing progress
      const newValue = progress.progress_value + increment;
      const progressData = progress.progress_data || {};
      if (session_data) {
        progressData.sessions = [...(progressData.sessions || []), session_data];
      }

      const { data: updated, error } = await adminClient
        .from(TABLES.USER_CHALLENGE_PROGRESS)
        .update({
          progress_value: newValue,
          progress_data: progressData,
          updated_at: new Date().toISOString()
        })
        .eq('id', progress.id)
        .select()
        .single();

      if (error) throw error;
      progress = updated;
    }

    // Check if challenge is now complete
    let justCompleted = false;
    if (!progress.is_completed && progress.progress_value >= targetValue) {
      justCompleted = true;

      // Mark as completed and award points
      await adminClient
        .from(TABLES.USER_CHALLENGE_PROGRESS)
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          points_awarded: challenge.bonus_points
        })
        .eq('id', progress.id);

      // Award points to user
      await adminClient
        .from(TABLES.POINT_TRANSACTIONS)
        .insert({
          user_id: req.user.id,
          organization_id: req.organization.id,
          points: challenge.bonus_points,
          reason: `Daily Challenge: ${challenge.title}`,
          reference_type: 'challenge',
          reference_id: challenge.id
        });

      await adminClient
        .from(TABLES.USERS)
        .update({
          total_points: req.user.total_points + challenge.bonus_points
        })
        .eq('id', req.user.id);

      progress.is_completed = true;
      progress.points_awarded = challenge.bonus_points;
    }

    res.json({
      success: true,
      progress: {
        ...progress,
        target_value: targetValue,
        just_completed: justCompleted
      },
      points_awarded: justCompleted ? challenge.bonus_points : 0
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challenges/:id/claim
 * Claim reward for a completed challenge
 */
router.post('/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Get progress record
    const { data: progress } = await adminClient
      .from(TABLES.USER_CHALLENGE_PROGRESS)
      .select(`
        *,
        challenge:daily_challenges(*)
      `)
      .eq('user_id', req.user.id)
      .eq('challenge_id', id)
      .single();

    if (!progress) {
      return res.status(404).json({ error: 'Challenge progress not found' });
    }

    if (!progress.is_completed) {
      return res.status(400).json({ error: 'Challenge not completed yet' });
    }

    if (progress.points_awarded > 0) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    const points = progress.challenge.bonus_points;

    // Award points
    await adminClient
      .from(TABLES.POINT_TRANSACTIONS)
      .insert({
        user_id: req.user.id,
        organization_id: req.organization.id,
        points,
        reason: `Challenge Reward: ${progress.challenge.title}`,
        reference_type: 'challenge',
        reference_id: id
      });

    await adminClient
      .from(TABLES.USERS)
      .update({
        total_points: req.user.total_points + points
      })
      .eq('id', req.user.id);

    await adminClient
      .from(TABLES.USER_CHALLENGE_PROGRESS)
      .update({ points_awarded: points })
      .eq('id', progress.id);

    res.json({
      success: true,
      points_awarded: points
    });
  } catch (error) {
    console.error('Error claiming challenge reward:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/challenges/team
 * Get team challenge progress (for team challenges)
 */
router.get('/team', async (req, res) => {
  try {
    if (!req.user.team_id) {
      return res.json({ success: true, challenges: [] });
    }

    const adminClient = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's team challenges
    const { data: challenges } = await adminClient
      .from(TABLES.DAILY_CHALLENGES)
      .select('*')
      .eq('organization_id', req.organization.id)
      .eq('date', today)
      .eq('is_team_challenge', true);

    if (!challenges || challenges.length === 0) {
      return res.json({ success: true, challenges: [] });
    }

    // Get team progress
    const challengeIds = challenges.map(c => c.id);
    const { data: teamProgress } = await adminClient
      .from(TABLES.TEAM_CHALLENGE_PROGRESS)
      .select('*')
      .eq('team_id', req.user.team_id)
      .in('challenge_id', challengeIds);

    const progressMap = {};
    teamProgress?.forEach(p => {
      progressMap[p.challenge_id] = p;
    });

    const challengesWithProgress = challenges.map(c => ({
      ...c,
      team_progress: progressMap[c.id] || { aggregate_progress: 0, is_completed: false }
    }));

    res.json({
      success: true,
      challenges: challengesWithProgress
    });
  } catch (error) {
    console.error('Error fetching team challenges:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challenges/generate
 * Manually trigger challenge generation (admin only)
 */
router.post('/generate', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const challenges = await generateDailyChallenges(req.organization.id, targetDate);

    res.json({
      success: true,
      date: targetDate,
      challenges
    });
  } catch (error) {
    console.error('Error generating challenges:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate daily challenges for an organization
 */
async function generateDailyChallenges(organizationId, date) {
  const adminClient = createAdminClient();

  // Get challenge templates
  const { data: templates } = await adminClient
    .from(TABLES.CHALLENGE_TEMPLATES)
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq('is_active', true);

  if (!templates || templates.length === 0) {
    // Use default challenges if no templates
    const defaultChallenges = [
      {
        title: 'Daily Practice',
        description: 'Complete 3 training sessions today',
        criteria_type: 'complete_sessions',
        criteria_value: { target_count: 3 },
        bonus_points: 30
      },
      {
        title: 'High Performer',
        description: 'Score 80% or higher on any session',
        criteria_type: 'achieve_score',
        criteria_value: { min_score: 80 },
        bonus_points: 50
      }
    ];

    const challenges = [];
    for (const challenge of defaultChallenges) {
      const { data } = await adminClient
        .from(TABLES.DAILY_CHALLENGES)
        .insert({
          organization_id: organizationId,
          date,
          ...challenge
        })
        .select()
        .single();

      if (data) challenges.push(data);
    }

    return challenges;
  }

  // Select 2-3 random templates based on weight
  const selectedTemplates = selectWeightedTemplates(templates, 3);

  const challenges = [];
  for (const template of selectedTemplates) {
    const bonusPoints = randomInRange(
      template.bonus_points_range?.min || 25,
      template.bonus_points_range?.max || 100
    );

    const criteriaValue = { ...template.criteria_config };
    const title = processTemplateString(template.title_template, criteriaValue);
    const description = processTemplateString(template.description_template, criteriaValue);

    const { data } = await adminClient
      .from(TABLES.DAILY_CHALLENGES)
      .insert({
        organization_id: organizationId,
        date,
        title,
        description,
        criteria_type: template.criteria_type,
        criteria_value: criteriaValue,
        bonus_points: bonusPoints,
        is_team_challenge: template.is_team_template
      })
      .select()
      .single();

    if (data) challenges.push(data);
  }

  return challenges;
}

function selectWeightedTemplates(templates, count) {
  const totalWeight = templates.reduce((sum, t) => sum + (t.frequency_weight || 1), 0);
  const selected = [];

  while (selected.length < count && selected.length < templates.length) {
    let random = Math.random() * totalWeight;
    for (const template of templates) {
      random -= template.frequency_weight || 1;
      if (random <= 0 && !selected.find(s => s.id === template.id)) {
        selected.push(template);
        break;
      }
    }
  }

  return selected;
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function processTemplateString(template, values) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

export default router;
