/**
 * Streak System API Routes
 *
 * Handles streak status, freeze/recovery tokens, and streak history
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/streaks/status
 * Get current streak status for the user
 */
router.get('/status', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get user's streak data
    const { data: user } = await adminClient
      .from(TABLES.USERS)
      .select(`
        current_streak, longest_streak, last_training_at,
        streak_freezes_available, streak_broken_at, streak_before_break,
        streak_recovery_deadline, streak_shield_active, streak_shield_expires_at
      `)
      .eq('id', req.user.id)
      .single();

    // Get available tokens
    const { data: tokens } = await adminClient
      .from(TABLES.STREAK_TOKENS)
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.now()');

    const freezeTokens = tokens?.filter(t => t.token_type === 'freeze') || [];
    const recoveryTokens = tokens?.filter(t => t.token_type === 'recovery') || [];

    // Check if streak is at risk (no practice today)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLog } = await adminClient
      .from('practice_log')
      .select('met_requirement')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    const streakAtRisk = !todayLog?.met_requirement && user.current_streak > 0;

    // Check if recovery is available
    const canRecover = user.streak_broken_at &&
                       user.streak_recovery_deadline &&
                       new Date(user.streak_recovery_deadline) > new Date() &&
                       recoveryTokens.length > 0;

    res.json({
      success: true,
      streak: {
        current: user.current_streak || 0,
        longest: user.longest_streak || 0,
        lastTrainingAt: user.last_training_at,
        atRisk: streakAtRisk,
        shieldActive: user.streak_shield_active,
        shieldExpiresAt: user.streak_shield_expires_at
      },
      tokens: {
        freezesAvailable: freezeTokens.length,
        freezeTokens: freezeTokens,
        recoveriesAvailable: recoveryTokens.length,
        recoveryTokens: recoveryTokens
      },
      recovery: canRecover ? {
        available: true,
        previousStreak: user.streak_before_break,
        deadline: user.streak_recovery_deadline
      } : {
        available: false
      }
    });
  } catch (error) {
    console.error('Error fetching streak status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/streaks/use-freeze
 * Use a streak freeze to protect streak for today
 */
router.post('/use-freeze', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get available freeze token
    const { data: token } = await adminClient
      .from(TABLES.STREAK_TOKENS)
      .select('*')
      .eq('user_id', req.user.id)
      .eq('token_type', 'freeze')
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.now()')
      .limit(1)
      .single();

    if (!token) {
      return res.status(400).json({ error: 'No freeze tokens available' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already met requirement today
    const { data: todayLog } = await adminClient
      .from('practice_log')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    if (todayLog?.met_requirement) {
      return res.status(400).json({ error: 'Already met requirement today, no freeze needed' });
    }

    // Use the freeze token
    await adminClient
      .from(TABLES.STREAK_TOKENS)
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', token.id);

    // Mark today as excused in practice log
    await adminClient
      .from('practice_log')
      .upsert({
        user_id: req.user.id,
        date: today,
        calls_completed: todayLog?.calls_completed || 0,
        minutes_practiced: todayLog?.minutes_practiced || 0,
        met_requirement: true,
        excused: true,
        excuse_reason: 'Streak freeze used',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      });

    // Activate streak shield for 24 hours
    await adminClient
      .from(TABLES.USERS)
      .update({
        streak_shield_active: true,
        streak_shield_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Streak freeze applied successfully',
      token_used: token.id
    });
  } catch (error) {
    console.error('Error using streak freeze:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/streaks/recover
 * Recover a broken streak using a recovery token
 */
router.post('/recover', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get user's recovery eligibility
    const { data: user } = await adminClient
      .from(TABLES.USERS)
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!user.streak_broken_at || !user.streak_recovery_deadline) {
      return res.status(400).json({ error: 'No streak to recover' });
    }

    if (new Date(user.streak_recovery_deadline) < new Date()) {
      return res.status(400).json({ error: 'Recovery deadline has passed' });
    }

    // Get available recovery token
    const { data: token } = await adminClient
      .from(TABLES.STREAK_TOKENS)
      .select('*')
      .eq('user_id', req.user.id)
      .eq('token_type', 'recovery')
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.now()')
      .limit(1)
      .single();

    if (!token) {
      return res.status(400).json({ error: 'No recovery tokens available' });
    }

    const recoveredStreak = user.streak_before_break;

    // Use the recovery token
    await adminClient
      .from(TABLES.STREAK_TOKENS)
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', token.id);

    // Record in streak history
    await adminClient
      .from(TABLES.STREAK_HISTORY)
      .update({
        was_recovered: true,
        recovery_token_id: token.id,
        end_reason: 'recovered'
      })
      .eq('user_id', req.user.id)
      .eq('ended_at', user.streak_broken_at);

    // Restore user's streak
    await adminClient
      .from(TABLES.USERS)
      .update({
        current_streak: recoveredStreak,
        streak_broken_at: null,
        streak_before_break: 0,
        streak_recovery_deadline: null
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Streak recovered successfully!',
      recovered_streak: recoveredStreak,
      token_used: token.id
    });
  } catch (error) {
    console.error('Error recovering streak:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/streaks/history
 * Get streak history for the user
 */
router.get('/history', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: history } = await adminClient
      .from(TABLES.STREAK_HISTORY)
      .select('*')
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    // Calculate stats
    const totalStreaks = history?.length || 0;
    const longestStreak = history?.reduce((max, h) => Math.max(max, h.streak_length), 0) || 0;
    const recoveredStreaks = history?.filter(h => h.was_recovered).length || 0;
    const totalPoints = history?.reduce((sum, h) => sum + (h.points_earned || 0), 0) || 0;

    res.json({
      success: true,
      history: history || [],
      stats: {
        totalStreaks,
        longestStreak,
        recoveredStreaks,
        totalPointsEarned: totalPoints
      }
    });
  } catch (error) {
    console.error('Error fetching streak history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/streaks/milestones
 * Get upcoming streak milestones
 */
router.get('/milestones', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get all milestones
    const { data: milestones } = await adminClient
      .from(TABLES.STREAK_MILESTONES)
      .select('*')
      .or(`organization_id.eq.${req.organization.id},organization_id.is.null`)
      .eq('is_active', true)
      .order('streak_days', { ascending: true });

    // Get user's current streak
    const currentStreak = req.user.current_streak || 0;

    // Mark achieved and next milestones
    const processedMilestones = milestones?.map(m => ({
      ...m,
      achieved: currentStreak >= m.streak_days,
      isNext: currentStreak < m.streak_days &&
              !milestones.some(other =>
                other.streak_days > currentStreak &&
                other.streak_days < m.streak_days
              )
    })) || [];

    // Find the next milestone
    const nextMilestone = processedMilestones.find(m => !m.achieved);
    const daysToNext = nextMilestone ? nextMilestone.streak_days - currentStreak : null;

    res.json({
      success: true,
      currentStreak,
      milestones: processedMilestones,
      nextMilestone: nextMilestone ? {
        ...nextMilestone,
        daysRemaining: daysToNext
      } : null
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/streaks/check
 * Check and update streak status (called on login or session complete)
 */
router.post('/check', async (req, res) => {
  try {
    const result = await checkAndUpdateStreak(req.user.id, req.organization.id);
    res.json(result);
  } catch (error) {
    console.error('Error checking streak:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check and update user's streak status
 * Called after login or completing a session
 */
export async function checkAndUpdateStreak(userId, organizationId) {
  const adminClient = createAdminClient();

  // Get user data
  const { data: user } = await adminClient
    .from(TABLES.USERS)
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Check if user has a streak shield active
  if (user.streak_shield_active && user.streak_shield_expires_at) {
    if (new Date(user.streak_shield_expires_at) < today) {
      // Shield expired
      await adminClient
        .from(TABLES.USERS)
        .update({
          streak_shield_active: false,
          streak_shield_expires_at: null
        })
        .eq('id', userId);
    }
  }

  // If no streak, nothing to break
  if (!user.current_streak || user.current_streak === 0) {
    return { success: true, streak: 0, status: 'no_streak' };
  }

  // Check if user practiced yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: yesterdayLog } = await adminClient
    .from('practice_log')
    .select('met_requirement, excused')
    .eq('user_id', userId)
    .eq('date', yesterdayStr)
    .single();

  // If yesterday was met or excused, streak is safe
  if (yesterdayLog?.met_requirement || yesterdayLog?.excused) {
    return { success: true, streak: user.current_streak, status: 'active' };
  }

  // Check if streak was already broken today
  if (user.streak_broken_at) {
    const brokenDate = new Date(user.streak_broken_at).toISOString().split('T')[0];
    if (brokenDate === todayStr) {
      return {
        success: true,
        streak: 0,
        status: 'broken_today',
        can_recover: user.streak_recovery_deadline && new Date(user.streak_recovery_deadline) > today
      };
    }
  }

  // Streak needs to be broken
  const previousStreak = user.current_streak;

  // Record streak history
  await adminClient
    .from(TABLES.STREAK_HISTORY)
    .insert({
      user_id: userId,
      organization_id: organizationId,
      streak_length: previousStreak,
      started_at: new Date(today.getTime() - previousStreak * 24 * 60 * 60 * 1000).toISOString(),
      ended_at: today.toISOString(),
      end_reason: 'broken'
    });

  // Set recovery window (48 hours)
  const recoveryDeadline = new Date(today.getTime() + 48 * 60 * 60 * 1000);

  // Update user
  await adminClient
    .from(TABLES.USERS)
    .update({
      current_streak: 0,
      streak_broken_at: today.toISOString(),
      streak_before_break: previousStreak,
      streak_recovery_deadline: recoveryDeadline.toISOString()
    })
    .eq('id', userId);

  return {
    success: true,
    streak: 0,
    previousStreak,
    status: 'broken',
    can_recover: true,
    recovery_deadline: recoveryDeadline.toISOString()
  };
}

/**
 * Award streak milestone rewards
 */
export async function checkStreakMilestones(userId, organizationId, currentStreak) {
  const adminClient = createAdminClient();

  // Get milestones at exactly this streak level
  const { data: milestones } = await adminClient
    .from(TABLES.STREAK_MILESTONES)
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq('streak_days', currentStreak)
    .eq('is_active', true);

  if (!milestones || milestones.length === 0) {
    return { awarded: false };
  }

  const awards = [];

  for (const milestone of milestones) {
    switch (milestone.reward_type) {
      case 'points':
        await adminClient
          .from(TABLES.POINT_TRANSACTIONS)
          .insert({
            user_id: userId,
            organization_id: organizationId,
            points: milestone.reward_value,
            reason: `${currentStreak}-day streak milestone!`,
            reference_type: 'streak_milestone',
            reference_id: milestone.id
          });

        await adminClient
          .from(TABLES.USERS)
          .update({
            total_points: adminClient.raw(`total_points + ${milestone.reward_value}`)
          })
          .eq('id', userId);

        awards.push({ type: 'points', value: milestone.reward_value });
        break;

      case 'freeze_token':
      case 'recovery_token':
        await adminClient
          .from(TABLES.STREAK_TOKENS)
          .insert({
            user_id: userId,
            organization_id: organizationId,
            token_type: milestone.reward_type === 'freeze_token' ? 'freeze' : 'recovery',
            earned_reason: `${currentStreak}-day streak milestone`
          });

        awards.push({ type: milestone.reward_type, value: 1 });
        break;

      case 'badge':
        if (milestone.badge_id) {
          await adminClient
            .from(TABLES.USER_BADGES)
            .upsert({
              user_id: userId,
              badge_id: milestone.badge_id,
              earned_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,badge_id'
            });

          awards.push({ type: 'badge', badge_id: milestone.badge_id });
        }
        break;
    }
  }

  return {
    awarded: awards.length > 0,
    awards,
    message: milestones[0]?.notification_message
  };
}

export default router;
