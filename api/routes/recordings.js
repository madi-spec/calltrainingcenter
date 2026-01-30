import express from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/recordings/:sessionId
 * Get recording for a training session
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { sessionId } = req.params;

    // Get the recording
    const { data: recording, error } = await supabase
      .from(TABLES.CALL_RECORDINGS)
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check access - user owns it or is a manager in the org
    const { data: user } = await supabase
      .from(TABLES.USERS)
      .select('role')
      .eq('id', userId)
      .single();

    const canAccess = recording.user_id === userId ||
      (recording.org_id === orgId && ['manager', 'admin', 'owner'].includes(user?.role));

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate signed URL if using Supabase Storage
    let audioUrl = recording.audio_url;
    if (recording.storage_path && !audioUrl) {
      const { data: signedUrl } = await supabase.storage
        .from(recording.storage_bucket || 'call-recordings')
        .createSignedUrl(recording.storage_path, 3600); // 1 hour expiry

      audioUrl = signedUrl?.signedUrl;
    }

    res.json({
      recording: {
        ...recording,
        audio_url: audioUrl
      }
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

/**
 * GET /api/recordings/:sessionId/bookmarks
 * Get bookmarks for a recording
 */
router.get('/:sessionId/bookmarks', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { sessionId } = req.params;

    // Get recording ID first
    const { data: recording } = await supabase
      .from(TABLES.CALL_RECORDINGS)
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!recording) {
      return res.json({ bookmarks: [] });
    }

    const { data: bookmarks, error } = await supabase
      .from(TABLES.RECORDING_BOOKMARKS)
      .select('*')
      .eq('recording_id', recording.id)
      .order('timestamp_seconds', { ascending: true });

    if (error) throw error;

    res.json({ bookmarks: bookmarks || [] });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

/**
 * POST /api/recordings/:sessionId/bookmarks
 * Add a bookmark to a recording
 */
router.post('/:sessionId/bookmarks', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { sessionId } = req.params;
    const { timestampSeconds, label, note, bookmarkType } = req.body;

    // Get recording ID
    const { data: recording } = await supabase
      .from(TABLES.CALL_RECORDINGS)
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const { data: bookmark, error } = await supabase
      .from(TABLES.RECORDING_BOOKMARKS)
      .insert({
        recording_id: recording.id,
        user_id: userId,
        timestamp_seconds: timestampSeconds,
        label: label || null,
        note: note || null,
        bookmark_type: bookmarkType || 'general'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ bookmark });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

/**
 * DELETE /api/recordings/:sessionId/bookmarks/:bookmarkId
 * Delete a bookmark
 */
router.delete('/:sessionId/bookmarks/:bookmarkId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { bookmarkId } = req.params;

    const { error } = await supabase
      .from(TABLES.RECORDING_BOOKMARKS)
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

/**
 * POST /api/recordings/:sessionId/share
 * Share a recording
 */
router.post('/:sessionId/share', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { sessionId } = req.params;
    const { sharedWith, teamId, message, expiresInDays } = req.body;

    // Get recording ID
    const { data: recording } = await supabase
      .from(TABLES.CALL_RECORDINGS)
      .select('id, user_id')
      .eq('session_id', sessionId)
      .single();

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Only owner can share
    if (recording.user_id !== userId) {
      return res.status(403).json({ error: 'Only the recording owner can share' });
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: share, error } = await supabase
      .from(TABLES.RECORDING_SHARES)
      .insert({
        recording_id: recording.id,
        shared_by: userId,
        shared_with: sharedWith || null,
        team_id: teamId || null,
        message: message || null,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ share });
  } catch (error) {
    console.error('Error sharing recording:', error);
    res.status(500).json({ error: 'Failed to share recording' });
  }
});

/**
 * GET /api/recordings/user/list
 * Get user's recordings
 */
router.get('/user/list', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    const { data: recordings, error } = await supabase
      .from(TABLES.CALL_RECORDINGS)
      .select(`
        *,
        session:training_sessions(scenario_id, overall_score, ended_at)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('recorded_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({ recordings: recordings || [] });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

/**
 * GET /api/recordings/shared
 * Get recordings shared with me
 */
router.get('/shared/list', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;

    // Get user's team
    const { data: user } = await supabase
      .from(TABLES.USERS)
      .select('team_id')
      .eq('id', userId)
      .single();

    const { data: shares, error } = await supabase
      .from(TABLES.RECORDING_SHARES)
      .select(`
        *,
        recording:call_recordings(
          *,
          session:training_sessions(scenario_id, overall_score)
        ),
        shared_by_user:users!recording_shares_shared_by_fkey(full_name, avatar_url)
      `)
      .or(`shared_with.eq.${userId},team_id.eq.${user?.team_id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out expired shares
    const validShares = (shares || []).filter(s =>
      !s.expires_at || new Date(s.expires_at) > new Date()
    );

    res.json({ shares: validShares });
  } catch (error) {
    console.error('Error fetching shared recordings:', error);
    res.status(500).json({ error: 'Failed to fetch shared recordings' });
  }
});

export default router;
