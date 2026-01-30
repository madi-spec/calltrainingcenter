import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { getAssignableRoles, validateRoleTransition } from '../lib/permissions.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/users
 * Get all users in organization
 */
router.get('/', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.USERS)
      .select(`
        *,
        branch:branches(id, name)
      `)
      .eq('organization_id', req.organization.id)
      .order('full_name', { ascending: true });

    // Managers only see their branch
    if (req.user.role === 'manager' && req.user.branch_id) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: users, error } = await query;

    if (error) throw error;

    // Get session counts
    const { data: sessionCounts } = await adminClient
      .from(TABLES.TRAINING_SESSIONS)
      .select('user_id')
      .eq('organization_id', req.organization.id)
      .eq('status', 'completed');

    const countMap = {};
    sessionCounts?.forEach(s => {
      countMap[s.user_id] = (countMap[s.user_id] || 0) + 1;
    });

    const usersWithCounts = users?.map(u => ({
      ...u,
      total_sessions: countMap[u.id] || 0
    }));

    res.json({ users: usersWithCounts || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Users can view themselves
    if (id !== req.user.id && !['manager', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: user, error } = await adminClient
      .from(TABLES.USERS)
      .select(`
        *,
        branch:branches(id, name),
        organization:organizations(id, name)
      `)
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id
 * Update a user
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, preferences, branch_id } = req.body;

    // Users can update themselves, managers+ can update others
    const canUpdate = id === req.user.id || ['manager', 'admin', 'super_admin'].includes(req.user.role);
    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminClient = createAdminClient();

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (preferences) updates.preferences = preferences;
    if (branch_id && ['admin', 'super_admin'].includes(req.user.role)) {
      updates.branch_id = branch_id;
    }

    const { data: user, error } = await adminClient
      .from(TABLES.USERS)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id/role
 * Change a user's role
 */
router.patch('/:id/role', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role required' });
    }

    const adminClient = createAdminClient();

    // Get target user's current role
    const { data: targetUser } = await adminClient
      .from(TABLES.USERS)
      .select('role')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate role transition
    const validation = validateRoleTransition(req.user.role, targetUser.role, role);
    if (!validation.valid) {
      return res.status(403).json({ error: validation.message });
    }

    const { data: user, error } = await adminClient
      .from(TABLES.USERS)
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users/invite
 * Invite a new user
 */
router.post('/invite', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { email, role, branch_id } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role required' });
    }

    // Check if role is assignable
    const assignableRoles = getAssignableRoles(req.user.role);
    if (!assignableRoles.includes(role)) {
      return res.status(403).json({ error: 'Cannot invite user with this role' });
    }

    const adminClient = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from(TABLES.USERS)
      .select('id')
      .eq('email', email)
      .eq('organization_id', req.organization.id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists in organization' });
    }

    // In a real implementation, you would:
    // 1. Create an invitation record
    // 2. Send an invitation email
    // 3. The user clicks the link to complete signup

    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation: {
        email,
        role,
        branch_id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate a user
 */
router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const adminClient = createAdminClient();

    // Get target user's role
    const { data: targetUser } = await adminClient
      .from(TABLES.USERS)
      .select('role')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot deactivate owner
    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot deactivate organization owner' });
    }

    // Soft delete by setting status to inactive
    const { error } = await adminClient
      .from(TABLES.USERS)
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
