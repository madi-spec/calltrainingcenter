/**
 * Teams API Routes
 *
 * Handles team management, member assignments, and team statistics.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/teams
 * List all teams for the organization
 */
router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('teams')
      .select(`
        *,
        manager:users!teams_manager_id_fkey(id, full_name, email),
        branch:branches(*),
        members:users!users_team_id_fkey(id, full_name, email, role)
      `)
      .eq('organization_id', req.organization.id)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Add member count to each team
    const teamsWithCounts = data.map(team => ({
      ...team,
      member_count: team.members?.length || 0
    }));

    res.json({ success: true, teams: teamsWithCounts });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teams/:id
 * Get single team with members and details
 */
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('teams')
      .select(`
        *,
        manager:users!teams_manager_id_fkey(id, full_name, email, role),
        branch:branches(*),
        members:users!users_team_id_fkey(
          id,
          full_name,
          email,
          role,
          total_points,
          current_streak,
          level,
          last_training_at
        )
      `)
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Team not found' });

    res.json({ success: true, team: data });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, branch_id, manager_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('teams')
      .insert({
        organization_id: req.organization.id,
        name,
        description,
        branch_id,
        manager_id: manager_id || req.user.id
      })
      .select(`
        *,
        manager:users!teams_manager_id_fkey(id, full_name, email),
        branch:branches(*)
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, team: data });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/teams/:id
 * Update team details
 */
router.put('/:id', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, branch_id, manager_id } = req.body;

    const adminClient = createAdminClient();

    // Verify user has access to this team
    if (req.user.role === 'manager') {
      const { data: team } = await adminClient
        .from('teams')
        .select('manager_id')
        .eq('id', req.params.id)
        .single();

      if (team?.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only update teams you manage' });
      }
    }

    const { data, error } = await adminClient
      .from('teams')
      .update({
        name,
        description,
        branch_id,
        manager_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select(`
        *,
        manager:users!teams_manager_id_fkey(id, full_name, email),
        branch:branches(*)
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, team: data });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/teams/:id
 * Soft delete a team
 */
router.delete('/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // First, remove team_id from all members
    await adminClient
      .from('users')
      .update({ team_id: null })
      .eq('team_id', req.params.id);

    // Then soft delete the team
    const { error } = await adminClient
      .from('teams')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teams/:id/members
 * Add members to a team
 */
router.post('/:id/members', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    const adminClient = createAdminClient();

    // Verify user has access to this team
    if (req.user.role === 'manager') {
      const { data: team } = await adminClient
        .from('teams')
        .select('manager_id')
        .eq('id', req.params.id)
        .single();

      if (team?.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only modify teams you manage' });
      }
    }

    // Update all specified users to belong to this team
    const { data, error } = await adminClient
      .from('users')
      .update({ team_id: req.params.id })
      .in('id', user_ids)
      .eq('organization_id', req.organization.id)
      .select('id, full_name, email');

    if (error) throw error;
    res.json({ success: true, addedMembers: data });
  } catch (error) {
    console.error('Error adding team members:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove a member from a team
 */
router.delete('/:id/members/:userId', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Verify user has access to this team
    if (req.user.role === 'manager') {
      const { data: team } = await adminClient
        .from('teams')
        .select('manager_id')
        .eq('id', req.params.id)
        .single();

      if (team?.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only modify teams you manage' });
      }
    }

    // Remove team assignment from user
    const { error } = await adminClient
      .from('users')
      .update({ team_id: null })
      .eq('id', req.params.userId)
      .eq('team_id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teams/:id/stats
 * Get team statistics
 */
router.get('/:id/stats', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get team members
    const { data: members, error: membersError } = await adminClient
      .from('users')
      .select('id, full_name, total_points, current_streak, level')
      .eq('team_id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (membersError) throw membersError;

    const memberIds = members?.map(m => m.id) || [];

    if (memberIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          memberCount: 0,
          totalPoints: 0,
          avgPoints: 0,
          totalSessions: 0,
          avgScore: 0,
          totalHours: 0,
          streakLeader: null,
          pointsLeader: null
        }
      });
    }

    // Get training sessions for the team
    const { data: sessions, error: sessionsError } = await adminClient
      .from('training_sessions')
      .select('user_id, overall_score, duration_seconds, points_earned')
      .in('user_id', memberIds)
      .eq('status', 'completed');

    if (sessionsError) throw sessionsError;

    // Calculate stats
    const totalPoints = members.reduce((sum, m) => sum + (m.total_points || 0), 0);
    const totalSessions = sessions?.length || 0;
    const avgScore = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / totalSessions)
      : 0;
    const totalSeconds = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
    const totalHours = Math.round(totalSeconds / 3600 * 10) / 10;

    // Find leaders
    const streakLeader = members.reduce((max, m) =>
      (m.current_streak || 0) > (max?.current_streak || 0) ? m : max, null);
    const pointsLeader = members.reduce((max, m) =>
      (m.total_points || 0) > (max?.total_points || 0) ? m : max, null);

    res.json({
      success: true,
      stats: {
        memberCount: members.length,
        totalPoints,
        avgPoints: Math.round(totalPoints / members.length),
        totalSessions,
        avgScore,
        totalHours,
        streakLeader: streakLeader ? {
          id: streakLeader.id,
          name: streakLeader.full_name,
          streak: streakLeader.current_streak
        } : null,
        pointsLeader: pointsLeader ? {
          id: pointsLeader.id,
          name: pointsLeader.full_name,
          points: pointsLeader.total_points
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teams/comparison
 * Compare all teams in the organization
 */
router.get('/comparison', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get all teams with members
    const { data: teams, error: teamsError } = await adminClient
      .from('teams')
      .select(`
        id,
        name,
        members:users!users_team_id_fkey(id, total_points, current_streak)
      `)
      .eq('organization_id', req.organization.id)
      .eq('is_active', true);

    if (teamsError) throw teamsError;

    // Get all training sessions
    const { data: sessions, error: sessionsError } = await adminClient
      .from('training_sessions')
      .select('user_id, overall_score, duration_seconds')
      .eq('organization_id', req.organization.id)
      .eq('status', 'completed');

    if (sessionsError) throw sessionsError;

    // Build session lookup by user
    const sessionsByUser = {};
    sessions?.forEach(s => {
      if (!sessionsByUser[s.user_id]) {
        sessionsByUser[s.user_id] = [];
      }
      sessionsByUser[s.user_id].push(s);
    });

    // Calculate stats for each team
    const comparison = teams?.map(team => {
      const memberIds = team.members?.map(m => m.id) || [];
      const teamSessions = memberIds.flatMap(id => sessionsByUser[id] || []);

      const totalPoints = team.members?.reduce((sum, m) => sum + (m.total_points || 0), 0) || 0;
      const avgScore = teamSessions.length > 0
        ? Math.round(teamSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / teamSessions.length)
        : 0;
      const totalHours = Math.round(
        teamSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 3600 * 10
      ) / 10;

      return {
        id: team.id,
        name: team.name,
        memberCount: team.members?.length || 0,
        totalPoints,
        avgPointsPerMember: team.members?.length > 0 ? Math.round(totalPoints / team.members.length) : 0,
        totalSessions: teamSessions.length,
        avgScore,
        totalHours,
        avgStreak: team.members?.length > 0
          ? Math.round(team.members.reduce((sum, m) => sum + (m.current_streak || 0), 0) / team.members.length * 10) / 10
          : 0
      };
    }) || [];

    // Sort by total points descending
    comparison.sort((a, b) => b.totalPoints - a.totalPoints);

    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Error fetching team comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
