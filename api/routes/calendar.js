import express from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware } from '../lib/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback';

/**
 * GET /api/calendar/integrations
 * Get user's calendar integrations
 */
router.get('/integrations', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data, error } = await supabase
      .from(TABLES.CALENDAR_INTEGRATIONS)
      .select('id, provider, provider_email, status, sync_enabled, reminder_minutes, last_sync_at, created_at')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ integrations: data || [] });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /api/calendar/google/auth-url
 * Get Google OAuth authorization URL
 */
router.get('/google/auth-url', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google Calendar integration not configured' });
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', req.user.id); // Include user ID for callback

  res.json({ url: authUrl.toString() });
});

/**
 * GET /api/calendar/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.redirect('/settings?error=calendar_auth_failed');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return res.redirect('/settings?error=calendar_auth_failed');
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();

    // Get user's org_id
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from(TABLES.USERS)
      .select('org_id')
      .eq('id', userId)
      .single();

    // Store integration
    await supabase
      .from(TABLES.CALENDAR_INTEGRATIONS)
      .upsert({
        user_id: userId,
        org_id: user.org_id,
        provider: 'google',
        provider_account_id: userInfo.id,
        provider_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        status: 'active',
        sync_enabled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });

    res.redirect('/settings?calendar=connected');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/settings?error=calendar_auth_failed');
  }
});

/**
 * DELETE /api/calendar/integrations/:id
 * Disconnect a calendar integration
 */
router.delete('/integrations/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { id } = req.params;

    const { error } = await supabase
      .from(TABLES.CALENDAR_INTEGRATIONS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * GET /api/calendar/events
 * Get user's training events
 */
router.get('/events', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from(TABLES.TRAINING_EVENTS)
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_start', { ascending: true });

    if (startDate) {
      query = query.gte('scheduled_start', startDate);
    }
    if (endDate) {
      query = query.lte('scheduled_start', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ events: data || [] });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/calendar/events
 * Create a training event
 */
router.post('/events', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const {
      assignmentId,
      scenarioId,
      scenarioName,
      courseId,
      scheduledStart,
      scheduledEnd,
      durationMinutes,
      notes,
      syncToCalendar
    } = req.body;

    const { data: event, error } = await supabase
      .from(TABLES.TRAINING_EVENTS)
      .insert({
        user_id: userId,
        org_id: orgId,
        assignment_id: assignmentId || null,
        scenario_id: scenarioId || null,
        scenario_name: scenarioName || null,
        course_id: courseId || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd || new Date(new Date(scheduledStart).getTime() + (durationMinutes || 30) * 60000).toISOString(),
        duration_minutes: durationMinutes || 30,
        notes: notes || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;

    // Sync to external calendar if requested
    if (syncToCalendar) {
      try {
        await syncEventToCalendar(userId, event);
      } catch (syncError) {
        console.error('Error syncing to calendar:', syncError);
        // Don't fail the request, just log the error
      }
    }

    res.json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /api/calendar/events/:id
 * Update a training event
 */
router.patch('/events/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from(TABLES.TRAINING_EVENTS)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ event: data });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete a training event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { id } = req.params;

    // Get the event first to check for external calendar sync
    const { data: event } = await supabase
      .from(TABLES.TRAINING_EVENTS)
      .select('external_event_id, calendar_integration_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    // Delete from external calendar if synced
    if (event?.external_event_id && event?.calendar_integration_id) {
      try {
        await deleteEventFromCalendar(userId, event);
      } catch (syncError) {
        console.error('Error deleting from external calendar:', syncError);
      }
    }

    const { error } = await supabase
      .from(TABLES.TRAINING_EVENTS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * GET /api/calendar/goals
 * Get user's training goals
 */
router.get('/goals', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    const { data, error } = await supabase
      .from(TABLES.TRAINING_GOALS)
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false });

    if (error) throw error;

    res.json({ goals: data || [] });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/calendar/goals
 * Create a training goal
 */
router.post('/goals', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { goalType, targetValue, periodStart, periodEnd, isMandatory } = req.body;

    const { data, error } = await supabase
      .from(TABLES.TRAINING_GOALS)
      .insert({
        user_id: userId,
        org_id: orgId,
        goal_type: goalType,
        target_value: targetValue,
        period_start: periodStart,
        period_end: periodEnd,
        is_mandatory: isMandatory || false,
        set_by: userId // Self-set
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ goal: data });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Helper function to sync event to external calendar
async function syncEventToCalendar(userId, event) {
  const supabase = createAdminClient();

  // Get active Google integration
  const { data: integration } = await supabase
    .from(TABLES.CALENDAR_INTEGRATIONS)
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('status', 'active')
    .single();

  if (!integration) return;

  // Refresh token if needed
  let accessToken = integration.access_token;
  if (new Date(integration.token_expires_at) < new Date()) {
    accessToken = await refreshGoogleToken(integration);
  }

  // Create event in Google Calendar
  const googleEvent = {
    summary: `Training: ${event.scenario_name || 'Practice Session'}`,
    description: event.notes || 'CSR Training Session',
    start: {
      dateTime: event.scheduled_start,
      timeZone: 'UTC'
    },
    end: {
      dateTime: event.scheduled_end,
      timeZone: 'UTC'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: integration.reminder_minutes || 15 }
      ]
    }
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    }
  );

  const createdEvent = await response.json();

  // Update our event with the external ID
  await supabase
    .from(TABLES.TRAINING_EVENTS)
    .update({
      external_event_id: createdEvent.id,
      calendar_integration_id: integration.id,
      sync_status: 'synced'
    })
    .eq('id', event.id);
}

// Helper function to refresh Google token
async function refreshGoogleToken(integration) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const tokens = await response.json();

  const supabase = createAdminClient();
  await supabase
    .from(TABLES.CALENDAR_INTEGRATIONS)
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    })
    .eq('id', integration.id);

  return tokens.access_token;
}

// Helper function to delete event from external calendar
async function deleteEventFromCalendar(userId, event) {
  const supabase = createAdminClient();

  const { data: integration } = await supabase
    .from(TABLES.CALENDAR_INTEGRATIONS)
    .select('*')
    .eq('id', event.calendar_integration_id)
    .single();

  if (!integration) return;

  let accessToken = integration.access_token;
  if (new Date(integration.token_expires_at) < new Date()) {
    accessToken = await refreshGoogleToken(integration);
  }

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.external_event_id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
}

export default router;
