import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/suites
 * Get all training suites
 */
router.get('/', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: suites, error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .select(`
        *,
        created_by_user:users!training_suites_created_by_fkey(full_name)
      `)
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ suites: suites || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/suites/:id
 * Get a specific training suite
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { data: suite, error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!suite) {
      return res.status(404).json({ error: 'Suite not found' });
    }

    res.json({ suite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/suites
 * Create a new training suite
 */
router.post('/', requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const { name, description, type, scenario_order, passing_score, required_completions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const adminClient = createAdminClient();

    const { data: suite, error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .insert({
        organization_id: req.organization.id,
        name,
        description,
        type: type || 'custom',
        scenario_order: scenario_order || [],
        passing_score: passing_score || 70,
        required_completions: required_completions || 1,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ suite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/suites/:id
 * Update a training suite
 */
router.patch('/:id', requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, scenario_order, passing_score, required_completions } = req.body;

    const adminClient = createAdminClient();

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type) updates.type = type;
    if (scenario_order) updates.scenario_order = scenario_order;
    if (passing_score !== undefined) updates.passing_score = passing_score;
    if (required_completions !== undefined) updates.required_completions = required_completions;
    updates.updated_at = new Date().toISOString();

    const { data: suite, error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ suite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/suites/:id
 * Delete a training suite
 */
router.delete('/:id', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .delete()
      .eq('id', id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/suites/:id/duplicate
 * Duplicate a training suite
 */
router.post('/:id/duplicate', requireRole('manager', 'admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    // Get original suite
    const { data: original, error: fetchError } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organization.id)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ error: 'Suite not found' });
    }

    // Create duplicate
    const { data: duplicate, error } = await adminClient
      .from(TABLES.TRAINING_SUITES)
      .insert({
        organization_id: req.organization.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        scenario_order: original.scenario_order,
        passing_score: original.passing_score,
        required_completions: original.required_completions,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ suite: duplicate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
