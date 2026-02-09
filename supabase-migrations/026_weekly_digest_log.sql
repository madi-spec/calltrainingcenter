-- Weekly digest deduplication log
-- Prevents the same week's digest from being sent multiple times per organization

CREATE TABLE IF NOT EXISTS weekly_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, week_key)
);

CREATE INDEX idx_weekly_digest_log_org_week ON weekly_digest_log(organization_id, week_key);
