/**
 * Practice Requirements API Routes
 *
 * Handles daily/weekly practice tracking, compliance monitoring,
 * and practice requirements configuration.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/practice/today
 * Get user's practice status for today
 */
router.get('/today', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's practice log
    const { data: log } = await adminClient
      .from('practice_log')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    // Get practice requirements
    const { data: requirement } = await adminClient
      .from('practice_requirements')
      .select('*')
      .eq('organization_id', req.organization.id)
      .or(`team_id.is.null,team_id.eq.${req.user.team_id || 'null'}`)
      .eq('is_active', true)
      .order('team_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    const requiredCalls = requirement?.required_calls || 5;
    const requiredMinutes = requirement?.required_minutes;

    res.json({
      success: true,
      today: {
        date: today,
        callsCompleted: log?.calls_completed || 0,
        minutesPracticed: log?.minutes_practiced || 0,
        metRequirement: log?.met_requirement || false,
        excused: log?.excused || false,
        excuseReason: log?.excuse_reason
      },
      requirement: {
        frequency: requirement?.frequency || 'daily',
        requiredCalls,
        requiredMinutes,
        callsRemaining: Math.max(0, requiredCalls - (log?.calls_completed || 0)),
        percentComplete: Math.min(100, Math.round((log?.calls_completed || 0) / requiredCalls * 100))
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s practice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/practice/week
 * Get user's practice for the current week
 */
router.get('/week', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];

    // Get practice logs for the week
    const { data: logs } = await adminClient
      .from('practice_log')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    // Get requirements
    const { data: requirement } = await adminClient
      .from('practice_requirements')
      .select('*')
      .eq('organization_id', req.organization.id)
      .or(`team_id.is.null,team_id.eq.${req.user.team_id || 'null'}`)
      .eq('is_active', true)
      .order('team_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    // Build week data
    const logMap = {};
    logs?.forEach(log => {
      logMap[log.date] = log;
    });

    const days = [];
    const requiredCalls = requirement?.required_calls || 5;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const log = logMap[dateStr];
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const isPast = date < new Date() && !isToday;

      days.push({
        date: dateStr,
        dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        callsCompleted: log?.calls_completed || 0,
        minutesPracticed: log?.minutes_practiced || 0,
        metRequirement: log?.met_requirement || false,
        excused: log?.excused || false,
        isToday,
        isFuture: !isPast && !isToday,
        status: log?.met_requirement ? 'complete' :
                log?.excused ? 'excused' :
                isPast ? 'missed' :
                isToday ? 'in_progress' : 'upcoming'
      });
    }

    // Calculate weekly summary
    const daysWithRequirement = days.filter(d => !d.isFuture).length;
    const daysMet = days.filter(d => d.metRequirement || d.excused).length;
    const totalCalls = days.reduce((sum, d) => sum + d.callsCompleted, 0);
    const totalMinutes = days.reduce((sum, d) => sum + d.minutesPracticed, 0);

    res.json({
      success: true,
      week: {
        startDate,
        endDate,
        days,
        summary: {
          daysCompleted: daysMet,
          daysRequired: daysWithRequirement,
          totalCalls,
          totalMinutes: Math.round(totalMinutes),
          complianceRate: daysWithRequirement > 0
            ? Math.round(daysMet / daysWithRequirement * 100)
            : 100
        }
      },
      requirement: {
        frequency: requirement?.frequency || 'daily',
        requiredCalls,
        requiredMinutes: requirement?.required_minutes
      }
    });
  } catch (error) {
    console.error('Error fetching week\'s practice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/practice/log
 * Log a completed practice call
 */
router.post('/log', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { duration_seconds, session_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const adminClient = createAdminClient();

    // Get current log or create new one
    const { data: existing } = await adminClient
      .from('practice_log')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    // Get requirements
    const { data: requirement } = await adminClient
      .from('practice_requirements')
      .select('*')
      .eq('organization_id', req.organization.id)
      .or(`team_id.is.null,team_id.eq.${req.user.team_id || 'null'}`)
      .eq('is_active', true)
      .order('team_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    const requiredCalls = requirement?.required_calls || 5;
    const requiredMinutes = requirement?.required_minutes;

    const newCallsCompleted = (existing?.calls_completed || 0) + 1;
    const newMinutesPracticed = (parseFloat(existing?.minutes_practiced) || 0) +
                                 ((duration_seconds || 0) / 60);

    // Check if requirement is met
    let metRequirement = false;
    if (requiredMinutes) {
      metRequirement = newMinutesPracticed >= requiredMinutes;
    } else {
      metRequirement = newCallsCompleted >= requiredCalls;
    }

    // Upsert practice log
    const { data: log, error } = await adminClient
      .from('practice_log')
      .upsert({
        user_id: req.user.id,
        date: today,
        calls_completed: newCallsCompleted,
        minutes_practiced: newMinutesPracticed,
        met_requirement: metRequirement,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;

    // Update user streak if requirement met
    if (metRequirement && !existing?.met_requirement) {
      const { data: user } = await adminClient
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', req.user.id)
        .single();

      const newStreak = (user?.current_streak || 0) + 1;
      const newLongest = Math.max(newStreak, user?.longest_streak || 0);

      await adminClient
        .from('users')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_training_at: new Date().toISOString()
        })
        .eq('id', req.user.id);
    }

    res.json({
      success: true,
      log,
      metRequirement,
      callsRemaining: Math.max(0, requiredCalls - newCallsCompleted)
    });
  } catch (error) {
    console.error('Error logging practice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/practice/team/:id/compliance
 * Get team practice compliance (manager+)
 */
router.get('/team/:id/compliance', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Verify access to team
    if (req.user.role === 'manager') {
      const { data: team } = await adminClient
        .from('teams')
        .select('manager_id')
        .eq('id', req.params.id)
        .single();

      if (team?.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only view teams you manage' });
      }
    }

    // Get team members
    const { data: members } = await adminClient
      .from('users')
      .select('id, full_name, email, current_streak')
      .eq('team_id', req.params.id)
      .eq('status', 'active');

    if (!members || members.length === 0) {
      return res.json({
        success: true,
        compliance: {
          members: [],
          overallRate: 0
        }
      });
    }

    // Get start of week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const startDate = monday.toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Get practice logs for all members this week
    const memberIds = members.map(m => m.id);
    const { data: logs } = await adminClient
      .from('practice_log')
      .select('*')
      .in('user_id', memberIds)
      .gte('date', startDate)
      .lte('date', today);

    // Build compliance data per member
    const logsByUser = {};
    logs?.forEach(log => {
      if (!logsByUser[log.user_id]) {
        logsByUser[log.user_id] = [];
      }
      logsByUser[log.user_id].push(log);
    });

    // Calculate days elapsed (including today)
    const todayDate = new Date();
    const daysElapsed = Math.floor((todayDate - monday) / (1000 * 60 * 60 * 24)) + 1;

    const memberCompliance = members.map(member => {
      const memberLogs = logsByUser[member.id] || [];
      const daysMet = memberLogs.filter(l => l.met_requirement || l.excused).length;
      const totalCalls = memberLogs.reduce((sum, l) => sum + (l.calls_completed || 0), 0);

      return {
        id: member.id,
        name: member.full_name,
        email: member.email,
        streak: member.current_streak || 0,
        weekDaysMet: daysMet,
        weekTotalCalls: totalCalls,
        complianceRate: daysElapsed > 0 ? Math.round(daysMet / daysElapsed * 100) : 0,
        todayComplete: memberLogs.some(l => l.date === today && l.met_requirement),
        todayExcused: memberLogs.some(l => l.date === today && l.excused)
      };
    });

    // Sort by compliance rate
    memberCompliance.sort((a, b) => b.complianceRate - a.complianceRate);

    const overallRate = memberCompliance.length > 0
      ? Math.round(memberCompliance.reduce((sum, m) => sum + m.complianceRate, 0) / memberCompliance.length)
      : 0;

    res.json({
      success: true,
      compliance: {
        weekStart: startDate,
        daysElapsed,
        members: memberCompliance,
        overallRate,
        todayCompleteCount: memberCompliance.filter(m => m.todayComplete).length,
        totalMembers: members.length
      }
    });
  } catch (error) {
    console.error('Error fetching team compliance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/practice/excuse
 * Mark a day as excused (manager+)
 */
router.put('/excuse', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const { user_id, date, reason } = req.body;

    if (!user_id || !date) {
      return res.status(400).json({ error: 'user_id and date are required' });
    }

    const adminClient = createAdminClient();

    // Verify the user belongs to org
    const { data: targetUser } = await adminClient
      .from('users')
      .select('id, team_id')
      .eq('id', user_id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Managers can only excuse their team members
    if (req.user.role === 'manager') {
      const { data: team } = await adminClient
        .from('teams')
        .select('manager_id')
        .eq('id', targetUser.team_id)
        .single();

      if (team?.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only excuse members of your team' });
      }
    }

    // Upsert excuse
    const { data, error } = await adminClient
      .from('practice_log')
      .upsert({
        user_id,
        date,
        excused: true,
        excuse_reason: reason,
        met_requirement: true, // Excused counts as meeting requirement
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, log: data });
  } catch (error) {
    console.error('Error excusing practice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/practice/requirements
 * Get practice requirements for the org
 */
router.get('/requirements', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('practice_requirements')
      .select(`
        *,
        team:teams(id, name)
      `)
      .eq('organization_id', req.organization.id)
      .order('team_id', { nullsFirst: true });

    if (error) throw error;

    res.json({ success: true, requirements: data || [] });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/practice/requirements
 * Create or update practice requirements
 */
router.post('/requirements', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { team_id, frequency, required_calls, required_minutes } = req.body;

    const adminClient = createAdminClient();

    // Check for existing requirement
    let query = adminClient
      .from('practice_requirements')
      .select('id')
      .eq('organization_id', req.organization.id);

    if (team_id) {
      query = query.eq('team_id', team_id);
    } else {
      query = query.is('team_id', null);
    }

    const { data: existing } = await query.single();

    let data, error;

    if (existing) {
      // Update
      ({ data, error } = await adminClient
        .from('practice_requirements')
        .update({
          frequency: frequency || 'daily',
          required_calls,
          required_minutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // Insert
      ({ data, error } = await adminClient
        .from('practice_requirements')
        .insert({
          organization_id: req.organization.id,
          team_id: team_id || null,
          frequency: frequency || 'daily',
          required_calls,
          required_minutes
        })
        .select()
        .single());
    }

    if (error) throw error;

    res.json({ success: true, requirement: data });
  } catch (error) {
    console.error('Error saving requirement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/practice/compliance-overview
 * Get compliance overview for all teams (manager+)
 */
router.get('/compliance-overview', authMiddleware, tenantMiddleware, requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get teams the user has access to
    let teamsQuery = adminClient
      .from('teams')
      .select('id, name')
      .eq('organization_id', req.organization.id)
      .eq('is_active', true);

    // Managers can only see their own teams
    if (req.user.role === 'manager') {
      teamsQuery = teamsQuery.eq('manager_id', req.user.id);
    }

    const { data: teams } = await teamsQuery;

    if (!teams || teams.length === 0) {
      return res.json({
        success: true,
        overview: {
          teams: [],
          totalMembers: 0,
          overallComplianceRate: 0,
          todayCompleteCount: 0
        }
      });
    }

    // Get all users in these teams
    const teamIds = teams.map(t => t.id);
    const { data: allMembers } = await adminClient
      .from('users')
      .select('id, full_name, email, team_id, current_streak')
      .in('team_id', teamIds)
      .eq('status', 'active');

    // Get week boundaries
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const startDate = monday.toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const daysElapsed = Math.floor((now - monday) / (1000 * 60 * 60 * 24)) + 1;

    // Get all practice logs for the week
    const memberIds = allMembers?.map(m => m.id) || [];
    const { data: allLogs } = memberIds.length > 0 ? await adminClient
      .from('practice_log')
      .select('*')
      .in('user_id', memberIds)
      .gte('date', startDate)
      .lte('date', today) : { data: [] };

    // Group logs by user
    const logsByUser = {};
    allLogs?.forEach(log => {
      if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
      logsByUser[log.user_id].push(log);
    });

    // Build team compliance data
    const teamsWithCompliance = teams.map(team => {
      const teamMembers = allMembers?.filter(m => m.team_id === team.id) || [];

      const membersWithCompliance = teamMembers.map(member => {
        const memberLogs = logsByUser[member.id] || [];
        const daysMet = memberLogs.filter(l => l.met_requirement || l.excused).length;
        const todayLog = memberLogs.find(l => l.date === today);

        return {
          id: member.id,
          name: member.full_name,
          streak: member.current_streak || 0,
          weekDaysMet: daysMet,
          complianceRate: daysElapsed > 0 ? Math.round(daysMet / daysElapsed * 100) : 0,
          todayComplete: todayLog?.met_requirement || false,
          todayExcused: todayLog?.excused || false
        };
      });

      const teamComplianceRate = membersWithCompliance.length > 0
        ? Math.round(membersWithCompliance.reduce((sum, m) => sum + m.complianceRate, 0) / membersWithCompliance.length)
        : 0;

      return {
        id: team.id,
        name: team.name,
        memberCount: teamMembers.length,
        complianceRate: teamComplianceRate,
        todayCompleteCount: membersWithCompliance.filter(m => m.todayComplete || m.todayExcused).length,
        members: membersWithCompliance.sort((a, b) => b.complianceRate - a.complianceRate)
      };
    });

    // Calculate overall stats
    const totalMembers = allMembers?.length || 0;
    const overallComplianceRate = teamsWithCompliance.length > 0
      ? Math.round(teamsWithCompliance.reduce((sum, t) => sum + t.complianceRate, 0) / teamsWithCompliance.length)
      : 0;
    const todayCompleteCount = teamsWithCompliance.reduce((sum, t) => sum + t.todayCompleteCount, 0);

    res.json({
      success: true,
      overview: {
        weekStart: startDate,
        daysElapsed,
        teams: teamsWithCompliance.sort((a, b) => b.complianceRate - a.complianceRate),
        totalMembers,
        overallComplianceRate,
        todayCompleteCount
      }
    });
  } catch (error) {
    console.error('Error fetching compliance overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/practice/requirements/:id
 * Delete a practice requirement
 */
router.delete('/requirements/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('practice_requirements')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/practice/quick-scenario
 * Get a random scenario matching user's level/difficulty
 */
router.get('/quick-scenario', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const userLevel = req.user.level || 1;

    // Map user level (1-20) to difficulty
    // Level 1-6: easy, Level 7-13: medium, Level 14-20: hard
    let difficulty;
    if (userLevel <= 6) {
      difficulty = 'easy';
    } else if (userLevel <= 13) {
      difficulty = 'medium';
    } else {
      difficulty = 'hard';
    }

    // Default scenarios with difficulty mapping
    const scenarios = [
      { id: 'cancellation-save', name: 'The Cancellation Save', difficulty: 'hard', category: 'Retention' },
      { id: 'furious-callback', name: 'The Furious Callback', difficulty: 'hard', category: 'Complaint Resolution' },
      { id: 'price-shopper', name: 'The Price Shopper', difficulty: 'medium', category: 'Sales' },
      { id: 'new-customer-inquiry', name: 'The New Customer Inquiry', difficulty: 'easy', category: 'Sales' },
      { id: 'wildlife-emergency', name: 'The Wildlife Emergency', difficulty: 'medium', category: 'Emergency Response' }
    ];

    // Filter scenarios by difficulty
    let matchingScenarios = scenarios.filter(s => s.difficulty === difficulty);

    // If no exact match, include adjacent difficulty
    if (matchingScenarios.length === 0) {
      if (difficulty === 'easy') {
        matchingScenarios = scenarios.filter(s => s.difficulty === 'medium');
      } else if (difficulty === 'hard') {
        matchingScenarios = scenarios.filter(s => s.difficulty === 'medium');
      }
    }

    // If still no match, use all scenarios
    if (matchingScenarios.length === 0) {
      matchingScenarios = scenarios;
    }

    // Pick a random scenario
    const randomIndex = Math.floor(Math.random() * matchingScenarios.length);
    const selectedScenario = matchingScenarios[randomIndex];

    res.json({
      success: true,
      scenario: selectedScenario,
      userLevel,
      recommendedDifficulty: difficulty
    });
  } catch (error) {
    console.error('Error getting quick scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
