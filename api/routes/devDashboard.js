import { Router } from 'express';
import Retell from 'retell-sdk';
import { authMiddleware } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

let retellClient = null;
function getRetellClient() {
  if (!retellClient) {
    retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });
  }
  return retellClient;
}

const router = Router();

const DEV_EMAIL = 'ballen@xrailabsteam.com';

function requireDev(req, res, next) {
  if (!req.user || req.user.email !== DEV_EMAIL) {
    return res.status(403).json({ error: 'Forbidden', message: 'Developer access only' });
  }
  next();
}

router.get('/stats', authMiddleware, requireDev, async (req, res) => {
  try {
    const admin = createAdminClient();

    // Run all queries in parallel
    const [
      usersTotal,
      usersWeek,
      usersDay,
      orgsTotal,
      sessionsTotal,
      sessionsCompleted,
      sessionsDay,
      invitationStats,
      recentUsers,
      recentSessions,
      orgActivity,
      bookmarksCount,
      certificatesCount,
      microSessionsCount,
      warmupSessionsCount,
      challengesCount,
      courseProgressCount,
      analysisCacheCount
    ] = await Promise.all([
      // Overview counts
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      admin.from('organizations').select('*', { count: 'exact', head: true }),
      admin.from('training_sessions').select('*', { count: 'exact', head: true }),
      admin.from('training_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      admin.from('training_sessions').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      admin.from('invitations').select('status'),

      // Recent users
      admin.from('users')
        .select('id, email, full_name, role, status, created_at, organization:organizations(name)')
        .order('created_at', { ascending: false })
        .limit(20),

      // Recent training sessions
      admin.from('training_sessions')
        .select('id, scenario_id, scenario_name, overall_score, status, duration_seconds, retell_call_id, created_at, user:users(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(20),

      // Org activity
      admin.from('users')
        .select('organization_id, organization:organizations(name)'),

      // Feature usage (last 7 days)
      admin.from('scenario_bookmarks').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('certificates').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('micro_sessions').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('warmup_sessions').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('colleague_challenges').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('user_course_progress').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('analysis_cache').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Build invitation breakdown
    const invitations = invitationStats.data || [];
    const invitationBreakdown = {};
    for (const inv of invitations) {
      invitationBreakdown[inv.status] = (invitationBreakdown[inv.status] || 0) + 1;
    }

    // Build org activity summary
    const orgMap = {};
    for (const u of (orgActivity.data || [])) {
      const orgId = u.organization_id;
      if (!orgId) continue;
      if (!orgMap[orgId]) {
        orgMap[orgId] = { name: u.organization?.name || 'Unknown', userCount: 0 };
      }
      orgMap[orgId].userCount++;
    }

    // Get session counts per org
    const { data: orgSessions } = await admin
      .from('training_sessions')
      .select('organization_id, created_at');

    for (const s of (orgSessions || [])) {
      if (orgMap[s.organization_id]) {
        orgMap[s.organization_id].sessionCount = (orgMap[s.organization_id].sessionCount || 0) + 1;
        const existing = orgMap[s.organization_id].lastSession;
        if (!existing || s.created_at > existing) {
          orgMap[s.organization_id].lastSession = s.created_at;
        }
      }
    }

    const orgBreakdown = Object.entries(orgMap).map(([id, data]) => ({
      id,
      name: data.name,
      userCount: data.userCount,
      sessionCount: data.sessionCount || 0,
      lastSession: data.lastSession || null
    })).sort((a, b) => b.sessionCount - a.sessionCount);

    res.json({
      overview: {
        totalUsers: usersTotal.count || 0,
        signupsThisWeek: usersWeek.count || 0,
        signupsToday: usersDay.count || 0,
        totalOrgs: orgsTotal.count || 0,
        totalSessions: sessionsTotal.count || 0,
        completedSessions: sessionsCompleted.count || 0,
        sessionsToday: sessionsDay.count || 0,
        invitations: invitationBreakdown
      },
      recentUsers: recentUsers.data || [],
      recentSessions: recentSessions.data || [],
      orgBreakdown,
      featureUsage: {
        bookmarks: bookmarksCount.count || 0,
        certificates: certificatesCount.count || 0,
        microSessions: microSessionsCount.count || 0,
        warmupSessions: warmupSessionsCount.count || 0,
        challenges: challengesCount.count || 0,
        coursesStarted: courseProgressCount.count || 0,
        analysisCache: analysisCacheCount.count || 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DevDashboard] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/recording/:callId', authMiddleware, requireDev, async (req, res) => {
  try {
    const call = await getRetellClient().call.retrieve(req.params.callId);
    if (!call?.recording_url) {
      return res.status(404).json({ error: 'No recording available for this call' });
    }
    res.json({ recording_url: call.recording_url });
  } catch (error) {
    console.error('[DevDashboard] Recording fetch error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
