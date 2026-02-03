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
 * GET /api/notifications/preferences
 * Get user's email notification preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: prefs, error } = await adminClient
      .from('email_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return default preferences if none exist
    if (!prefs) {
      return res.json({
        weekly_digest: true,
        digest_day: 'monday',
        digest_time: '08:00:00',
        timezone: req.user.preferences?.timezone || 'America/New_York'
      });
    }

    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's email notification preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const { weekly_digest, digest_day, digest_time, timezone } = req.body;
    const adminClient = createAdminClient();

    // Validate digest_day
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (digest_day && !validDays.includes(digest_day.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid digest_day. Must be a day of the week.' });
    }

    // Check if preferences exist
    const { data: existing } = await adminClient
      .from('email_preferences')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const prefsData = {
      user_id: req.user.id,
      ...(weekly_digest !== undefined && { weekly_digest }),
      ...(digest_day && { digest_day: digest_day.toLowerCase() }),
      ...(digest_time && { digest_time }),
      ...(timezone && { timezone })
    };

    let result;
    if (existing) {
      // Update existing preferences
      result = await adminClient
        .from('email_preferences')
        .update(prefsData)
        .eq('user_id', req.user.id)
        .select()
        .single();
    } else {
      // Insert new preferences
      result = await adminClient
        .from('email_preferences')
        .insert(prefsData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/preferences/unsubscribe
 * Unsubscribe from weekly digest emails
 */
router.post('/preferences/unsubscribe', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Check if preferences exist
    const { data: existing } = await adminClient
      .from('email_preferences')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const prefsData = {
      user_id: req.user.id,
      weekly_digest: false
    };

    let result;
    if (existing) {
      result = await adminClient
        .from('email_preferences')
        .update(prefsData)
        .eq('user_id', req.user.id)
        .select()
        .single();
    } else {
      result = await adminClient
        .from('email_preferences')
        .insert(prefsData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json({ success: true, message: 'Successfully unsubscribed from weekly digest emails' });
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
