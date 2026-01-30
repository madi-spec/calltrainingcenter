import express from 'express';
import webpush from 'web-push';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';

const router = express.Router();

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@csrtraining.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * GET /api/pwa/vapid-public-key
 * Get the VAPID public key for push subscription
 */
router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/**
 * POST /api/pwa/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { subscription, deviceInfo } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const { data, error } = await supabase
      .from(TABLES.PUSH_SUBSCRIPTIONS)
      .upsert({
        user_id: userId,
        org_id: orgId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys?.p256dh,
        auth_key: subscription.keys?.auth,
        device_name: deviceInfo?.name,
        device_type: deviceInfo?.type || 'desktop',
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,endpoint' })
      .select()
      .single();

    if (error) throw error;

    res.json({ subscription: data });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * DELETE /api/pwa/subscribe
 * Unsubscribe from push notifications
 */
router.delete('/subscribe', requireAuth, async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { endpoint } = req.body;

    if (endpoint) {
      // Unsubscribe specific endpoint
      await supabase
        .from(TABLES.PUSH_SUBSCRIPTIONS)
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
    } else {
      // Unsubscribe all
      await supabase
        .from(TABLES.PUSH_SUBSCRIPTIONS)
        .delete()
        .eq('user_id', userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * GET /api/pwa/subscriptions
 * Get user's push subscriptions
 */
router.get('/subscriptions', requireAuth, async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data, error } = await supabase
      .from(TABLES.PUSH_SUBSCRIPTIONS)
      .select('id, device_name, device_type, browser, os, is_active, last_used_at, created_at')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });

    if (error) throw error;

    res.json({ subscriptions: data || [] });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * POST /api/pwa/send-notification
 * Send a push notification (internal use)
 */
router.post('/send-notification', requireAuth, async (req, res) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(503).json({ error: 'Push notifications not configured' });
    }

    const supabase = createAdminClient();
    const { userId, title, body, url, data } = req.body;

    // Get user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from(TABLES.PUSH_SUBSCRIPTIONS)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return res.json({ sent: 0, message: 'No active subscriptions' });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      ...data
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        }, payload);

        // Update last used
        await supabase
          .from(TABLES.PUSH_SUBSCRIPTIONS)
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);

        sent++;
      } catch (pushError) {
        console.error('Push error:', pushError);
        failed++;

        // If subscription is expired or invalid, mark as inactive
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from(TABLES.PUSH_SUBSCRIPTIONS)
            .update({ is_active: false })
            .eq('id', sub.id);
        }
      }
    }

    res.json({ sent, failed });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * PUT /api/pwa/preferences
 * Update notification preferences
 */
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { preferences } = req.body;

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('notification_preferences')
      .single();

    if (error) throw error;

    res.json({ preferences: data.notification_preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /api/pwa/preferences
 * Get notification preferences
 */
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({ preferences: data?.notification_preferences || {} });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

export default router;
