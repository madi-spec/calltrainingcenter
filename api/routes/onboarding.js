import express from 'express';
import { authMiddleware } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/onboarding/status
 * Get current onboarding status for the user
 */
router.get('/status', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data: user, error } = await supabase
      .from('users')
      .select('onboarding_completed, onboarding_progress, onboarding_skipped')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({
      completed: user?.onboarding_completed || false,
      skipped: user?.onboarding_skipped || false,
      progress: user?.onboarding_progress || { steps_completed: [] }
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding status' });
  }
});

/**
 * POST /api/onboarding/start
 * Mark the tutorial as started
 */
router.post('/start', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_progress: {
          steps_completed: [],
          current_step: 'welcome',
          started_at: new Date().toISOString(),
          completed_at: null
        }
      })
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Tutorial started' });
  } catch (error) {
    console.error('Error starting tutorial:', error);
    res.status(500).json({ error: 'Failed to start tutorial' });
  }
});

/**
 * POST /api/onboarding/progress
 * Update progress for a specific step
 */
router.post('/progress', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { step_id, completed } = req.body;

    if (!step_id) {
      return res.status(400).json({ error: 'step_id is required' });
    }

    // Get current progress
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentProgress = user?.onboarding_progress || { steps_completed: [] };
    const stepsCompleted = currentProgress.steps_completed || [];

    // Add step to completed if not already there
    if (completed && !stepsCompleted.includes(step_id)) {
      stepsCompleted.push(step_id);
    }

    // Update progress
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_progress: {
          ...currentProgress,
          steps_completed: stepsCompleted,
          current_step: step_id
        }
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Also record in tutorial_completions table
    if (completed) {
      await supabase
        .from('tutorial_completions')
        .upsert({
          user_id: userId,
          step_id: step_id,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,step_id'
        });
    }

    res.json({
      success: true,
      steps_completed: stepsCompleted
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * POST /api/onboarding/complete
 * Mark the tutorial as completed
 */
router.post('/complete', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, org_id: orgId } = req.user;

    // Update user record
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentProgress = user?.onboarding_progress || {};

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_progress: {
          ...currentProgress,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', userId);

    if (error) throw error;

    // Award points for completing tutorial
    await supabase.from('point_transactions').insert({
      user_id: userId,
      organization_id: orgId,
      points: 50,
      reason: 'Completed onboarding tutorial',
      reference_type: 'tutorial',
      reference_id: null
    });

    // Update user's total points
    await supabase.rpc('increment_user_points', {
      user_id: userId,
      points_to_add: 50
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from('users')
        .update({ total_points: supabase.raw('total_points + 50') })
        .eq('id', userId);
    });

    res.json({
      success: true,
      message: 'Tutorial completed',
      points_earned: 50
    });
  } catch (error) {
    console.error('Error completing tutorial:', error);
    res.status(500).json({ error: 'Failed to complete tutorial' });
  }
});

/**
 * POST /api/onboarding/skip
 * Skip the tutorial
 */
router.post('/skip', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_skipped: true,
        onboarding_progress: {
          steps_completed: [],
          skipped_at: new Date().toISOString()
        }
      })
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Tutorial skipped' });
  } catch (error) {
    console.error('Error skipping tutorial:', error);
    res.status(500).json({ error: 'Failed to skip tutorial' });
  }
});

/**
 * POST /api/onboarding/reset
 * Reset tutorial progress (for testing or re-taking)
 */
router.post('/reset', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    // Reset user onboarding fields
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_completed: false,
        onboarding_skipped: false,
        onboarding_progress: {
          steps_completed: [],
          current_step: null,
          started_at: null,
          completed_at: null
        }
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Delete tutorial completions
    await supabase
      .from('tutorial_completions')
      .delete()
      .eq('user_id', userId);

    res.json({ success: true, message: 'Tutorial reset' });
  } catch (error) {
    console.error('Error resetting tutorial:', error);
    res.status(500).json({ error: 'Failed to reset tutorial' });
  }
});

export default router;
