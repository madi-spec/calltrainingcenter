import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * Points System Configuration
 */
export const POINTS = {
  SESSION_COMPLETE: 10,
  SCORE_BONUS: {
    '90-100': 50,
    '80-89': 30,
    '70-79': 20,
    '60-69': 10
  },
  DIFFICULTY_MULTIPLIER: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0
  },
  STREAK_BONUS: {
    3: 25,
    7: 75,
    14: 150,
    30: 500,
    90: 2000
  }
};

/**
 * Calculate points for a completed session
 */
export function calculatePoints(score, difficulty = 'medium', streak = 0) {
  let points = POINTS.SESSION_COMPLETE;

  // Score bonus
  if (score >= 90) points += POINTS.SCORE_BONUS['90-100'];
  else if (score >= 80) points += POINTS.SCORE_BONUS['80-89'];
  else if (score >= 70) points += POINTS.SCORE_BONUS['70-79'];
  else if (score >= 60) points += POINTS.SCORE_BONUS['60-69'];

  // Difficulty multiplier
  const multiplier = POINTS.DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  points = Math.round(points * multiplier);

  // Streak bonus
  const streakBonuses = Object.entries(POINTS.STREAK_BONUS)
    .filter(([days]) => streak >= parseInt(days))
    .map(([, bonus]) => bonus);

  if (streakBonuses.length > 0) {
    points += Math.max(...streakBonuses);
  }

  return points;
}

/**
 * GET /api/gamification/leaderboard
 * Get organization leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'weekly' } = req.query;
    const adminClient = createAdminClient();

    // Calculate date range
    const now = new Date();
    let startDate = null;

    switch (timeframe) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      // 'allTime' - no date filter
    }

    // Get users with their stats
    const { data: users } = await adminClient
      .from(TABLES.USERS)
      .select('id, full_name, total_points, current_streak, level')
      .eq('organization_id', req.organization.id)
      .eq('status', 'active')
      .order('total_points', { ascending: false });

    // Get session data for the timeframe
    let sessionsQuery = adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('user_id, overall_score, points_earned')
      .eq('organization_id', req.organization.id)
      .eq('status', 'completed');

    if (startDate) {
      sessionsQuery = sessionsQuery.gte('created_at', startDate.toISOString());
    }

    const { data: sessions } = await sessionsQuery;

    // Aggregate session data per user
    const userStats = {};
    sessions?.forEach(s => {
      if (!userStats[s.user_id]) {
        userStats[s.user_id] = { sessions: 0, totalScore: 0, points: 0 };
      }
      userStats[s.user_id].sessions += 1;
      userStats[s.user_id].totalScore += s.overall_score || 0;
      userStats[s.user_id].points += s.points_earned || 0;
    });

    // Build leaderboard
    let leaderboard = users?.map(u => ({
      id: u.id,
      name: u.full_name,
      points: timeframe === 'allTime' ? u.total_points : (userStats[u.id]?.points || 0),
      sessions: userStats[u.id]?.sessions || 0,
      avg_score: userStats[u.id]?.sessions > 0
        ? Math.round(userStats[u.id].totalScore / userStats[u.id].sessions)
        : 0,
      streak: u.current_streak || 0,
      level: u.level || 1
    })) || [];

    // Sort by points for the timeframe
    leaderboard.sort((a, b) => b.points - a.points);

    // Find current user's rank
    const userRankIndex = leaderboard.findIndex(u => u.id === req.user.id);
    const userRank = userRankIndex >= 0 ? {
      rank: userRankIndex + 1,
      ...leaderboard[userRankIndex],
      rank_change: 0 // Would need historical data to calculate
    } : null;

    res.json({
      leaderboard: leaderboard.slice(0, 50), // Top 50
      user_rank: userRank
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/badges
 * Get all available badges and user's earned badges
 */
router.get('/badges', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get all badges (system + org-specific)
    const { data: allBadges } = await adminClient
      .from(TABLES.BADGES)
      .select('*')
      .or(`organization_id.eq.${req.organization.id},is_system.eq.true`)
      .order('rarity', { ascending: true });

    // Get user's earned badges
    const { data: userBadges } = await adminClient
      .from(TABLES.USER_BADGES)
      .select('badge_id, earned_at, session_id')
      .eq('user_id', req.user.id);

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id));

    const badges = allBadges?.map(b => ({
      ...b,
      earned: earnedBadgeIds.has(b.id),
      earned_at: userBadges?.find(ub => ub.badge_id === b.id)?.earned_at
    })) || [];

    res.json({ badges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/my-badges
 * Get only user's earned badges
 */
router.get('/my-badges', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: userBadges } = await adminClient
      .from(TABLES.USER_BADGES)
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', req.user.id)
      .order('earned_at', { ascending: false });

    res.json({ badges: userBadges || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/points-history
 * Get point transaction history
 */
router.get('/points-history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const adminClient = createAdminClient();

    const { data: transactions } = await adminClient
      .from(TABLES.POINT_TRANSACTIONS)
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    res.json({ transactions: transactions || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/gamification/award-badge
 * Award a badge to a user (system use)
 */
router.post('/award-badge', async (req, res) => {
  try {
    const { user_id, badge_id, session_id } = req.body;
    const adminClient = createAdminClient();

    // Check if badge exists
    const { data: badge } = await adminClient
      .from(TABLES.BADGES)
      .select('id, points_value')
      .eq('id', badge_id)
      .single();

    if (!badge) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    // Award the badge
    const { data: userBadge, error } = await adminClient
      .from(TABLES.USER_BADGES)
      .insert({
        user_id: user_id || req.user.id,
        badge_id,
        session_id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Badge already earned' });
      }
      throw error;
    }

    // Award points for the badge
    if (badge.points_value > 0) {
      await adminClient.from(TABLES.POINT_TRANSACTIONS).insert({
        user_id: user_id || req.user.id,
        organization_id: req.organization.id,
        points: badge.points_value,
        reason: 'Badge earned',
        reference_type: 'badge',
        reference_id: badge_id
      });

      await adminClient
        .from(TABLES.USERS)
        .update({
          total_points: req.user.total_points + badge.points_value
        })
        .eq('id', user_id || req.user.id);
    }

    res.json({ userBadge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check for badge eligibility after session
 */
export async function checkBadgeEligibility(userId, sessionData, organizationId) {
  const adminClient = createAdminClient();
  const earnedBadges = [];

  try {
    // Get user's session history
    const { data: sessions } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('overall_score, scenario_id, category_scores')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const sessionCount = sessions?.length || 0;
    const { data: user } = await adminClient
      .from(TABLES.USERS)
      .select('current_streak')
      .eq('id', userId)
      .single();

    // Check for "First Steps" badge (1 session)
    if (sessionCount === 1) {
      earnedBadges.push({ criteria_type: 'session_count', criteria_value: 1 });
    }

    // Check for "Week Warrior" badge (7-day streak)
    if (user?.current_streak >= 7) {
      earnedBadges.push({ criteria_type: 'streak', criteria_value: 7 });
    }

    // Check for "Perfect Call" badge (100% score)
    if (sessionData.overall_score === 100) {
      earnedBadges.push({ criteria_type: 'perfect_score', criteria_value: 100 });
    }

    // More badge checks can be added here...

    return earnedBadges;
  } catch (error) {
    console.error('Error checking badge eligibility:', error);
    return [];
  }
}

export default router;
