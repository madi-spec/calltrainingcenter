/**
 * Courses API Routes
 *
 * Handles course listing, progress tracking, and course management.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/courses
 * List all courses with user progress
 */
router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get system courses and org-specific courses
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select(`
        *,
        modules:course_modules(*)
      `)
      .or(`is_system.eq.true,organization_id.eq.${req.organization.id}`)
      .eq('is_active', true)
      .order('display_order');

    if (coursesError) throw coursesError;

    // Get user's progress for all courses
    const { data: progress, error: progressError } = await adminClient
      .from('user_course_progress')
      .select('*')
      .eq('user_id', req.user.id);

    if (progressError) throw progressError;

    // Merge progress with courses
    const progressMap = {};
    progress?.forEach(p => {
      progressMap[p.course_id] = p;
    });

    const coursesWithProgress = courses?.map(course => {
      const courseProgress = progressMap[course.id];
      const totalModules = course.modules?.length || 0;

      return {
        ...course,
        progress: {
          status: courseProgress?.status || 'not_started',
          modulesCompleted: courseProgress?.modules_completed || 0,
          totalModules,
          percentComplete: totalModules > 0
            ? Math.round((courseProgress?.modules_completed || 0) / totalModules * 100)
            : 0,
          badgeEarnedAt: courseProgress?.badge_earned_at
        }
      };
    }) || [];

    res.json({ success: true, courses: coursesWithProgress });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:id
 * Get course detail with modules and user progress
 */
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get course with modules
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select(`
        *,
        modules:course_modules(*)
      `)
      .eq('id', req.params.id)
      .or(`is_system.eq.true,organization_id.eq.${req.organization.id}`)
      .single();

    if (courseError) throw courseError;
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Get user's course progress
    const { data: courseProgress } = await adminClient
      .from('user_course_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('course_id', req.params.id)
      .single();

    // Get user's module progress for this course's modules
    const moduleIds = course.modules?.map(m => m.id) || [];
    const { data: moduleProgress } = await adminClient
      .from('user_module_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .in('module_id', moduleIds);

    const moduleProgressMap = {};
    moduleProgress?.forEach(mp => {
      moduleProgressMap[mp.module_id] = mp;
    });

    // Merge module progress and determine unlock status
    const modulesWithProgress = course.modules
      ?.sort((a, b) => a.unlock_order - b.unlock_order)
      .map((module, idx) => {
        const mp = moduleProgressMap[module.id];
        const prevModule = idx > 0 ? course.modules[idx - 1] : null;
        const prevProgress = prevModule ? moduleProgressMap[prevModule.id] : null;

        // First module is always unlocked, others require previous to be completed
        const isUnlocked = idx === 0 ||
          prevProgress?.status === 'completed' ||
          prevProgress?.status === 'mastered';

        return {
          ...module,
          progress: {
            status: mp?.status || (isUnlocked ? 'in_progress' : 'locked'),
            scenariosCompleted: mp?.scenarios_completed || 0,
            scenariosWon: mp?.scenarios_won || 0,
            closeRate: mp?.best_close_rate || 0,
            attempts: mp?.attempts || 0,
            isUnlocked
          }
        };
      }) || [];

    res.json({
      success: true,
      course: {
        ...course,
        modules: modulesWithProgress,
        progress: {
          status: courseProgress?.status || 'not_started',
          modulesCompleted: courseProgress?.modules_completed || 0,
          totalModules: course.modules?.length || 0,
          badgeEarnedAt: courseProgress?.badge_earned_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:id/start
 * Start a course (creates progress record)
 */
router.post('/:id/start', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Check if progress already exists
    const { data: existing } = await adminClient
      .from('user_course_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('course_id', req.params.id)
      .single();

    if (existing) {
      return res.json({ success: true, progress: existing, message: 'Course already started' });
    }

    // Create course progress
    const { data: courseProgress, error: progressError } = await adminClient
      .from('user_course_progress')
      .insert({
        user_id: req.user.id,
        course_id: req.params.id,
        status: 'in_progress'
      })
      .select()
      .single();

    if (progressError) throw progressError;

    // Get the course modules to unlock the first one
    const { data: course } = await adminClient
      .from('courses')
      .select('modules:course_modules(*)')
      .eq('id', req.params.id)
      .single();

    if (course?.modules?.length > 0) {
      const firstModule = course.modules.sort((a, b) => a.unlock_order - b.unlock_order)[0];

      // Create module progress for first module
      await adminClient
        .from('user_module_progress')
        .insert({
          user_id: req.user.id,
          module_id: firstModule.id,
          status: 'in_progress',
          started_at: new Date().toISOString()
        });
    }

    res.json({ success: true, progress: courseProgress });
  } catch (error) {
    console.error('Error starting course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses
 * Create a custom course (admin only)
 */
router.post('/', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { name, description, category, product_line, icon, badge_name, badge_icon, modules } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const adminClient = createAdminClient();

    // Create the course
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .insert({
        organization_id: req.organization.id,
        name,
        description,
        category,
        product_line,
        icon,
        badge_name,
        badge_icon,
        is_system: false,
        created_by: req.user.id
      })
      .select()
      .single();

    if (courseError) throw courseError;

    // Create modules if provided
    if (modules && Array.isArray(modules) && modules.length > 0) {
      const modulesToInsert = modules.map((mod, idx) => ({
        course_id: course.id,
        name: mod.name,
        description: mod.description,
        difficulty: mod.difficulty || 'medium',
        scenario_count: mod.scenario_count || 10,
        pass_threshold: mod.pass_threshold || 60,
        required_completions: mod.required_completions || 1,
        unlock_order: idx
      }));

      const { error: modulesError } = await adminClient
        .from('course_modules')
        .insert(modulesToInsert);

      if (modulesError) throw modulesError;
    }

    // Fetch the complete course with modules
    const { data: completeCourse } = await adminClient
      .from('courses')
      .select(`
        *,
        modules:course_modules(*)
      `)
      .eq('id', course.id)
      .single();

    res.json({ success: true, course: completeCourse });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/courses/:id
 * Update a custom course
 */
router.put('/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Verify it's not a system course
    const { data: existing } = await adminClient
      .from('courses')
      .select('is_system')
      .eq('id', req.params.id)
      .single();

    if (existing?.is_system) {
      return res.status(403).json({ error: 'Cannot modify system courses' });
    }

    const { data, error } = await adminClient
      .from('courses')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, course: data });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/courses/:id
 * Soft delete a custom course
 */
router.delete('/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Verify it's not a system course
    const { data: existing } = await adminClient
      .from('courses')
      .select('is_system')
      .eq('id', req.params.id)
      .single();

    if (existing?.is_system) {
      return res.status(403).json({ error: 'Cannot delete system courses' });
    }

    const { error } = await adminClient
      .from('courses')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
