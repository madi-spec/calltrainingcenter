import express from 'express';
import { createAdminClient } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = express.Router();

// All routes require manager or higher role
router.use(requireAuth);
router.use(requireRole(['manager', 'admin', 'owner']));

/**
 * GET /api/skill-gaps/team-assessment
 * Get team skill assessment heatmap data
 */
router.get('/team-assessment', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { teamId, branchId } = req.query;

    // Get all users in the org with their skill gaps
    let query = supabase
      .from('user_skill_gaps')
      .select(`
        *,
        user:users(id, full_name, avatar_url, team_id)
      `)
      .eq('org_id', orgId);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: skillGaps, error } = await query;

    if (error) throw error;

    // Aggregate skill data for heatmap
    const skillCategories = ['empathy', 'problem_solving', 'product_knowledge', 'professionalism', 'communication'];
    const userScores = {};
    const categoryAverages = {};

    skillCategories.forEach(cat => {
      categoryAverages[cat] = { sum: 0, count: 0 };
    });

    (skillGaps || []).forEach(gap => {
      const userId = gap.user_id;
      const userName = gap.user?.full_name || 'Unknown';

      if (!userScores[userId]) {
        userScores[userId] = {
          userId,
          userName,
          avatarUrl: gap.user?.avatar_url,
          scores: {}
        };
      }

      userScores[userId].scores[gap.skill_category] = {
        score: gap.current_score,
        target: gap.target_score,
        gap: gap.gap_size,
        priority: gap.priority
      };

      if (gap.current_score !== null) {
        categoryAverages[gap.skill_category].sum += gap.current_score;
        categoryAverages[gap.skill_category].count += 1;
      }
    });

    // Calculate averages
    const averages = {};
    skillCategories.forEach(cat => {
      const avg = categoryAverages[cat];
      averages[cat] = avg.count > 0 ? Math.round(avg.sum / avg.count) : null;
    });

    res.json({
      users: Object.values(userScores),
      categories: skillCategories,
      averages,
      totalUsers: Object.keys(userScores).length
    });
  } catch (error) {
    console.error('Error fetching team assessment:', error);
    res.status(500).json({ error: 'Failed to fetch team assessment' });
  }
});

/**
 * GET /api/skill-gaps/user/:userId
 * Get individual user skill gaps
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_skill_gaps')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ skillGaps: data || [] });
  } catch (error) {
    console.error('Error fetching user skill gaps:', error);
    res.status(500).json({ error: 'Failed to fetch user skill gaps' });
  }
});

/**
 * GET /api/skill-gaps/critical
 * Get users with critical skill gaps (gap_size >= 30)
 */
router.get('/critical', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    const { data, error } = await supabase
      .from('user_skill_gaps')
      .select(`
        *,
        user:users(id, full_name, avatar_url, email)
      `)
      .eq('org_id', orgId)
      .eq('priority', 'critical')
      .order('gap_size', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ criticalGaps: data || [] });
  } catch (error) {
    console.error('Error fetching critical gaps:', error);
    res.status(500).json({ error: 'Failed to fetch critical gaps' });
  }
});

/**
 * POST /api/skill-gaps/improvement-plan
 * Create an improvement plan for a user
 */
router.post('/improvement-plan', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: assignedBy, orgId } = req.user;
    const { userId, targetSkill, targetScore, targetDate, notes, recommendedScenarios } = req.body;

    // Get current score for this skill
    const { data: currentGap } = await supabase
      .from('user_skill_gaps')
      .select('current_score')
      .eq('user_id', userId)
      .eq('skill_category', targetSkill)
      .single();

    const { data, error } = await supabase
      .from('skill_improvement_plans')
      .insert({
        user_id: userId,
        org_id: orgId,
        assigned_by: assignedBy,
        target_skill: targetSkill,
        current_score: currentGap?.current_score || null,
        target_score: targetScore,
        target_date: targetDate || null,
        notes: notes || null,
        recommended_scenarios: recommendedScenarios || [],
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ plan: data });
  } catch (error) {
    console.error('Error creating improvement plan:', error);
    res.status(500).json({ error: 'Failed to create improvement plan' });
  }
});

/**
 * GET /api/skill-gaps/improvement-plans
 * Get improvement plans for the organization
 */
router.get('/improvement-plans', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { userId, status = 'active' } = req.query;

    let query = supabase
      .from('skill_improvement_plans')
      .select(`
        *,
        user:users(id, full_name, avatar_url),
        assigned_by_user:users!skill_improvement_plans_assigned_by_fkey(id, full_name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ plans: data || [] });
  } catch (error) {
    console.error('Error fetching improvement plans:', error);
    res.status(500).json({ error: 'Failed to fetch improvement plans' });
  }
});

/**
 * PATCH /api/skill-gaps/improvement-plan/:planId
 * Update an improvement plan
 */
router.patch('/improvement-plan/:planId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { planId } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('skill_improvement_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;

    res.json({ plan: data });
  } catch (error) {
    console.error('Error updating improvement plan:', error);
    res.status(500).json({ error: 'Failed to update improvement plan' });
  }
});

/**
 * GET /api/skill-gaps/trends
 * Get skill trend data over time
 */
router.get('/trends', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get recent team assessments
    const { data, error } = await supabase
      .from('team_skill_assessments')
      .select('*')
      .eq('org_id', orgId)
      .gte('assessed_at', startDate.toISOString())
      .order('assessed_at', { ascending: true });

    if (error) throw error;

    res.json({ trends: data || [] });
  } catch (error) {
    console.error('Error fetching skill trends:', error);
    res.status(500).json({ error: 'Failed to fetch skill trends' });
  }
});

/**
 * POST /api/skill-gaps/refresh
 * Manually refresh skill gap calculations for the organization
 */
router.post('/refresh', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    // Get all users with their recent training sessions
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, team_id')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (usersError) throw usersError;

    let updated = 0;

    for (const user of users || []) {
      // Get user's recent sessions with scores
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('category_scores')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('category_scores', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(10);

      if (!sessions || sessions.length === 0) continue;

      // Calculate average scores per category
      const categoryTotals = {};
      const categoryCounts = {};

      sessions.forEach(session => {
        const scores = session.category_scores || {};
        Object.entries(scores).forEach(([cat, scoreData]) => {
          const score = typeof scoreData === 'object' ? scoreData.score : scoreData;
          if (typeof score === 'number') {
            if (!categoryTotals[cat]) {
              categoryTotals[cat] = 0;
              categoryCounts[cat] = 0;
            }
            categoryTotals[cat] += score;
            categoryCounts[cat] += 1;
          }
        });
      });

      // Upsert skill gaps for each category
      for (const [category, total] of Object.entries(categoryTotals)) {
        const avgScore = Math.round(total / categoryCounts[category]);

        await supabase
          .from('user_skill_gaps')
          .upsert({
            user_id: user.id,
            org_id: orgId,
            team_id: user.team_id,
            skill_category: category,
            current_score: avgScore,
            target_score: 70,
            assessed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,skill_category'
          });

        updated++;
      }
    }

    res.json({
      success: true,
      message: `Refreshed skill gaps for ${users?.length || 0} users`,
      updatedRecords: updated
    });
  } catch (error) {
    console.error('Error refreshing skill gaps:', error);
    res.status(500).json({ error: 'Failed to refresh skill gaps' });
  }
});

export default router;
