/**
 * Badge Tier Service
 *
 * Handles badge tier progression from bronze → silver → gold → platinum
 */

import { createAdminClient, TABLES } from '../lib/supabase.js';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

/**
 * Get the next tier after the current one
 */
function getNextTier(currentTier) {
  const index = TIER_ORDER.indexOf(currentTier);
  if (index === -1 || index === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[index + 1];
}

/**
 * Calculate tier based on progress count and thresholds
 */
function calculateTier(progressCount, thresholds) {
  if (progressCount >= (thresholds.platinum || 50)) return 'platinum';
  if (progressCount >= (thresholds.gold || 15)) return 'gold';
  if (progressCount >= (thresholds.silver || 5)) return 'silver';
  return 'bronze';
}

/**
 * Get progress to next tier
 */
function getProgressToNextTier(progressCount, currentTier, thresholds) {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return { nextTier: null, progress: 100, remaining: 0 };

  const targetCount = thresholds[nextTier] ||
    (nextTier === 'silver' ? 5 : nextTier === 'gold' ? 15 : 50);

  const previousTierCount = currentTier === 'bronze' ? 0 :
    currentTier === 'silver' ? (thresholds.silver || 5) :
    currentTier === 'gold' ? (thresholds.gold || 15) :
    (thresholds.platinum || 50);

  const rangeSize = targetCount - previousTierCount;
  const currentProgress = progressCount - previousTierCount;
  const percentage = Math.min(100, Math.round((currentProgress / rangeSize) * 100));

  return {
    nextTier,
    targetCount,
    currentProgress: progressCount,
    progress: percentage,
    remaining: Math.max(0, targetCount - progressCount)
  };
}

/**
 * Update badge progress and check for tier upgrades
 */
export async function updateBadgeProgress(userId, badgeId, organizationId) {
  const adminClient = createAdminClient();

  // Get badge info
  const { data: badge } = await adminClient
    .from(TABLES.BADGES)
    .select('*')
    .eq('id', badgeId)
    .single();

  if (!badge || !badge.is_tiered) {
    return { upgraded: false };
  }

  // Get user's badge progress
  const { data: userBadge } = await adminClient
    .from(TABLES.USER_BADGES)
    .select('*')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single();

  if (!userBadge) {
    return { upgraded: false, error: 'Badge not earned' };
  }

  const newProgressCount = (userBadge.progress_count || 1) + 1;
  const thresholds = badge.tier_thresholds || { silver: 5, gold: 15, platinum: 50 };
  const newTier = calculateTier(newProgressCount, thresholds);
  const currentTier = userBadge.current_tier || 'bronze';

  const upgraded = TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier);

  // Update user badge
  const updateData = {
    progress_count: newProgressCount,
    last_progress_at: new Date().toISOString()
  };

  if (upgraded) {
    updateData.current_tier = newTier;
    updateData[`${newTier}_earned_at`] = new Date().toISOString();
  }

  await adminClient
    .from(TABLES.USER_BADGES)
    .update(updateData)
    .eq('id', userBadge.id);

  // Record tier upgrade history
  if (upgraded) {
    await adminClient
      .from(TABLES.BADGE_TIER_HISTORY)
      .insert({
        user_id: userId,
        badge_id: badgeId,
        from_tier: currentTier,
        to_tier: newTier,
        progress_count: newProgressCount,
        points_awarded: getTierUpgradePoints(newTier)
      });

    // Award points for tier upgrade
    const tierPoints = getTierUpgradePoints(newTier);
    if (tierPoints > 0) {
      await adminClient
        .from(TABLES.POINT_TRANSACTIONS)
        .insert({
          user_id: userId,
          organization_id: organizationId,
          points: tierPoints,
          reason: `Badge tier upgrade: ${badge.name} → ${newTier}`,
          reference_type: 'badge_tier',
          reference_id: badgeId
        });
    }
  }

  return {
    upgraded,
    previousTier: currentTier,
    newTier,
    progressCount: newProgressCount,
    pointsAwarded: upgraded ? getTierUpgradePoints(newTier) : 0,
    ...getProgressToNextTier(newProgressCount, newTier, thresholds)
  };
}

/**
 * Get points awarded for reaching a tier
 */
function getTierUpgradePoints(tier) {
  const tierPoints = {
    bronze: 0,
    silver: 25,
    gold: 75,
    platinum: 200
  };
  return tierPoints[tier] || 0;
}

/**
 * Get badge status with tier information
 */
export async function getBadgeWithTierInfo(userId, badgeId) {
  const adminClient = createAdminClient();

  const { data: badge } = await adminClient
    .from(TABLES.BADGES)
    .select('*')
    .eq('id', badgeId)
    .single();

  if (!badge) return null;

  const { data: userBadge } = await adminClient
    .from(TABLES.USER_BADGES)
    .select('*')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single();

  if (!userBadge) {
    return {
      ...badge,
      earned: false,
      currentTier: null,
      progressCount: 0
    };
  }

  const currentTier = userBadge.current_tier || 'bronze';
  const progressCount = userBadge.progress_count || 1;
  const thresholds = badge.tier_thresholds || { silver: 5, gold: 15, platinum: 50 };

  return {
    ...badge,
    earned: true,
    earned_at: userBadge.earned_at,
    currentTier,
    progressCount,
    ...getProgressToNextTier(progressCount, currentTier, thresholds),
    tierHistory: {
      bronze_earned_at: userBadge.earned_at,
      silver_earned_at: userBadge.silver_earned_at,
      gold_earned_at: userBadge.gold_earned_at,
      platinum_earned_at: userBadge.platinum_earned_at
    }
  };
}

/**
 * Get all badges with tier info for a user
 */
export async function getAllBadgesWithTierInfo(userId, organizationId) {
  const adminClient = createAdminClient();

  // Get all badges
  const { data: badges } = await adminClient
    .from(TABLES.BADGES)
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system.eq.true`);

  // Get user's badges
  const { data: userBadges } = await adminClient
    .from(TABLES.USER_BADGES)
    .select('*')
    .eq('user_id', userId);

  const userBadgeMap = {};
  userBadges?.forEach(ub => {
    userBadgeMap[ub.badge_id] = ub;
  });

  return badges?.map(badge => {
    const userBadge = userBadgeMap[badge.id];

    if (!userBadge) {
      return {
        ...badge,
        earned: false,
        currentTier: null,
        progressCount: 0
      };
    }

    const currentTier = userBadge.current_tier || 'bronze';
    const progressCount = userBadge.progress_count || 1;
    const thresholds = badge.tier_thresholds || { silver: 5, gold: 15, platinum: 50 };

    return {
      ...badge,
      earned: true,
      earned_at: userBadge.earned_at,
      currentTier,
      progressCount,
      ...getProgressToNextTier(progressCount, currentTier, thresholds)
    };
  }) || [];
}

export default {
  updateBadgeProgress,
  getBadgeWithTierInfo,
  getAllBadgesWithTierInfo,
  calculateTier,
  getProgressToNextTier
};
