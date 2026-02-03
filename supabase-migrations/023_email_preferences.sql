-- Email Preferences Table
-- Stores user preferences for automated email notifications

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  weekly_digest BOOLEAN DEFAULT true,
  digest_day TEXT DEFAULT 'monday' CHECK (digest_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  digest_time TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_digest ON email_preferences(user_id, weekly_digest) WHERE weekly_digest = true;

-- Row Level Security
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own preferences
CREATE POLICY "Users see own preferences" ON email_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own preferences" ON email_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users insert own preferences" ON email_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS set_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER set_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();
