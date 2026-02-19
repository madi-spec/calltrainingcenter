/**
 * Modules API Routes
 *
 * Handles module details, scenario generation, and progress tracking.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { generateScenariosForModule, regenerateScenario } from '../services/scenarioGenerator.js';
import { generateCertificate } from '../services/certificateGenerator.js';

const router = Router();

/**
 * GET /api/modules/:id
 * Get module with scenarios and progress
 */
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get module with course info
    const { data: module, error: moduleError } = await adminClient
      .from('course_modules')
      .select(`
        *,
        course:courses(id, name, category, icon, badge_name, badge_icon)
      `)
      .eq('id', req.params.id)
      .single();

    if (moduleError) throw moduleError;
    if (!module) return res.status(404).json({ error: 'Module not found' });

    // Get user's progress for this module
    const { data: progress } = await adminClient
      .from('user_module_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .single();

    // Get generated scenarios for this user/module
    const { data: scenarios } = await adminClient
      .from('generated_scenarios')
      .select(`
        *,
        profile:customer_profiles(name, personality_traits, communication_style)
      `)
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .order('sequence_number');

    res.json({
      success: true,
      module: {
        ...module,
        progress: progress ? {
          status: progress.status,
          scenariosCompleted: progress.scenarios_completed,
          scenariosWon: progress.scenarios_won,
          closeRate: progress.best_close_rate,
          attempts: progress.attempts,
          startedAt: progress.started_at,
          completedAt: progress.completed_at
        } : null,
        scenarios: scenarios || []
      }
    });
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/:id/start
 * Start a module (generates scenarios)
 */
router.post('/:id/start', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get module info
    const { data: module, error: moduleError } = await adminClient
      .from('course_modules')
      .select('*, course:courses(*)')
      .eq('id', req.params.id)
      .single();

    if (moduleError) throw moduleError;
    if (!module) return res.status(404).json({ error: 'Module not found' });

    // Check if user already has progress
    const { data: existingProgress } = await adminClient
      .from('user_module_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .single();

    // If already has progress AND scenarios, return them
    if (existingProgress) {
      const { data: existingScenarios } = await adminClient
        .from('generated_scenarios')
        .select(`
          *,
          profile:customer_profiles(name, personality_traits, communication_style)
        `)
        .eq('user_id', req.user.id)
        .eq('module_id', req.params.id)
        .order('sequence_number');

      if (existingScenarios && existingScenarios.length > 0) {
        return res.json({
          success: true,
          progress: existingProgress,
          scenarios: existingScenarios,
          message: 'Module already started'
        });
      }
      // Progress exists but scenarios are missing (previous generation timed out) — fall through to regenerate
    }

    // Generate scenarios using the scenario generator service
    const insertedScenarios = await generateScenariosForModule(
      req.user.id,
      req.organization.id,
      module
    );

    // Create or update module progress (upsert handles the case where progress exists but scenarios were missing)
    const { data: progress, error: progressError } = await adminClient
      .from('user_module_progress')
      .upsert({
        user_id: req.user.id,
        module_id: module.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id' })
      .select()
      .single();

    if (progressError) throw progressError;

    res.json({
      success: true,
      progress,
      scenarios: insertedScenarios
    });
  } catch (error) {
    console.error('Error starting module:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/:id/next-scenario
 * Get the next pending scenario
 */
router.get('/:id/next-scenario', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: scenario, error } = await adminClient
      .from('generated_scenarios')
      .select(`
        *,
        profile:customer_profiles(*)
      `)
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .eq('status', 'pending')
      .order('sequence_number')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    if (!scenario) {
      return res.json({
        success: true,
        scenario: null,
        message: 'No more scenarios available'
      });
    }

    res.json({ success: true, scenario });
  } catch (error) {
    console.error('Error fetching next scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/:id/complete-scenario
 * Mark a scenario as complete and update progress
 */
router.post('/:id/complete-scenario', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { scenario_id, won, score, session_id } = req.body;

    if (!scenario_id) {
      return res.status(400).json({ error: 'scenario_id is required' });
    }

    const adminClient = createAdminClient();

    // Update the scenario
    const { data: scenario, error: scenarioError } = await adminClient
      .from('generated_scenarios')
      .update({
        status: 'completed'
      })
      .eq('id', scenario_id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (scenarioError) throw scenarioError;

    // Get current progress
    const { data: progress, error: progressError } = await adminClient
      .from('user_module_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .single();

    if (progressError) throw progressError;

    // Update progress
    const newCompleted = (progress.scenarios_completed || 0) + 1;
    const newWon = (progress.scenarios_won || 0) + (won ? 1 : 0);
    const newCloseRate = Math.round(newWon / newCompleted * 100);

    // Get module to check if completed
    const { data: module } = await adminClient
      .from('course_modules')
      .select('scenario_count, pass_threshold, course_id')
      .eq('id', req.params.id)
      .single();

    const isModuleComplete = newCompleted >= (module.scenario_count || 10);
    const isPassing = newCloseRate >= (module.pass_threshold || 60);

    const newStatus = isModuleComplete
      ? (isPassing ? 'completed' : 'in_progress') // Stay in_progress if didn't pass
      : 'in_progress';

    const { data: updatedProgress, error: updateError } = await adminClient
      .from('user_module_progress')
      .update({
        scenarios_completed: newCompleted,
        scenarios_won: newWon,
        best_close_rate: Math.max(progress.best_close_rate || 0, newCloseRate),
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If module completed, update course progress
    let courseProgress = null;
    let badgeAwarded = false;

    if (newStatus === 'completed') {
      // Get all module progress for this course
      const { data: allModules } = await adminClient
        .from('course_modules')
        .select('id')
        .eq('course_id', module.course_id);

      const { data: allProgress } = await adminClient
        .from('user_module_progress')
        .select('*')
        .eq('user_id', req.user.id)
        .in('module_id', allModules.map(m => m.id));

      const completedModules = allProgress?.filter(
        p => p.status === 'completed' || p.status === 'mastered'
      ).length || 0;

      const isCourseComplete = completedModules >= allModules.length;

      // Update course progress
      const { data: cp } = await adminClient
        .from('user_course_progress')
        .upsert({
          user_id: req.user.id,
          course_id: module.course_id,
          status: isCourseComplete ? 'completed' : 'in_progress',
          modules_completed: completedModules,
          badge_earned_at: isCourseComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_id'
        })
        .select()
        .single();

      courseProgress = cp;
      badgeAwarded = isCourseComplete;

      // Generate certificate if course is complete
      if (isCourseComplete) {
        try {
          // Get user details
          const { data: user } = await adminClient
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', req.user.id)
            .single();

          // Get course details
          const { data: course } = await adminClient
            .from('courses')
            .select('name')
            .eq('id', module.course_id)
            .single();

          if (user && course) {
            const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

            await generateCertificate({
              userId: req.user.id,
              courseId: module.course_id,
              userName,
              courseName: course.name,
              organizationName: req.organization.name,
              userEmail: user.email
            });

            console.log('[COURSE] Certificate generated for course completion');
          }
        } catch (certError) {
          console.error('[COURSE] Failed to generate certificate:', certError);
          // Don't fail the completion if certificate generation fails
        }
      }

      // Unlock next module if exists
      const { data: nextModule } = await adminClient
        .from('course_modules')
        .select('id')
        .eq('course_id', module.course_id)
        .gt('unlock_order', module.unlock_order)
        .order('unlock_order')
        .limit(1)
        .single();

      if (nextModule) {
        await adminClient
          .from('user_module_progress')
          .upsert({
            user_id: req.user.id,
            module_id: nextModule.id,
            status: 'in_progress',
            started_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,module_id'
          });
      }
    }

    res.json({
      success: true,
      moduleProgress: updatedProgress,
      courseProgress,
      moduleCompleted: newStatus === 'completed',
      badgeAwarded
    });
  } catch (error) {
    console.error('Error completing scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/:id/skip-scenario
 * Skip a scenario
 */
router.post('/:id/skip-scenario', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { scenario_id } = req.body;

    if (!scenario_id) {
      return res.status(400).json({ error: 'scenario_id is required' });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('generated_scenarios')
      .update({ status: 'skipped' })
      .eq('id', scenario_id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, scenario: data });
  } catch (error) {
    console.error('Error skipping scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/:id/regenerate-scenario
 * Regenerate a single scenario
 */
router.post('/:id/regenerate-scenario', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { sequence_number } = req.body;

    if (!sequence_number) {
      return res.status(400).json({ error: 'sequence_number is required' });
    }

    const scenario = await regenerateScenario(
      req.user.id,
      req.organization.id,
      req.params.id,
      sequence_number
    );

    res.json({ success: true, scenario });
  } catch (error) {
    console.error('Error regenerating scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/:id/reset
 * Reset module progress (for retrying)
 */
router.post('/:id/reset', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Delete existing scenarios
    await adminClient
      .from('generated_scenarios')
      .delete()
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id);

    // Get current attempts count first
    const { data: currentProgress } = await adminClient
      .from('user_module_progress')
      .select('attempts')
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .single();

    // Update progress with incremented attempts
    const { data: progress } = await adminClient
      .from('user_module_progress')
      .update({
        status: 'in_progress',
        scenarios_completed: 0,
        scenarios_won: 0,
        attempts: (currentProgress?.attempts || 0) + 1,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .eq('module_id', req.params.id)
      .select()
      .single();

    res.json({
      success: true,
      progress,
      message: 'Module reset. Use /start to generate new scenarios.'
    });
  } catch (error) {
    console.error('Error resetting module:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
