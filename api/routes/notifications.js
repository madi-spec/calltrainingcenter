/**
 * Notifications API Routes
 *
 * Handles user notifications for achievements, assignments, and system messages.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only = false } = req.query;
    const adminClient = createAdminClient();

    let query = adminClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      total_count: count || 0
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: notification, error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the user
 */
router.post('/read-all', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
