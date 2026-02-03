-- =============================================
-- FIX OBJECTION DUPLICATES AND ADD INDUSTRY TAGGING
-- =============================================

-- First, delete duplicate objections (keep only the one with lowest id for each unique text)
DELETE FROM objection_templates a
USING objection_templates b
WHERE a.id > b.id
  AND a.objection_text = b.objection_text
  AND a.objection_category = b.objection_category;

-- Add a unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_objection_unique
  ON objection_templates(objection_category, objection_text);

-- Add industry column to support better filtering
ALTER TABLE objection_templates
ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'pest_control';

-- Tag existing objections by industry based on display_order
-- Pest control: 1-59, Lawn care: 60-119
UPDATE objection_templates
SET industry = CASE
  WHEN display_order >= 60 AND display_order <= 119 THEN 'lawn_care'
  WHEN display_order >= 1 AND display_order <= 59 THEN 'pest_control'
  ELSE 'pest_control'
END;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_objection_industry ON objection_templates(industry);
