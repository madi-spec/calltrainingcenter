-- Migration: 017_async_analysis.sql
-- Description: Background processing for faster analysis

-- Add analysis status fields to training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending'
  CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS analysis_error TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS analysis_retry_count INTEGER DEFAULT 0;

-- Analysis queue for background processing
CREATE TABLE IF NOT EXISTS analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Priority (higher = more urgent)
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error tracking
  last_error TEXT,

  -- Worker info
  worker_id TEXT,
  locked_until TIMESTAMPTZ
);

-- Analysis results cache
CREATE TABLE IF NOT EXISTS analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE UNIQUE,

  -- Cached results
  overall_score INTEGER,
  category_scores JSONB,
  summary TEXT,
  strengths JSONB,
  improvements JSONB,
  key_moment JSONB,
  next_steps JSONB,

  -- Metadata
  model_used TEXT,
  tokens_used INTEGER,
  analysis_duration_ms INTEGER,

  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_sessions_analysis_status ON training_sessions(analysis_status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority DESC, queued_at ASC);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_locked ON analysis_queue(locked_until);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_session ON analysis_cache(session_id);

-- RLS Policies
ALTER TABLE analysis_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;

-- Analysis queue: service role only (background workers)
CREATE POLICY analysis_queue_service_policy ON analysis_queue
  FOR ALL USING (true); -- Controlled at application level

-- Analysis cache: users can see their own, managers can see their org's
CREATE POLICY analysis_cache_policy ON analysis_cache
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM training_sessions
      WHERE user_id = auth.uid() OR
      organization_id IN (
        SELECT org_id FROM users
        WHERE id = auth.uid() AND role IN ('manager', 'admin', 'owner')
      )
    )
  );

-- Function to get next analysis job
CREATE OR REPLACE FUNCTION get_next_analysis_job(p_worker_id TEXT, p_lock_duration INTERVAL DEFAULT '5 minutes')
RETURNS TABLE(job_id UUID, session_id UUID, org_id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE analysis_queue
  SET
    status = 'processing',
    started_at = NOW(),
    worker_id = p_worker_id,
    locked_until = NOW() + p_lock_duration,
    attempts = attempts + 1
  WHERE id = (
    SELECT id FROM analysis_queue
    WHERE status = 'pending'
      AND (locked_until IS NULL OR locked_until < NOW())
      AND attempts < max_attempts
    ORDER BY priority DESC, queued_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING analysis_queue.id, analysis_queue.session_id, analysis_queue.org_id;
END;
$$ LANGUAGE plpgsql;
