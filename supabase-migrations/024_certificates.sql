-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  score INTEGER,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
  ON certificates
  FOR SELECT
  USING (auth.uid()::text IN (
    SELECT clerk_id::text FROM users WHERE id = certificates.user_id
  ));

-- Public can verify certificates (for verification page)
CREATE POLICY "Public can verify certificates"
  ON certificates
  FOR SELECT
  USING (true);

-- System can insert certificates
CREATE POLICY "System can insert certificates"
  ON certificates
  FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE certificates IS 'Stores generated certificates for completed courses';
