import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/branches
 * Get all branches for the organization
 */
router.get('/', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: branches, error } = await adminClient
      .from(TABLES.BRANCHES)
      .select('*')
      .eq('organization_id', req.organization.id)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    // Get user counts for each branch
    const { data: userCounts } = await adminClient
      .from(TABLES.USERS)
      .select('branch_id')
      .eq('organization_id', req.organization.id);

    const countMap = {};
    userCounts?.forEach(u => {
      countMap[u.branch_id] = (countMap[u.branch_id] || 0) + 1;
    });

    const branchesWithCounts = branches.map(b => ({
      ...b,
      user_count: countMap[b.id] || 0
    }));

    res.json({ branches: branchesWithCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/branches/:id
 * Get a specific branch
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { data: branch, error } = await adminClient
      .from(TABLES.BRANCHES)
      .select(`
        *,
        users:users(id, full_name, email, role)
      `)
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json({ branch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/branches
 * Create a new branch
 */
router.post('/', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { name, address, phone, timezone, is_primary } = req.body;
    const adminClient = createAdminClient();

    // If setting as primary, unset existing primary
    if (is_primary) {
      await adminClient
        .from(TABLES.BRANCHES)
        .update({ is_primary: false })
        .eq('organization_id', req.organization.id)
        .eq('is_primary', true);
    }

    const { data: branch, error } = await adminClient
      .from(TABLES.BRANCHES)
      .insert({
        organization_id: req.organization.id,
        name,
        address,
        phone,
        timezone: timezone || 'America/New_York',
        is_primary: is_primary || false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ branch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/branches/:id
 * Update a branch
 */
router.patch('/:id', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, timezone, is_primary } = req.body;
    const adminClient = createAdminClient();

    // If setting as primary, unset existing primary
    if (is_primary) {
      await adminClient
        .from(TABLES.BRANCHES)
        .update({ is_primary: false })
        .eq('organization_id', req.organization.id)
        .eq('is_primary', true)
        .neq('id', id);
    }

    const { data: branch, error } = await adminClient
      .from(TABLES.BRANCHES)
      .update({
        name,
        address,
        phone,
        timezone,
        is_primary,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ branch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/branches/:id
 * Delete a branch
 */
router.delete('/:id', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Check if it's the primary branch
    const { data: branch } = await adminClient
      .from(TABLES.BRANCHES)
      .select('is_primary')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (branch?.is_primary) {
      return res.status(400).json({ error: 'Cannot delete primary branch' });
    }

    // Move users to null branch or primary
    const { data: primaryBranch } = await adminClient
      .from(TABLES.BRANCHES)
      .select('id')
      .eq('organization_id', req.organization.id)
      .eq('is_primary', true)
      .single();

    await adminClient
      .from(TABLES.USERS)
      .update({ branch_id: primaryBranch?.id || null })
      .eq('branch_id', id);

    const { error } = await adminClient
      .from(TABLES.BRANCHES)
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
