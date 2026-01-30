import { Router } from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, unread_only = false } = req.query;
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.is('read_at', null);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count } = await adminClient
      .from(TABLES.NOTIFICATIONS)
      .select('id', { count: 'exact' })
      .eq('user_id', req.user.id)
      .is('read_at', null);

    res.json({
      notifications: notifications || [],
      unread_count: count || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.NOTIFICATIONS)
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.NOTIFICATIONS)
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.NOTIFICATIONS)
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/send
 * Send a notification to users (for managers)
 */
router.post('/send', requireRole('manager', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { user_ids, branch_id, type, title, message, data } = req.body;
    const adminClient = createAdminClient();

    let targetUserIds = user_ids;

    // If branch_id provided, get all users in that branch
    if (branch_id && (!user_ids || user_ids.length === 0)) {
      const { data: branchUsers } = await adminClient
        .from(TABLES.USERS)
        .select('id')
        .eq('branch_id', branch_id)
        .eq('organization_id', req.organization.id);

      targetUserIds = branchUsers?.map(u => u.id) || [];
    }

    if (!targetUserIds || targetUserIds.length === 0) {
      return res.status(400).json({ error: 'No recipients specified' });
    }

    const notifications = targetUserIds.map(user_id => ({
      organization_id: req.organization.id,
      user_id,
      type: type || 'system',
      title,
      message,
      data: data || {},
      channels: ['in_app']
    }));

    const { data: created, error } = await adminClient
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) throw error;

    res.json({ notifications: created, count: created.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create system notification helper
 */
export async function createNotification(organizationId, userId, type, title, message, data = {}) {
  const adminClient = createAdminClient();

  return adminClient.from(TABLES.NOTIFICATIONS).insert({
    organization_id: organizationId,
    user_id: userId,
    type,
    title,
    message,
    data,
    channels: ['in_app']
  });
}

export default router;
