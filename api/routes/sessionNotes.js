import express from 'express';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware } from '../lib/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/session-notes/:sessionId
 * Get all notes for a training session
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { sessionId } = req.params;

    const { data: notes, error } = await supabase
      .from('session_notes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('timestamp_seconds', { ascending: true });

    if (error) throw error;

    res.json({ notes: notes || [] });
  } catch (error) {
    console.error('Error fetching session notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/session-notes/:sessionId
 * Create a new note for a session
 */
router.post('/:sessionId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { sessionId } = req.params;
    const { timestamp_seconds, note_text, note_type = 'personal' } = req.body;

    if (timestamp_seconds === undefined || !note_text) {
      return res.status(400).json({
        error: 'timestamp_seconds and note_text are required'
      });
    }

    // Verify session exists and user has access
    const { data: session } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select('user_id, organization_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check access - either owner or manager in same org
    const { data: user } = await supabase
      .from(TABLES.USERS)
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    const hasAccess = session.user_id === userId ||
      (session.organization_id === user?.organization_id &&
       ['manager', 'admin', 'super_admin'].includes(user?.role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: note, error } = await supabase
      .from('session_notes')
      .insert({
        session_id: sessionId,
        user_id: userId,
        timestamp_seconds: Math.round(timestamp_seconds),
        note_text: note_text.trim(),
        note_type
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ note });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/session-notes/:sessionId/:noteId
 * Update a note
 */
router.put('/:sessionId/:noteId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { noteId } = req.params;
    const { note_text, note_type } = req.body;

    if (!note_text) {
      return res.status(400).json({ error: 'note_text is required' });
    }

    const updateData = {
      note_text: note_text.trim()
    };

    if (note_type) {
      updateData.note_type = note_type;
    }

    const { data: note, error } = await supabase
      .from('session_notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/session-notes/:sessionId/:noteId
 * Delete a note
 */
router.delete('/:sessionId/:noteId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { noteId } = req.params;

    const { error } = await supabase
      .from('session_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
