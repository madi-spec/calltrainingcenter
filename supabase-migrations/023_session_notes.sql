-- Migration: 023_session_notes.sql
-- Description: Add timestamped notes functionality for session playback

-- Session notes table for personal timestamped notes during playback
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'personal' CHECK (note_type IN ('personal', 'mistake', 'success', 'objection', 'question')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_user ON session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_timestamp ON session_notes(session_id, timestamp_seconds);

-- RLS Policies
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own notes
CREATE POLICY session_notes_user_policy ON session_notes
  FOR ALL USING (user_id = auth.uid());

-- Add transcript_with_timestamps column to training_sessions if not exists
-- This stores the full transcript with word-level timing for precise synchronization
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS transcript_with_timestamps JSONB;

-- Add recording_url to training_sessions for easier access
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add analysis markers to training_sessions for visual highlights
-- Stores timestamps of mistakes, successes, objections identified by AI
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS analysis_markers JSONB DEFAULT '{"mistakes": [], "successes": [], "objections": []}'::jsonb;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS session_notes_updated_at ON session_notes;
CREATE TRIGGER session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_notes_updated_at();
