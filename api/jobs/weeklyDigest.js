/**
 * Weekly Digest Email Job
 * Sends weekly performance digest emails to managers every Monday at 8am
 */

import { createAdminClient, TABLES } from '../lib/supabase.js';
import { Resend } from 'resend';
import { generateWeeklyDigestHTML, generateWeeklyDigestText } from '../services/emailTemplates/weeklyDigest.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Calculate date range for the past week
 */
function getWeekRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    display: `${formatDate(start)} - ${formatDate(end)}`
  };
}

/**
 * Calculate team statistics for a manager's team
 */
async function calculateTeamStats(adminClient, organizationId, managerId) {
  const weekRange = getWeekRange();

  // Get all users in the organization that the manager oversees
  const { data: teamMembers, error: teamError } = await adminClient
    .from(TABLES.USERS)
    .select('id, full_name, email, role')
    .eq('organization_id', organizationId)
    .neq('role', 'super_admin')
    .eq('status', 'active');

  if (teamError) {
    console.error('[WeeklyDigest] Error fetching team members:', teamError);
    return null;
  }

  if (!teamMembers || teamMembers.length === 0) {
    return null;
  }

  const userIds = teamMembers.map(u => u.id);

  // Get all training sessions from the past week
  const { data: sessions, error: sessionsError } = await adminClient
    .from(TABLES.TRAINING_SESSIONS)
    .select('*')
    .eq('organization_id', organizationId)
    .in('user_id', userIds)
    .gte('started_at', weekRange.start)
    .lte('started_at', weekRange.end)
    .eq('status', 'completed');

  if (sessionsError) {
    console.error('[WeeklyDigest] Error fetching sessions:', sessionsError);
    return null;
  }

  // Calculate statistics
  const totalSessions = sessions?.length || 0;

  // Calculate average score
  const scoresArray = sessions?.filter(s => s.overall_score !== null).map(s => s.overall_score) || [];
  const avgScore = scoresArray.length > 0
    ? Math.round(scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length)
    : 0;

  // Calculate per-user stats
  const userStats = {};
  teamMembers.forEach(user => {
    userStats[user.id] = {
      user,
      sessions: [],
      totalSessions: 0,
      totalMinutes: 0,
      avgScore: 0,
      scores: []
    };
  });

  sessions?.forEach(session => {
    if (userStats[session.user_id]) {
      userStats[session.user_id].sessions.push(session);
      userStats[session.user_id].totalSessions++;
      userStats[session.user_id].totalMinutes += Math.round((session.duration_seconds || 0) / 60);
      if (session.overall_score !== null) {
        userStats[session.user_id].scores.push(session.overall_score);
      }
    }
  });

  // Calculate average scores for each user
  Object.values(userStats).forEach(stats => {
    if (stats.scores.length > 0) {
      stats.avgScore = Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length);
    }
  });

  // Find top performers (min 3 sessions, sorted by avg score)
  const topPerformers = Object.values(userStats)
    .filter(stats => stats.totalSessions >= 3)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3)
    .map(stats => ({
      full_name: stats.user.full_name,
      email: stats.user.email,
      sessions: stats.totalSessions,
      avgScore: stats.avgScore,
      totalMinutes: stats.totalMinutes
    }));

  // Find users needing attention
  const needsAttention = [];

  // Users with low scores (< 60) and at least 1 session
  Object.values(userStats).forEach(stats => {
    if (stats.totalSessions > 0 && stats.avgScore < 60) {
      needsAttention.push({
        full_name: stats.user.full_name,
        email: stats.user.email,
        reason: 'Low average score',
        avgScore: stats.avgScore,
        sessions: stats.totalSessions
      });
    }
  });

  // Users with no sessions this week
  Object.values(userStats).forEach(stats => {
    if (stats.totalSessions === 0 && stats.user.role !== 'manager' && stats.user.role !== 'admin') {
      needsAttention.push({
        full_name: stats.user.full_name,
        email: stats.user.email,
        reason: 'No practice sessions this week',
        sessions: 0
      });
    }
  });

  // Calculate completion rate (users with at least 1 session)
  const usersWithSessions = Object.values(userStats).filter(stats => stats.totalSessions > 0).length;
  const totalUsers = teamMembers.filter(u => u.role !== 'manager' && u.role !== 'admin').length;
  const completionRate = totalUsers > 0 ? Math.round((usersWithSessions / totalUsers) * 100) : 0;

  // Generate focus areas based on data
  const focusAreas = generateFocusAreas(sessions, userStats, completionRate);

  return {
    teamStats: {
      avgScore,
      totalSessions,
      completionRate,
      completedRequired: usersWithSessions,
      totalRequired: totalUsers
    },
    topPerformers,
    needsAttention: needsAttention.slice(0, 5), // Limit to top 5
    focusAreas,
    weekRange: weekRange.display
  };
}

