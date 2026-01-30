-- Migration: 011_recordings.sql
-- Description: Call recording storage and replay functionality

-- Call recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Storage info
  audio_url TEXT, -- Public URL or signed URL
  storage_path TEXT, -- Path in Supabase Storage bucket
  storage_bucket TEXT DEFAULT 'call-recordings',

  -- Audio metadata
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  format TEXT DEFAULT 'mp3',
  sample_rate INTEGER DEFAULT 44100,

  -- Transcript with timing
  transcript_with_timestamps JSONB, -- [{timestamp: number, speaker: string, text: string}]

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'deleted')),
  error_message TEXT,

  -- Timestamps
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recording bookmarks (mark important moments)
CREATE TABLE IF NOT EXISTS recording_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  label TEXT,
  note TEXT,
  bookmark_type TEXT DEFAULT 'general' CHECK (bookmark_type IN ('general', 'strength', 'improvement', 'question')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recording shares (share specific recordings with team/managers)
CREATE TABLE IF NOT EXISTS recording_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means shared with team
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_recordings_session ON call_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_user ON call_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_org ON call_recordings(org_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON call_recordings(status);
CREATE INDEX IF NOT EXISTS idx_recording_bookmarks_recording ON recording_bookmarks(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_shares_recording ON recording_shares(recording_id);

-- RLS Policies
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_shares ENABLE ROW LEVEL SECURITY;

-- Recordings: users can see their own, managers can see team's
CREATE POLICY call_recordings_user_policy ON call_recordings
  FOR SELECT USING (
    user_id = auth.uid() OR
    -- Managers can see their team's recordings
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY call_recordings_insert_policy ON call_recordings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Bookmarks: users can manage their own
CREATE POLICY recording_bookmarks_user_policy ON recording_bookmarks
  FOR ALL USING (user_id = auth.uid());

-- Shares: creator can manage, recipients can view
CREATE POLICY recording_shares_policy ON recording_shares
  FOR ALL USING (
    shared_by = auth.uid() OR
    shared_with = auth.uid() OR
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
  );

-- Add recording_id reference to training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES call_recordings(id) ON DELETE SET NULL;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT false;
