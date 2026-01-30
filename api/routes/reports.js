import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/reports/my-stats
 * Get current user's personal statistics
 */
router.get('/my-stats', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get user profile with stats
    const { data: user } = await adminClient
      .from(TABLES.USERS)
      .select('total_points, current_streak, longest_streak, level')
      .eq('id', req.user.id)
      .single();

    // Get session stats
    const { data: sessions } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('overall_score, points_earned')
      .eq('user_id', req.user.id)
      .eq('status', 'completed');

    const totalSessions = sessions?.length || 0;
    const averageScore = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / totalSessions)
      : 0;

    res.json({
      total_points: user?.total_points || 0,
      current_streak: user?.current_streak || 0,
      longest_streak: user?.longest_streak || 0,
      level: user?.level || 1,
      total_sessions: totalSessions,
      average_score: averageScore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/my-progress
 * Get detailed personal progress report
 */
router.get('/my-progress', async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const adminClient = createAdminClient();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get sessions in date range
    const { data: sessions } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Calculate stats
    const totalSessions = sessions?.length || 0;
    const totalHours = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 3600 || 0;
    const averageScore = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / totalSessions)
      : 0;
    const pointsEarned = sessions?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;

    // Calculate category averages
    const categoryAverages = {};
    const categoryCounts = {};

    sessions?.forEach(s => {
      if (s.category_scores) {
        Object.entries(s.category_scores).forEach(([key, value]) => {
          const score = typeof value === 'object' ? value.score : value;
          categoryAverages[key] = (categoryAverages[key] || 0) + score;
          categoryCounts[key] = (categoryCounts[key] || 0) + 1;
        });
      }
    });

    Object.keys(categoryAverages).forEach(key => {
      categoryAverages[key] = Math.round(categoryAverages[key] / categoryCounts[key]);
    });

    res.json({
      stats: {
        total_sessions: totalSessions,
        total_hours: Math.round(totalHours * 10) / 10,
        average_score: averageScore,
        points_earned: pointsEarned,
        category_averages: categoryAverages
      },
      trends: sessions?.map(s => ({
        date: s.created_at,
        score: s.overall_score
      })) || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/team
 * Get team performance report (for managers)
 */
router.get('/team', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const adminClient = createAdminClient();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
    }

    // Get team members
    let usersQuery = adminClient
      .from(TABLES.USERS)
      .select('id, full_name, email, total_points, current_streak')
      .eq('organization_id', req.organization.id);

    if (req.user.role === 'manager' && req.user.branch_id) {
      usersQuery = usersQuery.eq('branch_id', req.user.branch_id);
    }

    const { data: users } = await usersQuery;
    const userIds = users?.map(u => u.id) || [];

    // Get sessions for team
    const { data: sessions } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('user_id, overall_score, points_earned, duration_seconds')
      .in('user_id', userIds)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    // Calculate team stats
    const userStats = {};
    sessions?.forEach(s => {
      if (!userStats[s.user_id]) {
        userStats[s.user_id] = { sessions: 0, totalScore: 0, points: 0 };
      }
      userStats[s.user_id].sessions += 1;
      userStats[s.user_id].totalScore += s.overall_score || 0;
      userStats[s.user_id].points += s.points_earned || 0;
    });

    const teamMembers = users?.map(u => ({
      id: u.id,
      name: u.full_name,
      sessions: userStats[u.id]?.sessions || 0,
      avg_score: userStats[u.id]?.sessions > 0
        ? Math.round(userStats[u.id].totalScore / userStats[u.id].sessions)
        : 0,
      points: userStats[u.id]?.points || 0,
      streak: u.current_streak || 0,
      trend: 0 // Calculate based on previous period
    })) || [];

    const totalSessions = sessions?.length || 0;
    const averageScore = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / totalSessions)
      : 0;

    res.json({
      stats: {
        total_sessions: totalSessions,
        average_score: averageScore,
        active_users: Object.keys(userStats).length,
        team_members: teamMembers
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/team-summary
 * Quick team summary for dashboard
 */
router.get('/team-summary', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get active users count
    let usersQuery = adminClient
      .from(TABLES.USERS)
      .select('id', { count: 'exact' })
      .eq('organization_id', req.organization.id)
      .eq('status', 'active');

    if (req.user.role === 'manager' && req.user.branch_id) {
      usersQuery = usersQuery.eq('branch_id', req.user.branch_id);
    }

    const { count: activeUsers } = await usersQuery;

    // Get weekly sessions
    const { data: sessions, count: weeklySessions } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('overall_score', { count: 'exact' })
      .eq('organization_id', req.organization.id)
      .eq('status', 'completed')
      .gte('created_at', weekAgo.toISOString());

    const averageScore = sessions?.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / sessions.length)
      : 0;

    // Get pending assignments
    const { count: pendingAssignments } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .select('id', { count: 'exact' })
      .eq('organization_id', req.organization.id)
      .in('status', ['pending', 'in_progress']);

    res.json({
      active_users: activeUsers || 0,
      weekly_sessions: weeklySessions || 0,
      average_score: averageScore,
      pending_assignments: pendingAssignments || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/organization
 * Organization-wide report (for admins)
 */
router.get('/organization', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const adminClient = createAdminClient();

    // Similar to team report but org-wide
    // Implementation would be similar to /team but without branch filtering

    res.json({
      stats: {
        total_sessions: 0,
        average_score: 0,
        total_hours: 0,
        points_earned: 0,
        category_averages: {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/export
 * Export report data to CSV
 */
router.get('/export', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { type = 'personal', range = 'month' } = req.query;

    // Generate CSV content
    const csvContent = 'Date,Scenario,Score,Duration,Points\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${range}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