/**
 * Generate suggested focus areas based on team performance
 */
function generateFocusAreas(sessions, userStats, completionRate) {
  const focusAreas = [];

  // Check completion rate
  if (completionRate < 50) {
    focusAreas.push('Increase team participation - less than half the team practiced this week');
  } else if (completionRate < 75) {
    focusAreas.push('Boost engagement - 25% of team members still need to complete practice sessions');
  }

  // Check average scores
  const lowScorers = Object.values(userStats).filter(s => s.totalSessions > 0 && s.avgScore < 70);
  if (lowScorers.length > 0) {
    focusAreas.push(`${lowScorers.length} team member(s) scoring below 70% - consider additional coaching or training`);
  }

  // Analyze category scores to find weak areas
  const categoryTotals = {};
  const categoryCounts = {};

  sessions?.forEach(session => {
    if (session.category_scores && typeof session.category_scores === 'object') {
      Object.entries(session.category_scores).forEach(([category, score]) => {
        if (typeof score === 'number') {
          categoryTotals[category] = (categoryTotals[category] || 0) + score;
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });
    }
  });

  // Find categories with low average scores
  const weakCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category,
      avgScore: Math.round(total / categoryCounts[category])
    }))
    .filter(cat => cat.avgScore < 70)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 2);

  weakCategories.forEach(cat => {
    focusAreas.push(`Team struggling with "${cat.category}" (${cat.avgScore}% avg) - recommend focused training`);
  });

  // If no specific issues, provide positive reinforcement
  if (focusAreas.length === 0) {
    focusAreas.push('Team performing well overall - maintain momentum with consistent practice');
    if (completionRate === 100) {
      focusAreas.push('Excellent participation rate - consider introducing advanced scenarios');
    }
  }

  return focusAreas;
}

/**
 * Send digest email to a single manager
 */
