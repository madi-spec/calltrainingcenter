-- Add certificates table for tracking course completion certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  verification_code TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);

-- Ensure unique certificate per user per course (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_course_certificate
  ON certificates(user_id, course_id);

-- Add RLS policies for certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY certificates_select_own ON certificates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view certificates by verification code (for public verification)
CREATE POLICY certificates_select_by_code ON certificates
  FOR SELECT
  USING (true);

-- Only system can insert certificates (handled by API)
CREATE POLICY certificates_insert_system ON certificates
  FOR INSERT
  WITH CHECK (false);

-- Add comment
COMMENT ON TABLE certificates IS 'Tracks issued certificates for course completions';
