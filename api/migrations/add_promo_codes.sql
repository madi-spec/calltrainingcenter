-- Promo Code System Migration
-- Run this in the Supabase SQL Editor

-- Add promo code fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ;

-- Create promo_redemptions table to track code usage
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  promo_name TEXT,
  plan_granted TEXT NOT NULL,
  hours_granted INTEGER NOT NULL DEFAULT 25,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, promo_code)
);

-- Index for checking redemption limits
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_org ON promo_redemptions(organization_id);

-- Enable RLS
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins/owners can see their org's redemptions
CREATE POLICY "Users see own org promo redemptions" ON promo_redemptions
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