async function sendDigestToManager(adminClient, manager, organization, stats) {
  if (!resend) {
    console.log('[WeeklyDigest] Resend not configured - skipping email send');
    return { success: false, skipped: true };
  }

  const unsubscribeUrl = `${process.env.APP_URL || 'https://selleverycall.com'}/settings/notifications`;

  const emailData = {
    manager,
    organization,
    ...stats,
    unsubscribeUrl
  };

  try {
    const { data, error } = await resend.emails.send({
      from: 'Sell Every Call <digest@selleverycall.com>',
      to: [manager.email],
      subject: `Weekly Team Digest - ${organization.name} (${stats.weekRange})`,
      html: generateWeeklyDigestHTML(emailData),
      text: generateWeeklyDigestText(emailData)
    });

    if (error) {
      console.error('[WeeklyDigest] Error sending to', manager.email, ':', error);
      return { success: false, error: error.message };
    }

    console.log(`[WeeklyDigest] Sent to ${manager.email}, message ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[WeeklyDigest] Exception sending to', manager.email, ':', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the digest week key (ISO week identifier) to deduplicate sends.
 * Returns something like "2026-W06" for the current ISO week.
 */
function getDigestWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now - jan1) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Main job function - sends weekly digest emails to all managers
 */
export async function runWeeklyDigestJob({ force = false } = {}) {
  console.log('[WeeklyDigest] Job disabled - returning immediately');
  return { success: false, error: 'Weekly digest is disabled' };

  /* DISABLED - re-enable when deduplication is verified
  if (!resend) {
    console.warn('[WeeklyDigest] Resend not configured - aborting job');
    return { success: false, error: 'Email service not configured' };
  }

  const adminClient = createAdminClient();
  const weekKey = getDigestWeekKey();

  try {
    // Get all organizations
    const { data: organizations, error: orgError } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .select('id, name, logo_url')
      .neq('subscription_status', 'cancelled');

    if (orgError) {
      throw orgError;
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkippedDupe = 0;

    // Process each organization
    for (const organization of organizations) {
      console.log(`[WeeklyDigest] Processing organization: ${organization.name}`);

      // Deduplication: check if we already sent this week's digest for this org
      if (!force) {
        const { data: existingSend } = await adminClient
          .from('weekly_digest_log')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('week_key', weekKey)
          .limit(1)
          .maybeSingle();

        if (existingSend) {
          console.log(`[WeeklyDigest] Already sent ${weekKey} digest for ${organization.name}, skipping`);
          totalSkippedDupe++;
          continue;
        }
      }

      // Get managers with email digest enabled
      const { data: managers, error: managersError } = await adminClient
        .from(TABLES.USERS)
        .select(`
          id,
          email,
          full_name,
          role,
          email_preferences:email_preferences(*)
        `)
        .eq('organization_id', organization.id)
        .in('role', ['manager', 'admin', 'super_admin'])
        .eq('status', 'active');

      if (managersError) {
        console.error('[WeeklyDigest] Error fetching managers:', managersError);
        continue;
      }

      // Filter managers who have digest enabled (default to true if no preference set)
      const eligibleManagers = managers.filter(m => {
        const prefs = m.email_preferences?.[0];
        return !prefs || prefs.weekly_digest !== false;
      });

      console.log(`[WeeklyDigest] Found ${eligibleManagers.length} eligible managers`);

      // Calculate stats once per organization (all managers see same data)
      const stats = await calculateTeamStats(adminClient, organization.id, null);

      if (!stats) {
        console.log(`[WeeklyDigest] No data for ${organization.name}, skipping`);
        continue;
      }

      // Send to each eligible manager
      let orgSent = 0;
      for (const manager of eligibleManagers) {
        const result = await sendDigestToManager(adminClient, manager, organization, stats);
        if (result.success) {
          totalSent++;
          orgSent++;
        } else if (!result.skipped) {
          totalFailed++;
        }
      }

      // Record that we sent this week's digest for this org
      if (orgSent > 0) {
        await adminClient
          .from('weekly_digest_log')
          .insert({
            organization_id: organization.id,
            week_key: weekKey,
            recipients_count: orgSent,
            sent_at: new Date().toISOString()
          })
          .catch(err => console.error('[WeeklyDigest] Error logging digest send:', err));
      }
    }

    console.log(`[WeeklyDigest] Job completed. Sent: ${totalSent}, Failed: ${totalFailed}, Skipped (already sent): ${totalSkippedDupe}`);
    return { success: true, sent: totalSent, failed: totalFailed, skippedDuplicate: totalSkippedDupe };

  } catch (error) {
    console.error('[WeeklyDigest] Job failed:', error);
    return { success: false, error: error.message };
  }
  DISABLED */
}

/**
 * Manual trigger for testing (bypasses deduplication)
 */
export async function triggerWeeklyDigestManual() {
  console.log('[WeeklyDigest] Manual trigger disabled');
  return { success: false, error: 'Weekly digest is disabled' };
}
