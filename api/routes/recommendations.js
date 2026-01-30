import express from 'express';
import { authMiddleware } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import {
  getRecommendations,
  generateRecommendations,
  getSkillProfile,
  getSkillHistory
} from '../services/recommendationEngine.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/recommendations
 * Get personalized recommendations for the user
 */
router.get('/', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const recommendations = await getRecommendations(userId);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * POST /api/recommendations/refresh
 * Regenerate recommendations based on current skill profile
 */
router.post('/refresh', async (req, res) => {
  try {
    const { id: userId, org_id: orgId } = req.user;
    const recommendations = await generateRecommendations(userId, orgId);
    res.json({
      success: true,
      recommendations_generated: recommendations.length
    });
  } catch (error) {
    console.error('Error refreshing recommendations:', error);
    res.status(500).json({ error: 'Failed to refresh recommendations' });
  }
});

/**
 * POST /api/recommendations/:id/dismiss
 * Dismiss a recommendation
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { id } = req.params;

    const { error } = await supabase
      .from(TABLES.RECOMMENDATIONS)
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

/**
 * POST /api/recommendations/:id/complete
 * Mark a recommendation as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { id } = req.params;

    const { error } = await supabase
      .from(TABLES.RECOMMENDATIONS)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing recommendation:', error);
    res.status(500).json({ error: 'Failed to complete recommendation' });
  }
});

/**
 * GET /api/recommendations/skills
 * Get user's skill profile
 */
router.get('/skills', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getSkillProfile(userId);

    if (!profile) {
      return res.json({
        profile: null,
        message: 'Complete more training sessions to build your skill profile'
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Error fetching skill profile:', error);
    res.status(500).json({ error: 'Failed to fetch skill profile' });
  }
});

/**
 * GET /api/recommendations/skills/history
 * Get skill score history for trending
 */
router.get('/skills/history', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { days = 30 } = req.query;
    const history = await getSkillHistory(userId, parseInt(days));
    res.json({ history });
  } catch (error) {
    console.error('Error fetching skill history:', error);
    res.status(500).json({ error: 'Failed to fetch skill history' });
  }
});

/**
 * GET /api/recommendations/skills/benchmarks
 * Get organization skill benchmarks
 */
router.get('/skills/benchmarks', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { org_id: orgId } = req.user;

    const { data: benchmarks, error } = await supabase
      .from(TABLES.SKILL_BENCHMARKS)
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;

    // Return as a map for easy lookup
    const benchmarkMap = {};
    for (const b of benchmarks || []) {
      benchmarkMap[b.skill_category] = {
        target: b.target_score,
        minimum: b.minimum_score
      };
    }

    res.json({ benchmarks: benchmarkMap });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

export default router;
