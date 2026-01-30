import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/assignments
 * Get all assignments (for managers/admins)
 */
router.get('/', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .select(`
        *,
        user:users(id, full_name, email),
        suite:training_suites(id, name)
      `)
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false });

    // Managers only see their branch
    if (req.user.role === 'manager' && req.user.branch_id) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: assignments, error } = await query;

    if (error) throw error;

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/assignments/my
 * Get current user's assignments
 */
router.get('/my', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: assignments, error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .select(`
        *,
        suite:training_suites(id, name, description)
      `)
      .eq('user_id', req.user.id)
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Check for overdue assignments
    const now = new Date();
    const processedAssignments = assignments.map(a => {
      if (a.status !== 'completed' && new Date(a.due_date) < now) {
        return { ...a, status: 'overdue' };
      }
      return a;
    });

    res.json({ assignments: processedAssignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/assignments/pending
 * Get pending assignments for current user
 */
router.get('/pending', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: assignments, error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .select(`
        *,
        suite:training_suites(id, name)
      `)
      .eq('user_id', req.user.id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(10);

    if (error) throw error;

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/assignments
 * Create a new assignment
 */
router.post('/', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { user_id, branch_id, suite_id, scenario_id, due_date } = req.body;
    const adminClient = createAdminClient();

    // Validate the user exists in the organization
    const { data: targetUser } = await adminClient
      .from(TABLES.USERS)
      .select('id')
      .eq('id', user_id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!targetUser) {
      return res.status(400).json({ error: 'User not found in organization' });
    }

    // Determine progress based on suite or single scenario
    let progress = { completed: 0, total: 1 };
    if (suite_id) {
      const { data: suite } = await adminClient
        .from(TABLES.TRAINING_SUITES)
        .select('scenario_order')
        .eq('id', suite_id)
        .single();

      if (suite?.scenario_order) {
        progress.total = suite.scenario_order.length;
      }
    }

    const { data: assignment, error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .insert({
        organization_id: req.organization.id,
        user_id,
        branch_id,
        suite_id,
        scenario_id,
        assigned_by: req.user.id,
        due_date,
        status: 'pending',
        progress
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification
    await adminClient.from(TABLES.NOTIFICATIONS).insert({
      organization_id: req.organization.id,
      user_id,
      type: 'assignment',
      title: 'New Training Assignment',
      message: `You have been assigned new training due by ${new Date(due_date).toLocaleDateString()}`,
      data: { assignment_id: assignment.id },
      channels: ['in_app', 'email']
    });

    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/assignments/bulk
 * Create assignments for multiple users
 */
router.post('/bulk', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { user_ids, branch_id, suite_id, scenario_id, due_date } = req.body;
    const adminClient = createAdminClient();

    let targetUserIds = user_ids;

    // If branch_id is provided without user_ids, assign to all users in branch
    if (branch_id && (!user_ids || user_ids.length === 0)) {
      const { data: branchUsers } = await adminClient
        .from(TABLES.USERS)
        .select('id')
        .eq('branch_id', branch_id)
        .eq('organization_id', req.organization.id);

      targetUserIds = branchUsers?.map(u => u.id) || [];
    }

    if (!targetUserIds || targetUserIds.length === 0) {
      return res.status(400).json({ error: 'No users specified' });
    }

    // Determine progress
    let progress = { completed: 0, total: 1 };
    if (suite_id) {
      const { data: suite } = await adminClient
        .from(TABLES.TRAINING_SUITES)
        .select('scenario_order')
        .eq('id', suite_id)
        .single();

      if (suite?.scenario_order) {
        progress.total = suite.scenario_order.length;
      }
    }

    const assignments = targetUserIds.map(user_id => ({
      organization_id: req.organization.id,
      user_id,
      branch_id,
      suite_id,
      scenario_id,
      assigned_by: req.user.id,
      due_date,
      status: 'pending',
      progress
    }));

    const { data, error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .insert(assignments)
      .select();

    if (error) throw error;

    // Create notifications for all users
    const notifications = targetUserIds.map(user_id => ({
      organization_id: req.organization.id,
      user_id,
      type: 'assignment',
      title: 'New Training Assignment',
      message: `You have been assigned new training due by ${new Date(due_date).toLocaleDateString()}`,
      channels: ['in_app', 'email']
    }));

    await adminClient.from(TABLES.NOTIFICATIONS).insert(notifications);

    res.json({ assignments: data, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/assignments/:id
 * Update an assignment
 */
router.patch('/:id', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, status } = req.body;
    const adminClient = createAdminClient();

    const { data: assignment, error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .update({ due_date, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/assignments/:id
 * Delete an assignment
 */
router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.TRAINING_ASSIGNMENTS)
      .delete()
      .eq('id', id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
