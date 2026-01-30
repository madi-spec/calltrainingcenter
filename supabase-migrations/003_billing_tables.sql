-- Migration: Billing Tables
-- Creates usage_records and invoices tables for Stripe billing integration

-- Usage Records (for tracking training minutes and billing)
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('training_minutes', 'ai_analysis', 'voice_call')),
  quantity DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_usage_record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (for storing invoice records from Stripe)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  period_start DATE,
  period_end DATE,
  amount_due INTEGER,
  amount_paid INTEGER,
  currency TEXT DEFAULT 'usd',
  usage_summary JSONB,
  status TEXT DEFAULT 'draft',
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hour Purchases (for tracking additional hour purchases)
CREATE TABLE IF NOT EXISTS hour_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  hours_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_records_org ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_session ON usage_records(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_hour_purchases_org ON hour_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_hour_purchases_stripe ON hour_purchases(stripe_session_id);

-- Row Level Security
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins/Owners can view their org's billing data
CREATE POLICY "Admins view org usage records" ON usage_records
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins view org invoices" ON invoices
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins view org hour purchases" ON hour_purchases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Add billing-related columns to organizations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_status TEXT DEFAULT 'trialing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_plan TEXT DEFAULT 'starter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'training_hours_included'
  ) THEN
    ALTER TABLE organizations ADD COLUMN training_hours_included INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'training_hours_used'
  ) THEN
    ALTER TABLE organizations ADD COLUMN training_hours_used DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Index for organization billing lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Promo Redemptions (for tracking promotional code usage)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  promo_name TEXT,
  plan_granted TEXT NOT NULL,
  hours_granted INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for promo redemptions
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_org ON promo_redemptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_org_code ON promo_redemptions(organization_id, promo_code);

-- RLS for promo redemptions
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view org promo redemptions" ON promo_redemptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Add promo-related columns to organizations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'promo_code'
  ) THEN
    ALTER TABLE organizations ADD COLUMN promo_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'promo_expires_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN promo_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE organizations ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
END $$;
