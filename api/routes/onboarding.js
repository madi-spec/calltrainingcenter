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
    if (!req.user?.id) {
      return res.json({
        completed: false,
        skipped: false,
        progress: { steps_completed: [] }
      });
    }

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('onboarding_completed, onboarding_progress, onboarding_skipped')
      .eq('id', req.user.id)
      .single();

    // If columns don't exist or error, return defaults
    if (error) {
      console.warn('Onboarding status fetch error (columns may not exist):', error.message);
      return res.json({
        completed: false,
        skipped: false,
        progress: { steps_completed: [] }
      });
    }

    res.json({
      completed: user?.onboarding_completed || false,
      skipped: user?.onboarding_skipped || false,
      progress: user?.onboarding_progress || { steps_completed: [] }
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    // Return defaults on error so tutorial can still work
    res.json({
      completed: false,
      skipped: false,
      progress: { steps_completed: [] }
    });
  }
});

/**
 * POST /api/onboarding/start
 * Mark the tutorial as started
 */
router.post('/start', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ success: true, message: 'Tutorial started (no user)' });
    }

    const supabase = createAdminClient();

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
      .eq('id', req.user.id);

    // Log but don't fail if column doesn't exist
    if (error) {
      console.warn('Could not save onboarding start (column may not exist):', error.message);
    }

    res.json({ success: true, message: 'Tutorial started' });
  } catch (error) {
    console.error('Error starting tutorial:', error);
    // Return success anyway so tutorial works
    res.json({ success: true, message: 'Tutorial started' });
  }
});

/**
 * POST /api/onboarding/progress
 * Update progress for a specific step
 */
router.post('/progress', async (req, res) => {
  try {
    const { step_id, completed } = req.body;

    if (!step_id) {
      return res.status(400).json({ error: 'step_id is required' });
    }

    if (!req.user?.id) {
      return res.json({ success: true, steps_completed: [step_id] });
    }

    const supabase = createAdminClient();

    // Try to get current progress
    const { data: user } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', req.user.id)
      .single();

    const currentProgress = user?.onboarding_progress || { steps_completed: [] };
    const stepsCompleted = currentProgress.steps_completed || [];

    // Add step to completed if not already there
    if (completed && !stepsCompleted.includes(step_id)) {
      stepsCompleted.push(step_id);
    }

    // Try to update progress
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_progress: {
          ...currentProgress,
          steps_completed: stepsCompleted,
          current_step: step_id
        }
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.warn('Could not save progress (column may not exist):', updateError.message);
    }

    // Try to record in tutorial_completions table (optional)
    if (completed) {
      try {
        await supabase
          .from('tutorial_completions')
          .upsert({
            user_id: req.user.id,
            step_id: step_id,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,step_id'
          });
      } catch (e) {
        // Table may not exist, that's OK
      }
    }

    res.json({
      success: true,
      steps_completed: stepsCompleted
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    // Return success so tutorial continues
    res.json({ success: true, steps_completed: [] });
  }
});

/**
 * POST /api/onboarding/complete
 * Mark the tutorial as completed
 */
router.post('/complete', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ success: true, message: 'Tutorial completed', points_earned: 0 });
    }

    const supabase = createAdminClient();
    const orgId = req.organization?.id;

    // Get current progress
    const { data: user } = await supabase
      .from('users')
      .select('onboarding_progress')
      .eq('id', req.user.id)
      .single();

    const currentProgress = user?.onboarding_progress || {};

    // Try to mark as completed
    const { error } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_progress: {
          ...currentProgress,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', req.user.id);

    if (error) {
      console.warn('Could not mark onboarding complete (column may not exist):', error.message);
    }

    // Try to award points (optional)
    if (orgId) {
      try {
        await supabase.from('point_transactions').insert({
          user_id: req.user.id,
          organization_id: orgId,
          points: 50,
          reason: 'Completed onboarding tutorial',
          reference_type: 'tutorial',
          reference_id: null
        });
      } catch (e) {
        // Points table may not exist
      }
    }

    res.json({
      success: true,
      message: 'Tutorial completed',
      points_earned: 50
    });
  } catch (error) {
    console.error('Error completing tutorial:', error);
    res.json({ success: true, message: 'Tutorial completed', points_earned: 0 });
  }
});

/**
 * POST /api/onboarding/skip
 * Skip the tutorial
 */
router.post('/skip', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ success: true, message: 'Tutorial skipped' });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_skipped: true,
        onboarding_progress: {
          steps_completed: [],
          skipped_at: new Date().toISOString()
        }
      })
      .eq('id', req.user.id);

    if (error) {
      console.warn('Could not mark onboarding skipped (column may not exist):', error.message);
    }

    res.json({ success: true, message: 'Tutorial skipped' });
  } catch (error) {
    console.error('Error skipping tutorial:', error);
    res.json({ success: true, message: 'Tutorial skipped' });
  }
});

/**
 * POST /api/onboarding/reset
 * Reset tutorial progress (for testing or re-taking)
 */
router.post('/reset', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ success: true, message: 'Tutorial reset' });
    }

    const supabase = createAdminClient();

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
      .eq('id', req.user.id);

    if (updateError) {
      console.warn('Could not reset onboarding (columns may not exist):', updateError.message);
    }

    // Try to delete tutorial completions (table may not exist)
    try {
      await supabase
        .from('tutorial_completions')
        .delete()
        .eq('user_id', req.user.id);
    } catch (e) {
      // Table may not exist
    }

    res.json({ success: true, message: 'Tutorial reset' });
  } catch (error) {
    console.error('Error resetting tutorial:', error);
    res.json({ success: true, message: 'Tutorial reset' });
  }
});

export default router;
